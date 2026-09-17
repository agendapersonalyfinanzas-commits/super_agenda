import React, { useRef, useState } from 'react';
import { PRESET_MAP, PRESETS } from '../UI/Icons';
import { manejarInputMayusculas } from '../../utils/mayusculas.js';

export default function EditImageModal({ onClose, currentLabel, onSaveConfig }) {
  const fileInputRef = useRef(null);
  const [newLabel, setNewLabel] = useState(currentLabel || '');

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) onSaveConfig({ label: newLabel, customData: reader.result, presetKey: null });
      };
      reader.readAsDataURL(file);
    }
  };

  const availablePresets = PRESETS || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center p-4 font-mono select-none">
      <div className="w-full max-w-md bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        
        <div className="flex justify-between items-center border-b-4 border-black pb-2 bg-amber-100 -mx-6 -mt-6 p-4 rounded-t-[20px]">
          <h3 className="font-black uppercase text-sm text-black">Editar Gasto Rápido</h3>
          <button 
            type="button"
            onClick={onClose} 
            className="text-black font-black text-xl hover:scale-110 active:scale-95 transition-transform cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSaveConfig({ label: newLabel }); }} className="space-y-2 pt-2">
          <h4 className="text-xs font-black uppercase text-stone-600">Nombre del Botón (Pie)</h4>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newLabel} 
              onChange={manejarInputMayusculas ? manejarInputMayusculas(setNewLabel) : (e) => setNewLabel(e.target.value.toUpperCase())} 
              className="flex-1 px-3 py-2 border-2 border-black rounded-xl text-sm font-bold text-black uppercase focus:outline-none focus:ring-2 focus:ring-amber-400" 
              placeholder="CAMBIAR NOMBRE..." 
            />
            <button 
              type="submit" 
              className="px-4 py-2 bg-amber-400 text-black border-2 border-black rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-300 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            >
              OK
            </button>
          </div>
        </form>

        <div className="space-y-2 pt-2 border-t-2 border-dashed border-stone-200">
          <h4 className="text-xs font-black uppercase text-stone-600">Subir nueva foto</h4>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            className="w-full py-2.5 bg-stone-100 border-2 border-black rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black hover:bg-stone-200 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            📸 Cargar desde dispositivo
          </button>
        </div>

        <div className="space-y-2 pt-2 border-t-2 border-dashed border-stone-200">
          <h4 className="text-xs font-black uppercase text-stone-600">Cambiar Personaje de la App</h4>
          <div className="grid grid-cols-3 gap-2">
            {availablePresets.map((preset) => {
              const imgSrc = preset.src || (PRESET_MAP && PRESET_MAP[preset.key]);
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => onSaveConfig({ label: newLabel, presetKey: preset.key, customData: null })}
                  className="flex flex-col items-center p-2 border-2 border-black rounded-xl bg-stone-50 hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 overflow-hidden rounded-full border border-black bg-white flex items-center justify-center">
                    {imgSrc ? (
                      <img src={imgSrc} alt={preset.name} className="w-full h-full object-cover scale-125 pointer-events-none" />
                    ) : (
                      <span className="text-xs font-black">⭐</span>
                    )}
                  </div>
                  <span className="text-[9px] font-bold text-center mt-1 text-black block truncate w-full uppercase">{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}