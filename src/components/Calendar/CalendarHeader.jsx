import React from 'react';

export default function CalendarHeader({ setIsCanvasOpen, setIsVoiceOpen, auditorMode, auditedUserName }) {
  return (
    <div className="w-full space-y-4">
      {auditorMode && auditedUserName && (
        <div className="w-full bg-red-500 text-white text-center font-black text-xs py-2 border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wide">
          🔍 Modo Dios (Agenda) Activo - Auditando a: {auditedUserName}
        </div>
      )}

      <div className="w-full bg-white border-4 border-black p-4 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row justify-between items-center gap-4 font-mono">
        <div className="text-center sm:text-left">
          <h2 className="text-lg font-black uppercase tracking-tight">📅 Agenda y Eventos</h2>
          <p className="text-xs text-stone-600 font-bold">Gestiona tus actividades y pagos programados</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
          {setIsCanvasOpen && (
            <button
              type="button"
              onClick={() => setIsCanvasOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2 bg-amber-400 border-3 border-black rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
            >
              ✏️ Dibujar Nota
            </button>
          )}
          {setIsVoiceOpen && (
            <button
              type="button"
              onClick={() => setIsVoiceOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2 bg-sky-400 border-3 border-black rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
            >
              🎙️ Nota de Voz
            </button>
          )}
        </div>
      </div>
    </div>
  );
}