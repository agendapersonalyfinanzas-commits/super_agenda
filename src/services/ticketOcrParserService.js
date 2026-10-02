import { groupOcrWordsIntoLines } from './layoutService';

/**
 * Parser de Máxima Precisión para Tickets/Facturas Locales (Actualizado y Corregido)
 */
export function parseTicketData(ocrResult) {
  // 1. Reconstruir las líneas de texto según la geometría del ticket
  const lines = ocrResult.words ? groupOcrWordsIntoLines(ocrResult.words) : ocrResult.text.split('\n');

  let merchant = 'ESTABLECIMIENTO DESCONOCIDO';
  let date = null;
  let totalAmount = null;
  let taxAmount = null;
  const items = [];

  const currentYear = new Date().getFullYear(); // Año actual dinámico (ej. 2026)

  // Expresiones Regulares Clave
  const dateRegex = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/;
  const totalRegex = /\b(total|monto total|neto|pagar|gran total)\b/i;
  const taxRegex = /\b(iva|impuesto|16%|8%)\b/i;
  const priceRegex = /(\d+[.,]\d{2})\b/;

  // 2. Primera Pasada: Detectar Establecimiento (Generalmente en las primeras 3 líneas)
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const cleanLine = lines[i].trim().toUpperCase();
    if (cleanLine.length > 3 && !cleanLine.includes('TICKET') && !cleanLine.includes('BIENVENIDO')) {
      merchant = cleanLine;
      break;
    }
  }

  // 3. Procesar Línea por Línea
  lines.forEach((line) => {
    const lowerLine = line.toLowerCase().trim();

    // Extraer y Normalizar Fecha (con validación anti-futuro)
    if (!date) {
      const dateMatch = line.match(dateRegex);
      if (dateMatch) {
        let day = dateMatch[1].padStart(2, '0');
        let month = dateMatch[2].padStart(2, '0');
        let year = dateMatch[3];
        if (year.length === 2) year = '20' + year;

        let parsedYear = parseInt(year, 10);
        if (parsedYear > currentYear) {
          console.warn(`⚠️️ Alerta OCR (ticketData): Año futurista detectado (${parsedYear}). Ajustando al año actual.`);
          year = currentYear.toString();
        }

        if (parseInt(month) >= 1 && parseInt(month) <= 12 && parseInt(day) >= 1 && parseInt(day) <= 31) {
          date = `${year}-${month}-${day}`;
        }
      }
    }

    // Extraer Total
    if (totalRegex.test(lowerLine)) {
      const priceMatches = line.match(/([0-9,]+\.\d{2})/g);
      if (priceMatches && priceMatches.length > 0) {
        totalAmount = parseFloat(priceMatches[priceMatches.length - 1].replace(',', '.'));
      }
    }

    // Extraer IVA
    if (taxRegex.test(lowerLine)) {
      const priceMatch = line.match(priceRegex);
      if (priceMatch) {
        taxAmount = parseFloat(priceMatch[1].replace(',', '.'));
      }
    }

    // Extraer Ítems (Líneas con estructura: [Cantidad] [Nombre Producto] [Precio])
    const priceMatches = line.match(/([0-9,]+\.\d{2})/g);
    if (priceMatches && priceMatches.length > 0 && !totalRegex.test(lowerLine) && !taxRegex.test(lowerLine)) {
      const price = parseFloat(priceMatches[priceMatches.length - 1].replace(',', '.'));
      
      // Capturar correctamente cantidades con decimales (ej: 0.510, 1.000) o enteros
      const qtyMatch = line.match(/^(\d+\.\d{3}|\d+\.\d+|\d+)/);
      const quantity = qtyMatch ? parseFloat(qtyMatch[1]) : 1;

      // Limpiar el nombre del producto
      let productName = line;
      for (const p of priceMatches) {
        productName = productName.replace(p, '');
      }
      productName = productName
        .replace(/^\s*(\d+\.\d{3}|\d+\.\d+|\d+)\s*/, '')
        .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚÑñ\s]/g, '')
        .trim();

      if (productName.length > 2 && price > 0 && price < 1500) {
        items.push({
          name: productName.toUpperCase(),
          quantity: quantity,
          price: price,
          subtotal: Number((price * quantity).toFixed(2))
        });
      }
    }
  });

  return {
    merchant,
    date: date || new Date().toISOString().split('T')[0],
    amount: totalAmount || Number(items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)),
    tax: taxAmount || 0,
    items: items
  };
}