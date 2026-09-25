// src/utils/offlineSync.js

// ¡Ajusta esta ruta hacia donde tengas configurado tu cliente de Supabase!
import { supabase } from '../supabaseClient'; 
import { guardarEnStorage, obtenerDeStorage } from './storage';

// Clave exclusiva para la cola de tareas sin internet
const OFFLINE_QUEUE_KEY = 'family_offline_queue';

/**
 * Agrega una operación a la cola cuando no hay internet.
 * @param {string} action - 'INSERT', 'UPDATE', o 'DELETE'
 * @param {string} table - Nombre de la tabla en Supabase (ej. 'agenda_events', 'transactions')
 * @param {object} payload - Los datos completos (ya deben incluir user_id, household_id, auth_user_email, etc.)
 */
export const agregarAColaOffline = async (action, table, payload) => {
  try {
    const queue = obtenerDeStorage(OFFLINE_QUEUE_KEY, []);
    
    queue.push({
      id: crypto.randomUUID(), // ID único interno para la operación en la cola
      action,
      table,
      payload,
      timestamp: new Date().toISOString()
    });

    guardarEnStorage(OFFLINE_QUEUE_KEY, queue);
    console.log(`[Offline Sync] Operación ${action} en la tabla '${table}' encolada localmente.`);
  } catch (error) {
    console.error("[Offline Sync] Error al encolar operación offline:", error);
  }
};

/**
 * Intenta enviar a Supabase todas las operaciones guardadas en la cola.
 * Se ejecuta automáticamente cuando regresa el internet.
 */
export const procesarColaOffline = async () => {
  // 1. Verificamos si realmente hay conexión a internet
  if (!navigator.onLine) return;

  const queue = obtenerDeStorage(OFFLINE_QUEUE_KEY, []);
  if (queue.length === 0) return; // No hay nada pendiente

  console.log(`[Offline Sync] Regresó la conexión. Procesando ${queue.length} operaciones pendientes...`);
  
  const pendingQueue = []; // Guardaremos aquí las que fallen para no perderlas

  for (const item of queue) {
    try {
      const { action, table, payload } = item;
      let error = null;

      // 2. Procesamos dependiendo del tipo de acción
      if (action === 'INSERT') {
        // En inserciones, le pasamos el payload exacto que vino del componente
        const { error: insertError } = await supabase.from(table).insert([payload]);
        error = insertError;
      } 
      else if (action === 'UPDATE') {
        // En actualizaciones, sacamos el 'id' para buscar la fila y actualizamos el resto
        const { id, ...updateData } = payload;
        const { error: updateError } = await supabase.from(table).update(updateData).eq('id', id);
        error = updateError;
      } 
      else if (action === 'DELETE') {
        // En borrado, solo necesitamos el 'id'
        const { error: deleteError } = await supabase.from(table).delete().eq('id', payload.id);
        error = deleteError;
      }

      // 3. Manejo de Errores de Supabase
      if (error) {
        console.error(`[Offline Sync] Supabase rechazó el ${action} en '${table}':`, error.message);
        
        // Si el error es un problema de red persistente, la volvemos a encolar.
        // Si es un error de RLS (403) significa que los datos inyectados fueron incorrectos, 
        // podrías descartarla aquí si quieres, pero por seguridad la devolvemos a la cola.
        pendingQueue.push(item);
      } else {
        console.log(`[Offline Sync] ✅ Éxito subiendo a la nube: ${action} en '${table}'`);
      }
    } catch (err) {
      console.error("[Offline Sync] Fallo catastrófico al intentar sincronizar un item:", err);
      pendingQueue.push(item); // Lo devolvemos a la cola para no perder datos
    }
  }

  // 4. Actualizamos el Storage: limpiamos los exitosos y dejamos los que fallaron
  guardarEnStorage(OFFLINE_QUEUE_KEY, pendingQueue);
  
  if (pendingQueue.length === 0) {
    console.log("[Offline Sync] ✨ Sincronización completada. La cola está vacía.");
  } else {
    console.warn(`[Offline Sync] ⚠️ Quedaron ${pendingQueue.length} operaciones pendientes (posible bloqueo RLS o red inestable).`);
  }
};