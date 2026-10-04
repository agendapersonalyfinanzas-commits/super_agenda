// src/services/ocrSmartMatcher.js
import { supabase } from '../supabaseClient';

/**
 * Calcula la similitud basada en intersección de palabras (Token Similarity)
 */
function calculateTokenSimilarity(str1, str2) {
  const s1 = String(str1 || '').toLowerCase().trim();
  const s2 = String(str2 || '').toLowerCase().trim();
  if (s1 === s2) return 1.0;
  
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));
  
  let intersection = 0;
  for (const w of words1) {
    if (words2.has(w)) intersection++;
  }
  const union = new Set([...words1, ...words2]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Busca en el historial de precios el producto más parecido al texto crudo del OCR
 */
export async function smartMatchScannedItem(rawName, storeName, userId) {
  if (!rawName || !userId) return { name: rawName, price: null, matched: false };
  
  try {
    const cleanStore = storeName ? String(storeName).toUpperCase() : '';

    // Consultar el historial de precios del usuario (filtrado opcionalmente por comercio)
    let query = supabase
      .from('price_history')
      .select('product_name, price')
      .eq('user_id', userId);

    if (cleanStore) {
      query = query.eq('store_name', cleanStore);
    }

    const { data: history, error } = await query;

    if (error || !history || history.length === 0) {
      return { name: rawName, price: null, matched: false };
    }

    // Agrupar productos históricos para promediar precios y evitar duplicados
    const productMap = {};
    history.forEach(h => {
      const prod = h.product_name;
      if (!productMap[prod]) {
        productMap[prod] = { prices: [] };
      }
      productMap[prod].prices.push(Number(h.price) || 0);
    });

    let bestMatchName = rawName;
    let bestPrice = null;
    let highestScore = 0;

    for (const [historicalName, info] of Object.entries(productMap)) {
      const score = calculateTokenSimilarity(rawName, historicalName);
      if (score > highestScore) {
        highestScore = score;
        bestMatchName = historicalName;
        // Calcular el precio promedio histórico de ese producto
        bestPrice = info.prices.reduce((a, b) => a + b, 0) / info.prices.length;
      }
    }

    // Umbral de coincidencia del 40% o superior para aplicar autocorrección
    if (highestScore >= 0.4) {
      return {
        name: bestMatchName, // Nombre canónico limpio
        price: Number(bestPrice.toFixed(2)),
        matched: true,
        score: highestScore
      };
    }

    return { name: rawName, price: null, matched: false };

  } catch (err) {
    console.warn('⚠️ Error en smartMatchScannedItem:', err.message);
    return { name: rawName, price: null, matched: false };
  }
}

/**
 * Procesa un arreglo completo de ítems escaneados por OCR aplicando la inteligencia histórica
 */
export async function enhanceScannedItemsWithMemory(items = [], storeName, userId) {
  if (!items || items.length === 0 || !userId) return items;

  const enhancedItems = [];
  for (const item of items) {
    const rawName = item.name || 'PRODUCTO';
    const matchResult = await smartMatchScannedItem(rawName, storeName, userId);

    const finalPrice = matchResult.matched && matchResult.price ? matchResult.price : (Number(item.price) || 0);
    const qty = Number(item.quantity) || 1;

    enhancedItems.push({
      ...item,
      name: matchResult.matched ? matchResult.name : String(rawName).toUpperCase(),
      price: finalPrice,
      subtotal: Number((qty * finalPrice).toFixed(2)),
      is_auto_corrected: matchResult.matched // Bandera visual opcional para saber si la app lo adivinó
    });
  }

  return enhancedItems;
}