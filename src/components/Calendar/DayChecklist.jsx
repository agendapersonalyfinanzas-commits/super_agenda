// src/components/Calendar/DayChecklist.jsx
import React from 'react';

export default function DayChecklist({ selectedDate, dayTasks, handleToggleComplete, handleDeleteTask, onClose, onSwitchToCanvas }) {
  
  const getDateObj = (dateInput) => {
    if (!dateInput) return new Date();
    if (dateInput instanceof Date && !isNaN(dateInput)) return dateInput;
    if (typeof dateInput === 'string') {
      const parts = dateInput.split(/[-/T]/);
      if (parts.length >= 3) {
        // Si viene en formato YYYY-MM-DD o DD-MM-YYYY
        if (parts[0].length === 4) {
          return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
          return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
      }
    }
    const parsed = new Date(dateInput);
    return !isNaN(parsed) ? parsed : new Date();
  };

  const dateObj = getDateObj(selectedDate);
  const formattedDateString = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

  // 🔴 CORRECCIÓN: Extraer exclusivamente las tareas del día seleccionado del diccionario global
  let tasks = [];
  if (dayTasks) {
    if (Array.isArray(dayTasks)) {
      // Si por alguna razón pasaron un arreglo plano, filtramos por fecha de base de datos
      tasks = dayTasks.filter(t => t.event_date === formattedDateString);
    } else if (typeof dayTasks === 'object') {
      // Si pasaron el objeto agrupado por fecha (ej: dayTasks['2026-09-22'])
      tasks = dayTasks[formattedDateString] || [];
    }
  }

  return (
    <div className="bg-amber-300 border-4 border-black p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] font-mono select-none space-y-4 relative">
      
      {/* Botón de cierre */}
      <button 
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 bg-white border-2 border-black w-8 h-8 rounded-xl font-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer hover:bg-rose-300 transition-colors"
      >
        ✕
      </button>

      <div className="border-b-4 border-black pb-3 pr-8">
        <h2 className="text-lg font-black uppercase text-black">
          📋 ACTIVIDADES Y PAGOS DEL DÍA
        </h2>
        <span className="text-xs font-bold bg-white border-2 border-black px-2 py-0.5 rounded-lg inline-block mt-1">
          {formattedDateString}
        </span>
      </div>

      {/* Botón para abrir lienzo S-Pen */}
      {onSwitchToCanvas && (
        <button
          type="button"
          onClick={onSwitchToCanvas}
          className="w-full bg-white border-2 border-black py-2.5 rounded-2xl font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer hover:bg-amber-100 transition-colors"
        >
          ✏️ ABRIR LIENZO S-PEN
        </button>
      )}

      {/* Listado de tareas o actividades filtradas */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <div 
              key={task.id || Math.random()} 
              className={`flex justify-between items-center p-3 border-2 border-black rounded-xl text-xs font-bold ${
                task.is_completed ? 'bg-stone-200 opacity-80' : 'bg-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="border border-black px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-200">
                  {task.time || '09:00'}
                </span>
                <span className={task.is_completed ? 'line-through text-stone-500' : 'text-black'}>
                  {task.text || task.task || task.title}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => handleToggleComplete && handleToggleComplete(task)}
                  className={`px-2 py-1 border-2 border-black rounded-lg font-black text-[10px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer ${
                    task.is_completed ? 'bg-amber-300' : 'bg-emerald-300'
                  }`}
                >
                  {task.is_completed ? 'Reabrir' : 'Completar'}
                </button>

                <button 
                  type="button"
                  onClick={() => handleDeleteTask && handleDeleteTask(task.id)}
                  className="text-rose-600 font-black cursor-pointer hover:scale-125 transition-transform text-sm"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center font-bold text-black uppercase text-xs py-4 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            NO HAY ACTIVIDADES O PAGOS PROGRAMADOS
          </p>
        )}
      </div>

    </div>
  );
}