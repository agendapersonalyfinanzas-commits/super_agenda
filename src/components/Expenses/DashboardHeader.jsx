import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function DashboardHeader({ 
  user_name, 
  activeUser, 
  onOcrOpen,
  // 🌟 Props para el Modo Dios / Auditor
  isAuditor = false,
  usersList = [],
  selectedAuditedUser = null,
  setSelectedAuditedUser = () => {}
}) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = time.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  }).toUpperCase();

  const formattedTime = time.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className="bg-[#FBBF24] border-4 border-black rounded-3xl p-3 sm:p-4 shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col gap-3 select-none w-full">
      
      {/* CONTENEDOR VISUAL PRINCIPAL */}
      <div className="w-full h-56 sm:h-64 relative rounded-2xl overflow-hidden border-2 border-black bg-[#38BDF8] flex items-center justify-center">
        
        {/* CAPA 0: Fondo con nubes animadas */}
        <div className="absolute inset-0 z-0 animate-clouds-loop opacity-85 pointer-events-none"></div>

        {/* CAPA 1: Woodstock piloto */}
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          <div className="animate-woodstock-loop-medium">
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-70">
              <span className="w-3 h-1 bg-white rounded-full border border-black/40"></span>
              <span className="w-4 h-1 bg-white rounded-full border border-black/40"></span>
            </div>
            
            <img 
              src="/juego-woodsock-piloto.png" 
              alt="Woodstock Piloto" 
              className="w-12 h-12 object-contain drop-shadow-[3px_3px_0px_rgba(0,0,0,1)]"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        </div>

        {/* CAPA 2: Destellos mágicos */}
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
          <div className="relative w-full h-full">
            <span className="absolute top-[40%] left-[45%] text-yellow-300 text-4xl animate-sparkle-1 drop-shadow-[0_0_12px_rgba(255,255,0,1)]">✨</span>
            <span className="absolute top-[35%] left-[52%] text-white text-3xl animate-sparkle-2 drop-shadow-[0_0_12px_rgba(255,255,255,1)]">🌟</span>
            <span className="absolute top-[48%] left-[48%] text-amber-300 text-3xl animate-sparkle-3 drop-shadow-[0_0_12px_rgba(255,215,0,1)]">⭐</span>
          </div>
        </div>

        {/* CAPA 3: Imagen principal de frente */}
        <img 
          src="/snoppy-ciudad-tranparente.png" 
          alt="Super Agenda Snoopy" 
          className="absolute inset-0 w-full h-full object-cover z-30 pointer-events-none"
          onError={(e) => { e.target.style.display = 'none'; }}
        />

      </div>

      {/* CONTENEDOR INFERIOR */}
      <div className="flex flex-col gap-2.5 w-full">
        
        {/* ⚡ PANEL DE MODO DIOS / AUDITOR */}
        {isAuditor && (
          <div className="w-full bg-purple-200 border-[3px] border-black rounded-2xl p-2.5 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-black text-xs uppercase text-purple-950 tracking-wider">
              <span className="text-base animate-pulse">⚡</span>
              <span>Modo Dios (Auditoría)</span>
            </div>
            
            <select
              value={selectedAuditedUser || ''}
              onChange={(e) => setSelectedAuditedUser(e.target.value || null)}
              className="w-full sm:w-auto bg-white border-2 border-black rounded-xl px-3 py-1.5 font-bold text-xs uppercase cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
            >
              <option value="">👤 Mi Vista Personal</option>
              {usersList.map((user) => {
                const fullName = `${user.nombre || ''} ${user.apellido_paterno || ''}`.trim() || user.email || 'Usuario';
                return (
                  <option key={user.id} value={user.id}>
                    🔍 Auditar: {fullName}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* BOTÓN ESCANEAR TICKET */}
        <div className="flex justify-start w-full">
          <button 
            type="button"
            onClick={onOcrOpen}
            className="bg-white border-[3px] border-black rounded-2xl py-2 px-4 font-black text-black shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center gap-2 text-xs sm:text-sm uppercase cursor-pointer"
          >
            <span className="text-base">📸</span>
            ESCANEAR TICKET
          </button>
        </div>

        {/* CONTENEDOR DE FECHA Y RELOJ EN FORMATO PÍLDORA CON OPACIDAD 35% */}
        <div className="w-full bg-transparent py-1 px-1 flex items-center justify-between">
          
          {/* Fecha en píldora con bg-white/35 */}
          <div className="flex items-center gap-2 bg-white/35 px-3.5 py-1.5 rounded-full border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            <span className="text-base">📅</span>
            <span className="font-mono font-black text-xs sm:text-sm text-black tracking-wide">{formattedDate}</span>
          </div>

          {/* Reloj en píldora con bg-white/35 */}
          <div className="font-mono font-black text-xs sm:text-sm text-black bg-white/35 px-3.5 py-1.5 rounded-full border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            {formattedTime}
          </div>

        </div>
      </div>

    </div>
  );
}