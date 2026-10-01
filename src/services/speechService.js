// src/services/speechService.js

export const isSpeechSupported = () => {
  return typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
};

/**
 * Servicio de voz Senior Master: Auto-resiliente, continuo y sin duplicación de palabras.
 */
export const createSpeechListener = ({ onStart, onResult, onError, onEnd }) => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.warn('[Speech Service] El navegador no soporta reconocimiento de voz.');
    return null;
  }

  let recognition = null;
  let isManuallyStopped = false;
  let persistentTranscript = ''; // Almacena el texto definitivo acumulado entre reinicios

  const createInstance = () => {
    const rec = new SpeechRecognition();
    rec.lang = 'es-MX';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onstart = () => {
      if (onStart && !persistentTranscript) {
        onStart();
      }
    };

    rec.onresult = (event) => {
      let currentInterim = '';
      let currentFinal = '';

      // Procesamos únicamente los resultados nuevos desde event.resultIndex
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          currentFinal += transcriptPiece + ' ';
        } else {
          currentInterim += transcriptPiece;
        }
      }

      // Si hay texto final nuevo, lo consolidamos de forma permanente
      if (currentFinal) {
        persistentTranscript += currentFinal;
      }

      // El texto total combina lo permanente + lo que se está dictando en tiempo real
      const fullText = (persistentTranscript + currentInterim).trim();
      if (onResult) {
        onResult(fullText);
      }
    };

    rec.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      console.warn('[Speech Service] Aviso de reconocimiento:', event.error);
      if (onError) onError(event.error);
    };

    rec.onend = () => {
      // Auto-reiniciado silencioso en segundo plano si el usuario no ha detenido el micro
      if (!isManuallyStopped) {
        try {
          recognition = createInstance();
          recognition.start();
        } catch (e) {
          console.warn('[Speech Service] No se pudo reiniciar automáticamente:', e);
        }
      } else {
        if (onEnd) onEnd();
      }
    };

    return rec;
  };

  recognition = createInstance();

  return {
    start: () => {
      isManuallyStopped = false;
      persistentTranscript = '';
      try {
        recognition.start();
        console.log('[Speech Service] Micrófono iniciado sin eco.');
      } catch (e) {
        console.error('[Speech Service] Error al iniciar:', e);
      }
    },
    stop: () => {
      isManuallyStopped = true;
      try {
        recognition.stop();
        console.log('[Speech Service] Micrófono detenido.');
      } catch (e) {
        console.error('[Speech Service] Error al detener:', e);
      }
      if (onEnd) onEnd();
    }
  };
};