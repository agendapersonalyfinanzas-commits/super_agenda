// src/components/Expenses/OCRScanner.jsx

import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { parseExpenseInput } from '../../services/aiParserService';
import { agregarAColaOffline } from '../../utils/offlineSync';
import { guardarYCrearPlantilla } from '../../services/templateService';
import { analyzeAndUpdatePrices } from '../../services/priceRadarService'; // 👈 Importamos el Radar de Precios

export default function OCRScanner({ onClose, onScanSuccess }) {
  const [loading, setLoading] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
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
    setProgressStatus('Inicializando motor OCR local...');

    try {
      const result = await parseExpenseInput(selectedFile, (progressInfo) => {
        if (progressInfo.status === 'downloading') {
          setProgressStatus(`Cargando diccionario (${progressInfo.progress}%)...`);
        } else if (progressInfo.status === 'loading_model') {
          setProgressStatus('Cargando motor de visión local...');
        } else if (progressInfo.status === 'ready') {
          setProgressStatus('Escaneando texto y precios del ticket...');
        }
      });

      if (result) {
        setReviewData(result);
      } else {
        throw new Error('No se pudieron extraer datos válidos del ticket.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error al procesar el ticket con el motor local.');
    } finally {
      setLoading(false);
      setProgressStatus('');
    }
  };

  // --- Manejo de Ítems Editables ---
  const handleItemNameChange = (index, newName) => {
    const updatedItems = [...(reviewData.items || [])];
    updatedItems[index].name = newName;
    setReviewData({ ...reviewData, items: updatedItems });
  };

  const handleItemPriceChange = (index, newPrice) => {
    const updatedItems = [...(reviewData.items || [])];
    updatedItems[index].price = newPrice;
    setReviewData({ ...reviewData, items: updatedItems });
  };

  const handleDeleteItem = (index) => {
    const updatedItems = reviewData.items.filter((_, i) => i !== index);
    setReviewData({ ...reviewData, items: updatedItems });
  };

  const handleAddItem = () => {
    const updatedItems = [...(reviewData.items || []), { name: 'NUEVO PRODUCTO', price: 0 }];
    setReviewData({ ...reviewData, items: updatedItems });
  };

  const handleRecalculateTotal = () => {
    const newTotal = (reviewData.items || []).reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    setReviewData({ ...reviewData, amount: Number(newTotal.toFixed(2)) });
  };

  const handleConfirmSave = async (e) => {
    e.preventDefault();
    if (!reviewData) return;

    setLoading(true);
    setErrorMsg('');

    let transactionPayload = null;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user || !user.email) {
        throw new Error('Debes iniciar sesión para registrar gastos.');
      }

      const amountNum = Number(reviewData.amount) || 0;
      const conceptText = reviewData.concept ? reviewData.concept.toUpperCase() : 'COMPRA';
      const categoryText = reviewData.category ? reviewData.category.toUpperCase() : 'OTROS';

      transactionPayload = {
        concept: conceptText,
        amount: amountNum,
        category: categoryText,
        description: reviewData.description || conceptText,
        transaction_date: new Date().toISOString(),
        items: Array.isArray(reviewData.items) ? reviewData.items : [],
        auth_user_email: user.email
      };

      // 🧠 1. Enseñar / Guardar plantilla híbrida (Local + Supabase)
      await guardarYCrearPlantilla(conceptText, {
        category: categoryText,
        totalItems: reviewData.items?.length || 0,
        lastAmount: amountNum
      });

      // 🔍 2. Disparar el Radar de Precios / Inflación con los ítems escaneados
      if (reviewData.items && reviewData.items.length > 0) {
        const priceAlerts = await analyzeAndUpdatePrices(reviewData.items, conceptText);
        if (priceAlerts && priceAlerts.length > 0) {
          console.silly?.('📈 Alertas de inflación / cambios de precios detectadas:', priceAlerts);
          // Opcional: podrías mostrar una notificación toast o pasarlas en el callback si lo deseas
        }
      }

      if (!navigator.onLine) {
        await agregarAColaOffline('INSERT', 'transactions', transactionPayload);
        if (onScanSuccess) onScanSuccess(transactionPayload);
        onClose();
        return;
      }

      const { data: insertedData, error: dbError } = await supabase
        .from('transactions')
        .insert([transactionPayload])
        .select()
        .single();

      if (dbError) throw dbError;

      window.dispatchEvent(new CustomEvent('refresh-financial-data'));

      if (onScanSuccess) onScanSuccess(insertedData);
      onClose();

    } catch (err) {
      console.error('Error al guardar gasto:', err);

      if ((!navigator.onLine || err.message?.includes('Fetch')) && transactionPayload) {
        await agregarAColaOffline('INSERT', 'transactions', transactionPayload);
        if (onScanSuccess) onScanSuccess(reviewData);
        onClose();
      } else {
        setErrorMsg(err.message || 'Error al intentar guardar en Supabase.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 font-mono">
      <div className="bg-[#Fef8e7] border-4 border-black p-6 rounded-3xl max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-black max-h-[90vh] overflow-y-auto">
        
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

              {loading && progressStatus && (
                <div className="bg-amber-100 border-2 border-black p-2 rounded-xl text-xs font-bold text-amber-900 animate-pulse">
                  ⚡ {progressStatus}
                </div>
              )}

              <button
                type="button"
                disabled={loading || !selectedFile}
                onClick={handleProcess}
                className={`w-full py-3 border-4 border-black rounded-2xl font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all ${
                  loading || !selectedFile ? 'bg-stone-300 text-stone-500 cursor-not-allowed' : 'bg-emerald-400 text-black hover:bg-emerald-300 cursor-pointer active:translate-x-0.5 active:translate-y-0.5'
                }`}
              >
                {loading ? '🔍 Escaneando con OCR...' : '✨ Analizar Ticket e Ítems'}
              </button>
            </div>
          </>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-black uppercase">🔍 Verificar Datos de Ticket</h2>
              <button 
                type="button"
                onClick={() => setReviewData(null)}
                className="w-8 h-8 bg-rose-500 text-white border-2 border-black rounded-xl font-black flex items-center justify-center cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="mb-3 bg-rose-200 border-2 border-black p-2 rounded-xl text-xs font-bold text-rose-900">
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleConfirmSave} className="space-y-3 text-left">
              <div>
                <label className="block text-xs font-black uppercase text-stone-800 mb-1">Comercio / Concepto:</label>
                <input 
                  type="text" 
                  value={reviewData.concept || ''} 
                  onChange={(e) => setReviewData({...reviewData, concept: e.target.value})}
                  className="w-full bg-white border-2 border-black p-2 rounded-xl text-sm font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-black uppercase text-stone-800">Monto Total ($):</label>
                  <button
                    type="button"
                    onClick={handleRecalculateTotal}
                    className="text-[10px] font-bold text-indigo-700 underline hover:text-indigo-900 cursor-pointer"
                  >
                    🔄 Sumar ítems
                  </button>
                </div>
                <input 
                  type="number" 
                  step="0.01"
                  value={reviewData.amount || ''} 
                  onChange={(e) => setReviewData({...reviewData, amount: e.target.value})}
                  className="w-full bg-white border-2 border-black p-2 rounded-xl text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-stone-800 mb-1">Categoría Asignada:</label>
                <select 
                  value={reviewData.category || 'SUPERMERCADO'}
                  onChange={(e) => setReviewData({...reviewData, category: e.target.value})}
                  className="w-full bg-white border-2 border-black p-2 rounded-xl text-sm font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none cursor-pointer"
                >
                  <option value="SUPERMERCADO">SUPERMERCADO</option>
                  <option value="ALIMENTOS">ALIMENTOS</option>
                  <option value="TRANSPORTE">TRANSPORTE</option>
                  <option value="SERVICIOS">SERVICIOS</option>
                  <option value="ENTRETENIMIENTO">ENTRETENIMIENTO</option>
                  <option value="SALUD">SALUD</option>
                  <option value="HOGAR">HOGAR</option>
                  <option value="OTROS">OTROS</option>
                </select>
              </div>

              {/* Lista Interactiva de Productos */}
              <div className="bg-white border-2 border-black p-2.5 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black uppercase text-stone-600">
                    🛒 Ítems Editables ({reviewData.items ? reviewData.items.length : 0}):
                  </p>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-2 py-0.5 bg-amber-300 border border-black rounded-md text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-400 cursor-pointer"
                  >
                    ➕ Agregar
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {reviewData.items && reviewData.items.length > 0 ? (
                    reviewData.items.map((it, i) => (
                      <div key={i} className="flex items-center space-x-1.5 border-b border-stone-200 pb-1">
                        <input
                          type="text"
                          value={it.name || ''}
                          onChange={(e) => handleItemNameChange(i, e.target.value)}
                          className="w-3/5 bg-stone-50 border border-black p-1 rounded text-xs font-bold uppercase focus:bg-white focus:outline-none"
                          placeholder="Producto"
                        />
                        <div className="w-2/5 flex items-center space-x-1">
                          <span className="text-xs font-black">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={it.price ?? ''}
                            onChange={(e) => handleItemPriceChange(i, parseFloat(e.target.value) || 0)}
                            className="w-full bg-stone-50 border border-black p-1 rounded text-xs font-bold focus:bg-white focus:outline-none"
                            placeholder="0.00"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(i)}
                            className="p-1 bg-rose-200 border border-black rounded text-[10px] font-black hover:bg-rose-300 cursor-pointer"
                            title="Eliminar"
                          >
                            🗑️️
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-stone-500 italic text-center py-1">
                      No hay productos detectados. Usa "➕ Agregar" para insertar uno.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setReviewData(null)}
                  disabled={loading}
                  className="w-1/2 py-2.5 bg-stone-300 text-stone-800 border-2 border-black rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-stone-200 active:translate-x-0.5 active:translate-y-0.5"
                >
                  Volver
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-1/2 py-2.5 bg-emerald-400 text-black border-2 border-black rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-emerald-300 active:translate-x-0.5 active:translate-y-0.5"
                >
                  {loading ? 'Guardando...' : '💾 Guardar'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}