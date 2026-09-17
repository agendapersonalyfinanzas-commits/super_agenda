import React, { useState, useRef } from 'react';
import { scanTicketOCR } from '../../services/ocrService';

// Importación de utilidades con extensión .js para Vite
import { aNumero, formatearMoneda } from '../../utils/moneda.js';
import { aMayusculas } from '../../utils/mayusculas.js';
import { obtenerMensajeError } from '../../utils/errores.js';

export default function OCRScanner({ onScanSuccess, onClose }) {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      setErrorMsg('');
      
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleTriggerInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleProcessScan = async () => {
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) {
      setErrorMsg(aMayusculas('Por favor selecciona o toma una foto primero'));
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const targetFile = files[0];
      const rawResult = await scanTicketOCR(targetFile);

      // Limpieza utilitaria de los datos detectados por el OCR
      const sanitizedResult = {
        ...rawResult,
        amount: aNumero(rawResult?.amount),
        concept: aMayusculas(rawResult?.concept || rawResult?.vendor || 'COMPRA CON TICKET'),
        category: aMayusculas(rawResult?.category || 'MERCADO')
      };

      onScanSuccess(sanitizedResult);
    } catch (err) {
      setErrorMsg(obtenerMensajeError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center p-4 font-mono tracking-tight text-black select-none">
      <div className="w-full max-w-md bg-white border-4 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        
        {/* CABECERA */}
        <div className="p-4 bg-amber-400 border-b-4 border-black flex justify-between items-center">
          <div>
            <h3 className="font-black text-lg uppercase tracking-wide">Escanear Ticket</h3>
            <p className="text-xs font-bold text-amber-950 uppercase">Detector Inteligente OCR</p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            disabled={loading} 
            className="text-black font-black text-xl hover:scale-110 active:scale-95 transition-transform disabled:opacity-50 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="p-6 bg-white space-y-6">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          {!previewUrl ? (
            <button
              type="button"
              onClick={handleTriggerInput}
              className="w-full h-48 border-4 border-dashed border-black rounded-2xl flex flex-col items-center justify-center bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <span className="text-3xl mb-2">📸</span>
              <span className="font-black text-xs uppercase tracking-wider">Abrir Cámara / Subir Foto</span>
            </button>
          ) : (
            <div className="space-y-4">
              <div className="w-full h-48 border-4 border-black rounded-2xl overflow-hidden bg-black flex items-center justify-center relative">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                {!loading && (
                  <button
                    type="button"
                    onClick={handleTriggerInput}
                    className="absolute bottom-2 right-2 bg-white border-2 border-black px-3 py-1 rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                  >
                    Cambiar
                  </button>
                )}
              </div>

              {errorMsg && (
                <div className="border-4 border-red-500 bg-red-50 text-red-700 p-3 rounded-xl font-black text-xs uppercase tracking-wide">
                  ⚠️ {errorMsg}
                </div>
              )}

              <button
                type="button"
                onClick={handleProcessScan}
                disabled={loading}
                className="w-full py-4 bg-amber-400 border-4 border-black rounded-xl font-black text-lg uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 text-black flex items-center justify-center gap-2 hover:bg-amber-300 cursor-pointer"
              >
                {loading ? 'PROCESANDO TEXTO...' : 'ANALIZAR TOTAL DEL TICKET'}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}