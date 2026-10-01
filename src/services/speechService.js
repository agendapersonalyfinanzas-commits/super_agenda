// src/services/speechService.js

export const isSpeechSupported = () => {
  return typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
};

/**
 * Servicio de voz optimizado: sin duplicación de palabras y con auto-restart resiliente.
 */
export const createSpeechListener = ({ onStart, onResult, onError, onEnd }) => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.warn('[Speech Service] El navegador no soporta reconocimiento de voz.');
    return null;
  }

  let recognition = null;
  let isManuallyStopped = false;

  const createRecognitionInstance = () => {
    const rec = new SpeechRecognition();
    rec.lang = 'es-MX';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onstart = () => {
      if (onStart) onStart();
    };

    rec.onresult = (event) => {
      let fullTranscript = '';
      
      // 🛡️ Solución Senior: Recorremos desde el índice 0 para reconstruir 
      // la frase completa sin duplicar fragmentos intermedios o finales.
      for (let i = 0; i < event.results.length; ++i) {
        fullTranscript += event.results[i][0].transcript + ' ';
      }

      const cleanText = fullTranscript.replace(/\s+/g, ' ').trim();
      if (onResult) {
        onResult(cleanText);
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
      // 🔄 Auto-restart transparente si el navegador corta por silencio
      if (!isManuallyStopped) {
        console.log('[Speech Service] Reiniciando escucha de forma invisible...');
        try {
          recognition = createRecognitionInstance();
          recognition.start();
        } catch (e) {
          console.warn('[Speech Service] No se pudo reiniciar:', e);
        }
      } else {
        if (onEnd) onEnd();
      }
    };

    return rec;
  };

  recognition = createRecognitionInstance();

  return {
    start: () => {
      try {
        isManuallyStopped = false;
        recognition.start();
        console.log('[Speech Service] Micrófono iniciado.');
      } catch (e) {
        console.error('[Speech Service] Error al iniciar:', e);
      }
    },
    stop: () => {
      isManuallyStopped = true;
      try {
        recognition.stop();
        console.log('[Speech Service] Micrófono detenido manualmente.');
      } catch (e) {
        console.error('[Speech Service] Error al detener:', e);
      }
      if (onEnd) onEnd();
    }
  };
};