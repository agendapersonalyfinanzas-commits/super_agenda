// src/utils/offlineSync.js

import { supabase } from '../supabaseClient'; 
import { guardarEnStorage, obtenerDeStorage } from './storage';

const OFFLINE_QUEUE_KEY = 'family_offline_queue';

/**
 * Agrega una operación a la cola offline inyectando automáticamente los contextos RLS (user_id / auth_user_email).
 */
export const agregarAColaOffline = async (action, table, payload) => {
  try {
    const queue = obtenerDeStorage(OFFLINE_QUEUE_KEY, []);
    
    // Obtener sesión activa para cumplir estrictamente con las políticas RLS
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;

    let enrichedPayload = { ...payload };

    if (user) {
      if (table === 'transactions' && !enrichedPayload.auth_user_email) {
        enrichedPayload.auth_user_email = user.email;
      }
      if (['expenses', 'store_templates', 'agenda_events', 'savings_goals'].includes(table) && !enrichedPayload.user_id) {
        enrichedPayload.user_id = user.id;
      }
    }

    queue.push({
      id: crypto.randomUUID(),
      action,
      table,
      payload: enrichedPayload,
      timestamp: new Date().toISOString()
    });

    guardarEnStorage(OFFLINE_QUEUE_KEY, queue);
    console.log(`[Offline Sync] Operación ${action} en '${table}' encolada con contexto RLS.`);

    window.dispatchEvent(new CustomEvent('refresh-financial-data'));
  } catch (error) {
    console.error("[Offline Sync] Error al encolar operación offline:", error);
  }
};

/**
 * Sincroniza la cola pendiente con Supabase al recuperar la conexión.
 */
export const procesarColaOffline = async () => {
  if (!navigator.onLine) return;

  const queue = obtenerDeStorage(OFFLINE_QUEUE_KEY, []);
  if (queue.length === 0) return;

  console.log(`[Offline Sync] Sincronizando ${queue.length} operaciones pendientes con Supabase...`);
  
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
        console.error(`[Offline Sync] RLS rechazó el ${action} en '${table}':`, error.message);
        pendingQueue.push(item);
      } else {
        sincronizadosConExito++;
        console.log(`[Offline Sync] ✅ Sincronizado: ${action} en '${table}'`);
      }
    } catch (err) {
      pendingQueue.push(item);
    }
  }

  guardarEnStorage(OFFLINE_QUEUE_KEY, pendingQueue);
  
  if (sincronizadosConExito > 0) {
    window.dispatchEvent(new CustomEvent('refresh-financial-data'));
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => procesarColaOffline());
}