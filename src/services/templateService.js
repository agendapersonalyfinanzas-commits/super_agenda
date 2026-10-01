// src/services/templateService.js

import { supabase } from '../supabaseClient';
import { guardarEnStorage, obtenerDeStorage } from '../utils/storage.js';

const TEMPLATES_CACHE_KEY = 'family_store_templates_cache';

/**
 * Guarda o actualiza una plantilla para que el sistema aprenda automáticamente de las correcciones.
 */
export async function guardarPlantillaLocalYNube(templateData) {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return;

    const payload = {
      user_id: user.id,
      concept: templateData.concept.toUpperCase(),
      category: templateData.category.toUpperCase(),
      items_count: templateData.itemsCount || 0,
      updated_at: new Date().toISOString()
    };

    // 1. Guardar en caché local (Offline-First)
    const localTemplates = obtenerDeStorage(TEMPLATES_CACHE_KEY, []);
    const existingIndex = localTemplates.findIndex(t => t.concept === payload.concept);
    if (existingIndex >= 0) {
      localTemplates[existingIndex] = payload;
    } else {
      localTemplates.push(payload);
    }
    guardarEnStorage(TEMPLATES_CACHE_KEY, localTemplates);

    // 2. Persistir en la tabla 'store_templates' de Supabase
    if (navigator.onLine) {
      const { error } = await supabase
        .from('store_templates')
        .upsert(payload, { onConflict: 'user_id, concept' });

      if (error) {
        console.warn('[Template Service] Error al guardar plantilla en la nube:', error.message);
      }
    }
  } catch (err) {
    console.error('[Template Service] Error en ciclo de aprendizaje:', err);
  }
}

// 🔗 Alias de compatibilidad para que OCRScanner.jsx y otros componentes lo reconozcan
export const guardarYCrearPlantilla = guardarPlantillaLocalYNube;

/**
 * Consulta la memoria de aprendizaje para acelerar la categorización de conceptos conocidos.
 */
export async function obtenerPlantillaLocalYNube(conceptName) {
  if (!conceptName) return null;
  const upperConcept = conceptName.toUpperCase();

  const localTemplates = obtenerDeStorage(TEMPLATES_CACHE_KEY, []);
  const foundLocal = localTemplates.find(t => t.concept === upperConcept);
  if (foundLocal) return foundLocal;

  if (navigator.onLine) {
    try {
      const { data, error } = await supabase
        .from('store_templates')
        .select('*')
        .eq('concept', upperConcept)
        .maybeSingle();

      if (!error && data) return data;
    } catch (err) {
      console.error('[Template Service] Error obteniendo plantilla:', err);
    }
  }

  return null;
}