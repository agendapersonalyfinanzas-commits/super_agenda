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
      // Importación dinámica local o usando la función re-exportada
      const { parseNaturalLanguageExpense } = await import('./naturalLanguageParser');
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
    date: new Date().toISOString().split('T')[0],
    engine: 'FALLBACK'
  };
}

/**
 * Parser Maestro Estructural para Tickets en México (Con Prioridad de Marca y Anti-Ubicación)
 */
async function parseMexicanTicket(ocrText) {
  const lines = ocrText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rawHeader = lines.slice(0, 8).join(' ').toUpperCase();

  let concept = 'ESTABLECIMIENTO DESCONOCIDO';
  let category = 'SUPERMERCADO';

  // REGLA DE PRIORIDAD: Forzar marcas principales detectadas en el encabezado para evitar confusiones con ubicaciones
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
  const currentYear = new Date().getFullYear(); // Año actual dinámico (ej. 2026)
  const MONTH_MAP = {
    'ENE': '01', 'FEB': '02', 'MAR': '03', 'ABR': '04', 'MAY': '05', 'JUN': '06',
    'JUL': '07', 'AGO': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DIC': '12',
    'JAN': '01', 'APR': '04', 'AUG': '08', 'DEC': '12'
  };

  // Validación de Fecha Lógica (Anti-Futuro)
  for (const line of lines) {
    const dateMatch = line.match(/(\d{1,2})\s*[\/\-\.]\s*([A-Z]{3,4}\.?|\d{1,2})\s*[\/\-\.]?\s*(\d{2,4})/i);
    if (dateMatch) {
      let day = dateMatch[1].padStart(2, '0');
      let monthRaw = dateMatch[2].toUpperCase().replace(/\./g, '');
      let year = dateMatch[3];
      if (year.length === 2) year = '20' + year;

      let parsedYear = parseInt(year, 10);
      if (parsedYear > currentYear) {
        console.warn(`⚠️ Alerta OCR: Año futurista detectado (${parsedYear}). Ajustando al año actual.`);
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
      const matches = line.match(/([0-9,]+\.\d{2})/g);
      if (matches && matches.length > 0) {
        const val = parseFloat(matches[matches.length - 1].replace(',', ''));
        if (val > 0) {
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

    const priceMatches = line.match(/([0-9,]+\.\d{2})/g);

    if (priceMatches && priceMatches.length > 0) {
      // REGLA DE ORO: El precio total de la línea es estrictamente la ÚLTIMA cifra monetaria de la extrema derecha
      const lineTotal = parseFloat(priceMatches[priceMatches.length - 1].replace(',', ''));

      // Captura limpia de la cantidad o peso al inicio (ej: 0.445, 1.000, 2)
      const qtyMatch = line.match(/^([0-9]+[.,][0-9]+|[0-9]+)\s+/);
      const quantity = qtyMatch ? parseFloat(qtyMatch[1].replace(',', '.')) : 1;

      let cleanedName = line;
      // Remover todos los bloques de precios del texto de la línea
      for (const p of priceMatches) {
        cleanedName = cleanedName.replace(p, '');
      }
      // Remover el bloque numérico de cantidad inicial para que no deje basura
      if (qtyMatch) {
        cleanedName = cleanedName.replace(qtyMatch[0], '');
      }
      // Remover únicamente la letra de control de impuestos del final (ej: " A" o " B")
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

  if (totalAmount === 0 && items.length > 0) {
    totalAmount = items.reduce((sum, item) => sum + item.price, 0);
  }

  return {
    concept: concept.toUpperCase(),
    amount: Number(totalAmount.toFixed(2)) || 0,
    category: category,
    description: `Ticket escaneado de ${concept}`,
    items: items,
    date: ticketDate || new Date().toISOString().split('T')[0],
    engine: 'MOBILE_EXPERT_CHEDRAUI_MERCHANT_FIX_V7'
  };
}