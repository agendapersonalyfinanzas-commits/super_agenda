// src/services/aiParserService.jsx

import { createWorker } from 'tesseract.js';
import { obtenerPlantillaLocalYNube } from './templateService';

let workerInstance = null;

/**
 * 🏢 Diccionario Canónico Masivo para México (Supermercados, Gasolineras, Comida Rápida, Tiendas y Servicios)
 */
const CANONICAL_MERCHANTS = [
  // --- SUPERMERCADOS Y CLUBES DE PRECIOS ---
  {
    canonical: 'CHEDRAUI',
    category: 'SUPERMERCADO',
    aliases: ['CHEDRAUI', 'CHEDRAHUI', 'CHEDRAUT', 'CHEDRAU', 'TIENDAS CHEDRAUI', 'SUPER CHE']
  },
  {
    canonical: 'WALMART',
    category: 'SUPERMERCADO',
    aliases: ['WALMART', 'WAL MART', 'BODEGA AURRERA', 'AURRERA', 'EXPRESS AURRERA', 'SUPERAMA']
  },
  {
    canonical: 'SORIANA',
    category: 'SUPERMERCADO',
    aliases: ['SORIANA', 'HIPER SORIANA', 'SORIANA HIERRO', 'SORIANA EXPRESS', 'SUPER CITY', 'CITY CLUB']
  },
  {
    canonical: 'SAM\'S CLUB',
    category: 'SUPERMERCADO',
    aliases: ['SAMS CLUB', 'SAM\'S CLUB', 'SAMS', 'SAM', 'CLUB SAMS']
  },
  {
    canonical: 'COSTCO',
    category: 'SUPERMERCADO',
    aliases: ['COSTCO', 'COSTCO WHOLESALE']
  },

  // --- SALUD Y FARMACIAS ---
  {
    canonical: 'FARMACIAS GUADALAJARA',
    category: 'SALUD',
    aliases: ['FARMACIAS GUADALAJARA', 'FARMACIA GUADALAJARA', 'FARMACIAS GDL']
  },
  {
    canonical: 'FARMACIAS DEL AHORRO',
    category: 'SALUD',
    aliases: ['FARMACIAS DEL AHORRO', 'FARMACIA DEL AHORRO', 'DEL AHORRO']
  },
  {
    canonical: 'FARMACIAS SIMILARES',
    category: 'SALUD',
    aliases: ['FARMACIAS SIMILARES', 'FARMACIA SIMILARES', 'DR SIMI', 'FARMACIAS DE LOS SIMILARES']
  },
  {
    canonical: 'FARMACIAS BENAVIDES',
    category: 'SALUD',
    aliases: ['FARMACIAS BENAVIDES', 'FARMACIA BENAVIDES']
  },

  // --- TRANSPORTE Y GASOLINERAS ---
  {
    canonical: 'PEMEX',
    category: 'TRANSPORTE',
    aliases: ['PEMEX', 'PETROLEOS MEXICANOS', 'GASOLINERA PEMEX']
  },
  {
    canonical: 'REPSOL',
    category: 'TRANSPORTE',
    aliases: ['REPSOL', 'GASOLINERA REPSOL']
  },
  {
    canonical: 'MOBIL',
    category: 'TRANSPORTE',
    aliases: ['MOBIL', 'GASOLINERA MOBIL', 'EXXONMOBIL']
  },
  {
    canonical: 'G500',
    category: 'TRANSPORTE',
    aliases: ['G500', 'GRUPO G500', 'GASOLINERA G500']
  },
  {
    canonical: 'BP',
    category: 'TRANSPORTE',
    aliases: ['BP', 'GASOLINERA BP']
  },
  {
    canonical: 'SHELL',
    category: 'TRANSPORTE',
    aliases: ['SHELL', 'GASOLINERA SHELL']
  },

  // --- TIENDAS DE CONVENIENCIA Y CAFETERÍAS ---
  {
    canonical: 'OXXO',
    category: 'ALIMENTOS',
    aliases: ['OXXO', 'CADENA COMERCIAL OXXO']
  },
  {
    canonical: '7-ELEVEN',
    category: 'ALIMENTOS',
    aliases: ['7-ELEVEN', 'SEVEN ELEVEN', '7 ELEVEN']
  },
  {
    canonical: 'LA PARROQUIA',
    category: 'ALIMENTOS',
    aliases: ['LA PARROQUIA', 'CAFE LA PARROQUIA', 'GRAN CAFE DE LA PARROQUIA']
  },
  {
    canonical: 'CAFÉ ANDRADE',
    category: 'ALIMENTOS',
    aliases: ['CAFE ANDRADE', 'CAFÉ ANDRADE', 'CAFFENIO']
  },
  {
    canonical: 'STARBUCKS',
    category: 'ALIMENTOS',
    aliases: ['STARBUCKS', 'STARBUCKS COFFEE']
  },

  // --- RESTAURANTES Y COMIDA RÁPIDA ---
  {
    canonical: 'SANBORNS',
    category: 'ALIMENTOS',
    aliases: ['SANBORNS', 'SAMBORNS', 'CAFE SANBORNS']
  },
  {
    canonical: 'SUSHI GO',
    category: 'ALIMENTOS',
    aliases: ['SUSHI GO', 'SUSHIITO', 'SUSHI ROLL']
  },
  {
    canonical: 'MCDONALD\'S',
    category: 'ALIMENTOS',
    aliases: ['MCDONALDS', 'MCDONALD\'S', 'MACDONALDS']
  },
  {
    canonical: 'BURGER KING',
    category: 'ALIMENTOS',
    aliases: ['BURGER KING', 'BK']
  },
  {
    canonical: 'SUBWAY',
    category: 'ALIMENTOS',
    aliases: ['SUBWAY']
  },
  {
    canonical: 'PIZZA HUT',
    category: 'ALIMENTOS',
    aliases: ['PIZZA HUT']
  },
  {
    canonical: 'DOMINO\'S PIZZA',
    category: 'ALIMENTOS',
    aliases: ['DOMINOS PIZZA', 'DOMINO\'S', 'DOMINOS']
  },
  {
    canonical: 'CARL\'S JR',
    category: 'ALIMENTOS',
    aliases: ['CARLS JR', 'CARL\'S JR', 'CARLS']
  },
  {
    canonical: 'LITTLE CAESARS',
    category: 'ALIMENTOS',
    aliases: ['LITTLE CAESARS', 'LITTLE CAESAR\'S', 'LITTLECAESARS']
  },
  {
    canonical: 'PAPA JOHN\'S',
    category: 'ALIMENTOS',
    aliases: ['PAPA JOHNS', 'PAPA JOHN\'S']
  },

  // --- ENTRETENIMIENTO ---
  {
    canonical: 'CINÉPOLIS',
    category: 'ENTRETENIMIENTO',
    aliases: ['CINEPOLIS', 'CINÉPOLIS', 'CINEMAS CINEPOLIS']
  },
  {
    canonical: 'CINEMEX',
    category: 'ENTRETENIMIENTO',
    aliases: ['CINEMEX']
  },

  // --- TIENDAS DEPARTAMENTALES Y COMPRAS ---
  {
    canonical: 'LIVERPOOL',
    category: 'COMPRAS',
    aliases: ['LIVERPOOL', 'EL PUERTO DE LIVERPOOL', 'FABRICAS DE FRANCIA']
  },
  {
    canonical: 'SUBURBIA',
    category: 'COMPRAS',
    aliases: ['SUBURBIA']
  },
  {
    canonical: 'SEARS',
    category: 'COMPRAS',
    aliases: ['SEARS']
  },
  {
    canonical: 'OFFICE DEPOT',
    category: 'COMPRAS',
    aliases: ['OFFICE DEPOT', 'OFFICEDEPOT']
  },

  // --- SERVICIOS BÁSICOS ---
  {
    canonical: 'CFE',
    category: 'SERVICIOS',
    aliases: ['CFE', 'COMISION FEDERAL DE ELECTRICIDAD', 'CFE SUMINISTRO BASICO']
  },
  {
    canonical: 'TELMEX',
    category: 'SERVICIOS',
    aliases: ['TELMEX', 'TELEFONOS DE MEXICO', 'INFONET']
  }
];

function resolveCanonicalMerchant(rawOcrText) {
  if (!rawOcrText) return { name: 'COMPRA GENERAL', category: 'OTROS' };
  const upperText = rawOcrText.toUpperCase();

  for (const merchant of CANONICAL_MERCHANTS) {
    for (const alias of merchant.aliases) {
      if (upperText.includes(alias)) {
        return { name: merchant.canonical, category: merchant.category };
      }
    }
  }

  let cleanName = upperText.split(',')[0].replace(/S\.?A\.? DE C\.?V\.?|R\.?F\.?C\.?/g, '').trim();
  if (cleanName.length > 30) cleanName = cleanName.substring(0, 30);

  return { name: cleanName || 'COMPRA GENERAL', category: 'OTROS' };
}

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
 * Parser Maestro Estructural para Tickets en México
 */
async function parseMexicanTicket(ocrText) {
  const lines = ocrText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Resolver comercio y categoría canónica a partir de las primeras líneas del ticket
  const rawHeader = lines.slice(0, 5).join(' ');
  const canonicalResult = resolveCanonicalMerchant(rawHeader);

  let concept = canonicalResult.name;
  let category = canonicalResult.category;
  let totalAmount = 0;
  const items = [];

  // Memoria Híbrida
  try {
    const savedTemplate = await obtenerPlantillaLocalYNube(concept);
    if (savedTemplate && savedTemplate.category) {
      category = savedTemplate.category;
    }
  } catch (e) {}

  // 1. Extracción de Fecha
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

  // 2. Extracción del Monto Total (Búsqueda estricta en línea TOTAL, ignorando SUBTOTAL)
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

  // 3. Extracción Estructural Segura de Ítems
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
    engine: 'MOBILE_EXPERT_MEGA_CANONICAL_V4'
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