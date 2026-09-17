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
    <div className="bg-[#FBBF24] border-4 border-black rounded-3xl p-5 shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col items-center gap-4 text-center">
      <div>
        <h1 className="text-2xl font-black tracking-wider text-black uppercase">SUPER AGENDA</h1>
        <p className="text-xs font-bold text-black opacity-80 uppercase tracking-tight">
          CONTROL DIARIO • FINANZAS RETRO
        </p>
      </div>

      {/* Reloj Cuadrado Retro */}
      <div className="relative w-44 h-44 rounded-2xl border-4 border-black bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)] shrink-0 overflow-hidden flex items-center justify-center my-1">
        <img 
          src="/snoopy-aviator.png" 
          alt="Reloj Snoopy Aviador" 
          className="absolute inset-0 w-full h-full object-cover scale-105" 
        />

        {/* Manecilla de Horas */}
        <div 
          className="absolute w-2 h-11 bg-black rounded-full origin-bottom bottom-1/2 left-[calc(50%-4px)] border border-white z-10 shadow-md"
          style={{ transform: `rotate(${hourDeg}deg)` }}
        />

        {/* Manecilla de Minutos */}
        <div 
          className="absolute w-1.5 h-16 bg-black rounded-full origin-bottom bottom-1/2 left-[calc(50%-3px)] border border-white z-20 shadow-md"
          style={{ transform: `rotate(${minDeg}deg)` }}
        />

        {/* Manecilla de Segundos */}
        <div 
          className="absolute w-1 h-18 bg-red-600 origin-bottom bottom-1/2 left-[calc(50%-2px)] z-30"
          style={{ transform: `rotate(${secDeg}deg)` }}
        />

        {/* Remache Central */}
        <div className="absolute w-4 h-4 bg-yellow-400 border-2 border-black rounded-full z-40" />
      </div>

      <div className="w-full flex flex-col gap-3">
        <button className="w-full bg-white border-[3px] border-black rounded-2xl py-2.5 px-4 font-black text-black shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2">
          📸 ESCANEAR TICKET
        </button>

        <div className="w-full bg-white border-[3px] border-black rounded-2xl py-2 px-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">📅</span>
            <span className="font-extrabold text-sm text-black">{formattedDate}</span>
          </div>

          <div className="font-mono font-black text-sm text-black bg-[#FAF7F2] px-3 py-1 rounded-xl border-2 border-black">
            {formattedTime}
          </div>
        </div>
      </div>
    </div>
  );
}