import { groupOcrWordsIntoLines } from './layoutService';

/**
 * Parser de Máxima Precisión para Tickets/Facturas Locales
 */
export function parseTicketData(ocrResult) {
  // 1. Reconstruir las líneas de texto según la geometría del ticket
  const lines = ocrResult.words ? groupOcrWordsIntoLines(ocrResult.words) : ocrResult.text.split('\n');

  let merchant = 'ESTABLECIMIENTO DESCONOCIDO';
  let date = null;
  let totalAmount = null;
  let taxAmount = null;
  const items = [];

  // Expresiones Regulares Clave
  const dateRegex = /\b(\d{2}[/-]\d{2}[/-]\d{2,4})\b/;
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

    // Extraer Fecha
    if (!date) {
      const dateMatch = line.match(dateRegex);
      if (dateMatch) date = dateMatch[1];
    }

    // Extraer Total
    if (totalRegex.test(lowerLine)) {
      const priceMatch = line.match(priceRegex);
      if (priceMatch) {
        totalAmount = parseFloat(priceMatch[1].replace(',', '.'));
      }
    }

    // Extraer IVA
    if (taxRegex.test(lowerLine)) {
      const taxMatch = line.match(priceRegex);
      if (taxMatch) {
        taxAmount = parseFloat(taxMatch[1].replace(',', '.'));
      }
    }

    // Extraer Ítems (Líneas con estructura: [Cantidad] [Nombre Producto] [Precio])
    const itemPriceMatch = line.match(/(\d+[.,]\d{2})/);
    if (itemPriceMatch && !totalRegex.test(lowerLine) && !taxRegex.test(lowerLine)) {
      const price = parseFloat(itemPriceMatch[1].replace(',', '.'));
      
      // Intentar extraer la cantidad inicial (ej: "2 COCA COLA 50.00")
      const qtyMatch = line.match(/^(\d+)\s+/);
      const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

      // Limpiar el nombre del producto
      const productName = line
        .replace(/^(\d+)\s+/, '')
        .replace(/(\d+[.,]\d{2})/, '')
        .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚÑñ\s]/g, '')
        .trim();

      if (productName.length > 2) {
        items.push({
          name: productName.toUpperCase(),
          quantity: quantity,
          price: price,
          subtotal: price * quantity
        });
      }
    }
  });

  return {
    merchant,
    date: date || new Date().toISOString().split('T')[0],
    amount: totalAmount || items.reduce((sum, item) => sum + item.subtotal, 0),
    tax: taxAmount || 0,
    items: items
  };
}