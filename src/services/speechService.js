// src/services/speechService.js

export const isSpeechSupported = () => {
  return typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
};

/**
 * Crea un listener de voz robusto y continuo para evitar cortes abruptos ante pausas breves.
 */
export const createSpeechListener = ({ onStart, onResult, onError, onEnd }) => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.warn('[Speech Service] El navegador no soporta reconocimiento de voz.');
    return null;
  }

  const recognition = new SpeechRecognition();
  
  // ⚙️ Configuraciones Senior Master para fluidez
  recognition.lang = 'es-MX'; // Idioma español (puedes cambiarlo a 'es-ES' si prefiero España)
  recognition.continuous = true; // 👈 Mantiene el micrófono abierto aunque hagas pausas
  recognition.interimResults = true; // 👈 Muestra texto en tiempo real mientras hablas

  let finalTranscript = '';
  let isManuallyStopped = false;

  recognition.onstart = () => {
    finalTranscript = '';
    isManuallyStopped = false;
    if (onStart) onStart();
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcriptPiece = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcriptPiece + ' ';
      } else {
        interimTranscript += transcriptPiece;
      }
    }

    // Combinamos lo que ya se confirmó con lo que se está dictando en tiempo real
    const currentFullText = (finalTranscript + interimTranscript).trim();
    if (onResult) {
      onResult(currentFullText);
    }
  };

  recognition.onerror = (event) => {
    // Ignoramos el error 'no-speech' común si el usuario solo tarda en empezar a hablar
    if (event.error === 'no-speech') return;
    console.error('[Speech Service] Error de reconocimiento:', event.error);
    if (onError) onError(event.error);
  };

  recognition.onend = () => {
    // Si el navegador lo cierra solo pero no fue una parada manual, 
    // podemos decidir si mantener el estado final
    if (onEnd && !isManuallyStopped) {
      onEnd();
    }
  };

  return {
    start: () => {
      try {
        isManuallyStopped = false;
        recognition.start();
        console.log('[Speech Service] Micrófono iniciado en modo continuo.');
      } catch (e) {
        console.error('[Speech Service] No se pudo iniciar:', e);
      }
    },
    stop: () => {
      try {
        isManuallyStopped = true;
        recognition.stop();
        console.log('[Speech Service] Micrófono detenido manualmente.');
        if (onEnd) onEnd();
      } catch (e) {
        console.error('[Speech Service] Error al detener:', e);
      }
    }
  };
};