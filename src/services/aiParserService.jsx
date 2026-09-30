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
 * 🚀 Comprime y redimensiona imágenes gigantes de cámaras móviles para evitar
 * saturación de memoria (OOM) o timeouts en Tesseract.
 */
async function resizeImageIfNeeded(fileOrBlob, maxWidth = 1200, quality = 0.8) {
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
        canvas.toBlob(
          (blob) => {
            resolve(blob || fileOrBlob);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(fileOrBlob);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(fileOrBlob);
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Función principal para procesar imágenes de tickets en México
 */
export async function parseExpenseInput(inputData, onProgress) {
  try {
    if (inputData instanceof File || inputData instanceof Blob) {
      const optimizedImage = await resizeImageIfNeeded(inputData);

      const worker = await initWorker(onProgress);
      if (!worker) throw new Error('No se pudo inicializar el motor OCR.');

      const imageUrl = URL.createObjectURL(optimizedImage);
      const { data: { text } } = await worker.recognize(imageUrl);
      URL.revokeObjectURL(imageUrl);

      console.log('📄 TEXTO OCR MÉXICO RECIBIDO:\n', text);

      if (text && text.trim().length > 0) {
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
    date: new Date().toISOString().split('T')[0],
    engine: 'FALLBACK'
  };
}

/**
 * Parser Universal optimizado para formatos comerciales de México (incluyendo Chedraui)
 */
async function parseMexicanTicket(ocrText) {
  const lines = ocrText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let concept = 'COMPRA GENERAL';
  let totalAmount = 0;
  let category = 'OTROS';
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
    { pattern: /FARMACIA|FARMACIAS|GUADALAJARA|SIMILARES/i, name: 'FARMACIA', cat: 'SALUD' }
  ];

  // 1. Extracción del nombre raíz
  for (const line of lines) {
    for (const store of STORE_DICTIONARY) {
      if (store.pattern.test(line)) {
        let cleanMerchantName = line.includes(',') ? line.split(',')[0].trim() : line;
        concept = (cleanMerchantName.length >= 3 && cleanMerchantName.length <= 45) ? cleanMerchantName.toUpperCase() : store.name;
        category = store.cat;
        break;
      }
    }
    if (concept !== 'COMPRA GENERAL') break;
  }

  // 2. Extracción de Fecha
  let ticketDate = null;
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

      let month = MONTH_MAP[monthRaw] || monthRaw.padStart(2, '0');
      if (parseInt(month) >= 1 && parseInt(month) <= 12 && parseInt(day) >= 1 && parseInt(day) <= 31) {
        ticketDate = `${year}-${month}-${day}`;
        break;
      }
    }
  }

  // Memoria Híbrida
  let learnedTemplate = null;
  try {
    learnedTemplate = await obtenerPlantillaLocalYNube(concept);
    if (learnedTemplate && learnedTemplate.category) {
      category = learnedTemplate.category;
    }
  } catch (e) {
    console.warn('No se pudo cargar plantilla aprendida');
  }

  // 3. Extracción del Monto Total (Soporta formatos como TOTAL M.N.$ 368.80)
  for (const line of lines) {
    const cleanLine = line.replace(/([0-9]),([0-9]{3})/g, '$1$2');
    const totalMatch = cleanLine.match(/(?:TOTAL\s*M\.?N\.?|TOTAL\s*A\s*PAGAR|IMPORTE\s*TOTAL|TOTAL)\s*[:\$]?\s*([0-9\.\s,]{4,})/i);
    if (totalMatch) {
      let rawVal = totalMatch[1].replace(/[\s\$]/g, '');
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

  const IGNORE_PATTERNS = /TIENDAS|OXXO|WALMART|BODEGA|OFFICE|PEMEX|SAMS|COSTCO|SORIANA|ARTELI|HOME|LIVERPOOL|S\.?A\.?|C\.?V\.?|R\.?F\.?C\.?|SUC|BLVD|AV\.|CANT|ARTICULO|PRECIC|SUBTOTAL|TOTAL|AFILIACION|TARJETA|CAMBIO|AUT#|PROSA|SALDO|REBAJADO|AHORRO|IVA|IEPS|ATENDIO|OPINION|REDONDEO|REGIMEN|AVISO|PAGO|EFECTIVO|MENSAJE|GRACIAS|TASA|IMPORTE|CLIENTE|CAJERO|CODIGO|DEVOLUCIONES|PREFERENCIA|DEBITO|ARQC|AID|DSC|DESCUENTO|FARMACIA|SALCHICHONERIA|LACTEOS|PANIFICADORA/i;

  let inItemsSection = true;

  // 4. Extracción robusta adaptada a Chedraui (doble precio y exclusión de descuentos)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/SUBTOTAL|TOTAL\s*[\$M]|EFECTIVO|TARJ\.?|CAMBIO|IVA\s+\d|IEPS|FORMA\s*DE\s*PAGO|DEBITO/i.test(line)) {
      inItemsSection = false;
    }
    if (!inItemsSection) continue;

    // Ignorar líneas de descuento (que terminan en '-' o contienen 'dsc')
    if (line.endsWith('-') || /dsc|descuento|ahorro/i.test(line)) {
      continue;
    }

    // Patrón específico para supermercados con doble precio (ej: 1.000 Curitas 96.00 96.00 B o 4.000 Cuerno 8.00 32.00 K)
    const fullItemMatch = line.match(/^\s*(\d+[.,]\d+)?\s+(.+?)\s+([0-9,]+\.\d{2})\s+([0-9,]+\.\d{2})\s*[A-Z]?\s*$/);

    if (fullItemMatch) {
      let rawName = fullItemMatch[2].replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
      let lineTotal = parseFloat(fullItemMatch[4].replace(',', ''));

      if (rawName.length >= 3 && !IGNORE_PATTERNS.test(rawName) && lineTotal > 0) {
        const upperName = rawName.toUpperCase();
        if (!items.some(item => item.name === upperName)) {
          items.push({
            name: upperName,
            price: lineTotal
          });
        }
      }
    } else {
      // Fallback para líneas sencillas
      const priceMatch = line.match(/([0-9]+\.\d{2})$/);
      if (priceMatch && !line.endsWith('-')) {
        const price = parseFloat(priceMatch[1]);
        let currentClean = line
          .replace(/([0-9]+\.\d{2})$/, '')
          .replace(/^\d+(\.\d+)?\s+/, '')
          .replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (currentClean.length >= 3 && !IGNORE_PATTERNS.test(currentClean) && price > 0) {
          const upperName = currentClean.toUpperCase();
          if (!items.some(item => item.name === upperName)) {
            items.push({
              name: upperName,
              price: price
            });
          }
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
    date: new Date().toISOString().split('T')[0],
    items: []
  };
}