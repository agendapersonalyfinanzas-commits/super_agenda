import React from 'react';
import BaronRojoGame from './BaronRojoGame';
import { useBaronGameLogic } from '../../hooks/useBaronGameLogic'; // <-- Corregido con ../../

export default function GamesScreen({ activeUser, selectedGame, setSelectedGame, onBack }) {
  
  // 🧠 Conectamos el cerebro financiero usando el ID del usuario activo
  const userId = activeUser?.id || activeUser?.uid;
  const { score, loading, financialStats } = useBaronGameLogic(userId);

  // Si el usuario ya seleccionó un juego específico, lo renderizamos
  if (selectedGame === 'baron-rojo') {
    return (
      <BaronRojoGame 
        activeUser={activeUser} 
        onBack={() => setSelectedGame(null)} // Regresa al menú de GamesScreen
      />
    );
  }

  return (
    <div className="bg-[#FBBF24] border-4 border-black rounded-3xl p-6 shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col gap-6 text-center select-none max-w-4xl mx-auto font-mono">
      
      {/* CABECERA DE LA PANTALLA DE JUEGOS */}
      <header className="flex justify-between items-center bg-white border-3 border-black p-4 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-3">
          <span className="text-4xl animate-bounce">🕹️</span>
          <div className="text-left">
            <h1 className="text-sm sm:text-base font-black uppercase text-black">CENTRAL DE JUEGOS</h1>
            <p className="text-[11px] font-black text-amber-600">ELIGE TU MISIÓN DE SALUD FINANCIERA</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="bg-black text-white border-2 border-black px-4 py-2 rounded-xl text-xs font-black shadow-[2px_2px_0px_rgba(255,255,255,1)] cursor-pointer hover:bg-stone-800 transition-all"
        >
          🏠 Regresar a la App
        </button>
      </header>

      {/* 🧠 PANEL DE ESTADÍSTICAS FINANCIERAS EN VIVO */}
      <div className="bg-white border-3 border-black p-4 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] grid grid-cols-3 gap-2 text-center font-black">
        <div className="bg-amber-100 border-2 border-black p-2 rounded-xl">
          <span className="block text-[10px] text-stone-600 uppercase">INGRESOS MES</span>
          <span className="text-sm sm:text-base text-black">${financialStats.income}</span>
        </div>
        <div className="bg-red-100 border-2 border-black p-2 rounded-xl">
          <span className="block text-[10px] text-stone-600 uppercase">GASTOS MES</span>
          <span className="text-sm sm:text-base text-black">${financialStats.expenses}</span>
        </div>
        <div className="bg-emerald-100 border-2 border-black p-2 rounded-xl">
          <span className="block text-[10px] text-stone-600 uppercase">ISF (SALUD)</span>
          <span className="text-sm sm:text-base text-emerald-700">{loading ? '...' : `${score}%`}</span>
        </div>
      </div>

      {/* LISTA / BOTONES DE SELECCIÓN DE JUEGOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Tarjeta del Juego 1: Barón Rojo */}
        <div className="bg-white border-3 border-black rounded-2xl p-5 shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col justify-between gap-4 text-left">
          <div>
            <span className="text-3xl">✈️</span>
            <h3 className="text-sm font-black uppercase text-black mt-2">Snoopy: Barón Rojo Arcade</h3>
            <p className="text-xs text-stone-600 mt-1">
              Esquiva y destruye gastos hormiga con perspectiva 3D frontal. Tu ISF actual de <span className="font-black text-black">{score}%</span> define si el Barón te persigue o dominas los cielos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedGame('baron-rojo')}
            className="bg-emerald-400 hover:bg-emerald-300 border-3 border-black text-black font-black py-3 rounded-xl text-xs uppercase shadow-[4px_4px_0px_rgba(0,0,0,1)] cursor-pointer transition-all text-center active:translate-x-0.5 active:translate-y-0.5"
          >
            🚀 Jugar Barón Rojo
          </button>
        </div>

        {/* Tarjeta de Próximo Juego (Placeholder) */}
        <div className="bg-stone-100 border-3 border-black rounded-2xl p-5 shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col justify-between gap-4 text-left opacity-75">
          <div>
            <span className="text-3xl">🧩</span>
            <h3 className="text-sm font-black uppercase text-black mt-2">Próxima Misión Financiera</h3>
            <p className="text-xs text-stone-600 mt-1">
              Más desafíos estilo arcade para mantener tu presupuesto bajo control y desbloquear logros en tu escuadrón.
            </p>
          </div>
          <button
            type="button"
            disabled
            className="bg-stone-300 border-3 border-black text-stone-600 font-black py-3 rounded-xl text-xs uppercase cursor-not-allowed text-center"
          >
            🔒 Próximamente
          </button>
        </div>

      </div>

    </div>
  );
}