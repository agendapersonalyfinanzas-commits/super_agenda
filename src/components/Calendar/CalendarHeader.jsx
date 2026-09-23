// src/components/Calendar/CalendarHeader.jsx
import React from 'react';
import { aMayusculas } from '../../utils/mayusculas.js';
import { registrarNotificacionesPush } from '../../utils/pushNotifications.js';

export default function CalendarHeader({ setIsCanvasOpen, setIsVoiceOpen, supabase }) {
  return (
    <header className="w-full flex flex-wrap justify-between items-center border-4 border-black bg-amber-400 p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] gap-4">
      <div>
        <h1 className="text-2xl font-black uppercase text-black tracking-tight">
          {aMayusculas('Agenda y Pendientes')}
        </h1>
        <p className="text-xs font-bold text-amber-950 uppercase mt-0.5 tracking-tight">
          {aMayusculas('Organización, Pagos y Notas')}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button 
          type="button"
          onClick={() => registrarNotificacionesPush(supabase)}
          className="px-4 py-2.5 bg-emerald-300 border-4 border-black rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer hover:bg-emerald-400"
        >
          🔔 {aMayusculas('Activar Alertas')}
        </button>
        <button 
          type="button"
          onClick={() => setIsCanvasOpen(true)}
          className="px-4 py-2.5 bg-white border-4 border-black rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer hover:bg-stone-100"
        >
          ✍️ {aMayusculas('Escribir Nota')}
        </button>
        <button 
          type="button"
          onClick={() => setIsVoiceOpen(true)}
          className="px-4 py-2.5 bg-white border-4 border-black rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer hover:bg-stone-100"
        >
          🎙️ {aMayusculas('Dictar Nota')}
        </button>
      </div>
    </header>
  );
}