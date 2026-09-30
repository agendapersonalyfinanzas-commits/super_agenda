/**
 * Agrupa los bloques de texto detectados por el OCR en líneas horizontales reales
 */
export function groupOcrWordsIntoLines(ocrWords, yThreshold = 12) {
  // Ordenar primero verticalmente
  const sortedWords = [...ocrWords].sort((a, b) => a.bbox.y0 - b.bbox.y0);

  const lines = [];

  sortedWords.forEach((word) => {
    // Buscar si la palabra pertenece a una línea existente según su tolerancia Y
    const line = lines.find(
      (l) => Math.abs(l.yBase - word.bbox.y0) <= yThreshold
    );

    if (line) {
      line.words.push(word);
    } else {
      lines.push({
        yBase: word.bbox.y0,
        words: [word]
      });
    }
  });

  // Ordenar las palabras de cada línea horizontalmente (de izquierda a derecha)
  return lines.map((line) => {
    line.words.sort((a, b) => a.bbox.x0 - b.bbox.x0);
    return line.words.map((w) => w.text).join(' ');
  });
}