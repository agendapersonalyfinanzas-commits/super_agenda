/**
 * Aplica filtros de limpieza de imagen en Canvas para optimizar el OCR térmico
 */
export function preprocessReceiptImage(imageElement) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = imageElement.width;
  canvas.height = imageElement.height;

  ctx.drawImage(imageElement, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Conversión a Escala de Grises + Umbralizado / Contraste Adaptativo
  for (let i = 0; i < data.length; i += 4) {
    // Luminancia promedio
    const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    
    // Aumento de contraste binarizado (B/N puro)
    const threshold = avg > 128 ? 255 : 0;

    data[i] = threshold;     // R
    data[i + 1] = threshold; // G
    data[i + 2] = threshold; // B
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}