// src/utils/offlineSync.js

import { supabase } from '../supabaseClient'; 
import { guardarEnStorage, obtenerDeStorage } from './storage';

// Clave exclusiva para la cola de tareas sin internet
const OFFLINE_QUEUE_KEY = 'family_offline_queue';

/**
 * Agrega una operación a la cola cuando no hay internet.
 * @param {string} action - 'INSERT', 'UPDATE', o 'DELETE'
 * @param {string} table - Nombre de la tabla en Supabase (ej. 'agenda_events', 'transactions')
 * @param {object} payload - Los datos completos (deben incluir auth_user_email para RLS)
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

    // Notificamos opcionalmente a la UI local para que pinte el cambio en estado "pendiente"
    window.dispatchEvent(new CustomEvent('refresh-financial-data'));
  } catch (error) {
    console.error("[Offline Sync] Error al encolar operación offline:", error);
  }
};

/**
 * Intenta enviar a Supabase todas las operaciones guardadas en la cola.
 * Se ejecuta automáticamente cuando regresa el internet.
 */
export const procesarColaOffline = async () => {
  if (!navigator.onLine) return;

  const queue = obtenerDeStorage(OFFLINE_QUEUE_KEY, []);
  if (queue.length === 0) return; // No hay nada pendiente

  console.log(`[Offline Sync] Regresó la conexión. Procesando ${queue.length} operaciones pendientes...`);
  
  const pendingQueue = [];
  let sincronizadosConExito = 0;

  for (const item of queue) {
    try {
      const { action, table, payload } = item;
      let error = null;

      if (action === 'INSERT') {
        const { error: insertError } = await supabase.from(table).insert([payload]);
        error = insertError;
      } 
      else if (action === 'UPDATE') {
        const { id, ...updateData } = payload;
        const { error: updateError } = await supabase.from(table).update(updateData).eq('id', id);
        error = updateError;
      } 
      else if (action === 'DELETE') {
        const { error: deleteError } = await supabase.from(table).delete().eq('id', payload.id);
        error = deleteError;
      }

      if (error) {
        console.error(`[Offline Sync] Supabase rechazó el ${action} en '${table}':`, error.message);
        pendingQueue.push(item);
      } else {
        sincronizadosConExito++;
        console.log(`[Offline Sync] ✅ Éxito subiendo a la nube: ${action} en '${table}'`);
      }
    } catch (err) {
      console.error("[Offline Sync] Fallo al intentar sincronizar item:", err);
      pendingQueue.push(item);
    }
  }

  // Actualizar Storage con los pendientes
  guardarEnStorage(OFFLINE_QUEUE_KEY, pendingQueue);
  
  if (sincronizadosConExito > 0) {
    console.log(`[Offline Sync] ✨ Se sincronizaron ${sincronizadosConExito} registros con Supabase.`);
    // 🌟 REQUISITO CLAVE: Forzar a las vistas a pedir los datos limpios a la BD
    window.dispatchEvent(new CustomEvent('refresh-financial-data'));
  }

  if (pendingQueue.length > 0) {
    console.warn(`[Offline Sync] ⚠️️ Quedaron ${pendingQueue.length} operaciones pendientes.`);
  }
};

// 🌟 Escuchador automático: Cuando el navegador detecta conexión, procesa la cola
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    procesarColaOffline();
  });
}