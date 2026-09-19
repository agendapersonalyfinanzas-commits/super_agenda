import React from 'react';

export default function QuickExpenseButton({
  action,
  index,
  isEditMode,
  onClick,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}) {
  const displayName = action?.label || action?.name || action?.concept || 'BOTÓN';

  return (
    <div
      className="relative flex flex-col items-center select-none cursor-grab active:cursor-grabbing"
      draggable={true}
      onDragStart={(e) => onDragStart && onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop && onDrop(e, index)}
      onDragEnd={onDragEnd}
    >
      <button
        type="button"
        draggable={false}
        onClick={() => onClick && onClick(action)}
        className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all relative overflow-hidden ${
          isEditMode ? 'ring-4 ring-amber-400' : 'cursor-pointer hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'
        }`}
      >
        {/* 🛑 pointer-events-none y draggable={false} evitan que el navegador arrastre solo la imagen */}
        <img
          src={action?.icon || action?.image || '/charlie-market.png'}
          alt={displayName}
          draggable={false}
          className="w-full h-full object-cover pointer-events-none select-none"
        />
        {isEditMode && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
            <span className="bg-amber-400 text-black text-[10px] font-black px-2 py-1 border-2 border-black rounded">
              EDITAR
            </span>
          </div>
        )}
      </button>

      <span className="mt-3 text-xs font-black uppercase text-black text-center w-full truncate bg-white px-2 py-1 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] pointer-events-none">
        {displayName}
      </span>

      {isEditMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`¿Eliminar botón ${displayName}?`)) {
              if (onDelete) {
                onDelete(action?.id);
              }
            }
          }}
          className="absolute -top-2 -right-2 bg-red-600 text-white w-8 h-8 rounded-full border-4 border-black flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:scale-90 z-20 cursor-pointer"
        >
          X
        </button>
      )}
    </div>
  );
}