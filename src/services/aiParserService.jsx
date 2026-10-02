// src/services/aiParserService.jsx

import { createWorker } from 'tesseract.js';
import { obtenerPlantillaLocalYNube } from './templateService';
import { resolveCanonicalMerchant } from './diccionario';

// 🔄 Re-exportar para mantener compatibilidad con componentes que lo importen desde aquí
export { parseNaturalLanguageExpense } from './naturalLanguageParser';

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
 * 🚀 Preprocesamiento móvil profesional en Canvas (escala de grises y contraste para tickets térmicos)
 */
async function enhanceImageForMobile(fileOrBlob, maxWidth = 1200) {
  return new Promise((resolve) => {
    if (!(fileOrBlob instanceof File || fileOrBlob instanceof Blob)) {
      resolve(fileOrBlob);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        try {
          const imgData = ctx.getImageData(0, 0, width, height);
          const data = imgData.data;
          const contrastFactor = 1.3;

          for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            const contrasted = Math.min(255, Math.max(0, (gray - 128) * contrastFactor + 128));
            data[i]     = contrasted;
            data[i + 1] = contrasted;
            data[i + 2] = contrasted;
          }
          ctx.putImageData(imgData, 0, 0);
        } catch (canvasErr) {}

        canvas.toBlob((blob) => resolve(blob || fileOrBlob), 'image/jpeg', 0.9);
      };
      img.onerror = () => resolve(fileOrBlob);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(fileOrBlob);
    reader.readAsDataURL(fileOrBlob);
  });
}

export async function parseExpenseInput(inputData, onProgress) {
  try {
    if (inputData instanceof File || inputData instanceof Blob) {
      const processedImage = await enhanceImageForMobile(inputData);
      const worker = await initWorker(onProgress);
      if (!worker) throw new Error('No se pudo inicializar el motor OCR.');

      const imageUrl = URL.createObjectURL(processedImage);
      const { data: { text } } = await worker.recognize(imageUrl);
      URL.revokeObjectURL(imageUrl);

      console.log('📄 TEXTO OCR RECIBIDO:\n', text);

      if (text && text.trim().length > 0) {
        return await parseMexicanTicket(text);
      }
    } else if (typeof inputData === 'string') {
      const { parseNaturalLanguageExpense } = await import('./naturalLanguageParser');
      return parseNaturalLanguageExpense(inputData);
    }
  } catch (err) {
    console.warn('⚠ Error in parseExpenseInput:', err);
  }

  return {
    concept: 'COMPRA GENERAL',
    amount: 0.00,
    category: 'OTROS',
    description: 'Ticket escaneado (Modo manual)',
    items: [],
    date: new Date().toISOString().split('T')[0],
    engine: 'FALLBACK'
  };
}

/**
 * Parser Maestro Estructural para Tickets en México (Afinado v9: Aislamiento estricto de cantidad y precios)
 */
async function parseMexicanTicket(ocrText) {
  const lines = ocrText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rawHeader = lines.slice(0, 8).join(' ').toUpperCase();

  let concept = 'ESTABLECIMIENTO DESCONOCIDO';
  let category = 'SUPERMERCADO';

  if (/CHEDRAU|CHEDR/i.test(rawHeader)) {
    concept = 'CHEDRAUI';
    category = 'SUPERMERCADO';
  } else if (/WALMART|BODEGA/i.test(rawHeader)) {
    concept = 'WALMART';
    category = 'SUPERMERCADO';
  } else if (/OXXO/i.test(rawHeader)) {
    concept = 'OXXO';
    category = 'ALIMENTOS';
  } else if (/SORIANA/i.test(rawHeader)) {
    concept = 'SORIANA';
    category = 'SUPERMERCADO';
  } else {
    const canonicalResult = resolveCanonicalMerchant(rawHeader);
    concept = canonicalResult.name;
    category = canonicalResult.category;
  }

  let totalAmount = 0;
  const items = [];

  try {
    const savedTemplate = await obtenerPlantillaLocalYNube(concept);
    if (savedTemplate && savedTemplate.category) {
      category = savedTemplate.category;
    }
  } catch (e) {}

  let ticketDate = null;
  const currentYear = new Date().getFullYear();
  const MONTH_MAP = {
    'ENE': '01', 'FEB': '02', 'MAR': '03', 'ABR': '04', 'MAY': '05', 'JUN': '06',
    'JUL': '07', 'AGO': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DIC': '12',
    'JAN': '01', 'APR': '04', 'AUG': '08', 'DEC': '12'
  };

  for (const line of lines) {
    const dateMatch = line.match(/(\d{1,2})\s*[\/\-\.]\s*([A-Z]{3,4}\.?|\d{1,2})\s*[\/\-\.]?\s*(\d{2,4})/i);
    if (dateMatch) {
      let day = dateMatch[1].padStart(2, '0');
      let monthRaw = dateMatch[2].toUpperCase().replace(/\./g, '');
      let year = dateMatch[3];
      if (year.length === 2) year = '20' + year;

      let parsedYear = parseInt(year, 10);
      if (parsedYear > currentYear) {
        year = currentYear.toString();
      }

      let month = MONTH_MAP[monthRaw] || monthRaw.padStart(2, '0');
      if (parseInt(month) >= 1 && parseInt(month) <= 12 && parseInt(day) >= 1 && parseInt(day) <= 31) {
        ticketDate = `${year}-${month}-${day}`;
        break;
      }
    }
  }

  for (const line of lines) {
    if (/TOTAL/i.test(line) && !/SUBTOTAL/i.test(line)) {
      const matches = line.match(/([0-9]{1,4}[.,]\d{2})/g);
      if (matches && matches.length > 0) {
        const val = parseFloat(matches[matches.length - 1].replace(',', ''));
        if (val > 0 && val < 50000) {
          totalAmount = val;
          break;
        }
      }
    }
  }

  const IGNORE_PATTERNS = /TIENDAS|OXXO|WALMART|BODEGA|OFFICE|PEMEX|SAMS|COSTCO|SORIANA|ARTELI|HOME|LIVERPOOL|S\.?A\.?|C\.?V\.?|R\.?F\.?C\.?|SUC|BLVD|AV\.|CANT|ARTICULO|PRECIC|SUBTOTAL|TOTAL|AFILIACION|TARJETA|CAMBIO|AUT#|PROSA|SALDO|REBAJADO|AHORRO|IVA|IEPS|ATENDIO|OPINION|REDONDEO|REGIMEN|AVISO|PAGO|EFECTIVO|MENSAJE|GRACIAS|TASA|IMPORTE|CLIENTE|CAJERO|CODIGO|DEVOLUCIONES|PREFERENCIA|DEBITO|ARQC|AID|DSC|DESCUENTO|FARMACIA|SALCHICHONERIA|LACTEOS|PANIFICADORA|ALIMENTOS|REFIGERADOS|EMPACADA|DEPARTAMENTO|TUXPAN/i;

  let inItemsSection = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/SUBTOTAL|TOTAL\s*[\$M]|EFECTIVO|TARJ\.?|CAMBIO|IVA\s+\d|IEPS|FORMA\s*DE\s*PAGO|DEBITO/i.test(line)) {
      inItemsSection = false;
    }
    if (!inItemsSection) continue;

    if (line.endsWith('-') || /dsc|descuento|ahorro|%/.test(line) || /^\d{8,14}$/.test(line)) {
      continue;
    }

    // 1. EXTRAER CANTIDAD AL INICIO DEL RENGLÓN (Ej: 1.000, 0.270, 2)
    const qtyMatch = line.match(/^([0-9]+[.,]\d{1,3}|[0-9]+)\s+/);
    const quantity = qtyMatch ? parseFloat(qtyMatch[1].replace(',', '.')) : 1;

    // 2. AISLAR EL RESTO DEL TEXTO (QUITANDO LA CANTIDAD PARA QUE SUS DECIMALES NO INTERFIERAN)
    const textWithoutQty = qtyMatch ? line.substring(qtyMatch[0].length) : line;

    // 3. BUSCAR PRECIOS EXCLUSIVAMENTE EN EL TEXTO RESTANTE
    const priceMatches = textWithoutQty.match(/([0-9]{1,4}[.,]\d{2})/g);

    if (priceMatches && priceMatches.length > 0) {
      // El precio final es estrictamente el último valor de la derecha
      const lineTotal = parseFloat(priceMatches[priceMatches.length - 1].replace(',', ''));

      let cleanedName = textWithoutQty;
      // Remover todos los precios detectados
      for (const p of priceMatches) {
        cleanedName = cleanedName.replace(p, '');
      }
      // Remover letra de impuesto al final (ej. A, B)
      cleanedName = cleanedName.replace(/\s+[A-Z]\s*$/, '');
      // Limpiar caracteres especiales y espacios múltiples
      cleanedName = cleanedName.replace(/[^a-zA-ZáéíóúÁÉÍÓÚÑñ0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

      if (cleanedName.length >= 3 && !IGNORE_PATTERNS.test(cleanedName) && lineTotal > 0 && lineTotal < 1500) {
        const upperName = cleanedName.toUpperCase();
        if (!items.some(item => item.name === upperName)) {
          items.push({
            name: upperName,
            quantity: quantity,
            price: lineTotal
          });
        }
      }
    }
  }

  // Respaldo de Monto Total si no se detectó correctamente
  const calculatedSum = Number(items.reduce((sum, item) => sum + item.price, 0).toFixed(2));
  if (totalAmount === 0 || (totalAmount > 5000 && calculatedSum > 0 && calculatedSum < 2000)) {
    totalAmount = calculatedSum;
  }

  return {
    concept: concept.toUpperCase(),
    amount: Number(totalAmount.toFixed(2)) || 0,
    category: category,
    description: `Ticket escaneado de ${concept}`,
    items: items,
    date: ticketDate || new Date().toISOString().split('T')[0],
    engine: 'MOBILE_EXPERT_CHEDRAUI_V9_ISOLATED'
  };
}