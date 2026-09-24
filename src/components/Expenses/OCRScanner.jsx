import React, { useState } from 'react';
import { scanTicketOCR } from '../../services/ocrService';

export default function OCRScanner({ onClose, onScanSuccess }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setErrorMsg('');
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) {
      setErrorMsg('Por favor selecciona o toma una foto primero.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const result = await scanTicketOCR(selectedFile);
      if (onScanSuccess) {
        onScanSuccess(result);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error al procesar el ticket.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 font-mono">
      <div className="bg-[#Fef8e7] border-4 border-black p-6 rounded-3xl max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-black">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-black uppercase">📸 Escanear Ticket</h2>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 bg-rose-500 text-white border-2 border-black rounded-xl font-black flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 bg-rose-200 border-2 border-black p-2 rounded-xl text-xs font-bold text-rose-900">
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="space-y-4 text-center">
          <label className="block w-full py-4 px-4 bg-amber-400 border-4 border-black rounded-2xl font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-amber-300 active:translate-x-0.5 active:translate-y-0.5 transition-all">
            {selectedFile ? '📁 Cambiar Imagen' : '📷 Tomar Foto / Subir Ticket'}
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              onChange={handleFileChange} 
              className="hidden" 
            />
          </label>

          {selectedFile && (
            <p className="text-xs font-bold text-stone-700 truncate">
              Archivo listo: {selectedFile.name}
            </p>
          )}

          <button
            type="button"
            disabled={loading || !selectedFile}
            onClick={handleProcess}
            className={`w-full py-3 border-4 border-black rounded-2xl font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all ${
              loading || !selectedFile ? 'bg-stone-300 text-stone-500 cursor-not-allowed' : 'bg-emerald-400 text-black hover:bg-emerald-300 cursor-pointer active:translate-x-0.5 active:translate-y-0.5'
            }`}
          >
            {loading ? '🤖 Analizando con IA...' : '✨ Analizar Total del Ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}