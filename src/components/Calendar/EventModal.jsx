// src/components/Calendar/EventModal.jsx
import React from 'react';
import { aMayusculas } from '../../utils/mayusculas.js';

export default function EventModal({
  selectedDate,
  setSelectedDate,
  setIsCanvasOpen,
  setIsVoiceOpen,
  newTaskDate,
  setModalCalendarDate,
  modalCalendarDate,
  setNewTaskDate,
  newTaskTime,
  setNewTaskTime,
  newTaskText,
  setNewTaskText,
  esPagoProgramado,
  setEsPagoProgramado,
  montoPago,
  setMontoPago,
  tipoMovimiento,
  setTipoMovimiento,
  categoriaPago,
  setCategoriaPago,
  frecuenciaPago,
  setFrecuenciaPago,
  handleAddTask,
  dayTasks,
  getSemaforoVisual,
  handleToggleComplete,
  handleDeleteTask
}) {
  if (!selectedDate) return null;

  // 🛡️ Blindaje inteligente: Asegura una fecha válida para el mini-calendario del modal
  const safeModalDate = (modalCalendarDate instanceof Date && !isNaN(modalCalendarDate))
    ? modalCalendarDate
    : (selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date());

  const modalYear = safeModalDate.getFullYear();
  const modalMonth = safeModalDate.getMonth();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 font-mono select-none">
      <div className="w-full max-w-lg bg-amber-400 border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        
        <div className="flex justify-between items-center border-b-4 border-black pb-3">
          <div>
            <h3 className="font-black uppercase text-base text-black">
              {aMayusculas('Actividades y Pagos del Día')}
            </h3>
            <p className="text-xs font-bold text-amber-950">{selectedDate}</p>
          </div>
          <button 
            type="button"
            onClick={() => setSelectedDate(null)} 
            className="text-black font-black text-xl hover:text-stone-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsCanvasOpen(true)}
          className="w-full py-2.5 bg-white border-4 border-black rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
        >
          ✏️ {aMayusculas('Abrir Lienzo S-Pen')}
        </button>

        {/* FORMULARIO DE NUEVA ACTIVIDAD CON SELECTOR DE HORA RETRO-COMIC */}
        <div className="space-y-3 bg-amber-300 p-3.5 border-3 border-black rounded-2xl shadow-[3px_3px_0px_rgba(0,0,0,1)]">
          
          <div className="bg-white border-3 border-black rounded-2xl p-3 space-y-2">
            <div className="flex justify-between items-center font-black text-xs uppercase">
              <span>📅 Fecha Seleccionada:</span>
              <span className="bg-amber-200 border border-black px-2 py-0.5 rounded text-[10px]">
                {newTaskDate || selectedDate}
              </span>
            </div>

            <div className="flex justify-between items-center bg-amber-100 border-2 border-black rounded-xl p-1.5">
              <button 
                type="button"
                onClick={() => setModalCalendarDate(new Date(modalYear, modalMonth - 1, 1))}
                className="px-2.5 py-1 bg-white border border-black rounded-lg font-black text-[10px] uppercase cursor-pointer hover:bg-stone-100 active:translate-x-0.5 active:translate-y-0.5"
              >
                ◀ Mes
              </button>
              <span className="font-black text-xs uppercase">
                {safeModalDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
              </span>
              <button 
                type="button"
                onClick={() => setModalCalendarDate(new Date(modalYear, modalMonth + 1, 1))}
                className="px-2.5 py-1 bg-white border border-black rounded-lg font-black text-[10px] uppercase cursor-pointer hover:bg-stone-100 active:translate-x-0.5 active:translate-y-0.5"
              >
                Mes ▶
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black pt-1">
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                <div key={i} className="text-stone-600 pb-1">{d}</div>
              ))}
              {Array.from({ length: new Date(modalYear, modalMonth, 1).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: new Date(modalYear, modalMonth + 1, 0).getDate() }).map((_, i) => {
                const dayNum = i + 1;
                const y = modalYear;
                const m = String(modalMonth + 1).padStart(2, '0');
                const d = String(dayNum).padStart(2, '0');
                const dateStr = `${y}-${m}-${d}`;
                const isSelected = (newTaskDate || selectedDate) === dateStr;

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => setNewTaskDate(dateStr)}
                    className={`h-7 rounded-lg border border-black font-black flex items-center justify-center cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-emerald-400 text-black scale-105 shadow-[1px_1px_0px_rgba(0,0,0,1)]' 
                        : 'bg-amber-50 hover:bg-amber-200 text-black'
                    }`}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>
          </div>

          {/* HORA Y TÍTULO DE LA ACTIVIDAD - SELECTOR ESTILO RETRO-COMIC */}
          <div className="flex gap-2 items-end">
            <div className="flex flex-col">
              <label className="text-[10px] font-black uppercase text-black mb-1">Hora:</label>
              <div className="flex gap-1 items-center">
                <select
                  value={newTaskTime.split(':')[0] || '09'}
                  onChange={(e) => {
                    const h = e.target.value;
                    const m = newTaskTime.split(':')[1] || '00';
                    setNewTaskTime(`${h}:${m}`);
                  }}
                  className="p-2.5 bg-white border-3 border-black rounded-xl text-xs font-black uppercase focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                >
                  {Array.from({ length: 24 }).map((_, i) => {
                    const hStr = String(i).padStart(2, '0');
                    return <option key={hStr} value={hStr}>{hStr}</option>;
                  })}
                </select>
                <span className="font-black text-black text-sm">:</span>
                <select
                  value={newTaskTime.split(':')[1] || '00'}
                  onChange={(e) => {
                    const m = e.target.value;
                    const h = newTaskTime.split(':')[0] || '09';
                    setNewTaskTime(`${h}:${m}`);
                  }}
                  className="p-2.5 bg-white border-3 border-black rounded-xl text-xs font-black uppercase focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                >
                  {['00', '10', '15', '20', '30', '40', '45', '50'].map((mStr) => (
                    <option key={mStr} value={mStr}>{mStr}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col flex-1">
              <label className="text-[10px] font-black uppercase text-black mb-1">Concepto / Actividad:</label>
              <input
                type="text"
                placeholder="Ej. Cita en la SEV. Pago de Renta.."
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                className="p-2.5 bg-white border-3 border-black rounded-xl text-xs font-bold uppercase focus:outline-none"
              />
            </div>
          </div>

          <div className="border-2 border-black rounded-xl p-2.5 bg-white flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer font-black text-xs uppercase">
              <input 
                type="checkbox" 
                checked={esPagoProgramado}
                onChange={(e) => setEsPagoProgramado(e.target.checked)}
                className="w-4 h-4 accent-black cursor-pointer"
              />
              <span>📅 ¿Es un pago programado?</span>
            </label>

            {esPagoProgramado && (
              <div className="flex flex-col gap-2.5 pt-2 border-t border-black/20">
                <div className="flex gap-2">
                  <input 
                    type="number"
                    placeholder="Monto ($)"
                    value={montoPago}
                    onChange={(e) => setMontoPago(e.target.value)}
                    className="flex-1 border-2 border-black rounded-xl px-2.5 py-1.5 text-xs font-bold bg-amber-50 focus:outline-none"
                  />
                  <select 
                    value={tipoMovimiento}
                    onChange={(e) => setTipoMovimiento(e.target.value)}
                    className="border-2 border-black rounded-xl px-2.5 py-1.5 text-xs font-bold bg-amber-50 focus:outline-none uppercase"
                  >
                    <option value="expense">Gasto (Pago)</option>
                    <option value="income">Ingreso (Cobro)</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="Categoría (Ej. Renta)"
                    value={categoriaPago}
                    onChange={(e) => setCategoriaPago(e.target.value)}
                    className="flex-1 border-2 border-black rounded-xl px-2.5 py-1.5 text-xs font-bold bg-amber-50 uppercase focus:outline-none"
                  />

                  <select 
                    value={frecuenciaPago}
                    onChange={(e) => setFrecuenciaPago(e.target.value)}
                    className="w-40 border-2 border-black rounded-xl px-2.5 py-1.5 text-xs font-bold bg-amber-50 focus:outline-none uppercase"
                  >
                    <option value="single">🎯 Eventual</option>
                    <option value="monthly">🔁 Recurrente</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsVoiceOpen(true)}
              className="flex-1 py-2.5 bg-white border-3 border-black rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            >
              🎙️ {aMayusculas('Dictar')}
            </button>
            <button
              type="button"
              onClick={handleAddTask}
              className="flex-1 py-2.5 bg-emerald-400 hover:bg-emerald-300 border-3 border-black rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            >
              💾 {aMayusculas('Guardar Actividad')}
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-56 overflow-y-auto pt-2">
          {(dayTasks[selectedDate] || []).map((task) => {
            const semaforo = getSemaforoVisual(task);

            return (
              <div 
                key={task.id} 
                className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-2.5 border-2 border-black rounded-xl text-xs font-bold gap-2 transition-all duration-300 ${
                  task.is_completed ? 'bg-stone-200 opacity-80' : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden flex-wrap">
                  <span className="border border-black px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-200 text-black">
                    {task.time}
                  </span>
                  
                  <span className={`break-all font-black ${
                    task.is_completed ? 'line-through text-stone-500' : 'text-black'
                  }`}>
                    {task.text} {task.recurrence === 'monthly' ? '🔁' : '🎯'}
                  </span>

                  {task.is_pago && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="bg-sky-100 border border-black px-2 py-0.5 rounded text-[10px] font-black uppercase">
                        🏷️ {task.category}
                      </span>
                      <span className="bg-sky-100 border border-black px-2 py-0.5 rounded text-[10px] font-black">
                        ${task.monto?.toLocaleString()} ({task.transaction_type === 'expense' ? 'Pago' : 'Cobro'})
                      </span>
                      <span className={`border px-2 py-0.5 rounded text-[10px] font-black uppercase ${semaforo.clase}`}>
                        {semaforo.badge}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3 shrink-0 ml-auto sm:ml-2">
                  <button 
                    type="button"
                    onClick={() => handleToggleComplete(task)}
                    className={`px-2.5 py-1 border-2 border-black rounded-xl font-black text-[10px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all ${
                      task.is_completed ? 'bg-amber-300 hover:bg-amber-400' : 'bg-green-300 hover:bg-green-400'
                    }`}
                    title={task.is_completed ? "Desmarcar pago" : "Pagar y registrar en finanzas"}
                  >
                    {task.is_completed ? '↩️ Reabrir' : '💳 Pagar al Instante'}
                  </button>

                  <button 
                    type="button"
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-rose-600 font-black cursor-pointer hover:scale-125 transition-transform text-base"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}

          {(!dayTasks[selectedDate] || dayTasks[selectedDate].length === 0) && (
            <p className="text-center text-xs font-black text-amber-950 uppercase pt-2">
              No hay actividades o pagos programados
            </p>
          )}
        </div>

      </div>
    </div>
  );
}