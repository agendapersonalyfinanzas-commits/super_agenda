// src/services/templateService.js

import { supabase } from '../supabaseClient';
import { agregarAColaOffline } from '../utils/offlineSync';

const LOCAL_CACHE_KEY = 'app_store_templates_cache';

/**
 * Consulta si existe una plantilla aprendida para un comercio (Offline-first)
 */
export async function obtenerPlantillaLocalYNube(storeName) {
  if (!storeName) return null;
  const normalizedStore = storeName.toUpperCase().trim();

  // 1. Buscar primero en caché local (Velocidad instantánea y sin conexión)
  try {
    const localCache = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '{}');
    if (localCache[normalizedStore]) {
      return localCache[normalizedStore];
    }
  } catch (e) {
    console.warn('Error leyendo caché local de plantillas:', e);
  }

  // 2. Si hay red, consultar en Supabase
  if (navigator.onLine) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data, error } = await supabase
          .from('store_templates')
          .select('template_rules')
          .eq('store_name', normalizedStore)
          .maybeSingle(); // 👈 CAMBIO CLAVE: .maybeSingle() evita el error 406 si la tienda no existe

        if (data && !error && data.template_rules) {
          // Guardar en caché local para futuros escaneos offline
          const localCache = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '{}');
          localCache[normalizedStore] = data.template_rules;
          localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(localCache));

          return data.template_rules;
        }
      }
    } catch (err) {
      console.warn('No se pudo conectar a Supabase para recuperar plantilla:', err);
    }
  }

  return null;
}

/**
 * Guarda o actualiza una plantilla aprendida (Enseña al sistema tras corrección manual)
 */
export async function guardarYCrearPlantilla(storeName, rules) {
  if (!storeName) return;
  const normalizedStore = storeName.toUpperCase().trim();

  // 1. Guardar en caché local inmediatamente
  try {
    const localCache = JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || '{}');
    localCache[normalizedStore] = rules;
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(localCache));
  } catch (e) {
    console.warn('Error guardando en caché local:', e);
  }

  // 2. Sincronizar con Supabase respetando tus políticas RLS
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      auth_user_email: user.email,
      store_name: normalizedStore,
      template_rules: rules,
      updated_at: new Date().toISOString()
    };

    if (!navigator.onLine) {
      await agregarAColaOffline('UPSERT', 'store_templates', payload);
      return;
    }

    const { error } = await supabase
      .from('store_templates')
      .upsert(payload, { onConflict: 'user_id, store_name' });

    if (error) throw error;
    console.log(`🧠 Plantilla de '${normalizedStore}' sincronizada con éxito en Supabase.`);
  } catch (err) {
    console.error('Error al sincronizar plantilla en Supabase:', err);
  }
}