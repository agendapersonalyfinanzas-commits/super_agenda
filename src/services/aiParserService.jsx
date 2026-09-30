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
 * 🚀 Preprocesamiento móvil ultraligero en Canvas para tickets térmicos
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
          const contrastFactor = 1.4;

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

      console.log('📄 TEXTO OCR SEMÁNTICO RECIBIDO:\n', text);

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
 * Parser con Motor Semántico Estable y Memoria Híbrida
 */
async function parseMexicanTicket(ocrText) {
  const lines = ocrText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let concept = 'CHEDRAUI';
  let totalAmount = 0;
  let category = 'SUPERMERCADO';
  const items = [];

  const STORE_DICTIONARY = [
    { pattern: /CHEDRAU/i, name: 'CHEDRAUI', cat: 'SUPERMERCADO' },
    { pattern: /SAMS\s*CLUB|SAM'S/i, name: 'SAM\'S CLUB', cat: 'SUPERMERCADO' },
    { pattern: /COSTCO/i, name: 'COSTCO WHOLESALE', cat: 'SUPERMERCADO' },
    { pattern: /WALMART/i, name: 'WALMART', cat: 'SUPERMERCADO' },
    { pattern: /BODEGA\s*AURRERA/i, name: 'BODEGA AURRERÁ', cat: 'SUPERMERCADO' },
    { pattern: /SORIANA/i, name: 'SORIANA', cat: 'SUPERMERCADO' },
    { pattern: /OXXO/i, name: 'OXXO', cat: 'ALIMENTOS' },
    { pattern: /FARMACIA|GUADALAJARA|SIMILARES|POZA\s*RICA/i, name: 'FARMACIA', cat: 'SALUD' }
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

  // 🧠 Memoria Híbrida
  let learnedTemplate = null;
  try {
    learnedTemplate = await obtenerPlantillaLocalYNube(concept);
    if (learnedTemplate && learnedTemplate.category) {
      category = learnedTemplate.category;
    }
  } catch (e) {}

  // 1. Detección de Fecha
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

  // 2. Extracción Semántica del Monto Total (Evita SUBTOTAL)
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

  const IGNORE_PATTERNS = /TIENDAS|OXXO|WALMART|BODEGA|OFFICE|PEMEX|SAMS|COSTCO|SORIANA|ARTELI|HOME|LIVERPOOL|S\.?A\.?|C\.?V\.?|R\.?F\.?C\.?|SUC|BLVD|AV\.|CANT|ARTICULO|PRECIC|SUBTOTAL|TOTAL|AFILIACION|TARJETA|CAMBIO|AUT#|PROSA|SALDO|REBAJADO|AHORRO|IVA|IEPS|ATENDIO|OPINION|REDONDEO|REGIMEN|AVISO|PAGO|EFECTIVO|MENSAJE|GRACIAS|TASA|IMPORTE|CLIENTE|CAJERO|CODIGO|DEVOLUCIONES|PREFERENCIA|DEBITO|ARQC|AID|DSC|DESCUENTO|FARMACIA|SALCHICHONERIA|LACTEOS|PANIFICADORA|ALIMENTOS|REFIGERADOS|EMPACADA|DEPARTAMENTO/i;

  let inItemsSection = true;

  // 3. Extracción Semántica Segura de Ítems
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
      const lineTotal = parseFloat(priceMatches[priceMatches.length - 1].replace(',', ''));

      let cleanedName = line;
      for (const p of priceMatches) {
        cleanedName = cleanedName.replace(p, '');
      }
      cleanedName = cleanedName.replace(/^\s*\d+[.,]\d+\s*/, '');
      cleanedName = cleanedName.replace(/\s+[A-Z]\s*$/, '');
      cleanedName = cleanedName.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

      if (cleanedName.length >= 3 && !IGNORE_PATTERNS.test(cleanedName) && lineTotal > 0 && lineTotal < 1500) {
        const upperName = cleanedName.toUpperCase();
        if (!items.some(item => item.name === upperName)) {
          items.push({
            name: upperName,
            price: lineTotal
          });
        }
      }
    }
  }

  return {
    concept: concept.toUpperCase(),
    amount: Number(totalAmount.toFixed(2)) || 0,
    category: category,
    description: `Ticket escaneado de ${concept}`,
    items: items,
    date: ticketDate || new Date().toISOString().split('T')[0],
    engine: 'MOBILE_SEMANTIC_STABLE_HYBRID'
  };
}

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