import React, { useState } from 'react';
import { aMayusculas } from '../utils/mayusculas.js';

export default function CalendarGrid({ onSelectDay, dayTasks = {} }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

  // Función para determinar el estilo del semáforo según la proximidad del evento
  const getTaskSemaphoreStyle = (dateStr) => {
    const [day, monthNum, yearNum] = dateStr.split('/');
    const taskDate = new Date(yearNum, monthNum - 1, day);
    taskDate.setHours(0, 0, 0, 0);

    const diffTime = taskDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'bg-rose-500 text-white animate-pulse'; // 🔴 Hoy (Rojo urgente parpadeante)
    if (diffDays <= 2) return 'bg-amber-300 text-black'; // 🟡 Cerca (1 o 2 días)
    return 'bg-emerald-400 text-black'; // 🟢 Lejos (3 días o más)
  };

  return (
    <div className="w-full bg-white border-4 border-black p-4 sm:p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-mono select-none">
      
      {/* CONTROLES DE MES */}
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
          <div key={`empty-${index}`} className="h-16 sm:h-20 bg-stone-100 border-2 border-dashed border-stone-300 rounded-xl opacity-40" />
        ))}

        {Array.from({ length: totalDays }).map((_, index) => {
          const dayNum = index + 1;
          const formattedDate = `${dayNum.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year}`;
          
          const cellDate = new Date(year, month, dayNum);
          cellDate.setHours(0, 0, 0, 0);

          const isToday = cellDate.getTime() === today.getTime();
          const isPast = cellDate.getTime() < today.getTime();

          const tasksForDay = dayTasks[formattedDate] || [];
          const hasTasks = tasksForDay.length > 0;
          const firstTask = hasTasks ? tasksForDay[0] : null;
          const semaphoreStyle = hasTasks ? getTaskSemaphoreStyle(formattedDate) : '';

          return (
            <button
              key={dayNum}
              type="button"
              disabled={isPast}
              onClick={() => !isPast && onSelectDay && onSelectDay(formattedDate)}
              className={`h-16 sm:h-20 border-2 rounded-xl font-black text-xs flex flex-col items-center justify-between p-1 relative transition-all ${
                isPast
                  ? 'bg-stone-200 text-stone-400 border-stone-300 opacity-50 cursor-not-allowed shadow-none'
                  : isToday
                  ? 'bg-sky-400 text-black border-3 border-black scale-105 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none' // 🔵 Azul para HOY
                  : 'bg-amber-50 hover:bg-amber-300 border-black cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
              }`}
            >
              {/* Número del día */}
              <div className="w-full flex justify-between items-center px-1">
                <span className="text-xs sm:text-sm font-black">{dayNum}</span>
                {isToday && (
                  <span className="text-[7px] sm:text-[8px] bg-black text-white font-black px-1 rounded-sm uppercase tracking-wider">
                    HOY
                  </span>
                )}
              </div>

              {/* Mini-etiqueta con la hora y actividad si existe */}
              {hasTasks ? (
                <div className={`w-full text-[9px] sm:text-[10px] font-black rounded px-1 py-0.5 truncate border border-black ${semaphoreStyle}`}>
                  {firstTask.time} {firstTask.text}
                </div>
              ) : (
                <div className="h-3" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}