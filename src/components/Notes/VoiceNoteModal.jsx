import React, { useState } from 'react';
import { aMayusculas } from '../../utils/mayusculas.js';

export default function VoiceNoteModal({ 
  onClose, 
  onSave, 
  modalCalendarDate: propModalCalendarDate, 
  setModalCalendarDate: propSetModalCalendarDate, 
  newTaskDate: propNewTaskDate, 
  setNewTaskDate: propNewTaskDateSetter,
  selectedDate 
}) {
  const [textoDictado, setTextoDictado] = useState('');
  const [isListening, setIsListening] = useState(false);

  // Estados locales como respaldo por si no se pasan desde el componente padre
  const [localModalCalendarDate, setLocalModalCalendarDate] = useState(new Date());
  const [localNewTaskDate, setLocalNewTaskDate] = useState(selectedDate || new Date().toISOString().split('T')[0]);

  const modalCalendarDate = propModalCalendarDate !== undefined ? propModalCalendarDate : localModalCalendarDate;
  const setModalCalendarDate = propSetModalCalendarDate || setLocalModalCalendarDate;

  const newTaskDate = propNewTaskDate !== undefined ? propNewTaskDate : localNewTaskDate;
  const setNewTaskDate = propNewTaskDateSetter || setLocalNewTaskDate;

  // Estados para pagos programados
  const [esPagoProgramado, setEsPagoProgramado] = useState(false);
  const [montoPago, setMontoPago] = useState('');
  const [tipoMovimiento, setTipoMovimiento] = useState('expense'); // 'expense' | 'income'
  const [categoriaPago, setCategoriaPago] = useState('GENERAL');
  const [frecuenciaPago, setFrecuenciaPago] = useState('single'); // 'single' | 'monthly'

  const categoriasDisponibles = ['GENERAL', 'COMIDA', 'SERVICIOS', 'RENTA', 'OTROS'];

  // Soporte para Web Speech API (Dictado por voz nativo del navegador)
  const handleStartListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta reconocimiento de voz nativo. Puedes escribir tu nota directamente en el campo de texto.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setTextoDictado(prev => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch (err) {
      console.error('No se pudo iniciar el dictado:', err);
      setIsListening(false);
    }
  };

  const handleSaveNote = () => {
    if (!textoDictado.trim()) {
      alert('Por favor escribe o dicta una nota antes de guardar.');
      return;
    }

    if (typeof onSave === 'function') {
      onSave({
        text: textoDictado.trim(),
        date: newTaskDate || selectedDate,
        is_pago: esPagoProgramado,
        monto: montoPago ? parseFloat(montoPago) : 0,
        transaction_type: tipoMovimiento,
        category: categoriaPago,
        recurrence: frecuenciaPago
      });
    }
  };

  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 font-mono select-none overflow-y-auto"
      onClick={handleClose}
    >
      <div 
        className="w-full max-w-lg bg-amber-400 border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4 max-h-[90vh] overflow-y-auto my-auto cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* ENCABEZADO Y BOTÓN CERRAR */}
        <div className="flex justify-between items-center border-b-4 border-black pb-3">
          <div>
            <h3 className="font-black uppercase text-base text-black">
              {aMayusculas('Teclado / Nota de Voz & Fecha')}
            </h3>
            <p className="text-[10px] font-bold text-amber-950 uppercase">
              Selecciona fecha, dicta o programa tu pago
            </p>
          </div>
          <button 
            type="button"
            onClick={handleClose} 
            className="text-black font-black text-xl hover:text-stone-800 cursor-pointer bg-amber-300 hover:bg-amber-200 border-2 border-black rounded-lg w-8 h-8 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
          >
            ✕
          </button>
        </div>

        {/* CUERPO DEL MODAL */}
        <div className="space-y-3 bg-amber-300 p-3.5 border-3 border-black rounded-2xl shadow-[3px_3px_0px_rgba(0,0,0,1)]">
          
          {/* NAVEGADOR DE FECHAS ESTILO RETRO (MINI CALENDARIO) */}
          {modalCalendarDate && (
            <div className="bg-white border-3 border-black rounded-2xl p-3 space-y-2 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <div className="flex justify-between items-center font-black text-xs uppercase">
                <span>📅 FECHA SELECCIONADA:</span>
                <span className="bg-amber-200 border border-black px-2 py-0.5 rounded text-[10px]">
                  {newTaskDate || selectedDate}
                </span>
              </div>

              <div className="flex justify-between items-center bg-amber-100 border-2 border-black rounded-xl p-1.5">
                <button 
                  type="button"
                  onClick={() => setModalCalendarDate(new Date(modalCalendarDate.getFullYear(), modalCalendarDate.getMonth() - 1, 1))}
                  className="px-2.5 py-1 bg-white border border-black rounded-lg font-black text-[10px] uppercase cursor-pointer hover:bg-stone-100"
                >
                  ◀ MES
                </button>
                <span className="font-black text-xs uppercase">
                  {modalCalendarDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                </span>
                <button 
                  type="button"
                  onClick={() => setModalCalendarDate(new Date(modalCalendarDate.getFullYear(), modalCalendarDate.getMonth() + 1, 1))}
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
          )}

          {/* TEXTAREA Y BOTÓN DE DICTADO */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-black">
              Contenido de la Nota / Actividad:
            </label>
            <textarea
              rows={3}
              placeholder="Escribe aquí o presiona dictar..."
              value={textoDictado}
              onChange={(e) => setTextoDictado(e.target.value)}
              className="p-3 bg-white border-3 border-black rounded-2xl text-xs font-bold uppercase focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black resize-none"
            />

            <button
              type="button"
              onClick={handleStartListening}
              className={`w-full py-2.5 border-3 border-black rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isListening 
                  ? 'bg-rose-400 text-black animate-pulse' 
                  : 'bg-white hover:bg-stone-100 text-black'
              }`}
            >
              <span>{isListening ? '🎙️ ESCUCHANDO...' : '🎙️ INICIAR DICTADO POR VOZ'}</span>
            </button>
          </div>

          {/* SECCIÓN PAGOS PROGRAMADOS */}
          <div className="border-3 border-black rounded-xl p-3 bg-white flex flex-col gap-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <label className="flex items-center gap-2 cursor-pointer font-black text-xs uppercase text-black">
              <input 
                type="checkbox" 
                checked={esPagoProgramado}
                onChange={(e) => setEsPagoProgramado(e.target.checked)}
                className="w-4 h-4 accent-black cursor-pointer"
              />
              <span>📅 ¿ES UN PAGO PROGRAMADO?</span>
            </label>

            {esPagoProgramado && (
              <div className="flex flex-col gap-2.5 pt-2 border-t-2 border-black">
                
                {/* MONTO Y GASTO/INGRESO */}
                <div className="flex gap-2 items-center">
                  <input 
                    type="number"
                    placeholder="Monto ($)"
                    value={montoPago}
                    onChange={(e) => setMontoPago(e.target.value)}
                    className="flex-1 border-2 border-black rounded-xl px-2.5 py-1.5 text-xs font-bold bg-amber-50 text-black focus:outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                  />

                  <div className="flex border-2 border-black rounded-xl overflow-hidden shadow-[2px_2px_0px_rgba(0,0,0,1)] shrink-0">
                    <button
                      type="button"
                      onClick={() => setTipoMovimiento('expense')}
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
                      onClick={() => setTipoMovimiento('income')}
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

                {/* CATEGORÍA */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase text-black">Categoría:</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {categoriasDisponibles.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoriaPago(cat)}
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

              </div>
            )}
          </div>

          {/* BOTÓN GUARDAR */}
          <button
            type="button"
            onClick={handleSaveNote}
            className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 border-3 border-black rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer text-black"
          >
            💾 {aMayusculas('Guardar Nota / Pago')}
          </button>

        </div>

      </div>
    </div>
  );
}