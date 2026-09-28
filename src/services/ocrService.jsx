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
    Analiza esta imagen de un ticket o recibo de compra. Extrae la información y devuelve un objeto JSON válido con exactamente estas tres llaves:
    1. "amount": número flotante con el total exacto a pagar (ej: 150.50). Si no encuentras el total, pon 0.
    2. "concept": el nombre del comercio, establecimiento o descripción del gasto (en MAYÚSCULAS).
    3. "category": una categoría sugerida estrictamente de esta lista: ALIMENTOS, TRANSPORTE, SERVICIOS, ENTRETENIMIENTO, SALUD, SUPERMERCADO, HOGAR, OTROS (en MAYÚSCULAS).
    
    Ejemplo de formato requerido:
    {"amount": 250.00, "concept": "SUPERAMA", "category": "SUPERMERCADO"}
  `;

  // Modelo requerido por la respuesta actual del servidor de Google AI
  const modelsToTry = ['gemini-3.8-flash', 'gemini-1.5-flash'];
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`Intentando escanear ticket con el modelo: ${modelName}`);
      const response = await ai.models.generateContent({
        model: modelName,
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
      console.log(`Respuesta exitosa de ${modelName}:`, textResponse);

      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('La respuesta de la IA no contiene JSON válido.');
      }

      const parsedData = JSON.parse(jsonMatch[0]);

      return {
        amount: Number(parsedData.amount) || 0,
        concept: parsedData.concept ? String(parsedData.concept).toUpperCase() : 'COMPRA CON TICKET',
        category: parsedData.category ? String(parsedData.category).toUpperCase() : 'OTROS',
        rawText: textResponse
      };

    } catch (error) {
      console.warn(`Falló el modelo ${modelName}:`, error.message);
      lastError = error;
    }
  }

  throw new Error(`Error al procesar el ticket: ${lastError?.message || 'La IA no pudo completar la solicitud.'}`);
};