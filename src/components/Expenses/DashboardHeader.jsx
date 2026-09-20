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
      
      {/* Estilos con vuelo frontal, giro suave y destellos de rayos solares */}
      <style>{`
        @keyframes woodstockErraticFlight {
          0% {
            transform: translate(0px, 15px) scale(0.9) rotate(0deg);
          }
          25% {
            transform: translate(32vw, -25px) scale(1.3) rotate(4deg);
          }
          48% {
            transform: translate(68vw, 10px) scale(0.5) rotate(-4deg);
          }
          50% {
            /* Extremo derecho: punto de giro */
            transform: translate(72vw, 15px) scale(0.55) rotate(0deg);
          }
          75% {
            transform: translate(35vw, -20px) scale(1.2) rotate(-4deg);
          }
          95% {
            transform: translate(8vw, 15px) scale(1.0) rotate(4deg);
          }
          100% {
            transform: translate(0px, 15px) scale(0.9) rotate(0deg);
          }
        }
        .woodstock-erratic-animation {
          animation: woodstockErraticFlight 14s ease-in-out infinite;
        }

        /* Giro suave y fluido pasando por scaleX(0) para simular la rotación de frente */
        @keyframes woodstockFlip {
          0%, 46% { 
            transform: scaleX(1); 
          }
          50% { 
            transform: scaleX(0); /* Transición en el extremo derecho */
          }
          54%, 96% { 
            transform: scaleX(-1); 
          }
          100% { 
            transform: scaleX(1); /* Transición en el extremo izquierdo */
          }
        }
        .woodstock-img-flip {
          animation: woodstockFlip 14s ease-in-out infinite;
        }

        /* Rotación lenta para los rayos de sol de la libreta */
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spinSlow 25s linear infinite;
        }
      `}</style>

      {/* CONTENEDOR VISUAL PRINCIPAL */}
      <div className="w-full h-56 sm:h-64 relative rounded-2xl overflow-hidden border-2 border-black bg-[#38BDF8] flex items-center justify-center">
        
        {/* CAPA 0: Fondo con nubes animadas */}
        <div className="absolute inset-0 z-0 animate-clouds-loop opacity-85 pointer-events-none"></div>

        {/* CAPA 1: Woodstock piloto con vuelo frontal y giro suave */}
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden flex items-center">
          <div className="woodstock-erratic-animation absolute left-2 flex items-center">
            <img 
              src="/juego-woodsock-piloto.png" 
              alt="Woodstock Piloto" 
              className="woodstock-img-flip w-20 h-20 object-contain drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-transform"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        </div>

        {/* CAPA 2: Rayos solares con posición independiente para celular (izq) y desktop (sm:izq) */}
        <div className="absolute top-[-12%] left-[16%] sm:top-[-10%] sm:left-[27%] z-20 pointer-events-none flex items-center justify-center">
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
            {/* Rayos giratorios */}
            <div className="absolute inset-0 animate-spin-slow opacity-95">
              <svg viewBox="0 0 100 100" className="w-full h-full fill-yellow-300 drop-shadow-[0_0_14px_rgba(253,224,71,1)]">
                <path d="M50 0 L54 35 L50 50 L46 35 Z" transform="rotate(0 50 50)" />
                <path d="M50 0 L54 35 L50 50 L46 35 Z" transform="rotate(30 50 50)" />
                <path d="M50 0 L54 35 L50 50 L46 35 Z" transform="rotate(60 50 50)" />
                <path d="M50 0 L54 35 L50 50 L46 35 Z" transform="rotate(90 50 50)" />
                <path d="M50 0 L54 35 L50 50 L46 35 Z" transform="rotate(120 50 50)" />
                <path d="M50 0 L54 35 L50 50 L46 35 Z" transform="rotate(150 50 50)" />
                <path d="M50 0 L54 35 L50 50 L46 35 Z" transform="rotate(180 50 50)" />
                <path d="M50 0 L54 35 L50 50 L46 35 Z" transform="rotate(210 50 50)" />
                <path d="M50 0 L54 35 L50 50 L46 35 Z" transform="rotate(240 50 50)" />
                <path d="M50 0 L54 35 L50 50 L46 35 Z" transform="rotate(270 50 50)" />
                <path d="M50 0 L54 35 L50 50 L46 35 Z" transform="rotate(300 50 50)" />
                <path d="M50 0 L54 35 L50 50 L46 35 Z" transform="rotate(330 50 50)" />
              </svg>
            </div>
            {/* Núcleo central de brillo */}
            <div className="absolute w-20 h-20 bg-white rounded-full blur-sm opacity-90 animate-pulse"></div>
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