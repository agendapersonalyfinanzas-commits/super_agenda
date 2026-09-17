import React, { useState } from 'react';
import { formatearMoneda } from '../../utils/moneda.js';
import PDFPreviewModal from './PDFPreviewModal.jsx';

export default function RecentTransactions({ transactions = [], onDelete, onUpdate }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'expense' | 'income'
  const [editingId, setEditingId] = useState(null);
  const [newAmount, setNewAmount] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleStartEdit = (tx) => {
    setEditingId(tx.id);
    setNewAmount(tx.amount);
  };

  const handleSaveEdit = (id) => {
    const parsed = Number(newAmount);
    if (!isNaN(parsed) && onUpdate) {
      onUpdate(id, parsed);
    }
    setEditingId(null);
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
                    {editingId === tx.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="any"
                          autoFocus
                          value={newAmount}
                          onChange={(e) => setNewAmount(e.target.value)}
                          className="w-22 px-2 py-1.5 border-2 border-black rounded-xl text-xs font-bold bg-white text-black"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(tx.id)}
                          className="bg-emerald-400 border-2 border-black px-2.5 py-1.5 rounded-xl font-black text-[10px] cursor-pointer shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:bg-emerald-300"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="bg-stone-300 border-2 border-black px-2.5 py-1.5 rounded-xl font-black text-[10px] cursor-pointer shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span className={`font-black text-sm ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isIncome ? '+' : '-'}{formatearMoneda(tx.amount)}
                      </span>
                    )}

                    {editingId !== tx.id && (
                      <div className="flex items-center gap-1.5 ml-2 border-l-2 border-black pl-2">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(tx)}
                          title="Editar monto"
                          className="bg-amber-300 border-2 border-black w-7 h-7 rounded-xl font-black flex items-center justify-center text-xs cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-105 transition-transform"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(tx.id)}
                          title="Eliminar registro"
                          className="bg-red-500 text-white border-2 border-black w-7 h-7 rounded-xl font-black flex items-center justify-center text-xs cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-105 transition-transform"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
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
    </>
  );
}