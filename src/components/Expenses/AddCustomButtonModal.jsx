import React, { useState } from 'react';

// Corrección de ruta: 2 niveles arriba (../../utils)
import { manejarInputMayusculas } from '../../utils/mayusculas.js';

export default function AddCustomButtonModal({ 
  onClose, 
  onSubmit, 
  name, 
  setName, 
  amount, 
  setAmount, 
  cat, 
  setCat,
  presetIcons = [],
  onSelectIcon 
}) {
  const [selectedIconIdx, setSelectedIconIdx] = useState(null);

  const handleChooseIcon = (iconUrl, index) => {
    setSelectedIconIdx(index);
    if (onSelectIcon) onSelectIcon(iconUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center p-4 font-mono select-none">
      <div className="w-full max-w-md bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        
        <div className="flex justify-between items-center border-b-4 border-black pb-2 bg-amber-100 -mx-6 -mt-6 p-4 rounded-t-[20px]">
          <h3 className="font-black uppercase text-sm text-black">✨ Nuevo Botón Rápido</h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-black font-black text-xl hover:scale-110 active:scale-95 transition-transform cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-[10px] font-black uppercase mb-1 text-stone-600">
              Concepto / Nombre
            </label>
            <input 
              type="text" 
              required 
              placeholder="EJ: GASOLINA, SUPER, CINE" 
              value={name} 
              onChange={manejarInputMayusculas(setName)} 
              className="w-full px-3 py-2 border-2 border-black rounded-xl text-sm font-bold text-black uppercase focus:outline-none focus:ring-2 focus:ring-amber-400" 
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase mb-1 text-stone-600">
              Monto Predeterminado
            </label>
            <input 
              type="number" 
              required 
              min="0" 
              step="any" 
              placeholder="0.00" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              className="w-full px-3 py-2 border-2 border-black rounded-xl text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-amber-400" 
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase mb-1 text-stone-600">
              Categoría
            </label>
            <select 
              value={cat} 
              onChange={e => setCat(e.target.value.toUpperCase())} 
              className="w-full px-3 py-2 border-2 border-black rounded-xl text-sm font-bold bg-white text-black uppercase focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              <option value="MERCADO">MERCADO</option>
              <option value="ALIMENTACIÓN">ALIMENTACIÓN</option>
              <option value="TRANSPORTE">TRANSPORTE</option>
              <option value="SERVICIOS">SERVICIOS</option>
              <option value="MANTENIMIENTO">MANTENIMIENTO</option>
              <option value="VARIOS">VARIOS</option>
            </select>
          </div>

          {presetIcons.length > 0 && (
            <div>
              <label className="block text-[10px] font-black uppercase mb-1 text-stone-600">
                Selecciona un personaje / ícono
              </label>
              <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto p-2 border-2 border-black rounded-xl bg-stone-50">
                {presetIcons.map((iconUrl, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => handleChooseIcon(iconUrl, idx)}
                    className={`h-16 w-full border-2 rounded-xl overflow-hidden flex items-center justify-center transition-all cursor-pointer ${
                      selectedIconIdx === idx 
                        ? 'border-black bg-amber-300 scale-105 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                        : 'border-stone-200 hover:border-black bg-white'
                    }`}
                  >
                    <img 
                      src={iconUrl} 
                      alt="Preset" 
                      className="w-full h-full object-cover object-center" 
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="w-full py-3 bg-amber-400 text-black border-4 border-black rounded-xl font-black text-xs uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-300 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            Crear Acceso
          </button>
        </form>
      </div>
    </div>
  );
}