// src/services/speechService.js

/**
 * Inicializa y configura el reconocedor de voz nativo del navegador.
 * @param {Object} callbacks Objeto con handlers: onResult, onError, onEnd, onStart
 * @returns {Object} Instancia de SpeechRecognition o null si no es compatible
 */
export const createSpeechListener = ({ onResult, onError, onEnd, onStart }) => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (onError) {
      onError('El navegador no soporta la API de reconocimiento de voz nativa.');
    }
    return null;
  }

  const recognition = new SpeechRecognition();
  
  // Configuración para captura precisa en español
  recognition.continuous = false; // Se detiene automáticamente al terminar de hablar
  recognition.interimResults = false; // Solo devuelve el resultado final pulido
  recognition.lang = 'es-MX'; // Optimizado para español de México / Latinoamérica

  recognition.onstart = () => {
    if (onStart) onStart();
  };

  recognition.onresult = (event) => {
    if (event.results && event.results[0] && event.results[0][0]) {
      const transcript = event.results[0][0].transcript;
      if (onResult) onResult(transcript);
    }
  };

  recognition.onerror = (event) => {
    console.error('Error en reconocimiento de voz:', event.error);
    if (onError) onError(event.error);
  };

  recognition.onend = () => {
    if (onEnd) onEnd();
  };

  return recognition;
};

/**
 * Verifica si el navegador actual soporta entrada por voz.
 */
export const isSpeechSupported = () => {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
};