import React from 'react';
import { formatearMoneda } from '../../utils/moneda.js';

export default function PlayerProgressSection({ activePlayers, activeUser }) {
  const playerData = activePlayers?.[0] || { user_name: activeUser || 'LUIS RICARDO', balance: 0 };
  const balance = playerData.balance || 0;

  return (
    <section className="border-4 border-black bg-amber-400 p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4 select-none font-mono">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-black uppercase text-stone-900">🏆 Avance de Disciplina Financiera</h2>
      </div>
      <div className="space-y-3 bg-white border-4 border-black p-5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs sm:text-sm font-black uppercase">
            <span className="flex items-center gap-2">
              <span>👑</span> {playerData.user_name} (CUENTA PRINCIPAL)
            </span>
            <span className={balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
              {formatearMoneda(balance)} {balance >= 0 ? 'DISPONIBLE' : 'DEUDA'}
            </span>
          </div>
          <div className="w-full bg-stone-100 border-2 border-black rounded-xl h-5 overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] relative">
            <div 
              style={{ 
                width: `${Math.max(5, Math.min(100, Math.abs(balance) > 0 ? 100 : 5))}%` 
              }} 
              className={`h-full border-r-2 border-black transition-all duration-500 ${
                balance >= 0 ? 'bg-amber-400' : 'bg-rose-400'
              }`} 
            />
          </div>
        </div>
      </div>
    </section>
  );
}