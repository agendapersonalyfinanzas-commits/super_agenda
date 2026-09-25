import React from 'react';

export default function DailyAgendaList({ dayTasks, getSemaforoVisual, handleToggleComplete, handleDeleteTask, isAuditor, auditedUserName }) {
  return (
    <div className="w-full space-y-4 pt-4">
      <div className="border-b-4 border-black pb-2 flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-black text-lg uppercase text-black">📋 AGENDA DIARIA Y EVENTOS</h3>
          {isAuditor && auditedUserName && (
            <span className="bg-red-500 text-white border-2 border-black px-2.5 py-0.5 rounded-xl text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              Auditoría: {auditedUserName}
            </span>
          )}
        </div>
        <span className="bg-amber-300 border-2 border-black px-2.5 py-0.5 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          Días con actividad: {Object.keys(dayTasks).length}
        </span>
      </div>

      {Object.keys(dayTasks).length === 0 ? (
        <div className="bg-white border-4 border-black rounded-3xl p-6 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <p className="font-bold text-xs uppercase text-stone-600">
            {isAuditor ? `No hay actividades ni pagos programados para ${auditedUserName || 'el usuario seleccionado'}.` : 'No hay actividades ni pagos programados en el calendario.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {Object.entries(dayTasks).map(([dateStr, tasks]) => {
            const totalPendientes = tasks.filter(t => !t.is_completed).length;

            return (
              <div 
                key={dateStr}
                className="bg-white border-4 border-black rounded-3xl p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-4"
              >
                {/* Encabezado de la tarjeta por Día */}
                <div className="flex justify-between items-center border-b-3 border-black pb-2.5 bg-amber-100 -mx-5 -mt-5 p-4 rounded-t-3xl border-t-0 border-x-0 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📅</span>
                    <h4 className="font-black text-base uppercase text-black">
                      Día: {dateStr}
                    </h4>
                  </div>
                  <span className={`border-2 border-black px-2.5 py-0.5 rounded-xl text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${totalPendientes === 0 ? 'bg-emerald-300 text-black' : 'bg-amber-300 text-black'}`}>
                    {totalPendientes === 0 ? '✨ ¡Día Completado!' : `${totalPendientes} pendientes`}
                  </span>
                </div>

                {/* Lista de eventos para este día */}
                <div className="space-y-3">
                  {tasks.map(task => {
                    const isCompleted = task.is_completed;
                    const isPago = task.is_pago;
                    const semaforo = getSemaforoVisual(task);

                    return (
                      <div 
                        key={task.id}
                        className={`border-3 border-black p-3.5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                          isCompleted ? 'bg-stone-100 opacity-80' : 'bg-amber-50/50 hover:bg-amber-50'
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          {/* Checkbox / Botón de palomear rápido */}
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(task)}
                            className={`w-7 h-7 rounded-xl border-3 border-black flex items-center justify-center font-black text-sm cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 shrink-0 ${
                              isCompleted ? 'bg-emerald-400 text-black' : 'bg-white text-transparent'
                            }`}
                            title={isCompleted ? "Marcar como pendiente" : "Palomear como realizado"}
                          >
                            ✓
                          </button>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* ICONO DISTINTIVO: FINANZAS VS ACTIVIDAD */}
                              <span className="bg-amber-300 border border-black px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase flex items-center gap-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                {task.is_pago ? '💳 FINANZAS' : '📌 ACTIVIDAD'} ⏰ {task.time || '12:00'}
                              </span>
                              <span className="text-[10px] font-black uppercase text-stone-700 bg-white border border-black px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                [{task.category || 'GENERAL'}]
                              </span>
                            </div>
                            <h5 className={`font-black text-sm uppercase mt-1 ${isCompleted ? 'line-through text-stone-400' : 'text-black'}`}>
                              {task.text || task.concept} {task.recurrence === 'monthly' ? '🔁' : ''}
                            </h5>
                            {isPago && (task.monto > 0 || task.amount > 0) && (
                              <p className="text-[11px] font-black text-emerald-700 mt-0.5">
                                Monto: ${task.monto || task.amount} ({task.transaction_type === 'expense' ? 'Pago' : 'Cobro'})
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                          <span className={`border-2 border-black px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${semaforo?.clase || 'bg-stone-200 text-black'}`}>
                            {semaforo?.badge || 'PENDIENTE'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(task)}
                            className={`px-2.5 py-1 border-2 border-black font-black text-[10px] uppercase rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer ${
                              isCompleted ? 'bg-stone-200 text-black' : isPago ? 'bg-green-300 text-black' : 'bg-amber-400 text-black'
                            }`}
                          >
                            {isCompleted ? '↩️ Reabrir' : isPago ? '💳 Pagar' : '✓ Realizado'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id)}
                            className="px-2.5 py-1 bg-rose-200 border-2 border-black font-black text-[10px] uppercase rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer text-rose-900"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}