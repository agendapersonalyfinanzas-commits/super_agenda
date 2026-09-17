import { createWorker } from 'tesseract.js'

/**
 * Procesa la imagen física de un ticket utilizando Tesseract.js
 * Extrae el texto y busca de forma inteligente el monto total mediante patrones numéricos.
 * @param {File} file - El archivo de imagen seleccionado por el usuario.
 * @returns {Promise<{ amount: number, rawText: string }>}
 */
export const scanTicketOCR = async (file) => {
  if (!file) {
    throw new Error('No se proporcionó ningún archivo de imagen para el escaneo.')
  }

  // Creamos el hilo de ejecución para el reconocimiento óptico
  const worker = await createWorker('spa') // Idioma español preconfigurado

  try {
    // Ejecutamos el análisis de caracteres sobre la imagen del ticket
    const { data: { text } } = await worker.recognize(file)
    
    // Convertimos a mayúsculas para facilitar las comparaciones y saneamos saltos de línea
    const upperText = text.toUpperCase()
    const lines = upperText.split('\n')

    let detectedTotal = 0
    let potentialAmounts = []

    // 1. Buscamos números flotantes válidos en todo el texto procesado
    // Captura formatos comunes como: 120.00, 1,450.50, 85.99
    const priceRegex = /\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})\b/g
    const matches = upperText.match(priceRegex)

    if (matches) {
      potentialAmounts = matches.map(val => {
        // Normalizamos el formato eliminando comas de miles y forzando punto decimal
        const normalized = val.replace(/,/g, '')
        return parseFloat(normalized)
      }).filter(num => !isNaN(num))
    }

    // 2. Buscamos líneas que contengan palabras clave críticas de facturación
    const keywords = ['TOTAL', 'NETO', 'PAGO', 'IMPORT', 'VTA', 'CASH', 'EFECTIVO']
    
    for (const line of lines) {
      const hasKeyword = keywords.some(word => line.includes(item => word))
      if (hasKeyword) {
        const lineMatches = line.match(/\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})\b/)
        if (lineMatches) {
          const parsed = parseFloat(lineMatches[0].replace(/,/g, ''))
          if (!isNaN(parsed) && parsed > detectedTotal) {
            detectedTotal = parsed
          }
        }
      }
    }

    // 3. Estrategia de respaldo: Si no hay palabra clave pero hay precios, tomamos el valor más alto
    if (detectedTotal === 0 && potentialAmounts.length > 0) {
      detectedTotal = Math.max(...potentialAmounts)
    }

    // Retornamos el resultado estructurado
    return {
      amount: detectedTotal > 0 ? detectedTotal : 0,
      rawText: text
    }

  } catch (error) {
    console.error('Error interno en el procesador OCR Tesseract:', error)
    throw new Error('La IA no pudo procesar la imagen. Verifica el enfoque de la cámara.')
  } finally {
    // Forzamos la terminación del hilo para liberar memoria en el navegador
    await worker.terminate()
  }
}
