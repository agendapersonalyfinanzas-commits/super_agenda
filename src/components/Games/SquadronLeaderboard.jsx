import React from 'react';

// Módulo 4: El Salón de la Fama (Leaderboard basado en Eficiencia y Rangos - Privacidad Absoluta)
export default function SquadronLeaderboard({ players = [] }) {
  // Ordenar jugadores simulados o reales por eficiencia / puntaje de rango
  const sortedPlayers = [...players].sort((a, b) => (b.efficiency || 85) - (a.efficiency || 85));

  return (
    <div className="max-w-2xl mx-auto bg-[#Fef8e7] border-4 border-black p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] font-mono text-black">
      
      <div className="text-center border-b-4 border-black pb-4 mb-6">
        <div className="inline-block bg-rose-500 text-white border-2 border-black px-4 py-1 rounded-full text-xs font-black uppercase mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          Salón de la Fama • Escuadrón Peanuts
        </div>
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wider">
          Leaderboard de Eficiencia
        </h2>
        <p className="text-xs font-bold text-stone-700 mt-1">
          Clasificación basada estrictamente en constancia y rangos de disciplina (Sin montos expuestos).
        </p>
      </div>

      <div className="space-y-3">
        {sortedPlayers.length === 0 ? (
          <div className="p-4 text-center bg-white border-3 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold text-xs">
            No hay aviadores registrados en el escuadrón todavía.
          </div>
        ) : (
          sortedPlayers.map((player, index) => {
            const rankBadge = index === 0 ? '👑 As de Ases' : index === 1 ? '🎖️ Capitán' : index === 2 ? '⭐ Piloto Destacado' : '✈️ Aviador';
            const efficiencyValue = player.efficiency || (95 - index * 7);

            return (
              <div 
                key={player.user_name || index}
                className="flex items-center justify-between bg-white border-3 border-black p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-300 border-2 border-black rounded-xl flex items-center justify-center font-black text-xs shadow-sm">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-black text-sm uppercase">{player.user_name}</p>
                    <p className="text-[10px] font-bold text-stone-500 uppercase">{rankBadge}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block bg-emerald-100 text-emerald-900 border-2 border-black px-3 py-1 rounded-xl text-xs font-black shadow-sm">
                    Eficiencia: {efficiencyValue}%
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-6 text-center bg-stone-900 text-amber-300 border-3 border-black p-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-[10px] font-black uppercase tracking-widest">
          🔒 Privacidad Garantizada: Los saldos y montos monetarios se mantienen estrictamente confidenciales.
        </p>
      </div>

    </div>
  );
}