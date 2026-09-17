import React from 'react';

export default function PlayerControlPanel({
  activeUser,
  setActiveUser,
  availableUsersList,
  isEditMode,
  setIsEditMode,
  setSelectedExpenseId,
  showAddPlayerRow,
  setShowAddPlayerRow,
  newPlayerName,
  setNewPlayerName,
  onAddPlayer
}) {
  return (
    <div className="border-4 border-black bg-white p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4 w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-stone-600 shrink-0">👤 Jugador:</span>
            <select 
              value={activeUser} 
              onChange={(e) => setActiveUser(e.target.value)} 
              className="px-2.5 py-1.5 border-2 border-black rounded-xl text-xs font-black bg-amber-400 focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer truncate max-w-32.5 sm:max-w-none"
            >
              {availableUsersList.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <button 
            type="button"
            onClick={() => {
              setIsEditMode(!isEditMode);
              if (setSelectedExpenseId) setSelectedExpenseId(null);
            }}
            className={`px-3 py-1.5 border-3 sm:border-4 border-black rounded-xl font-black text-xs uppercase tracking-wide shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer ${
              isEditMode ? 'bg-rose-400 text-black shadow-none translate-x-0.5 translate-y-0.5' : 'bg-amber-400 text-black hover:bg-amber-300'
            }`}
          >
            {isEditMode ? '⚙️ LISTO' : '🛠️ EDITAR BOTONES'}
          </button>
        </div>
        
        <button 
          type="button" 
          onClick={() => setShowAddPlayerRow(!showAddPlayerRow)} 
          className="px-3 py-1.5 bg-stone-100 border-2 border-black rounded-xl text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-stone-200 cursor-pointer w-full sm:w-auto text-center"
        >
          {showAddPlayerRow ? 'Cancelar' : '➕ Registrar Jugador'}
        </button>
      </div>

      {showAddPlayerRow && (
        <form onSubmit={onAddPlayer} className="flex flex-col sm:flex-row gap-2 pt-2 border-t-2 border-dashed border-stone-200 items-stretch sm:items-center">
          <input 
            type="text" 
            value={newPlayerName} 
            onChange={(e) => setNewPlayerName(e.target.value)} 
            placeholder="ESCRIBE TU NOMBRE DE JUGADOR..." 
            maxLength={15} 
            className="flex-1 px-3 py-2 border-2 border-black rounded-xl text-xs font-bold focus:outline-none uppercase" 
          />
          <button type="submit" className="px-4 py-2 bg-emerald-400 border-2 border-black rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer">
            Guardar
          </button>
        </form>
      )}
    </div>
  );
}