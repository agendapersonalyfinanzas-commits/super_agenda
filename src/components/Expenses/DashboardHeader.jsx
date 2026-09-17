import React, { useState, useEffect } from 'react';

export default function DashboardHeader() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours();

  const secDeg = (seconds / 60) * 360;
  const minDeg = ((minutes + seconds / 60) / 60) * 360;
  const hourDeg = (((hours % 12) + minutes / 60) / 12) * 360;

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
    <div className="bg-[#FBBF24] border-4 border-black rounded-3xl p-4 sm:p-5 shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col items-center gap-4 text-center select-none">
      
      {/* Insignia / Título de la App */}
      <div className="flex flex-col items-center">
        <span className="bg-black text-white text-[10px] font-black tracking-widest uppercase px-3 py-0.5 rounded-full border-2 border-white mb-1 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
          ★ FLIGHT INSTRUMENTS ★
        </span>
        <h1 className="text-2xl font-black tracking-wider text-black uppercase">SUPER AGENDA</h1>
      </div>

      {/* CLUSTER DE INSTRUMENTOS (AMPLIADO) */}
      <div className="relative flex items-center justify-center w-full my-3">
        
        {/* MEDIDOR 1: HORAS */}
        <div className="flex flex-col items-center z-10 -mr-4 sm:-mr-6">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-black bg-[#60A5FA] shadow-[5px_5px_0px_rgba(0,0,0,1)] shrink-0 overflow-hidden flex items-center justify-center">
            <div className="absolute inset-2 rounded-full border-2 border-black/30 border-dashed" />
            <span className="absolute top-1.5 font-mono font-black text-xs text-black">12</span>
            <span className="absolute right-2 font-mono font-black text-xs text-black">3</span>
            <span className="absolute bottom-1.5 font-mono font-black text-xs text-black">6</span>
            <span className="absolute left-2 font-mono font-black text-xs text-black">9</span>

            <div 
              className="absolute w-2 h-9 sm:h-10 bg-black rounded-full origin-bottom bottom-1/2 left-[calc(50%-4px)] border border-white z-10 shadow-md"
              style={{ transform: `rotate(${hourDeg}deg)` }}
            />
            <div className="absolute w-4 h-4 bg-white border-2 border-black rounded-full z-20" />
          </div>

          <span className="mt-2 font-black text-[10px] sm:text-xs text-black bg-white px-2.5 py-0.5 rounded-md border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] -rotate-3">
            ⏱ {String(hours % 12 || 12).padStart(2, '0')} HORAS
          </span>
        </div>

        {/* MEDIDOR 2: MINUTOS (SNOOPY - MÁS GRANDE CON LECTURA DE MINUTOS) */}
        <div className="flex flex-col items-center z-20">
          <div className="relative w-40 h-40 sm:w-44 sm:h-44 rounded-full border-4 border-black bg-white shadow-[7px_7px_0px_rgba(0,0,0,1)] shrink-0 overflow-hidden flex items-center justify-center">
            
            <img 
              src="/snoopy-aviator.png" 
              alt="Snoopy Aviador" 
              className="absolute inset-0 w-full h-full object-cover scale-110" 
            />

            <div className="absolute inset-2.5 rounded-full border-2 border-black/20 pointer-events-none" />

            <div 
              className="absolute w-2.5 h-16 sm:h-18 bg-red-600 rounded-full origin-bottom bottom-1/2 left-[calc(50%-5px)] border-2 border-black z-20 shadow-lg"
              style={{ transform: `rotate(${minDeg}deg)` }}
            />

            <div className="absolute w-5 h-5 bg-yellow-400 border-2 border-black rounded-full z-30 shadow-md" />
          </div>

          {/* ETIQUETA ROJA CON MINUTOS DINÁMICOS */}
          <span className="mt-2 font-black text-xs sm:text-sm text-white bg-red-600 px-3.5 py-1 rounded-md border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] rotate-1">
            ✈ {String(minutes).padStart(2, '0')} MINUTOS
          </span>
        </div>

        {/* MEDIDOR 3: SEGUNDOS */}
        <div className="flex flex-col items-center z-10 -ml-4 sm:-ml-6">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-black bg-[#FACC15] shadow-[5px_5px_0px_rgba(0,0,0,1)] shrink-0 overflow-hidden flex items-center justify-center">
            
            <div className="absolute inset-2.5 rounded-full border border-black/40" />
            <div className="absolute w-full h-px bg-black/20" />
            <div className="absolute h-full w-px bg-black/20" />

            <div 
              className="absolute w-2 h-10 sm:h-11 bg-red-600 origin-bottom bottom-1/2 left-[calc(50%-4px)] z-10 shadow-sm"
              style={{ transform: `rotate(${secDeg}deg)` }}
            >
              <div className="w-3 h-3 -ml-0.5 -mt-1 bg-black rounded-full" />
            </div>

            <div className="absolute w-4 h-4 bg-black rounded-full z-20" />
          </div>

          <span className="mt-2 font-black text-[10px] sm:text-xs text-black bg-white px-2.5 py-0.5 rounded-md border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] rotate-3">
            ⚡ {String(seconds).padStart(2, '0')}s ALT
          </span>
        </div>

      </div>

      {/* Botón de Acción y Contenedor de Fecha */}
      <div className="w-full flex flex-col gap-3 mt-1">
        <button className="w-full bg-white border-[3px] border-black rounded-2xl py-2.5 px-4 font-black text-black shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 text-sm uppercase">
          📸 ESCANEAR TICKET
        </button>

        <div className="w-full bg-white border-[3px] border-black rounded-2xl py-2 px-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">📅</span>
            <span className="font-extrabold text-xs sm:text-sm text-black">{formattedDate}</span>
          </div>

          <div className="font-mono font-black text-xs sm:text-sm text-black bg-[#FAF7F2] px-3 py-1 rounded-xl border-2 border-black">
            {formattedTime}
          </div>
        </div>
      </div>

    </div>
  );
}