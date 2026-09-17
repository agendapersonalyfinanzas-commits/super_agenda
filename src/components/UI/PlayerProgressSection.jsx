import React from 'react';
import { formatearMoneda } from '../../utils/moneda.js';

export default function PlayerProgressSection({ activePlayers, activeUser, isSampleData }) {
  const maxBalance = Math.max(...activePlayers.map((b) => Math.abs(b.balance)), 1);

  return (
    <section className="border-4 border-black bg-amber-400 p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-black uppercase">🏆 Avance de Disciplina Financiera</h2>
        {isSampleData && (
          <span className="text-[10px] font-black bg-white border-2 border-black px-2 py-0.5 rounded-full uppercase">
            Modo Muestra
          </span>
        )}
      </div>
      <div className="space-y-3 bg-white border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        {activePlayers.length === 0 ? (
          <p className="text-xs font-bold text-center text-stone-500 uppercase">Cargando avance de los jugadores...</p>
        ) : (
          activePlayers.map((user, idx) => (
            <div key={user.username} className="space-y-1">
              <div className="flex justify-between items-center text-xs font-black uppercase">
                <span>
                  {idx === 0 ? '👑' : '⭐'} {idx + 1}. {user.username} {user.username === activeUser && '(TÚ)'}
                </span>
                <span className={user.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                  {formatearMoneda(user.balance)} {user.balance >= 0 ? 'DISPONIBLE' : 'DEUDA'}
                </span>
              </div>
              <div className="w-full bg-stone-100 border-2 border-black rounded-lg h-4 overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] relative">
                <div 
                  style={{ 
                    width: `${Math.max(5, Math.min(100, Math.abs(user.balance) > 0 ? (Math.abs(user.balance) / maxBalance) * 100 : 5))}%` 
                  }} 
                  className={`h-full border-r-2 border-black transition-all duration-500 ${
                    user.balance >= 0 
                      ? user.username === activeUser ? 'bg-amber-400' : 'bg-sky-400'
                      : 'bg-rose-400'
                  }`} 
                />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}