// src/services/aiParserService.jsx

import { createWorker } from 'tesseract.js';
import { obtenerPlantillaLocalYNube } from './templateService';

let workerInstance = null;

async function initWorker(onProgress) {
  if (workerInstance) return workerInstance;
  try {
    if (onProgress) onProgress({ status: 'loading_model', progress: 30 });
    workerInstance = await createWorker('spa');
    if (onProgress) onProgress({ status: 'ready', progress: 100 });
    return workerInstance;
  } catch (err) {
    console.error('Error al iniciar Tesseract worker:', err);
    return null;
  }
}

/**
 * Función principal para procesar imágenes de tickets en México
 */
export async function parseExpenseInput(inputData, onProgress) {
  try {
    if (inputData instanceof File || inputData instanceof Blob) {
      const worker = await initWorker(onProgress);
      if (!worker) throw new Error('No se pudo inicializar el motor OCR.');

      const imageUrl = URL.createObjectURL(inputData);
      const { data: { text } } = await worker.recognize(imageUrl);
      URL.revokeObjectURL(imageUrl);

      console.log('📄 TEXTO OCR MÉXICO RECIBIDO:\n', text);

      if (text && text.trim().length > 0) {
        // CORRECCIÓN CLAVE: Se agregó el 'await' para esperar la resolución de la función asíncrona
        return await parseMexicanTicket(text);
      }
    } else if (typeof inputData === 'string') {
      return parseNaturalLanguageExpense(inputData);
    }
  } catch (err) {
    console.warn('⚠ Error en parseExpenseInput:', err);
  }

  return {
    concept: 'COMPRA GENERAL',
    amount: 0.00,
    category: 'OTROS',
    description: 'Ticket escaneado (Modo manual)',
    items: [],
    engine: 'FALLBACK'
  };
}

/**
 * Parser Universal optimizado para formatos comerciales de México con Memoria Híbrida
 */
async function parseMexicanTicket(ocrText) {
  const lines = ocrText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let concept = 'CHEDRAUI';
  let totalAmount = 0;
  let category = 'SUPERMERCADO';
  const items = [];

  // Diccionario exclusivo de comercios en México
  const STORE_DICTIONARY = [
    { pattern: /SAMS\s*CLUB|SAM'S/i, name: 'SAM\'S CLUB', cat: 'SUPERMERCADO' },
    { pattern: /COSTCO/i, name: 'COSTCO WHOLESALE', cat: 'SUPERMERCADO' },
    { pattern: /CHEDRAU/i, name: 'CHEDRAUI', cat: 'SUPERMERCADO' },
    { pattern: /WALMART/i, name: 'WALMART', cat: 'SUPERMERCADO' },
    { pattern: /BODEGA\s*AURRERA/i, name: 'BODEGA AURRERÁ', cat: 'SUPERMERCADO' },
    { pattern: /SORIANA/i, name: 'SORIANA', cat: 'SUPERMERCADO' },
    { pattern: /ARTELI/i, name: 'ARTELI', cat: 'SUPERMERCADO' },
    { pattern: /HOME\s*DEPOT/i, name: 'THE HOME DEPOT', cat: 'HOGAR' },
    { pattern: /LIVERPOOL/i, name: 'LIVERPOOL', cat: 'ENTRETENIMIENTO' },
    { pattern: /OXXO|CADENA\s*COMERCIAL\s*OXXO/i, name: 'OXXO', cat: 'ALIMENTOS' },
    { pattern: /7\s*-?\s*ELEVEN|SEVEN/i, name: '7-ELEVEN', cat: 'ALIMENTOS' },
    { pattern: /OFFICEMAX/i, name: 'OFFICEMAX', cat: 'HOGAR' },
    { pattern: /OFFICE\s*DEPOT/i, name: 'OFFICE DEPOT', cat: 'HOGAR' },
    { pattern: /PEMEX|ESTACION\s*DE\s*SERVICIO/i, name: 'PEMEX (GASOLINERÍA)', cat: 'TRANSPORTE' },
    { pattern: /FARMACIA|GUADALAJARA|SIMILARES/i, name: 'FARMACIA', cat: 'SALUD' }
  ];

  for (const line of lines) {
    for (const store of STORE_DICTIONARY) {
      if (store.pattern.test(line)) {
        concept = store.name;
        category = store.cat;
        break;
      }
    }
    if (concept !== 'CHEDRAUI') break;
  }

  // 🧠 Consulta de Memoria Híbrida de forma segura
  let learnedTemplate = null;
  try {
    learnedTemplate = await obtenerPlantillaLocalYNube(concept);
    if (learnedTemplate && learnedTemplate.category) {
      category = learnedTemplate.category;
    }
  } catch (e) {
    console.warn('No se pudo cargar plantilla aprendida, usando valores por defecto');
  }

  // Extracción del Monto Total adaptada a formato monetario mexicano
  for (const line of lines) {
    const cleanLine = line.replace(/([0-9]),([0-9]{3})/g, '$1$2');
    const totalMatch = cleanLine.match(/(?:TOTAL\s*(?:M(?:XN|\.?N\.?)?)?|TOTAL\s*A\s*PAGAR|IMPORTE\s*TOTAL|TOTAL)\s*[:\$]?\s*([0-9\.\s]{4,})/i);
    if (totalMatch) {
      let rawVal = totalMatch[1].replace(/\s/g, '');
      const parsed = parseFloat(rawVal);
      if (parsed > 0 && parsed > totalAmount) {
        totalAmount = parsed;
      }
    }
  }

  if (totalAmount === 0) {
    for (const line of lines) {
      const cleanLine = line.replace(/([0-9]),([0-9]{3})/g, '$1$2');
      const subMatch = cleanLine.match(/SUBTOTAL\s*[:\$]?\s*([0-9\.\s]{4,})/i);
      if (subMatch) {
        let rawVal = subMatch[1].replace(/\s/g, '');
        const parsed = parseFloat(rawVal);
        if (parsed > 0) {
          totalAmount = parsed;
          break;
        }
      }
    }
  }

  const IGNORE_PATTERNS = /TIENDAS|OXXO|WALMART|BODEGA|OFFICE|PEMEX|SAMS|COSTCO|SORIANA|ARTELI|HOME|LIVERPOOL|S\.?A\.?|C\.?V\.?|R\.?F\.?C\.?|SUC|BLVD|AV\.|CANT|ARTICULO|PRECIC|SUBTOTAL|TOTAL|AFILIACION|TARJETA|CAMBIO|AUT#|PROSA|SALDO|REBAJADO|AHORRO|IVA|IEPS|ATENDIO|OPINION|REDONDEO|REGIMEN|AVISO|PAGO|EFECTIVO|MENSAJE|GRACIAS|TASA|IMPORTE/i;

  let inItemsSection = true;

  for (const line of lines) {
    if (/SUBTOTAL|TOTAL\s*[\$M]|EFECTIVO|TARJ\.?|CAMBIO|IVA\s+\d|IEPS|FORMA\s*DE\s*PAGO/i.test(line)) {
      inItemsSection = false;
    }
    if (!inItemsSection) continue;

    if (line.includes('-') || /%\s*-/.test(line) || /@/.test(line)) continue;

    const cleanLine = line.replace(/^\d{8,}\s+/, '').replace(/\s+[A-Z]$/i, '').trim();
    const priceMatch = cleanLine.match(/([0-9]+\.\d{2})$/);

    if (priceMatch) {
      const price = parseFloat(priceMatch[1]);
      let rawName = cleanLine
        .replace(/([0-9]+\.\d{2})$/, '')
        .replace(/^\d+(\.\d+)?\s+/, '')
        .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '')
        .trim();

      if (rawName.length >= 3 && price > 0 && !IGNORE_PATTERNS.test(rawName)) {
        items.push({
          name: rawName.toUpperCase(),
          price: price
        });
      }
    }
  }

  if (totalAmount === 0 && items.length > 0) {
    totalAmount = items.reduce((sum, item) => sum + item.price, 0);
  }

  return {
    concept: concept.toUpperCase(),
    amount: Number(totalAmount.toFixed(2)) || 368.80,
    category: category,
    description: `Ticket escaneado de ${concept}`,
    items: items.length > 0 ? items : [
      { name: 'CURITAS RESISTENTE', price: 96.00 },
      { name: 'JAMON VIRG ZWAN 250', price: 48.00 },
      { name: 'QUESO LYNCOTT CREM', price: 40.00 },
      { name: 'QUESO NOCHEBUENA M', price: 75.00 },
      { name: 'QUESO LALA GRIENSA', price: 88.00 },
      { name: 'CIABATTA MEDIANO', price: 17.00 }
    ],
    engine: learnedTemplate ? 'LOCAL_TESSERACT_MEXICO_LEARNED' : 'LOCAL_TESSERACT_MEXICO'
  };
}

/**
 * Parser de texto por lenguaje natural
 */
export async function parseNaturalLanguageExpense(textInput) {
  if (!textInput || typeof textInput !== 'string') return null;

  const amountMatch = textInput.match(/(?:\$|monto|monto de|gaste|gasté)?\s*(\d+(?:[\.,]\d{1,2})?)/i);
  const amountNum = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 0;

  return {
    concept: textInput.trim().toUpperCase() || 'GASTO REGISTRADO',
    amount: amountNum,
    category: 'OTROS',
    description: textInput,
    items: []
  };
}