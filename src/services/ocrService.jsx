import { GoogleGenAI, Type } from '@google/genai';

const fileToGenerativePart = async (file) => {
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
            width = Math.round((width * maxHeight) / height);
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

        resolve({
          inlineData: {
            data: base64Data,
            mimeType: 'image/jpeg',
          },
        });
      };
      img.onerror = (err) => reject(new Error('No se pudo leer la imagen.'));
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

export const scanTicketOCR = async (file) => {
  if (!file) {
    throw new Error('No se proporcionó ningún archivo de imagen.');
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Falta configurar la llave VITE_GEMINI_API_KEY en tu archivo .env');
  }

  const ai = new GoogleGenAI({ apiKey });
  const imagePart = await fileToGenerativePart(file);

  const prompt = `
    Analiza esta imagen de un ticket o recibo de compra. Extrae la información con precisión:
    1. El total exacto a pagar (amount).
    2. El nombre del comercio o establecimiento en MAYÚSCULAS (concept).
    3. Una categoría sugerida estrictamente de esta lista: ALIMENTOS, TRANSPORTE, SERVICIOS, ENTRETENIMIENTO, SALUD, SUPERMERCADO, HOGAR, OTROS (category).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [prompt, imagePart],
      config: {
        // 🌟 FORZAMOS A LA IA A DEVOLVER UN JSON PURO Y ESTRUCTURADO
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: "Total exacto a pagar en número flotante" },
            concept: { type: Type.STRING, description: "Nombre del comercio en MAYÚSCULAS" },
            category: { type: Type.STRING, description: "Categoría exacta permitida" }
          },
          required: ['amount', 'concept', 'category']
        }
      }
    });

    const textResponse = response.text ? response.text.trim() : '{}';
    const parsedData = JSON.parse(textResponse);

    return {
      amount: Number(parsedData.amount) || 0,
      concept: parsedData.concept ? parsedData.concept.toUpperCase() : 'COMPRA CON TICKET',
      category: parsedData.category ? parsedData.category.toUpperCase() : 'OTROS',
      rawText: textResponse
    };

  } catch (error) {
    console.error('Error al procesar con Gemini:', error);
    throw new Error('La IA no pudo interpretar el ticket. Intenta con una foto más clara.');
  }
};