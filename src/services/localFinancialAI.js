// src/services/localFinancialAI.js
import { getLearnedMerchants } from './financialDB';

/**
 * Procesa un texto en lenguaje natural y extrae el comercio, categoría, 
 * total general e ítems desglosados con cantidad y precio unitario.
 * @param {string} inputText Texto proveniente del dictado por voz o entrada manual
 */
export const processVoiceExpense = (inputText) => {
  if (!inputText || !inputText.trim()) {
    throw new Error('No hay texto para procesar.');
  }

  const cleanText = inputText.trim();
  const lowerText = cleanText.toLowerCase();
  const learnedMerchants = getLearnedMerchants();

  // 1. Identificar Comercio y Categoría mediante la DB de aprendizaje local
  let concept = 'GASTO MANUAL';
  let category = 'OTROS';

  for (const [merchant, defaultCategory] of Object.entries(learnedMerchants)) {
    if (lowerText.includes(merchant.toLowerCase())) {
      concept = merchant;
      category = defaultCategory;
      break;
    }
  }

  // Si no se halló un comercio guardado, tomamos la primera palabra relevante
  if (concept === 'GASTO MANUAL') {
    const words = cleanText.split(' ').filter(w => w.length > 2);
    if (words.length > 0) {
      concept = words[0].toUpperCase();
    }
  }

  // 2. Fallback de Categorías por Palabras Clave
  if (category === 'OTROS') {
    if (/comida|tacos|café|pan|restaurante|cenar|desayuno|pizza|hamburguesa|muffin/i.test(lowerText)) {
      category = 'ALIMENTOS';
    } else if (/uber|didi|gasolina|pasaje|camión|estacionamiento|taxi|metro/i.test(lowerText)) {
      category = 'TRANSPORTE';
    } else if (/luz|agua|internet|teléfono|recibo|gas|renta/i.test(lowerText)) {
      category = 'SERVICIOS';
    } else if (/cine|película|spotify|netflix|juego|suscripción/i.test(lowerText)) {
      category = 'ENTRETENIMIENTO';
    } else if (/farmacia|medicina|doctor|hospital|pastillas|consulta/i.test(lowerText)) {
      category = 'SALUD';
    } else if (/super|mercado|despensa|verdura|fruta/i.test(lowerText)) {
      category = 'SUPERMERCADO';
    }
  }

  // 3. Extracción Avanzada de Ítems, Cantidades y Precios
  // Separar segmentos por comas, " y ", " con ", " más "
  const rawSegments = cleanText.split(/,|\s+y\s+|\s+con\s+|\s+más\s+/i);
  const items = [];
  let totalCalculated = 0;

  rawSegments.forEach(segment => {
    const segTrim = segment.trim();
    if (!segTrim) return;

    // Patrón 1: Cantidad + Producto + Precio (ej: "2 cafés de 35", "3 cocas a 20")
    const qtyPriceMatch = segTrim.match(/(\d+)\s+([a-záéíóúñ\s]+?)\s+(?:de|a|\$)\s*(\d+(?:\.\d{1,2})?)/i);
    
    // Patrón 2: Producto + Precio simple (ej: "café de 35", "pan 20")
    const simplePriceMatch = segTrim.match(/([a-záéíóúñ\s]+?)\s+(?:de|a|\$)?\s*(\d+(?:\.\d{1,2})?)/i);

    if (qtyPriceMatch) {
      const qty = parseInt(qtyPriceMatch[1], 10);
      const name = qtyPriceMatch[2].replace(/compré|gasté|un|una|el|la|de/gi, '').trim().toUpperCase();
      const unitPrice = parseFloat(qtyPriceMatch[3]);
      const subtotal = qty * unitPrice;

      items.push({
        name: `${qty}X ${name}`,
        price: subtotal,
        quantity: qty,
        unitPrice: unitPrice
      });
      totalCalculated += subtotal;

    } else if (simplePriceMatch && !/en el|en la|del/i.test(simplePriceMatch[1])) {
      const name = simplePriceMatch[1].replace(/compré|gasté|un|una|el|la|de/gi, '').trim().toUpperCase();
      const price = parseFloat(simplePriceMatch[2]);

      if (name.length > 0) {
        items.push({
          name: name,
          price: price,
          quantity: 1,
          unitPrice: price
        });
        totalCalculated += price;
      }
    }
  });

  // Si no se detectaron precios individuales en los ítems, buscar un monto global en la frase
  if (items.length === 0) {
    const globalNumber = cleanText.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
    const amount = globalNumber ? parseFloat(globalNumber[1]) : 0;

    items.push({
      name: cleanText.toUpperCase(),
      price: amount,
      quantity: 1,
      unitPrice: amount
    });
    totalCalculated = amount;
  }

  return {
    amount: totalCalculated,
    concept: concept,
    category: category,
    description: cleanText,
    items: items,
    timestamp: new Date().toISOString()
  };
};