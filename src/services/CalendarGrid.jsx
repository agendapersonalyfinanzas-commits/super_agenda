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

  // 🚦 Semáforo visual financiero de la celda basado en los pagos y eventos
  const getDaySemaphoreStyle = (tasks, cellDateStr) => {
    if (!tasks || tasks.length === 0) return 'bg-amber-50 hover:bg-amber-200 border-black';

    const allCompleted = tasks.every(t => t.is_completed);
    if (allCompleted) {
      return 'bg-emerald-200 text-black border-emerald-700';
    }

    const [day, monthNum, yearNum] = cellDateStr.split('/');
    const taskDate = new Date(yearNum, monthNum - 1, day);
    taskDate.setHours(0, 0, 0, 0);

    const diffTime = taskDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    const hasUnpaidPayment = tasks.some(t => t.is_pago && !t.is_completed);

    if (hasUnpaidPayment) {
      if (diffDays < 0) return 'bg-rose-400 text-black border-rose-800 animate-pulse'; // Vencido
      if (diffDays === 0) return 'bg-rose-300 text-black border-rose-800 animate-pulse'; // Vence hoy
      if (diffDays <= 2) return 'bg-amber-300 text-black border-black'; // Próximo a vencer
    }

    return 'bg-sky-100 text-black border-black';
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
          <div key={`empty-${index}`} className="h-20 sm:h-24 bg-stone-100 border-2 border-dashed border-stone-300 rounded-xl opacity-40" />
        ))}

        {Array.from({ length: totalDays }).map((_, index) => {
          const dayNum = index + 1;
          const formattedDate = `${dayNum.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year}`;
          
          const cellDate = new Date(year, month, dayNum);
          cellDate.setHours(0, 0, 0, 0);

          const isToday = cellDate.getTime() === today.getTime();

          const tasksForDay = dayTasks[formattedDate] || [];
          const hasTasks = tasksForDay.length > 0;
          
          // Suma total de los montos financieros programados en el día
          const totalMonto = tasksForDay.reduce((acc, t) => acc + (t.is_pago ? (Number(t.monto) || 0) : 0), 0);
          
          const cellStyle = getDaySemaphoreStyle(tasksForDay, formattedDate);

          return (
            <button
              key={dayNum}
              type="button"
              onClick={() => onSelectDay && onSelectDay(formattedDate)}
              className={`h-20 sm:h-24 border-2 rounded-xl font-black text-xs flex flex-col justify-between p-1.5 relative transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                isToday
                  ? 'bg-sky-400 text-black border-3 border-black scale-105' 
                  : cellStyle
              }`}
            >
              {/* Número del día e indicador de HOY */}
              <div className="w-full flex justify-between items-center">
                <span className="text-xs sm:text-sm font-black">{dayNum}</span>
                {isToday && (
                  <span className="text-[7px] sm:text-[8px] bg-black text-white font-black px-1 rounded-sm uppercase tracking-wider">
                    HOY
                  </span>
                )}
              </div>

              {/* Resumen financiero dentro de la celda */}
              {hasTasks ? (
                <div className="w-full flex flex-col gap-0.5 overflow-hidden text-left">
                  {totalMonto > 0 && (
                    <div className="bg-black text-amber-300 text-[9px] sm:text-[10px] px-1 py-0.5 rounded font-black truncate text-center shadow-xs">
                      ${totalMonto.toLocaleString()}
                    </div>
                  )}
                  <div className="text-[9px] sm:text-[10px] font-bold truncate text-black bg-white/90 px-1 py-0.5 rounded border border-black/30 flex items-center justify-between">
                    <span>{tasksForDay[0]?.is_completed ? '🟢' : tasksForDay[0]?.is_pago ? '💳' : '📌'}</span>
                    <span className="truncate">{tasksForDay.length} {tasksForDay.length === 1 ? 'evento' : 'eventos'}</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}