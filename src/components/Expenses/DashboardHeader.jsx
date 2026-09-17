import React from "react"
import * as Icons from "../UI/Icons"

// Ruta directa desde la carpeta public
const superSnoopyImg = "/assets/super-snoopy.png"

export default function DashboardHeader({ onOcrOpen }) {
  const formattedDate = new Date().toLocaleDateString('es-MX', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short' 
  })

  // Protección anti-fallos por si LinusCalendarIcon no está exportado en Icons.jsx
  const IconComponent = Icons.LinusCalendarIcon || (() => <span>📅</span>)

  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-4 border-black bg-amber-400 p-6 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] gap-4">
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-black bg-white shrink-0 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <img src={superSnoopyImg} alt="Snoopy" className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="text-3xl font-black uppercase text-black">Super Agenda</h1>
          <p className="text-xs font-bold text-amber-950 uppercase mt-0.5">Control diario • Finanzas retro</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button 
          type="button" 
          onClick={onOcrOpen} 
          className="px-4 py-2 bg-white border-4 border-black rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-amber-50 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
        >
          📸 Escanear Ticket
        </button>
        <div className="flex items-center gap-2 bg-white border-4 border-black px-4 py-2 rounded-xl text-xs font-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <IconComponent /> {formattedDate}
        </div>
      </div>
    </header>
  )
}