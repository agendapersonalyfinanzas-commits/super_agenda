import React, { useState, useEffect, useRef } from 'react';

// Utilidades centralizadas con rutas verificadas (dos niveles arriba: ../../utils/)
import { aMayusculas } from '../../utils/mayusculas.js';
import { obtenerMensajeError } from '../../utils/errores.js';

export default function VoiceNoteModal({ onSave, onClose }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState('Presiona el micrófono para hablar');
  const [errorMessage, setErrorMessage] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignorar si ya estaba detenido
        }
      }
    };
  }, []);

  const toggleListening = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage('Tu navegador no soporta Web Speech API. Por favor usa Google Chrome.');
      setStatusMessage('Navegador no compatible.');
      return;
    }

    // Si ya está escuchando, lo detenemos
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error(e);
        }
      }
      setIsListening(false);
      setStatusMessage('Grabación detenida por el usuario.');
      return;
    }

    try {
      setErrorMessage('');
      setStatusMessage('Solicitando acceso al micrófono...');

      // 1. Solicitamos permiso y LIBERAMOS de inmediato el canal de audio para no bloquearlo
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop()); // Liberación explícita del hardware
        } catch (micErr) {
          console.error('Error al pedir micrófono:', micErr);
          setErrorMessage('Permiso de micrófono denegado en tu navegador o sistema.');
          setStatusMessage('Permiso denegado.');
          return;
        }
      }

      setStatusMessage('Conectando con el motor de voz...');
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'es-MX';

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMessage('🎙️ Escuchando... Habla ahora.');
        setErrorMessage('');
      };

      recognition.onresult = (event) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        setTranscript(currentText);
      };

      recognition.onerror = (event) => {
        console.error('Error SpeechRecognition:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorMessage('El navegador bloqueó el micrófono. Habilítalo en el icono del candado en la barra de direcciones.');
        } else if (event.error === 'no-speech') {
          setErrorMessage('No se escuchó voz. Intenta hablar más cerca del micrófono.');
        } else if (event.error === 'network') {
          setErrorMessage('Error de conexión. Se requiere internet para el dictado por voz.');
        } else {
          setErrorMessage(`Error del reconocedor: ${event.error}`);
        }
        setStatusMessage(`Error: ${event.error}`);
      };

      recognition.onend = () => {
        setIsListening(false);
        setStatusMessage('Reconocimiento finalizado.');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Error al iniciar dictado:', err);
      setIsListening(false);
      setErrorMessage(obtenerMensajeError(err) || 'No se pudo iniciar el micrófono.');
      setStatusMessage('Error de inicio.');
    }
  };

  const handleClear = () => {
    setTranscript('');
  };

  const handleConfirmSave = () => {
    if (!transcript.trim()) {
      alert('Primero dicta o escribe alguna nota.');
      return;
    }
    onSave(transcript.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 font-mono text-black select-none">
      <div className="w-full max-w-lg bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4">
        
        {/* Cabecera Estilo Cómic */}
        <div className="flex justify-between items-center border-b-4 border-black pb-2 bg-amber-400 -mx-6 -mt-6 p-4 rounded-t-[20px]">
          <div>
            <h3 className="font-black uppercase text-sm text-black">
              {aMayusculas('Dictado por Voz')}
            </h3>
            <p className="text-[10px] font-bold text-amber-950 uppercase">
              {aMayusculas('Nota o gasto dictado')}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-black font-black text-xl hover:text-stone-700 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Indicador de Estado / Diagnóstico en pantalla */}
        <div className="text-center bg-amber-50 border-2 border-black p-2 rounded-xl text-[11px] font-black uppercase text-stone-700">
          {statusMessage}
        </div>

        {/* Mensaje de Error si aplica */}
        {errorMessage && (
          <div className="p-3 bg-rose-100 border-2 border-rose-600 rounded-xl text-xs font-bold text-rose-700 uppercase wrap-break-word">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Botón de Grabar / Detener */}
        <div className="flex flex-col items-center justify-center py-2 space-y-3">
          <button
            type="button"
            onClick={toggleListening}
            className={`w-20 h-20 rounded-full border-4 border-black flex items-center justify-center text-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer ${
              isListening 
                ? 'bg-rose-500 animate-pulse text-white ring-4 ring-rose-300' 
                : 'bg-amber-400 hover:bg-amber-300 text-black'
            }`}
          >
            {isListening ? '🛑' : '🎙️'}
          </button>
        </div>

        {/* Área de Texto Transcrito */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black uppercase text-stone-600">
              {aMayusculas('Texto Transcrito')}:
            </label>
            {transcript && (
              <button 
                type="button" 
                onClick={handleClear}
                className="text-[10px] font-black uppercase text-rose-600 hover:underline cursor-pointer"
              >
                {aMayusculas('Borrar')}
              </button>
            )}
          </div>
          <textarea
            rows={4}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="El texto dictado aparecerá aquí..."
            className="w-full p-3 bg-stone-50 border-2 border-black rounded-xl text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Botón Guardar */}
        <button 
          type="button" 
          onClick={handleConfirmSave} 
          disabled={!transcript.trim()}
          className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black border-4 border-black rounded-xl font-black text-xs uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
        >
          {aMayusculas('Guardar Nota Dictada')}
        </button>

      </div>
    </div>
  );
}