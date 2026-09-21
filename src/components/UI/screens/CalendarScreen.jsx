import React, { useState, useEffect } from 'react';
import CalendarGrid from '../../../services/CalendarGrid';
import SIdenoteCanvas from '../../Expenses/SIdenoteCanvas';
import VoiceNoteModal from '../../Notes/VoiceNoteModal';

// ¡IMPORTANTE! Ajusta esta ruta a donde tengas tu cliente de Supabase
import { supabase } from '../../../supabaseClient'; 

// Utilidades centralizadas
import { guardarEnStorage, obtenerDeStorage } from '../../../utils/storage.js';
import { formatearFechaCorta } from '../../../utils/fechas.js';
import { aMayusculas } from '../../../utils/mayusculas.js';
import { obtenerMensajeError } from '../../../utils/errores.js';

const NOTES_STORAGE_KEY = 'family_spen_notes';

export default function CalendarScreen() {
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('09:00');
  
  const [newTaskDate, setNewTaskDate] = useState('');
  
  // Estado para navegar el mes dentro del mini-calendario del modal
  const [modalCalendarDate, setModalCalendarDate] = useState(new Date());

  // Estados para pagos, cobros, categoría libre y recurrencia
  const [esPagoProgramado, setEsPagoProgramado] = useState(false);
  const [montoPago, setMontoPago] = useState('');
  const [tipoMovimiento, setTipoMovimiento] = useState('expense'); // 'expense' o 'income'
  const [categoriaPago, setCategoriaPago] = useState('GENERAL');
  const [frecuenciaPago, setFrecuenciaPago] = useState('single'); // 'single' o 'monthly'

  const [successMessage, setSuccessMessage] = useState('');

  const [savedNotes, setSavedNotes] = useState(() => 
    obtenerDeStorage(NOTES_STORAGE_KEY, [])
  );
  
  const [dayTasks, setDayTasks] = useState({});

  useEffect(() => {
    if (selectedDate) {
      const [day, month, year] = selectedDate.split('/');
      const formatted = `${year}-${month}-${day}`;
      setNewTaskDate(formatted);
      setModalCalendarDate(new Date(year, month - 1, day));
    } else {
      const hoy = new Date().toISOString().split('T')[0];
      setNewTaskDate(hoy);
      setModalCalendarDate(new Date());
    }
  }, [selectedDate]);

  // ----------------------------------------------------------------
  // FUNCIONES DE SUPABASE
  // ----------------------------------------------------------------
  
  const fetchActivities = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) return;

      const { data, error } = await supabase
        .from('agenda_events')
        .select('*')
        .eq('user_id', userData.user.id);

      if (error) throw error;

      const grouped = {};
      
      data.forEach(task => {
        let dbDate = task.event_date; // 'YYYY-MM-DD'

        if (task.recurrence === 'monthly' && dbDate) {
          const [_, __, day] = dbDate.split('-');
          const now = new Date();
          const currentYear = now.getFullYear();
          const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
          dbDate = `${currentYear}-${currentMonth}-${day}`;
        }

        const [year, month, day] = dbDate.split('-');
        const dateStr = `${day}/${month}/${year}`;
        
        if (!grouped[dateStr]) grouped[dateStr] = [];
        grouped[dateStr].push({
          id: task.id,
          text: task.title,
          time: task.event_time ? task.event_time.substring(0, 5) : '00:00',
          is_completed: task.is_completed,
          is_expense: task.is_expense,
          icon_url: task.icon_url,
          is_pago: task.is_pago || false,
          monto: task.monto || 0,
          transaction_type: task.transaction_type || 'expense',
          category: task.category || 'GENERAL',
          recurrence: task.recurrence || 'single',
          event_date_db: dbDate
        });
      });

      Object.keys(grouped).forEach(date => {
        grouped[date].sort((a, b) => a.time.localeCompare(b.time));
      });

      setDayTasks(grouped);
    } catch (error) {
      console.error("Error al cargar eventos de Supabase:", error);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleAddTask = async () => {
    const hoyStr = new Date().toISOString().split('T')[0];

    if (!newTaskText.trim() || !newTaskDate) {
      alert("Por favor ingresa un título y selecciona una fecha.");
      return;
    }

    // Validación: Las tareas normales de agenda no permiten fechas pasadas,
    // pero los pagos/cobros (tanto eventuales como recurrentes) SÍ lo permiten para control financiero.
    if (!esPagoProgramado && newTaskDate < hoyStr) {
      alert("Las actividades normales de la agenda no se pueden programar en fechas pasadas.");
      return;
    }
    
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData?.user) {
        alert("Debes iniciar sesión para guardar actividades.");
        return;
      }
      const userId = userData.user.id;

      const { data: profileData } = await supabase
        .from('users')
        .select('household_id')
        .eq('id', userId)
        .single();

      const eventToInsert = {
        title: newTaskText.trim(),
        event_date: newTaskDate,
        event_time: newTaskTime ? (newTaskTime.length === 5 ? `${newTaskTime}:00` : newTaskTime) : '00:00:00',
        user_id: userId,
        household_id: profileData?.household_id || null,
        is_completed: false,
        is_expense: esPagoProgramado && tipoMovimiento === 'expense',
        icon_url: null,
        is_pago: esPagoProgramado,
        monto: esPagoProgramado && montoPago ? parseFloat(montoPago) : 0,
        transaction_type: tipoMovimiento,
        category: categoriaPago.trim().toUpperCase() || 'GENERAL',
        recurrence: esPagoProgramado ? frecuenciaPago : 'single'
      };

      const { error } = await supabase
        .from('agenda_events')
        .insert([eventToInsert]);

      if (error) throw error;

      setNewTaskText('');
      setEsPagoProgramado(false);
      setMontoPago('');
      setCategoriaPago('GENERAL');
      setFrecuenciaPago('single');
      triggerSuccess('¡Evento financiero guardado!');
      fetchActivities(); 

    } catch (error) {
      console.error("Error al guardar en Supabase:", error);
      alert(`Error al guardar: ${error.message || JSON.stringify(error)}`);
    }
  };

  const handleDeleteTask = async (taskId) => {
    const confirmDelete = window.confirm("¿Seguro que deseas borrar esta actividad?");
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('agenda_events')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      triggerSuccess('Actividad eliminada de la nube');
      fetchActivities();
    } catch (error) {
      console.error("Error al eliminar:", error);
      alert(`No se pudo eliminar: ${error.message || JSON.stringify(error)}`);
    }
  };

  const handleToggleComplete = async (task) => {
    const nuevoEstado = !task.is_completed;

    try {
      const { error } = await supabase
        .from('agenda_events')
        .update({ is_completed: nuevoEstado })
        .eq('id', task.id);

      if (error) throw error;

      if (task.is_pago && nuevoEstado && task.monto > 0) {
        const { data: authData } = await supabase.auth.getUser();
        const userEmail = authData?.user?.email || null;

        const { error: errorTrans } = await supabase
          .from('transactions')
          .insert([
            {
              concept: `Movimiento: ${task.text}`,
              amount: task.monto,
              transaction_type: task.transaction_type || 'expense',
              category: task.category || 'GENERAL',
              auth_user_email: userEmail
            }
          ]);

        if (!errorTrans) {
          window.dispatchEvent(new CustomEvent('transaction-updated'));
        }
      }

      triggerSuccess(nuevoEstado ? '💳 ¡Pago realizado y registrado en finanzas!' : 'Actividad reabierta');
      fetchActivities();
    } catch (error) {
      console.error("Error al actualizar estado y finanzas:", error.message);
      alert("Hubo un error al procesar el movimiento.");
    }
  };

  const getSemaforoVisual = (task) => {
    if (task.is_completed) {
      return {
        badge: '🟢 Pagado',
        clase: 'bg-green-100 border-green-600 text-green-900'
      };
    }

    if (!task.is_pago) {
      return {
        badge: '',
        clase: 'bg-white text-black'
      };
    }

    const hoy = new Date().toISOString().split('T')[0];
    const fechaEvento = task.event_date_db;

    if (fechaEvento === hoy) {
      return {
        badge: '🔴 ¡Vence Hoy!',
        clase: 'bg-red-200 border-red-600 text-red-950 animate-pulse'
      };
    } else if (fechaEvento < hoy) {
      return {
        badge: '🔴 Vencido',
        clase: 'bg-red-300 border-red-700 text-red-950'
      };
    } else {
      return {
        badge: '🟡 Pendiente',
        clase: 'bg-yellow-100 border-yellow-600 text-yellow-900'
      };
    }
  };

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const timers = [];
    const now = new Date();

    Object.entries(dayTasks).forEach(([dateStr, tasks]) => {
      tasks.forEach((task) => {
        if (!task.time || task.is_completed) return;

        const [day, month, year] = dateStr.split('/');
        const [hours, minutes] = task.time.split(':');
        const taskDate = new Date(year, month - 1, day, hours, minutes, 0);

        const timeToTask = taskDate.getTime() - now.getTime();

        if (timeToTask > 0) {
          const timer = setTimeout(() => {
            if (Notification.permission === 'granted') {
              new Notification('🔔 Super Agenda: Recordatorio', {
                body: `${task.time} - ${task.text} ${task.is_pago ? `($${task.monto})` : ''}`,
                icon: '/super-snoopy.png'
              });
            }
          }, timeToTask);

          timers.push(timer);
        }
      });
    });

    return () => timers.forEach(t => clearTimeout(t));
  }, [dayTasks]);

  useEffect(() => {
    guardarEnStorage(NOTES_STORAGE_KEY, savedNotes);
  }, [savedNotes]);

  const handleSaveNote = (base64Data) => {
    try {
      const newNote = { 
        id: Date.now(), 
        image: base64Data, 
        date: selectedDate || formatearFechaCorta(new Date()) 
      };
      setSavedNotes(prev => [newNote, ...prev]);
      setIsCanvasOpen(false);
      triggerSuccess('Nota guardada con éxito');
    } catch (err) {
      console.error('Error al guardar nota:', obtenerMensajeError(err));
    }
  };

  const handleSaveVoiceNote = (textoDictado) => {
    try {
      if (selectedDate) {
        setNewTaskText(textoDictado);
      } else {
        const newNote = { 
          id: Date.now(), 
          text: textoDictado, 
          date: formatearFechaCorta(new Date()) 
        };
        setSavedNotes(prev => [newNote, ...prev]);
        triggerSuccess('Nota de voz guardada');
      }
      setIsVoiceOpen(false);
    } catch (err) {
      console.error('Error al guardar dictado:', obtenerMensajeError(err));
    }
  };

  const triggerSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleDeleteNote = (id) => {
    setSavedNotes(prev => prev.filter(n => n.id !== id));
    triggerSuccess('Nota eliminada');
  };

  return (
    <div className="min-h-screen bg-[#Fef8e7] p-4 md:p-8 font-mono text-black pb-24 select-none relative">
      
      {successMessage && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-400 border-4 border-black px-6 py-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black font-black text-xs uppercase animate-bounce">
          ✅ {successMessage}
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6 flex flex-col items-center">
        
        <header className="w-full flex flex-wrap justify-between items-center border-4 border-black bg-amber-400 p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] gap-4">
          <div>
            <h1 className="text-2xl font-black uppercase text-black tracking-tight">
              {aMayusculas('Agenda y Pendientes')}
            </h1>
            <p className="text-xs font-bold text-amber-950 uppercase mt-0.5 tracking-tight">
              {aMayusculas('Organización, Pagos y Notas')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              type="button"
              onClick={() => setIsCanvasOpen(true)}
              className="px-4 py-2.5 bg-white border-4 border-black rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer hover:bg-stone-100"
            >
              ✍️ {aMayusculas('Escribir Nota')}
            </button>
            <button 
              type="button"
              onClick={() => setIsVoiceOpen(true)}
              className="px-4 py-2.5 bg-white border-4 border-black rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer hover:bg-stone-100"
            >
              🎙️ {aMayusculas('Dictar Nota')}
            </button>
          </div>
        </header>

        <CalendarGrid 
          onSelectDay={(dateStr) => setSelectedDate(dateStr)} 
          dayTasks={dayTasks} 
        />

        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
          {savedNotes.map(note => (
            <div 
              key={note.id} 
              className="border-4 border-black bg-white p-4 rounded-3xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between relative"
            >
              {note.image ? (
                <div className="w-full bg-stone-50 border-2 border-black rounded-2xl overflow-hidden p-1">
                  <img src={note.image} alt="Nota" className="w-full h-auto object-contain bg-white rounded-xl" />
                </div>
              ) : (
                <div className="w-full bg-amber-50 border-2 border-black rounded-2xl p-4 min-h-30 flex items-center justify-center text-center">
                  <p className="text-xs font-bold uppercase tracking-wide text-black wrap-break-word leading-relaxed">
                    "{note.text}"
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-dashed border-stone-200">
                <span className="text-[10px] font-black uppercase text-stone-600 bg-stone-100 border border-black px-2 py-0.5 rounded-md">
                  {note.date}
                </span>
                <button 
                  type="button"
                  onClick={() => handleDeleteNote(note.id)} 
                  className="text-xs font-black text-rose-600 uppercase hover:underline cursor-pointer"
                >
                  {aMayusculas('Eliminar')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL TAREAS DEL DÍA */}
      {selectedDate && (
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

            {/* FORMULARIO DE NUEVA ACTIVIDAD / PAGO PROGRAMADO */}
            <div className="space-y-3 bg-amber-300 p-3.5 border-3 border-black rounded-2xl shadow-[3px_3px_0px_rgba(0,0,0,1)]">
              
              {/* 📅 MINI CALENDARIO INTERACTIVO DENTRO DEL MODAL */}
              <div className="bg-white border-3 border-black rounded-2xl p-3 space-y-2">
                <div className="flex justify-between items-center font-black text-xs uppercase">
                  <span>📅 Selecciona la Fecha del Evento:</span>
                  <span className="bg-amber-200 border border-black px-2 py-0.5 rounded text-[10px]">
                    {newTaskDate || 'Ninguna'}
                  </span>
                </div>

                {/* Controles de mes para el mini calendario */}
                <div className="flex justify-between items-center bg-amber-100 border-2 border-black rounded-xl p-1.5">
                  <button 
                    type="button"
                    onClick={() => setModalCalendarDate(new Date(modalCalendarDate.getFullYear(), modalCalendarDate.getMonth() - 1, 1))}
                    className="px-2.5 py-1 bg-white border border-black rounded-lg font-black text-[10px] uppercase cursor-pointer hover:bg-stone-100 active:translate-x-0.5 active:translate-y-0.5"
                  >
                    ◀ Mes
                  </button>
                  <span className="font-black text-xs uppercase">
                    {modalCalendarDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                  </span>
                  <button 
                    type="button"
                    onClick={() => setModalCalendarDate(new Date(modalCalendarDate.getFullYear(), modalCalendarDate.getMonth() + 1, 1))}
                    className="px-2.5 py-1 bg-white border border-black rounded-lg font-black text-[10px] uppercase cursor-pointer hover:bg-stone-100 active:translate-x-0.5 active:translate-y-0.5"
                  >
                    Mes ▶
                  </button>
                </div>

                {/* Cuadrícula de días del mini calendario */}
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
                    const isSelected = newTaskDate === dateStr;

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

              <div className="flex gap-2">
                <input
                  type="time"
                  value={newTaskTime}
                  onChange={(e) => setNewTaskTime(e.target.value)}
                  className="p-2.5 bg-white border-3 border-black rounded-xl text-xs font-bold uppercase focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Ej. Pagar Renta, Internet..."
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  className="flex-1 p-2.5 bg-white border-3 border-black rounded-xl text-xs font-bold uppercase focus:outline-none"
                />
              </div>

              {/* CHECKBOX DE PAGO PROGRAMADO CON CATEGORÍA Y FRECUENCIA */}
              <div className="border-2 border-black rounded-xl p-2.5 bg-white flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer font-black text-xs uppercase">
                  <input 
                    type="checkbox" 
                    checked={esPagoProgramado}
                    onChange={(e) => setEsPagoProgramado(e.target.checked)}
                    className="w-4 h-4 accent-black cursor-pointer"
                  />
                  <span>📅 ¿Es un pago o cobro programado (Finanzas)?</span>
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
                        className="border-2 border-black rounded-xl px-2 py-1.5 text-xs font-bold bg-amber-50 focus:outline-none uppercase"
                      >
                        <option value="expense">Gasto (Pago)</option>
                        <option value="income">Ingreso (Cobro)</option>
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Categoría (Ej. Renta, Cable, Préstamo...)"
                        value={categoriaPago}
                        onChange={(e) => setCategoriaPago(e.target.value)}
                        className="flex-1 border-2 border-black rounded-xl px-2.5 py-1.5 text-xs font-bold bg-amber-50 uppercase focus:outline-none"
                      />

                      <select 
                        value={frecuenciaPago}
                        onChange={(e) => setFrecuenciaPago(e.target.value)}
                        className="w-40 border-2 border-black rounded-xl px-2 py-1.5 text-xs font-bold bg-amber-50 focus:outline-none uppercase"
                      >
                        <option value="single">🎯 Eventual (Una vez)</option>
                        <option value="monthly">🔁 Recurrente (Cada mes)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
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

            {/* LISTA DE ACTIVIDADES Y PAGOS */}
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
                        className={`px-2.5 py-1 border-2 border-black rounded-xl font-black text-[10px] uppercase shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all ${
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
                  No hay actividades o pagos programados para este día
                </p>
              )}
            </div>

          </div>
        </div>
      )}

      {isCanvasOpen && (
        <SIdenoteCanvas 
          onClose={() => setIsCanvasOpen(false)} 
          onSave={handleSaveNote} 
        />
      )}

      {isVoiceOpen && (
        <VoiceNoteModal 
          onClose={() => setIsVoiceOpen(false)} 
          onSave={handleSaveVoiceNote} 
        />
      )}
    </div>
  );
}