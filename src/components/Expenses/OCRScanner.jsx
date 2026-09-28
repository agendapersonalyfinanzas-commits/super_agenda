import React, { useState } from 'react';
import { scanTicketOCR } from '../../services/ocrService';

export default function OCRScanner({ onClose, onScanSuccess }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [reviewData, setReviewData] = useState(null);

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
      setReviewData(result);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error al procesar el ticket.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSave = (e) => {
    e.preventDefault();
    if (!reviewData) return;

    const amountNum = Number(reviewData.amount) || 0;
    const conceptText = reviewData.concept ? reviewData.concept.toUpperCase() : 'COMPRA';
    const categoryText = reviewData.category ? reviewData.category.toUpperCase() : 'OTROS';
    const currentDate = new Date().toISOString().split('T')[0];

    // Objeto robusto que incluye el distintivo de ticket escaneado (🎫)
    const newExpense = {
      id: Date.now(),
      date: currentDate,
      amount: amountNum,
      total: amountNum,
      concept: conceptText,
      title: conceptText,
      description: conceptText,
      category: categoryText,
      type: 'expense',
      isScanned: true, // Bandera para identificar que proviene de escaneo OCR
      icon: '🎫'       // Icono visual para el historial
    };

    const storageKeys = [
      'user_expenses',
      'transactions',
      'expenses',
      'user_transactions',
      'finanzas_transactions',
      'gastos'
    ];

    try {
      storageKeys.forEach((key) => {
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(existing)) {
          localStorage.setItem(key, JSON.stringify([...existing, newExpense]));
        }
      });

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('transactionsUpdated'));
      window.dispatchEvent(new CustomEvent('expenseAdded', { detail: newExpense }));
    } catch (storageErr) {
      console.error('Error al guardar en localStorage:', storageErr);
    }

    if (onScanSuccess) {
      onScanSuccess(newExpense);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 font-mono">
      <div className="bg-[#Fef8e7] border-4 border-black p-6 rounded-3xl max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-black">
        
        {!reviewData ? (
          <>
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
          </>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-black uppercase">🔍 Verificar Datos de IA</h2>
              <button 
                type="button"
                onClick={() => setReviewData(null)}
                className="w-8 h-8 bg-rose-500 text-white border-2 border-black rounded-xl font-black flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmSave} className="space-y-3 text-left">
              <div>
                <label className="block text-xs font-black uppercase text-stone-800 mb-1">Comercio / Concepto:</label>
                <input 
                  type="text" 
                  value={reviewData.concept} 
                  onChange={(e) => setReviewData({...reviewData, concept: e.target.value})}
                  className="w-full bg-white border-2 border-black p-2 rounded-xl text-sm font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-stone-800 mb-1">Monto ($):</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={reviewData.amount} 
                  onChange={(e) => setReviewData({...reviewData, amount: e.target.value})}
                  className="w-full bg-white border-2 border-black p-2 rounded-xl text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-stone-800 mb-1">Categoría Asignada:</label>
                <select 
                  value={reviewData.category}
                  onChange={(e) => setReviewData({...reviewData, category: e.target.value})}
                  className="w-full bg-white border-2 border-black p-2 rounded-xl text-sm font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none cursor-pointer"
                >
                  <option value="ALIMENTOS">ALIMENTOS</option>
                  <option value="TRANSPORTE">TRANSPORTE</option>
                  <option value="SERVICIOS">SERVICIOS</option>
                  <option value="ENTRETENIMIENTO">ENTRETENIMIENTO</option>
                  <option value="SALUD">SALUD</option>
                  <option value="SUPERMERCADO">SUPERMERCADO</option>
                  <option value="HOGAR">HOGAR</option>
                  <option value="OTROS">OTROS</option>
                </select>
              </div>

              <div className="flex space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setReviewData(null)}
                  className="w-1/2 py-2.5 bg-stone-300 text-stone-800 border-2 border-black rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-stone-200 active:translate-x-0.5 active:translate-y-0.5"
                >
                  Volver a Elegir
                </button>
                <button 
                  type="submit" 
                  className="w-1/2 py-2.5 bg-emerald-400 text-black border-2 border-black rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-emerald-300 active:translate-x-0.5 active:translate-y-0.5"
                >
                  💾 Guardar Gasto
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}