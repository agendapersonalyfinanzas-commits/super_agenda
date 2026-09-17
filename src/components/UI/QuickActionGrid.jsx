import React, { useState } from 'react';
import QuickExpenseButton from './QuickExpenseButton';

export default function QuickActionGrid({
  title,
  subtitle,
  actions = [],
  onSelect,
  onSave,
  isEditMode,
  onEditImage,
  onDelete,
  onAddCustom,
  bgColor = "bg-rose-500/15",
  titleColor = "text-rose-950",
  subtitleColor = "text-rose-800",
  isExpense = true
}) {
  const [draggedId, setDraggedId] = useState(null);

  const handleDragStart = (id) => {
    setDraggedId(id);
  };

  const handleDrop = (targetId) => {
    if (!draggedId || draggedId === targetId) return;
    if (onSelect) {
      onSelect(draggedId);
      setTimeout(() => onSelect(targetId), 50);
    }
    setDraggedId(null);
  };

  return (
    <div className={`border-4 border-black ${bgColor} p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4`}>
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-sm font-black uppercase ${titleColor}`}>{title}</h2>
          <p className={`text-[10px] font-bold ${subtitleColor} uppercase tracking-tight`}>
            {subtitle} (Arrastra para reordenar)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 justify-items-center">
        {actions.map((btn) => (
          <div key={btn.id} className="relative select-none">
            <QuickExpenseButton 
              btnId={btn.id}
              icon={btn.icon_url} 
              label={btn.label} 
              defaultAmount={btn.default_amount} 
              category={btn.category} 
              onSave={onSave}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              isExpense={isExpense}
            />

            {isEditMode && (
              <div className="absolute -top-2 -right-2 flex gap-1 z-30 pointer-events-auto">
                <button 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); onEditImage(btn.id); }} 
                  className="bg-amber-400 border-2 border-black font-black text-[11px] rounded-full w-6 h-6 flex items-center justify-center cursor-pointer shadow"
                >
                  📷
                </button>
                <button 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); onDelete(btn.id); }} 
                  className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-[11px] font-black border-2 border-black cursor-pointer shadow"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Botón Añadir */}
        <div className="flex flex-col items-center gap-2">
          <button 
            type="button" 
            onClick={onAddCustom} 
            className="w-28 h-28 flex items-center justify-center bg-white border-4 border-black rounded-full text-black text-3xl font-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:scale-105 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer"
          >
            +
          </button>
          <span className={`text-[11px] font-black uppercase bg-white border-2 border-black px-2 py-0.5 rounded-lg ${titleColor} shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]`}>
            Añadir
          </span>
        </div>
      </div>
    </div>
  );
}