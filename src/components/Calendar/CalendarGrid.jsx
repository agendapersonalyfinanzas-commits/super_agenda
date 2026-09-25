import React, { useState } from 'react';
import { aMayusculas } from '../../utils/mayusculas.js';

export default function CalendarGrid({ onSelectDay, dayTasks = {}, isAuditor, auditedUserName }) {
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
  const getDaySemaphoreStyle = (tasks, cellDate) => {
    if (!tasks || tasks.length === 0) return 'bg-amber-50 hover:bg-amber-200 border-black';

    const allCompleted = tasks.every(t => t.is_completed);
    if (allCompleted) {
      return 'bg-emerald-200 text-black border-emerald-700';
    }

    const diffTime = cellDate.getTime() - today.getTime();
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
    <div className="w-full bg-white border-4 border-black p-2 sm:p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-mono select-none">
      
      {/* CONTROLES DE MES Y AVISO DE AUDITORÍA */}
      <div className="flex flex-col items-center gap-2 sm:gap-3 mb-4 sm:mb-6 border-b-4 border-black pb-3 sm:pb-4">
        {isAuditor && auditedUserName && (
          <div className="bg-red-500 text-white border-2 border-black px-3 py-1 rounded-xl text-[10px] sm:text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] tracking-wide mb-1">
            🔍 Auditando agenda de: {auditedUserName}
          </div>
        )}
        <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-center">
          {aMayusculas(`${meses[month]} ${year}`)}
        </h2>
        <div className="flex justify-between w-full gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Mes anterior"
            className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-amber-400 border-3 sm:border-4 border-black rounded-xl font-black text-[11px] sm:text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer truncate"
          >
            ◀ {aMayusculas('Anterior')}
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Mes siguiente"
            className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-amber-400 border-3 sm:border-4 border-black rounded-xl font-black text-[11px] sm:text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer truncate"
          >
            {aMayusculas('Siguiente')} ▶
          </button>
        </div>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
        {diasSemana.map((d) => (
          <div key={d} className="font-black text-[10px] sm:text-xs uppercase text-stone-600 truncate">
            {d}
          </div>
        ))}
      </div>

      {/* Cuadrícula de días */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {Array.from({ length: firstDayIndex }).map((_, index) => (
          <div key={`empty-${index}`} className="h-14 sm:h-22 bg-stone-100 border-2 border-dashed border-stone-300 rounded-xl opacity-40" />
        ))}

        {Array.from({ length: totalDays }).map((_, index) => {
          const dayNum = index + 1;
          
          // Formato YYYY-MM-DD estándar unificado
          const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          
          const cellDate = new Date(year, month, dayNum);
          cellDate.setHours(0, 0, 0, 0);

          const isToday = cellDate.getTime() === today.getTime();

          const tasksForDay = dayTasks[formattedDate] || [];
          const hasTasks = tasksForDay.length > 0;
          
          // Suma total de los montos financieros programados en el día
          const totalMonto = tasksForDay.reduce((acc, t) => acc + (t.is_pago ? (Number(t.monto) || 0) : 0), 0);
          
          const cellStyle = getDaySemaphoreStyle(tasksForDay, cellDate);

          return (
            <button
              key={dayNum}
              type="button"
              onClick={() => onSelectDay && onSelectDay(formattedDate)}
              aria-label={`Día ${dayNum} de ${meses[month]} de ${year}`}
              className={`h-14 sm:h-22 border-2 rounded-xl font-black text-xs flex flex-col justify-between p-1 sm:p-1.5 relative transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none overflow-hidden ${cellStyle} ${
                isToday ? 'ring-3 sm:ring-4 ring-sky-500 z-10' : ''
              }`}
            >
              <div className="w-full flex items-center justify-between gap-0.5 leading-none">
                <span className="text-[11px] sm:text-sm font-black">{dayNum}</span>
                {isToday && (
                  <span className="text-[6px] sm:text-[8px] bg-black text-white font-black px-0.5 sm:px-1 py-0.5 rounded-xs uppercase tracking-tighter shrink-0">
                    HOY
                  </span>
                )}
              </div>

              {hasTasks ? (
                <div className="w-full flex flex-col gap-0.5 overflow-hidden text-left leading-none">
                  {totalMonto > 0 && (
                    <div className="bg-black text-amber-300 text-[7px] sm:text-[9px] px-0.5 py-0.5 rounded font-black truncate text-center">
                      ${totalMonto >= 1000 ? `${(totalMonto / 1000).toFixed(1)}k` : totalMonto}
                    </div>
                  )}
                  <div className="text-[7px] sm:text-[9px] font-bold truncate text-black bg-white/90 px-0.5 py-0.5 rounded border border-black/30 flex items-center justify-between">
                    <span>{tasksForDay[0]?.is_completed ? '🟢' : tasksForDay[0]?.is_pago ? '💳' : '📌'}</span>
                    <span className="truncate hidden sm:inline">{tasksForDay.length} {tasksForDay.length === 1 ? 'evento' : 'eventos'}</span>
                    <span className="sm:hidden text-[7px]">{tasksForDay.length}</span>
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