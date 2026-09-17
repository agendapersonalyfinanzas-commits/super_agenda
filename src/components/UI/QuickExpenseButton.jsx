import React, { useState } from 'react';
import { PRESET_MAP } from './Icons';
import { formatearMoneda } from '../../utils/moneda.js';

export default function QuickExpenseButton({ 
  icon, 
  label, 
  defaultAmount, 
  category, 
  onSave, 
  btnId,
  onDragStart,
  onDrop,
  isExpense 
}) {
  const [showModal, setShowModal] = useState(false);
  const [amountInput, setAmountInput] = useState(defaultAmount ?? '');

  const resolveIconSrc = (iconProp) => {
    if (!iconProp) return '/charlie-market.png';
    if (iconProp.startsWith('/') || iconProp.startsWith('data:')) return iconProp;
    if (PRESET_MAP && PRESET_MAP[iconProp]) return PRESET_MAP[iconProp];
    return iconProp;
  };

  const finalImageSrc = resolveIconSrc(icon);

  // Manejo del clic corto para abrir la calculadora y corregir el monto
  const handleClick = (e) => {
    e.stopPropagation();
    setAmountInput(defaultAmount ?? '');
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ 
      amount: Number(amountInput) || 0, 
      category, 
      concept: label 
    });
    setShowModal(false);
  };

  return (
    <div 
      className="flex flex-col items-center gap-1.5 relative select-none"
      draggable={isExpense}
      onDragStart={(e) => {
        if (isExpense && onDragStart) {
          e.dataTransfer.setData('text/plain', btnId);
          onDragStart(btnId);
        }
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (isExpense && onDrop) {
          onDrop(btnId);
        }
      }}
    >
      {/* Botón Circular 3D con imagen abarcando todo el círculo */}
      <button
        type="button"
        onClick={handleClick}
        className="relative w-28 h-28 rounded-full border-4 border-black overflow-hidden bg-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 active:translate-x-1.5 active:translate-y-1.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center group"
        title="Arrastra para mover o haz clic para registrar/ajustar monto"
      >
        <img
          src={finalImageSrc}
          alt={label}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none rounded-full"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/charlie-market.png';
          }}
        />
      </button>

      {/* Etiqueta y Monto debajo del círculo */}
      <div className="text-center pointer-events-none">
        <span className="block text-[10px] font-black uppercase bg-white border-2 border-black px-2 py-0.5 rounded-lg text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] max-w-27.5 truncate">
          {label}
        </span>
        {defaultAmount > 0 && (
          <span className="block text-[9px] font-bold text-stone-700 mt-0.5">
            {formatearMoneda(defaultAmount)}
          </span>
        )}
      </div>

      {/* Modal / Calculadora con posicionamiento global fijo para evitar deformaciones */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 font-mono select-none">
          <div className="w-full max-w-sm bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b-2 border-black pb-3 bg-amber-100 -mx-6 -mt-6 p-4 rounded-t-[20px]">
              <h3 className="font-black text-xs uppercase text-black">✨ Registrar {label}</h3>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                className="font-black text-base cursor-pointer hover:scale-110 transition-transform bg-white border-2 border-black rounded-full w-7 h-7 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-black uppercase mb-1.5 text-stone-700">Monto Real ($)</label>
                <input
                  type="number"
                  step="any"
                  autoFocus
                  required
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="0.00"
                  className="w-full px-4 py-3 border-3 border-black rounded-xl text-base font-bold text-black focus:outline-none focus:ring-4 focus:ring-amber-400 bg-stone-50"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-amber-400 text-black border-3 border-black rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-300 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
              >
                Guardar Gasto
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}