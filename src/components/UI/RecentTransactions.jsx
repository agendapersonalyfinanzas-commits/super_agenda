import React, { useState, useMemo } from 'react';
import { formatearMoneda } from '../../utils/moneda.js';
import PDFPreviewModal from './PDFPreviewModal.jsx';

// 🟢 Helper seguro para mostrar fecha y hora local exacta sin desfases de UTC
const formatearFechaLimpia = (tx) => {
  const rawDate = tx.transaction_date || tx.created_at;
  if (!rawDate) return '';

  if (typeof rawDate === 'string' && rawDate.length === 10 && rawDate.includes('-')) {
    const [anio, mes, dia] = rawDate.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  const fecha = new Date(rawDate);
  if (!isNaN(fecha)) {
    const dia = String(fecha.getUTCDate()).padStart(2, '0');
    const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
    const anio = fecha.getUTCFullYear();

    if (rawDate.includes('T') && (fecha.getHours() !== 0 || fecha.getMinutes() !== 0)) {
      const localDia = String(fecha.getDate()).padStart(2, '0');
      const localMes = String(fecha.getMonth() + 1).padStart(2, '0');
      const localAnio = fecha.getFullYear();
      const localHoras = String(fecha.getHours()).padStart(2, '0');
      const localMinutos = String(fecha.getMinutes()).padStart(2, '0');
      return `${localDia}/${localMes}/${localAnio} ${localHoras}:${localMinutos}`;
    }

    return `${dia}/${mes}/${anio}`;
  }

  return rawDate;
};

export default function RecentTransactions({ transactions = [], onDelete, onUpdate }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'savings' | 'expense' | 'income' | 'retro-expense' | 'retro-income'
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Estados Modal Edición
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [editConcept, setEditConcept] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState('expense');
  const [editDate, setEditDate] = useState('');
  const [editRetroactive, setEditRetroactive] = useState(false);

  // Estados Modal Eliminación
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState(null);

  // --- MANEJADORES EDICIÓN ---
  const handleStartEdit = (tx) => {
    setEditTx(tx);
    setEditConcept(tx.concept || tx.category || '');
    setEditAmount(tx.amount.toString());
    setEditType(tx.transaction_type || 'expense');
    setEditDate(tx.transaction_date || tx.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]);
    setEditRetroactive(Boolean(tx.is_retroactive));
    setEditModalOpen(true);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    const parsedAmount = Number(editAmount);
    
    if (!isNaN(parsedAmount) && parsedAmount > 0 && onUpdate && editTx) {
      onUpdate(editTx.id, {
        amount: parsedAmount,
        concept: editConcept.toUpperCase(),
        transaction_type: editType,
        transaction_date: editDate,
        is_retroactive: editRetroactive
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

  // 🌟 Ordenar transacciones de más reciente a más antigua basándose en la fecha contable (transaction_date)
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = new Date(a.transaction_date || a.created_at || 0);
    const dateB = new Date(b.transaction_date || b.created_at || 0);
    return dateB - dateA;
  });

  // Filtrar transacciones según la pestaña seleccionada utilizando estrictamente is_retroactive
  const filteredTransactions = sortedTransactions.filter((tx) => {
    const isSavings = tx.category === 'AHORRO' || tx.concept?.includes('Abono a meta');
    const isRetroactive = Boolean(tx.is_retroactive);

    if (filter === 'savings') return isSavings;
    if (filter === 'expense') return !isSavings && tx.transaction_type === 'expense';
    if (filter === 'income') return !isSavings && tx.transaction_type === 'income';
    if (filter === 'retro-expense') return !isSavings && tx.transaction_type === 'expense' && isRetroactive;
    if (filter === 'retro-income') return !isSavings && tx.transaction_type === 'income' && isRetroactive;
    return true; // 'all'
  });

  // 🌟 Cálculo inteligente del total: Balance Neto en 'all', o suma específica en filtros
  const totalFilteredAmount = useMemo(() => {
    if (filter === 'all') {
      return filteredTransactions.reduce((acc, tx) => {
        const amount = Number(tx.amount || 0);
        const isIncome = tx.transaction_type === 'income' && !(tx.category === 'AHORRO' || tx.concept?.includes('Abono a meta'));
        return isIncome ? acc + amount : acc - amount;
      }, 0);
    } else {
      return filteredTransactions.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
    }
  }, [filteredTransactions, filter]);

  if (!transactions || transactions.length === 0) {
    return null;
  }

  // 🟢 Determinamos si el total actual debe mostrarse en rojo y con signo negativo (Egresos)
  const isExpenseFilter = filter === 'expense' || filter === 'retro-expense';
  const isNegativeBalance = filter === 'all' && totalFilteredAmount < 0;
  const showRedNegative = isExpenseFilter || isNegativeBalance;

  return (
    <>
      <div className="border-4 border-black bg-white p-5 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4 font-mono">
        
        {/* CABECERA CON TÍTULO Y BOTONES DE FILTRO */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 border-b-2 border-black pb-3">
          <div>
            <h3 className="text-xs font-black uppercase text-black">🕒 Historial Últimos Movimientos</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-between xl:justify-end">
            {/* Botón que abre la vista previa con Zoom */}
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              title="Ver reporte con Zoom"
              className="bg-amber-300 border-2 border-black px-3 py-1 text-[10px] font-black uppercase rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-200 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex items-center gap-1"
            >
              <span>🔍 📥 PDF (Zoom)</span>
            </button>

            {/* Botones de filtro rápido con la misma estética unificada */}
            <div className="flex items-center gap-1 bg-stone-100 p-1 border-2 border-black rounded-2xl flex-wrap">
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
                onClick={() => setFilter('savings')}
                className={`px-2 py-1 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer ${
                  filter === 'savings' ? 'bg-blue-500 text-white shadow' : 'bg-transparent text-blue-700 hover:bg-blue-100'
                }`}
              >
                🔵 Ahorros
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
              <button
                type="button"
                onClick={() => setFilter('retro-expense')}
                className={`px-2 py-1 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer ${
                  filter === 'retro-expense' ? 'bg-orange-500 text-white shadow' : 'bg-transparent text-orange-700 hover:bg-orange-100'
                }`}
                title="Filtrar Egresos Retroactivos"
              >
                🟠 Egresos Retro.
              </button>
              <button
                type="button"
                onClick={() => setFilter('retro-income')}
                className={`px-2 py-1 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer ${
                  filter === 'retro-income' ? 'bg-amber-400 text-black shadow font-black' : 'bg-transparent text-amber-800 hover:bg-yellow-100'
                }`}
                title="Filtrar Ingresos Retroactivos"
              >
                🟡 Ingresos Retro.
              </button>
            </div>
          </div>
        </div>

        {/* 🌟 BARRA DE SUMA TOTAL CON SIGNO Y COLOR ADECUADO */}
        <div className={`p-3 border-2 border-black rounded-2xl flex justify-between items-center text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
          filter === 'savings' ? 'bg-blue-100 text-blue-950' :
          filter === 'expense' ? 'bg-rose-100 text-rose-950' :
          filter === 'income' ? 'bg-emerald-100 text-emerald-950' :
          filter === 'retro-expense' ? 'bg-orange-100 text-orange-950' :
          filter === 'retro-income' ? 'bg-yellow-100 text-black' :
          'bg-amber-100 text-black'
        }`}>
          <span>
            {filter === 'all' ? '⚖️ Balance Neto General:' : `Total (${
              filter === 'savings' ? 'Ahorros' : 
              filter === 'expense' ? 'Egresos' : 
              filter === 'income' ? 'Ingresos' :
              filter === 'retro-expense' ? 'Egresos Retroactivos' : 'Ingresos Retroactivos'
            }):`}
          </span>
          <span className={`text-sm font-black ${showRedNegative ? 'text-rose-600' : ''}`}>
            {isExpenseFilter && totalFilteredAmount > 0 
              ? `-${formatearMoneda(totalFilteredAmount)}`
              : isNegativeBalance
                ? `-${formatearMoneda(Math.abs(totalFilteredAmount))}`
                : formatearMoneda(totalFilteredAmount)}
          </span>
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
              const isSavings = tx.category === 'AHORRO' || tx.concept?.includes('Abono a meta');
              
              const isRetroactive = Boolean(tx.is_retroactive);
              const formattedDate = formatearFechaLimpia(tx);

              let dotColor = 'bg-rose-500';
              let bgColorClass = 'bg-rose-500/10';
              let textColorClass = 'text-rose-700';

              if (isSavings) {
                dotColor = 'bg-blue-500';
                bgColorClass = 'bg-blue-500/10';
                textColorClass = 'text-blue-700';
              } else if (isIncome) {
                dotColor = 'bg-emerald-500';
                bgColorClass = 'bg-emerald-500/10';
                textColorClass = 'text-emerald-700';
              }

              return (
                <div 
                  key={tx.id} 
                  className={`flex items-center justify-between p-3 border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-xs transition-all ${bgColorClass}`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`w-2.5 h-2.5 rounded-full border border-black ${dotColor}`} />
                      <span className="font-black uppercase block text-black">{tx.concept || tx.category}</span>
                      
                      {isRetroactive && (
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${
                          isIncome ? 'bg-yellow-300 text-black' : 'bg-orange-400 text-black'
                        }`}>
                          {isIncome ? 'Ingreso Retroactivo' : 'Egresos Retroactivo'}
                        </span>
                      )}
                    </div>
                    
                    <span className="text-[10px] text-stone-600 font-bold flex items-center gap-1">
                      <span className={isRetroactive ? 'text-orange-600 font-black bg-orange-100 px-1.5 py-0.5 rounded border border-black/40' : ''}>
                        📅 {formattedDate}
                      </span> 
                      <span>•</span>
                      <span className="uppercase">{tx.user_name || 'LUIS'}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`font-black text-sm ${textColorClass}`}>
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

      {/* MODAL EDICIÓN */}
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
                <label className="text-sm font-black uppercase mb-1">Fecha del movimiento:</label>
                <input 
                  type="date" 
                  value={editDate} 
                  onChange={(e) => setEditDate(e.target.value)} 
                  required 
                  className="border-4 border-black p-2 rounded-xl text-sm font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-x-1 focus:translate-y-1 focus:shadow-none transition-all bg-white cursor-pointer" 
                />
              </div>

              {/* Casilla de control retroactivo en edición */}
              <div className="flex items-center gap-2 bg-white/60 border-2 border-black p-3 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <input
                  type="checkbox"
                  id="editRetroToggle"
                  checked={editRetroactive}
                  onChange={(e) => setEditRetroactive(e.target.checked)}
                  className="w-5 h-5 accent-amber-400 border-2 border-black rounded cursor-pointer"
                />
                <label htmlFor="editRetroToggle" className="text-xs font-black uppercase text-black cursor-pointer select-none">
                  Marcar como movimiento retroactivo
                </label>
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

      {/* MODAL ELIMINAR */}
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