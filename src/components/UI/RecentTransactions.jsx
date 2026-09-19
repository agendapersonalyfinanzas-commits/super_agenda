import React, { useState } from 'react';
import { formatearMoneda } from '../../utils/moneda.js';
import PDFPreviewModal from './PDFPreviewModal.jsx';

export default function RecentTransactions({ transactions = [], onDelete, onUpdate }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'expense' | 'income'
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Estados Modal Edición
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [editConcept, setEditConcept] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState('expense');

  // Estados Modal Eliminación
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState(null);

  // --- MANEJADORES EDICIÓN ---
  const handleStartEdit = (tx) => {
    setEditTx(tx);
    setEditConcept(tx.concept || tx.category || '');
    setEditAmount(tx.amount.toString());
    setEditType(tx.transaction_type || 'expense');
    setEditModalOpen(true);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    const parsedAmount = Number(editAmount);
    
    if (!isNaN(parsedAmount) && parsedAmount > 0 && onUpdate && editTx) {
      // Pasamos un objeto con todos los datos editables para que el componente padre lo actualice
      onUpdate(editTx.id, {
        amount: parsedAmount,
        concept: editConcept.toUpperCase(),
        transaction_type: editType
      });
    }
    setEditModalOpen(false);
  };

  // --- MANEJADORES ELIMINACIÓN ---
  const handleStartDelete = (tx) => {
    setTxToDelete(tx);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete && txToDelete) {
      onDelete(txToDelete.id);
    }
    setDeleteModalOpen(false);
  };

  // Filtrar transacciones según la pestaña seleccionada
  const filteredTransactions = transactions.filter((tx) => {
    if (filter === 'expense') return tx.transaction_type === 'expense';
    if (filter === 'income') return tx.transaction_type === 'income';
    return true; // 'all'
  });

  if (!transactions || transactions.length === 0) {
    return null;
  }

  return (
    <>
      <div className="border-4 border-black bg-white p-5 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4 font-mono">
        
        {/* CABECERA CON TÍTULO LIMPIO Y BOTÓN DE PDF QUE ABRE EL ZOOM */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b-2 border-black pb-3">
          <div>
            <h3 className="text-xs font-black uppercase text-black">🕒 Historial Últimos Movimientos</h3>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* Botón que abre la vista previa con Zoom */}
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              title="Ver reporte con Zoom"
              className="bg-amber-300 border-2 border-black px-3 py-1 text-[10px] font-black uppercase rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-200 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex items-center gap-1"
            >
              <span>🔍 📥 PDF (Zoom)</span>
            </button>

            {/* Botones de filtro rápido */}
            <div className="flex items-center gap-1 bg-stone-100 p-1 border-2 border-black rounded-2xl">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-2 py-1 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer ${
                  filter === 'all' ? 'bg-black text-white shadow' : 'bg-transparent text-stone-700 hover:bg-stone-200'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFilter('expense')}
                className={`px-2 py-1 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer ${
                  filter === 'expense' ? 'bg-rose-500 text-white shadow' : 'bg-transparent text-rose-700 hover:bg-rose-100'
                }`}
              >
                🔴 Egresos
              </button>
              <button
                type="button"
                onClick={() => setFilter('income')}
                className={`px-2 py-1 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer ${
                  filter === 'income' ? 'bg-emerald-500 text-white shadow' : 'bg-transparent text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                🟢 Ingresos
              </button>
            </div>
          </div>
        </div>

        {/* LISTA DE MOVIMIENTOS */}
        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-6 text-xs font-bold text-stone-400 uppercase">
              No hay registros en esta categoría
            </div>
          ) : (
            filteredTransactions.slice(0, 10).map((tx) => {
              const isIncome = tx.transaction_type === 'income';
              
              return (
                <div 
                  key={tx.id} 
                  className={`flex items-center justify-between p-3 border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-xs transition-all ${
                    isIncome ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full border border-black ${isIncome ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <span className="font-black uppercase block text-black">{tx.concept || tx.category}</span>
                    </div>
                    <span className="text-[10px] text-stone-600 font-bold">
                      {new Date(tx.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • <span className="uppercase">{tx.user_name || 'LUIS'}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`font-black text-sm ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {isIncome ? '+' : '-'}{formatearMoneda(tx.amount)}
                    </span>

                    <div className="flex items-center gap-1.5 ml-2 border-l-2 border-black pl-2">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(tx)}
                        title="Editar movimiento"
                        className="bg-amber-300 border-2 border-black w-7 h-7 rounded-xl font-black flex items-center justify-center text-xs cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-105 transition-transform"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartDelete(tx)}
                        title="Eliminar registro"
                        className="bg-red-500 text-white border-2 border-black w-7 h-7 rounded-xl font-black flex items-center justify-center text-xs cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-105 transition-transform"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <PDFPreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        transactions={filteredTransactions}
      />

      {/* =========================================
          MODAL EDICIÓN DE MOVIMIENTO (Estilo Peanuts)
          ========================================= */}
      {editModalOpen && editTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm font-mono">
          <div className="bg-amber-100 border-4 border-black p-6 rounded-3xl w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-bounce-short">
            <h2 className="text-xl font-black uppercase text-black mb-4 border-b-4 border-black pb-2">✏️ Editar Movimiento</h2>
            
            <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-black uppercase mb-1">Tipo:</label>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setEditType('expense')} 
                    className={`flex-1 py-2 rounded-xl border-4 border-black font-black uppercase transition-all ${editType === 'expense' ? 'bg-rose-500 text-white shadow-none translate-x-1 translate-y-1' : 'bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}
                  >
                    🔴 Egreso
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setEditType('income')} 
                    className={`flex-1 py-2 rounded-xl border-4 border-black font-black uppercase transition-all ${editType === 'income' ? 'bg-emerald-500 text-white shadow-none translate-x-1 translate-y-1' : 'bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}
                  >
                    🟢 Ingreso
                  </button>
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-black uppercase mb-1">Concepto:</label>
                <input 
                  type="text" 
                  value={editConcept} 
                  onChange={(e) => setEditConcept(e.target.value)} 
                  required 
                  className="border-4 border-black p-2 rounded-xl text-lg font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-x-1 focus:translate-y-1 focus:shadow-none transition-all bg-white" 
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-black uppercase mb-1">Monto ($):</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={editAmount} 
                  onChange={(e) => setEditAmount(e.target.value)} 
                  required 
                  className="border-4 border-black p-2 rounded-xl text-2xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-x-1 focus:translate-y-1 focus:shadow-none transition-all bg-white" 
                />
              </div>

              <div className="flex gap-4 mt-4">
                <button type="button" onClick={() => setEditModalOpen(false)} className="flex-1 bg-white border-4 border-black py-2 rounded-xl font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1">
                  CANCELAR
                </button>
                <button type="submit" className="flex-1 bg-blue-500 text-white border-4 border-black py-2 rounded-xl font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1">
                  GUARDAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL CONFIRMACIÓN ELIMINAR
          ========================================= */}
      {deleteModalOpen && txToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm font-mono">
          <div className="bg-rose-100 border-4 border-black p-6 rounded-3xl w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-bounce-short">
            <h2 className="text-xl font-black uppercase text-black mb-4 border-b-4 border-black pb-2 text-center">⚠️ ¿Eliminar?</h2>
            
            <p className="text-center font-bold text-sm mb-6 uppercase text-black">
              ¿Estás seguro de eliminar el movimiento? <br/>
              <span className="text-rose-600 text-xl block mt-2 font-black">"{txToDelete.concept || txToDelete.category}"</span>
            </p>
            
            <div className="flex gap-4 mt-4">
              <button type="button" onClick={() => setDeleteModalOpen(false)} className="flex-1 bg-white border-4 border-black py-2 rounded-xl font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1">
                CANCELAR
              </button>
              <button type="button" onClick={handleConfirmDelete} className="flex-1 bg-red-500 text-white border-4 border-black py-2 rounded-xl font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1">
                ELIMINAR
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}