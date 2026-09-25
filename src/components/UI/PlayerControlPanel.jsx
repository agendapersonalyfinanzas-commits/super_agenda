import React from 'react';

export default function PlayerControlPanel({
  activeUser
}) {
  return (
    <div className="player-control-container p-4 rounded-3xl border-4 border-black bg-amber-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-mono flex flex-col sm:flex-row items-center justify-between gap-3 select-none">
      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-center sm:justify-start">
        <span className="w-3.5 h-3.5 bg-emerald-500 border-2 border-black rounded-full inline-block shadow-sm shrink-0" />
        <span className="font-black text-xs uppercase text-stone-800">CUENTA AUTENTICADA:</span>
        <span className="font-black text-xs sm:text-sm uppercase bg-white border-2 border-black px-3 py-1 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black truncate">
          {activeUser || 'LUIS RICARDO'}
        </span>
      </div>
      <div className="text-[10px] font-black uppercase bg-stone-900 text-amber-300 px-3 py-1 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] tracking-wider">
        ★ ARQUITECTURA DE USUARIO ÚNICO ★
      </div>
    </div>
  );
}