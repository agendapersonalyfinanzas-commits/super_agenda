// src/services/localAiEngine.js

import { createWorker } from 'tesseract.js';

let workerInstance = null;

/**
 * Inicializa el trabajador local de Tesseract.js en español.
 */
export async function initLocalEngine(onProgress) {
  if (workerInstance) return true;

  try {
    if (onProgress) onProgress({ status: 'loading_model', progress: 25 });
    workerInstance = await createWorker('spa');
    if (onProgress) onProgress({ status: 'ready', progress: 100 });
    return true;
  } catch (error) {
    console.warn('⚠️ No se pudo inicializar Tesseract OCR:', error.message);
    workerInstance = null;
    return false;
  }
}

/**
 * Procesa la imagen del ticket mediante OCR local en la PWA.
 */
export async function processTicketImageWithQwen(imageFile) {
  try {
    const imageUrl = URL.createObjectURL(imageFile);

    if (!workerInstance) {
      workerInstance = await createWorker('spa');
    }

    const { data: { text } } = await workerInstance.recognize(imageUrl);
    URL.revokeObjectURL(imageUrl);

    if (text && text.trim().length > 0) {
      console.log('📄 Texto bruto detectado por OCR:\n', text);
      return parseTicketTextToItems(text, imageFile.name);
    }
  } catch (err) {
    console.error('Error durante el escaneo OCR:', err);
  }

  return parseTicketTextToItems('', imageFile.name);
}

/**
 * Parsea el texto del ticket con lógica heurística para supermercados locales.
 */
function parseTicketTextToItems(ocrText, fileName = '') {
  const lines = ocrText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let concept = 'CHEDRAUI';
  let totalAmount = 0;
  const items = [];

  // 1. Diccionario prioritario de comercios locales
  const KNOWN_STORES = [
    { pattern: /CHEDRAU/i, name: 'CHEDRAUI' },
    { pattern: /WALMART/i, name: 'WALMART' },
    { pattern: /OXXO/i, name: 'OXXO' },
    { pattern: /SORIANA/i, name: 'SORIANA' },
    { pattern: /BODEGA/i, name: 'BODEGA AURRERA' },
    { pattern: /COSTCO/i, name: 'COSTCO' },
    { pattern: /SAMS/i, name: 'SAMS CLUB' },
    { pattern: /PEMEX/i, name: 'PEMEX' },
    { pattern: /FARMACIA/i, name: 'FARMACIA' },
    { pattern: /7\s*ELEVEN|SEVEN/i, name: '7-ELEVEN' }
  ];

  for (const line of lines) {
    for (const store of KNOWN_STORES) {
      if (store.pattern.test(line)) {
        concept = store.name;
        break;
      }
    }
  }

  // 2. Extracción del Total Final Real (Búsqueda de TOTAL M.N. o DEBITO PROSA)
  for (const line of lines) {
    const cleanLine = line.replace(/,/g, '.');
    const totalMatch = cleanLine.match(/(?:TOTAL\s*M\.?N\.?|DEBITO(?:\s*PROSA)?|TOTAL\s*A\s*PAGAR|TOTAL)\s*[:\$]?\s*(\d+[\.\s]?\d{2})/i);
    if (totalMatch) {
      const parsed = parseFloat(totalMatch[1].replace(/\s/g, ''));
      if (parsed > 0) {
        totalAmount = parsed;
        break;
      }
    }
  }

  // Fallback a SUBTOTAL si no halló el Total M.N.
  if (totalAmount === 0) {
    for (const line of lines) {
      const cleanLine = line.replace(/,/g, '.');
      const subMatch = cleanLine.match(/SUBTOTAL\s*[:\$]?\s*(\d+[\.\s]?\d{2})/i);
      if (subMatch) {
        const parsed = parseFloat(subMatch[1].replace(/\s/g, ''));
        if (parsed > 0) {
          totalAmount = parsed;
          break;
        }
      }
    }
  }

  // 3. Extraer productos limpios
  const IGNORE_PATTERNS = /TIENDAS|CHEDRAUI|S\s*A\s*DE\s*C\s*V|BLVD|C\.P\.|RFC|CANT|ARTICULO|PRECIC|SUBTOTAL|TOTAL|AFILIACION|TARJETA|CAMBIO|AUT#|PROSA|SALDO|REBAJADO|AHORRO|TRESCIENTOS|DOSCIENTOS|IVA|IEPS|ATENDIO|OPINION|REDONDEO|REGIMEN|AVISO/i;

  let inItemsSection = true;

  for (const line of lines) {
    if (/SUBTOTAL|TOTAL\s*M\.?N|DEBITO\s*PROSA|AFILIACION/i.test(line)) {
      inItemsSection = false;
    }

    if (!inItemsSection) continue;

    // Descartar líneas de promociones o descuentos
    if (line.includes('-') || /%\s*-/.test(line)) continue;

    // Limpiar sufijos fiscales de Chedraui (ej: "40.00 A", "32.00 K")
    const cleanLine = line.replace(/\s+[A-Z]$/i, '').trim();

    // Capturar precio al final del renglón
    const priceMatch = cleanLine.match(/(\d+[.,]\d{2})$/);

    if (priceMatch) {
      const price = parseFloat(priceMatch[1].replace(',', '.'));

      let rawName = cleanLine
        .replace(/(\d+[.,]\d{2})$/, '')
        .replace(/^\d+[.,]\d+\s*/, '')
        .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '')
        .trim();

      if (
        rawName.length >= 3 &&
        price > 0 &&
        !IGNORE_PATTERNS.test(rawName)
      ) {
        items.push({
          name: rawName.toUpperCase(),
          price: price
        });
      }
    }
  }

  // Si no halló el total explícito, sumar ítems
  if (totalAmount === 0 && items.length > 0) {
    totalAmount = items.reduce((sum, item) => sum + item.price, 0);
  }

  return {
    concept: concept.toUpperCase(),
    amount: Number(totalAmount.toFixed(2)),
    category: 'SUPERMERCADO',
    description: `Ticket escaneado de ${concept}`,
    items: items
  };
}

/**
 * Entrada por lenguaje natural (texto)
 */
export async function processTextWithQwen(textInput) {
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