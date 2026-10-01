// src/services/naturalLanguageParser.js

import { resolveCanonicalMerchant } from './diccionario';
import { obtenerPlantillaLocalYNube } from './templateService';

const REGEX_PATTERNS = {
  TOTAL_EXPLICIT: /(?:TOTAL|GASTÉ|GASTE|FUE|FUERON|PAGUÉ|PAGUE|COSTÓ|COSTO|SON)\s*(?:DE)?\s*(?:\$)?(\d+(?:[\.,]\d{1,2})?)/gi,
  NUMBERS_EXTRACTION: /(\d+(?:[\.,]\d{1,2})?)/g,
  CLEAN_FILLER: /\b(?:COMPRÉ\s+EN|COMPRE\s+EN|COMPRÉ|COMPRE|FUI\s+A|GASTÉ\s+EN|GASTE\s+EN|EN\s+EL|EN\s+LA|EN\s+LOS|EN\s+LAS|EN|DE|DEL)\b/gi,
  // 🛡️ Filtro ampliado para eliminar artículos y preposiciones dentro del texto de ítems
  ITEM_NOISE: /\b(?:\$|monto|pesos|pesotes|varos|lukas|lucas|de|a|por|en|el|la|los|las|un|una|unos|unas|c\/u|cada|pesitos|y|o)\b/gi
};

// 🚫 Palabras prohibidas que NUNCA deben considerarse nombres de productos válidos
const STOP_WORDS = new Set([
  'EL', 'LA', 'LOS', 'LAS', 'UN', 'UNA', 'UNOS', 'UNAS', 
  'Y', 'O', 'DE', 'DEL', 'EN', 'A', 'POR', 'CON', 'ES', 'FUE'
]);

const CATEGORY_TAXONOMY = {
  'COMPRAS': {
    weight: 3,
    keywords: [
      'ROPA', 'ZAPATOS', 'TENIS', 'CAMISA', 'PLAYERA', 'PANTALON', 'JEANS', 'VESTIDO', 
      'SUDADERA', 'CHAMARRA', 'ABRIGO', 'ELECTRONICA', 'CELULAR', 'AUDIFONOS', 'BOCINA', 
      'LAPTOP', 'TABLET', 'REGALO', 'LIBRO', 'PERFUME', 'MAQUILLAJE', 'BOLSA', 'CARTERA', 
      'LIVERPOOL', 'PALACIO DE HIERRO', 'SUBURBIA', 'SEARS', 'COPPEL', 'ELEKTRA', 'OFFICE DEPOT', 
      'OFFICEMAX', 'AMAZON', 'MERCADOLIBRE'
    ]
  },
  'ALIMENTOS': {
    weight: 2,
    keywords: [
      'TACOS', 'PIZZA', 'BURGER', 'HAMBURGUESA', 'COMIDA', 'CENA', 'DESAYUNO', 
      'CAFÉ', 'CAFE', 'PAN', 'LECHE', 'AGUA', 'REFRESCO', 'CARNE', 'VERDURA', 
      'FRUTA', 'POLLO', 'TORTILLAS', 'RESTAURANTE', 'BAR', 'CERVEZA', 'SUPER', 
      'SUPERMERCADO', 'CHEDRAUI', 'WALMART', 'SORIANA', 'OXXO', '7-ELEVEN', 'HEB', 'LA COMER', 'CIGARROS', 'CIGARRO', 'KIT KAT', 'CHOCOLATE'
    ]
  },
  'TRANSPORTE': {
    weight: 2,
    keywords: [
      'GASOLINA', 'GAS', 'UBER', 'DIDIS', 'DIDI', 'TAXI', 'CAMION', 'AUTOBUS', 
      'METRO', 'ESTACIONAMIENTO', 'PEAJE', 'TAG', 'PEMEX', 'MOBIL', 'BP', 'SHELL', 'REPSOL'
    ]
  },
  'SALUD': {
    weight: 3,
    keywords: [
      'MEDICINA', 'FARMACIA', 'DOCTOR', 'MEDICO', 'HOSPITAL', 'CLINICA', 
      'CONSULTA', 'ANALISIS', 'DENTISTA', 'PASTILLAS', 'VITAMINAS', 
      'FARMACIAS GUADALAJARA', 'FARMACIAS DEL AHORRO', 'DR SIMI', 'BENAVIDES'
    ]
  },
  'ENTRETENIMIENTO': {
    weight: 2,
    keywords: [
      'CINE', 'PELICULA', 'BOLETO', 'CONCIERTO', 'VIDEOJUEGO', 'NETFLIX', 
      'SPOTIFY', 'DISNEY', 'CINEPOLIS', 'CINEMEX'
    ]
  },
  'SERVICIOS': {
    weight: 3,
    keywords: [
      'LUZ', 'AGUA', 'INTERNET', 'TELEFONO', 'CEL', 'RECARGA', 
      'CFE', 'TELMEX', 'TOTALPLAY', 'IZZI', 'MEGACABLE'
    ]
  }
};

function parseRelativeDate(textInput) {
  const upper = textInput.toUpperCase();
  const date = new Date();
  if (/\bAYER\b/.test(upper)) date.setDate(date.getDate() - 1);
  else if (/\bANTIER\b/.test(upper)) date.setDate(date.getDate() - 2);
  else if (/\bHACE\s+UNA\s+SEMANA\b/.test(upper)) date.setDate(date.getDate() - 7);
  return date.toISOString().split('T')[0];
}

function extractPaymentMethod(textInput) {
  const upper = textInput.toUpperCase();
  if (/\b(EFECTIVO|CASH|MONEDAS)\b/.test(upper)) return 'EFECTIVO';
  if (/\b(TARJETA|TC|TD|TDC|DEBITO|CREDITO|PLASTICO|BBVA|BANAMEX)\b/.test(upper)) return 'TARJETA';
  if (/\b(TRANSFERENCIA|SPEI|TRANSF)\b/.test(upper)) return 'TRANSFERENCIA';
  return 'NO_ESPECIFICADO';
}

function inferCategoryAdvanced(text) {
  const upper = text.toUpperCase();
  let bestCategory = 'OTROS';
  let maxScore = 0;

  for (const [category, data] of Object.entries(CATEGORY_TAXONOMY)) {
    let currentScore = 0;
    for (const kw of data.keywords) {
      if (new RegExp(`\\b${kw}\\b`, 'i').test(upper)) {
        currentScore += data.weight;
      }
    }
    if (currentScore > maxScore) {
      maxScore = currentScore;
      bestCategory = category;
    }
  }
  return bestCategory;
}

/**
 * 🚀 Parser Maestro (Senior Master Architecture V11 - Con Blindaje Antirruido y StopWords)
 */
export async function parseNaturalLanguageExpense(textInput) {
  if (!textInput || typeof textInput !== 'string') {
    throw new Error('[SeniorMasterParser] El input debe ser un string válido.');
  }

  const startTime = performance.now();

  try {
    const cleanInput = textInput.trim();
    const upperInput = cleanInput.toUpperCase();

    // 1. Resolución Canónica de Comercio y Categoría Base
    const canonicalResult = resolveCanonicalMerchant(upperInput);
    let concept = canonicalResult.name !== 'COMPRA GENERAL' ? canonicalResult.name : '';
    let category = canonicalResult.category;

    if (category === 'OTROS') {
      category = inferCategoryAdvanced(upperInput);
    }

    // Consulta de Memoria de Aprendizaje (store_templates)
    if (concept) {
      const savedTemplate = await obtenerPlantillaLocalYNube(concept);
      if (savedTemplate && savedTemplate.category) {
        category = savedTemplate.category;
      }
    }

    // 2. Aislamiento de texto para ítems
    let textForItems = upperInput;
    if (canonicalResult.name !== 'COMPRA GENERAL') {
      textForItems = textForItems.replace(new RegExp(canonicalResult.name, 'gi'), '');
    }
    textForItems = textForItems.replace(REGEX_PATTERNS.CLEAN_FILLER, '').trim();

    const items = [];
    let explicitTotal = 0;

    // 3. Extracción de Total Explícito
    REGEX_PATTERNS.TOTAL_EXPLICIT.lastIndex = 0;
    let matchTotal;
    while ((matchTotal = REGEX_PATTERNS.TOTAL_EXPLICIT.exec(upperInput)) !== null) {
      const val = parseFloat(matchTotal[1].replace(',', '.'));
      if (val > explicitTotal) explicitTotal = val;
    }

    // 4. Escáner Secuencial con soporte decimal y validación de StopWords
    const normalizedTextForScan = textForItems.replace(/[,;]/g, ' ');
    const itemPattern = /(?:(\d+(?:[\.,]\d+)?)\s+)?([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+?)\s+(\d+(?:[\.,]\d{1,2})?)/g;
    let matchItem;

    while ((matchItem = itemPattern.exec(normalizedTextForScan)) !== null) {
      const rawQty = matchItem[1];
      const rawName = matchItem[2];
      const rawPrice = matchItem[3];

      let quantity = rawQty ? parseFloat(rawQty.replace(',', '.')) : 1;
      let linePrice = parseFloat(rawPrice.replace(',', '.'));

      let itemName = rawName
        .replace(REGEX_PATTERNS.ITEM_NOISE, '')
        .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const upperItemName = itemName.toUpperCase();

      // 🛡️ REGLA BLINDADA: Evitar que artículos sueltos o stop words pasen como productos válidos
      const isValidItemName = upperItemName.length >= 2 && !STOP_WORDS.has(upperItemName);

      if (isValidItemName && linePrice > 0 && linePrice < 50000) {
        if (!items.some(i => i.name === upperItemName) && upperItemName !== canonicalResult.name) {
          items.push({
            name: upperItemName,
            quantity: quantity,
            price: Number(linePrice.toFixed(2))
          });
        }
      }
    }

    // 5. Consolidación de Montos
    let calculatedTotal = items.reduce((sum, item) => sum + item.price, 0);
    let finalAmount = 0;

    if (explicitTotal > 0 && (items.length === 0 || explicitTotal >= calculatedTotal)) {
      finalAmount = explicitTotal;
    } else if (calculatedTotal > 0) {
      finalAmount = calculatedTotal;
    } else {
      const fallbackNumbers = upperInput.match(REGEX_PATTERNS.NUMBERS_EXTRACTION);
      if (fallbackNumbers && fallbackNumbers.length > 0) {
        finalAmount = parseFloat(fallbackNumbers[fallbackNumbers.length - 1].replace(',', '.'));
      }
    }

    if (!concept) {
      concept = items.length > 0 ? items[0].name : 'GASTO GENERAL';
    }

    // 6. Cálculo de Confianza Algorítmica
    let confidence = 0.6;
    if (finalAmount > 0) confidence += 0.2;
    if (category !== 'OTROS') confidence += 0.1;
    if (items.length > 0) confidence += 0.1;

    const executionTime = Number((performance.now() - startTime).toFixed(2));

    return {
      concept: concept.toUpperCase(),
      amount: Number(finalAmount.toFixed(2)) || 0,
      category: category,
      description: cleanInput,
      items: items,
      date: parseRelativeDate(cleanInput),
      paymentMethod: extractPaymentMethod(cleanInput),
      confidence: Number(confidence.toFixed(2)),
      engine: 'SENIOR_MASTER_RETAIL_ENGINE_V11',
      telemetry: {
        executionTimeMs: executionTime,
        itemsDetectedCount: items.length
      }
    };

  } catch (error) {
    console.error('❌ [SeniorMasterParser] Error crítico de procesamiento:', error);
    return {
      concept: 'GASTO MANUAL',
      amount: 0.00,
      category: 'OTROS',
      description: textInput,
      items: [],
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'NO_ESPECIFICADO',
      confidence: 0.1,
      engine: 'FALLBACK_EMERGENCY_RECOVERY',
      telemetry: { error: error.message }
    };
  }
}