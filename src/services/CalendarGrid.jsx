import React, { useState } from 'react';
import { aMayusculas } from '../utils/mayusculas.js';

export default function CalendarGrid({ onSelectDay }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  return (
    <div className="w-full bg-white border-4 border-black p-4 sm:p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-mono">
      
      {/* CONTROLES DE MES (Diseño adaptado para móvil sin desbordarse) */}
      <div className="flex flex-col items-center gap-3 mb-6 border-b-4 border-black pb-4">
        <h2 className="text-xl font-black uppercase tracking-tight text-center">
          {aMayusculas(`${meses[month]} ${year}`)}
        </h2>
        <div className="flex justify-between w-full gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="flex-1 px-3 py-2 bg-amber-400 border-4 border-black rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer truncate"
          >
            ◀ {aMayusculas('Anterior')}
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="flex-1 px-3 py-2 bg-amber-400 border-4 border-black rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer truncate"
          >
            {aMayusculas('Siguiente')} ▶
          </button>
        </div>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-1.5 mb-2 text-center">
        {diasSemana.map((d) => (
          <div key={d} className="font-black text-[11px] sm:text-xs uppercase text-stone-600">
            {d}
          </div>
        ))}
      </div>

      {/* Cuadrícula de días */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {Array.from({ length: firstDayIndex }).map((_, index) => (
          <div key={`empty-${index}`} className="h-12 sm:h-14 bg-stone-100 border-2 border-dashed border-stone-300 rounded-xl opacity-40" />
        ))}

        {Array.from({ length: totalDays }).map((_, index) => {
          const dayNum = index + 1;
          const formattedDate = `${dayNum.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year}`;
          
          return (
            <button
              key={dayNum}
              type="button"
              onClick={() => onSelectDay && onSelectDay(formattedDate)}
              className="h-12 sm:h-14 bg-amber-50 border-2 border-black rounded-xl font-black text-xs sm:text-sm flex flex-col items-center justify-center hover:bg-amber-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            >
              <span>{dayNum}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}