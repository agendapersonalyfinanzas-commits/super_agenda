// src/components/Calendar/EventModal.jsx
import React from 'react';

export default function EventModal(props) {
  const {
    selectedDate,
    handleCloseModal,
    setIsCanvasOpen,
    setIsVoiceOpen,
    newTaskDate,
    setNewTaskDate,
    modalCalendarDate,
    setModalCalendarDate,
    newTaskTime,
    setNewTaskTime,
    newTaskText,
    setNewTaskText,
    esPagoProgramado,
    setEsPagoProgramado,
    montoPago,
    setMontoPago,
    tipoMovimiento = 'expense',
    setTipoMovimiento,
    categoriaPago = 'GENERAL',
    setCategoriaPago,
    frecuenciaPago = 'single',
    setFrecuenciaPago,
    handleAddTask,
    dayTasks = [],
    dayTasksMap = {},
    getSemaforoVisual,
    handleToggleComplete,
    handleDeleteTask,
    isModalOpen = true
  } = props;

  if (!selectedDate && !isModalOpen) return null;

  const activeTasks = Array.isArray(dayTasks) 
    ? dayTasks 
    : (dayTasksMap && dayTasksMap[selectedDate]) || [];

  const categoriasDisponibles = ['GENERAL', 'COMIDA', 'SERVICIOS', 'RENTA', 'OTROS'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 font-mono select-none overflow-y-auto">
      <div className="w-full max-w-lg bg-amber-400 border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4 max-h-[90vh] overflow-y-auto my-auto">
        
        {/* ENCABEZADO Y BOTÓN CERRAR */}
        <div className="flex justify-between items-center border-b-4 border-black pb-3">
          <div>
            <h3 className="font-black uppercase text-base text-black">
              ACTIVIDADES Y PAGOS DEL DÍA
            </h3>
            <p className="text-xs font-bold text-amber-950">{selectedDate}</p>
          </div>
          <button 
            type="button"
            onClick={handleCloseModal} 
            className="text-black font-black text-2xl hover:text-rose-700 cursor-pointer p-1 leading-none transition-transform hover:scale-125"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* BOTÓN LIENZO S-PEN */}
        <button
          type="button"
          onClick={() => setIsCanvasOpen && setIsCanvasOpen(true)}
          className="w-full py-2.5 bg-white border-4 border-black rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer hover:bg-amber-100"
        >
          ✏️ ABRIR LIENZO S-PEN
        </button>

        {/* FORMULARIO */}
        <div className="space-y-3 bg-amber-300 p-3.5 border-3 border-black rounded-2xl shadow-[3px_3px_0px_rgba(0,0,0,1)]">
          
          {/* NAVEGADOR DE FECHAS EN MODAL */}
          {modalCalendarDate && (
            <div className="bg-white border-3 border-black rounded-2xl p-3 space-y-2">
              <div className="flex justify-between items-center font-black text-xs uppercase">
                <span>📅 FECHA SELECCIONADA:</span>
                <span className="bg-amber-200 border border-black px-2 py-0.5 rounded text-[10px]">
                  {newTaskDate || selectedDate}
                </span>
              </div>

              <div className="flex justify-between items-center bg-amber-100 border-2 border-black rounded-xl p-1.5">
                <button 
                  type="button"
                  onClick={() => setModalCalendarDate && setModalCalendarDate(new Date(modalCalendarDate.getFullYear(), modalCalendarDate.getMonth() - 1, 1))}
                  className="px-2.5 py-1 bg-white border border-black rounded-lg font-black text-[10px] uppercase cursor-pointer hover:bg-stone-100"
                >
                  ◀ MES
                </button>
                <span className="font-black text-xs uppercase">
                  {modalCalendarDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                </span>
                <button 
                  type="button"
                  onClick={() => setModalCalendarDate && setModalCalendarDate(new Date(modalCalendarDate.getFullYear(), modalCalendarDate.getMonth() + 1, 1))}
                  className="px-2.5 py-1 bg-white border border-black rounded-lg font-black text-[10px] uppercase cursor-pointer hover:bg-stone-100"
                >
                  MES ▶
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black pt-1">
                {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                  <div key={i} className="text-stone-600 pb-1">{d}</div>
                ))}
                {Array.from({ length: new Date(modalCalendarDate.getFullYear(), modalCalendarDate.getMonth(), 1).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: new Date(modalCalendarDate.getFullYear(), modalCalendarDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                  const dayNum = i + 1;
                  const y = modalCalendarDate.getFullYear();
                  const m = String(modalCalendarDate.getMonth() + 1).padStart(2, '0');
                  const d = String(dayNum).padStart(2, '0');
                  const dateStr = `${y}-${m}-${d}`;
                  const isSelected = (newTaskDate || selectedDate) === dateStr;

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => setNewTaskDate && setNewTaskDate(dateStr)}
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
          )}

          {/* HORA Y CONCEPTO */}
          <div className="flex gap-2 items-end">
            <div className="flex flex-col">
              <label className="text-[10px] font-black uppercase text-black mb-1">HORA:</label>
              <div className="flex gap-1 items-center bg-white border-3 border-black rounded-xl p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <input
                  type="time"
                  value={newTaskTime || ''}
                  onChange={(e) => setNewTaskTime && setNewTaskTime(e.target.value)}
                  className="bg-transparent font-black text-xs uppercase focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="flex flex-col flex-1">
              <label className="text-[10px] font-black uppercase text-black mb-1">CONCEPTO / ACTIVIDAD:</label>
              <input
                type="text"
                placeholder="Ej. PAGO COMIDA DOÑA JULIA"
                value={newTaskText || ''}
                onChange={(e) => setNewTaskText && setNewTaskText(e.target.value)}
                className="p-2.5 bg-white border-3 border-black rounded-xl text-xs font-bold uppercase focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black"
              />
            </div>
          </div>

          {/* SECCIÓN PAGOS PROGRAMADOS SIN <SELECT> NATIVO */}
          <div className="border-3 border-black rounded-xl p-3 bg-white flex flex-col gap-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <label className="flex items-center gap-2 cursor-pointer font-black text-xs uppercase text-black">
              <input 
                type="checkbox" 
                checked={!!esPagoProgramado}
                onChange={(e) => setEsPagoProgramado && setEsPagoProgramado(e.target.checked)}
                className="w-4 h-4 accent-black cursor-pointer"
              />
              <span>📅 ¿ES UN PAGO PROGRAMADO?</span>
            </label>

            {esPagoProgramado && (
              <div className="flex flex-col gap-2.5 pt-2 border-t-2 border-black">
                
                {/* MONTO Y BOTONES CONMUTADORES GASTO/INGRESO */}
                <div className="flex gap-2 items-center">
                  <input 
                    type="number"
                    placeholder="Monto ($)"
                    value={montoPago || ''}
                    onChange={(e) => setMontoPago && setMontoPago(e.target.value)}
                    className="flex-1 border-2 border-black rounded-xl px-2.5 py-1.5 text-xs font-bold bg-amber-50 text-black focus:outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                  />

                  {/* BOTONES CÓMIC RETRO EN LUGAR DE SELECT */}
                  <div className="flex border-2 border-black rounded-xl overflow-hidden shadow-[2px_2px_0px_rgba(0,0,0,1)] shrink-0">
                    <button
                      type="button"
                      onClick={() => setTipoMovimiento && setTipoMovimiento('expense')}
                      className={`px-2.5 py-1.5 text-[10px] font-black uppercase cursor-pointer transition-all ${
                        tipoMovimiento === 'expense'
                          ? 'bg-rose-400 text-black border-r-2 border-black'
                          : 'bg-white text-stone-600 border-r-2 border-black hover:bg-rose-100'
                      }`}
                    >
                      💸 GASTO
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoMovimiento && setTipoMovimiento('income')}
                      className={`px-2.5 py-1.5 text-[10px] font-black uppercase cursor-pointer transition-all ${
                        tipoMovimiento === 'income'
                          ? 'bg-emerald-400 text-black'
                          : 'bg-white text-stone-600 hover:bg-emerald-100'
                      }`}
                    >
                      💰 INGRESO
                    </button>
                  </div>
                </div>

                {/* SELECCIÓN RÁPIDA DE CATEGORÍA */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase text-black">Categoría:</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {categoriasDisponibles.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoriaPago && setCategoriaPago(cat)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-black border-2 border-black transition-all cursor-pointer ${
                          categoriaPago === cat
                            ? 'bg-amber-400 text-black shadow-[1px_1px_0px_rgba(0,0,0,1)] scale-105'
                            : 'bg-white text-stone-600 hover:bg-amber-100'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* FRECUENCIA */}
                {setFrecuenciaPago && (
                  <div className="flex gap-2 items-center justify-between border-t border-stone-200 pt-2">
                    <span className="text-[10px] font-black uppercase text-black">Frecuencia:</span>
                    <div className="flex border-2 border-black rounded-xl overflow-hidden shadow-[2px_2px_0px_rgba(0,0,0,1)] shrink-0">
                      <button
                        type="button"
                        onClick={() => setFrecuenciaPago('single')}
                        className={`px-2.5 py-1 text-[10px] font-black uppercase cursor-pointer transition-all ${
                          frecuenciaPago === 'single'
                            ? 'bg-amber-400 text-black border-r-2 border-black'
                            : 'bg-white text-stone-600 border-r-2 border-black hover:bg-amber-100'
                        }`}
                      >
                        🎯 ÚNICO
                      </button>
                      <button
                        type="button"
                        onClick={() => setFrecuenciaPago('monthly')}
                        className={`px-2.5 py-1 text-[10px] font-black uppercase cursor-pointer transition-all ${
                          frecuenciaPago === 'monthly'
                            ? 'bg-amber-400 text-black'
                            : 'bg-white text-stone-600 hover:bg-amber-100'
                        }`}
                      >
                        🔁 MENSUAL
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* BOTONES ACCIONES */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsVoiceOpen && setIsVoiceOpen(true)}
              className="flex-1 py-2.5 bg-white border-3 border-black rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer hover:bg-stone-100"
            >
              🎙️ DICTAR
            </button>
            <button
              type="button"
              onClick={handleAddTask}
              className="flex-1 py-2.5 bg-emerald-400 hover:bg-emerald-300 border-3 border-black rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer text-black"
            >
              💾 GUARDAR ACTIVIDAD
            </button>
          </div>
        </div>

        {/* LISTA DE ACTIVIDADES CREADAS */}
        <div className="space-y-2 max-h-56 overflow-y-auto pt-2">
          {activeTasks.map((task) => {
            const semaforo = getSemaforoVisual ? getSemaforoVisual(task) : { clase: 'bg-stone-100 text-black', badge: 'PENDIENTE' };

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
                      <span className="bg-sky-100 border border-black px-2 py-0.5 rounded text-[10px] font-black uppercase text-black">
                        🏷️ {task.category}
                      </span>
                      <span className="bg-sky-100 border border-black px-2 py-0.5 rounded text-[10px] font-black text-black">
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
                    onClick={() => handleToggleComplete && handleToggleComplete(task)}
                    className={`px-2.5 py-1 border-2 border-black rounded-xl font-black text-[10px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all ${
                      task.is_completed ? 'bg-amber-300 hover:bg-amber-400 text-black' : 'bg-green-300 hover:bg-green-400 text-black'
                    }`}
                  >
                    {task.is_completed ? '↩️ Reabrir' : '💳 Pagar al Instante'}
                  </button>

                  <button 
                    type="button"
                    onClick={() => handleDeleteTask && handleDeleteTask(task.id)}
                    className="text-rose-600 font-black cursor-pointer hover:scale-125 transition-transform text-base"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}

          {activeTasks.length === 0 && (
            <p className="text-center text-xs font-black text-amber-950 uppercase pt-2">
              No hay actividades o pagos programados
            </p>
          )}
        </div>

      </div>
    </div>
  );
}