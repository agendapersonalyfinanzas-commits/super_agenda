// src/services/priceRadarService.js
import { supabase } from '../supabaseClient';

/**
 * Analiza y actualiza los precios de los ítems detectados en Supabase
 * @param {Array} items - Lista de productos/ítems detectados por la IA
 * @param {string} storeName - Nombre del comercio o concepto principal
 */
export async function analyzeAndUpdatePrices(items = [], storeName = 'GENERAL') {
  if (!items || items.length === 0) return [];

  const alerts = [];

  for (const item of items) {
    try {
      // 1. Consultar el precio histórico anterior en la base de datos
      const { data: previousRecords, error: fetchError } = await supabase
        .from('price_radar_history')
        .select('*')
        .ilike('item_name', item.name)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!fetchError && previousRecords && previousRecords.length > 0) {
        const lastRecord = previousRecords[0];
        const oldPrice = lastRecord.price;
        const currentPrice = item.price;

        if (oldPrice > 0 && currentPrice > 0) {
          const diffPercent = ((currentPrice - oldPrice) / oldPrice) * 100;
          if (Math.abs(diffPercent) >= 5) { // Alerta si hay un cambio mayor o igual al 5%
            alerts.push({
              item_name: item.name,
              old_price: oldPrice,
              new_price: currentPrice,
              difference_percentage: diffPercent.toFixed(1)
            });
          }
        }
      }

      // 2. Guardar el nuevo registro de precio en Supabase
      await supabase.from('price_radar_history').insert([
        {
          item_name: item.name.toUpperCase(),
          price: item.price,
          store: storeName.toUpperCase(),
          quantity: item.quantity || 1,
          created_at: new Date().toISOString()
        }
      ]);
    } catch (err) {
      console.error('Error al procesar el radar de precios para el ítem:', item.name, err);
    }
  }

  return alerts;
}