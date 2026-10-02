import { GoogleGenAI } from '@google/genai';

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const maxWidth = 1024;
    const maxHeight = 1024;
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((height * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64Data = dataUrl.split(',')[1];
        resolve(base64Data);
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen en el canvas.'));
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

export const scanTicketOCR = async (file) => {
  if (!file) {
    throw new Error('No se proporcionó ningún archivo de imagen.');
  }

  const apiKey = 
    (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.REACT_APP_GEMINI_API_KEY)) ||
    (typeof process !== 'undefined' && process.env && (process.env.REACT_APP_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY));

  if (!apiKey) {
    throw new Error('Falta configurar la llave de API de Gemini en tu archivo .env');
  }

  const ai = new GoogleGenAI({ apiKey });
  const base64Data = await fileToBase64(file);

  const prompt = `
    Analiza esta imagen de un ticket, factura o recibo de compra. Extrae la información y devuelve un objeto JSON válido con exactamente estas llaves:
    1. "amount": número flotante con el total exacto a pagar (ej: 150.50). Si no encuentras el total, pon 0.
    2. "concept": el nombre del comercio, establecimiento o tienda donde se realizó la compra (en MAYÚSCULAS, ej: CHEDRAUI, WALMART, OXXO, etc.).
    3. "category": una categoría sugerida estrictamente de esta lista: ALIMENTOS, TRANSPORTE, SERVICIOS, ENTRETENIMIENTO, SALUD, SUPERMERCADO, HOGAR, OTROS (en MAYÚSCULAS).
    4. "dueDate": fecha de vencimiento o límite de pago si aparece en formato "YYYY-MM-DD", de lo contrario null.
    5. "returnPeriod": texto descriptivo del periodo de devolución si aplica (ej: "30 DÍAS"), de lo contrario null.
    6. "warranty": texto descriptivo de la garantía si aplica (ej: "1 AÑO"), de lo contrario null.
    7. "isBillOrInvoice": booleano (true si es recibo de servicios con fecha límite futura, false si es ticket normal).
    8. "description": resumen breve del ticket o servicio.
    9. "items": un arreglo (array) con los productos detectados. Cada objeto debe tener "name" (nombre del producto en mayúsculas), "quantity" (número entero o decimal con la cantidad o peso, ej: 1 o 0.510) y "price" (número flotante con el precio total del artículo). Si no hay desglose, pon [].
    
    Ejemplo de formato requerido:
    {
      "amount": 250.00,
      "concept": "CHEDRAUI",
      "category": "SUPERMERCADO",
      "dueDate": null,
      "returnPeriod": "30 DÍAS",
      "warranty": null,
      "isBillOrInvoice": false,
      "description": "Compra de despensa",
      "items": [
        {"name": "LECHE ENTERA 1L", "quantity": 1, "price": 28.50},
        {"name": "PAPA CAMBRAY", "quantity": 0.510, "price": 22.00}
      ]
    }
  `;

  try {
    console.log('Escaneando ticket con gemini-2.5-flash...');
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        prompt,
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data
          }
        }
      ],
    });

    const textResponse = response.text ? response.text.trim() : '';
    console.log('Respuesta exitosa:', textResponse);

    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('La respuesta de la IA no contiene JSON válido.');
    }

    const parsedData = JSON.parse(jsonMatch[0]);

    // Mapeo estructurado y seguro de los items con soporte para cantidades fraccionadas
    const formattedItems = Array.isArray(parsedData.items) 
      ? parsedData.items.map(item => {
          const qty = Number(item.quantity) || 1;
          const prc = Number(item.price) || 0;
          return {
            name: item.name ? String(item.name).toUpperCase() : 'PRODUCTO',
            quantity: qty,
            price: prc,
            subtotal: Number((qty * prc).toFixed(2))
          };
        }) 
      : [];

    return {
      amount: Number(parsedData.amount) || 0,
      concept: parsedData.concept ? String(parsedData.concept).toUpperCase() : 'COMPRA CON TICKET',
      category: parsedData.category ? String(parsedData.category).toUpperCase() : 'OTROS',
      dueDate: parsedData.dueDate || null,
      returnPeriod: parsedData.returnPeriod || null,
      warranty: parsedData.warranty || null,
      isBillOrInvoice: Boolean(parsedData.isBillOrInvoice),
      description: parsedData.description || '',
      items: formattedItems,
      rawText: textResponse
    };

  } catch (error) {
    console.error('Error al procesar el ticket con IA:', error);
    
    if (error?.message?.includes('429') || error?.message?.includes('quota')) {
      throw new Error('Límite de solicitudes excedido (Error 429). Espera unos 30 segundos antes de volver a escanear otro ticket para respetar la cuota gratuita.');
    }

    throw new Error(`Error al procesar el ticket: ${error?.message || 'La IA no pudo completar la solicitud.'}`);
  }
};