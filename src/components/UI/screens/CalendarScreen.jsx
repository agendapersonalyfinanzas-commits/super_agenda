// src/screens/CalendarScreen.jsx
import React, { useState, useEffect } from 'react';
import CalendarGrid from '../../../services/CalendarGrid';
import SIdenoteCanvas from '../../Expenses/SIdenoteCanvas';
import VoiceNoteModal from '../../Notes/VoiceNoteModal';

import { supabase } from '../../../supabaseClient'; 

// Utilidades centralizadas
import { guardarEnStorage, obtenerDeStorage } from '../../../utils/storage.js';
import { formatearFechaCorta } from '../../../utils/fechas.js';
import { aMayusculas } from '../../../utils/mayusculas.js';
import { obtenerMensajeError } from '../../../utils/errores.js';

// --- SOPORTE OFFLINE ---
import { agregarAColaOffline, procesarColaOffline } from '../../../utils/offlineSync.js';

const NOTES_STORAGE_KEY = 'family_spen_notes';
const EVENTS_CACHE_KEY = 'family_agenda_events_cache';
const USER_CACHE_KEY = 'family_current_user_profile';

export default function CalendarScreen() {
  // --- ESTADOS DE CONEXIÓN Y SESIÓN ---
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [sessionUser, setSessionUser] = useState(() => obtenerDeStorage(USER_CACHE_KEY, null));

  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('09:00');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [modalCalendarDate, setModalCalendarDate] = useState(new Date());

  const [esPagoProgramado, setEsPagoProgramado] = useState(false);
  const [montoPago, setMontoPago] = useState('');
  const [tipoMovimiento, setTipoMovimiento] = useState('expense');
  const [categoriaPago, setCategoriaPago] = useState('GENERAL');
  const [frecuenciaPago, setFrecuenciaPago] = useState('single');

  const [successMessage, setSuccessMessage] = useState('');
  const [savedNotes, setSavedNotes] = useState(() => obtenerDeStorage(NOTES_STORAGE_KEY, []));
  const [dayTasks, setDayTasks] = useState({});

  // 1. DETECTAR CONEXIÓN Y CARGAR USUARIO
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      procesarColaOffline().then(() => fetchActivities());
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const loadUser = async () => {
      if (navigator.onLine) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('household_id')
            .eq('id', session.user.id)
            .single();
          
          const userData = {
            id: session.user.id,
            email: session.user.email,
            household_id: profile?.household_id || null
          };
          setSessionUser(userData);
          guardarEnStorage(USER_CACHE_KEY, userData);
        }
      }
    };
    loadUser();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

  // --- AGRUPACIÓN DE EVENTOS POR FECHA ---
  const agruparEventos = (data) => {
    const grouped = {};
    data.forEach(task => {
      let dbDate = task.event_date;
      if (task.recurrence === 'monthly' && dbDate) {
        const [_, __, day] = dbDate.split('-');
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
        dbDate = `${currentYear}-${currentMonth}-${day}`;
      }
      if (!dbDate) return;
      const [year, month, day] = dbDate.split('-');
      const dateStr = `${day}/${month}/${year}`;
      
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push({
        ...task,
        text: task.title,
        time: task.event_time ? task.event_time.substring(0, 5) : '09:00',
        event_date_db: dbDate,
        displayDate: dateStr
      });
    });

    // Ordenar cronológicamente las tareas de cada día por hora
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => a.time.localeCompare(b.time));
    });
    return grouped;
  };

  // 2. FETCH ACTIVIDADES
  const fetchActivities = async () => {
    if (!sessionUser?.id) return;

    if (isOffline) {
      const cachedData = obtenerDeStorage(EVENTS_CACHE_KEY, []);
      setDayTasks(agruparEventos(cachedData));
      return;
    }

    try {
      const { data, error } = await supabase
        .from('agenda_events')
        .select('*')
        .eq('user_id', sessionUser.id);

      if (error) throw error;
      
      guardarEnStorage(EVENTS_CACHE_KEY, data);
      setDayTasks(agruparEventos(data));
    } catch (error) {
      console.error("Error al cargar eventos:", error);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [sessionUser, isOffline]);

  // 3. AGREGAR TAREA (TECLADO)
  const handleAddTask = async () => {
    if (!newTaskText.trim() || !newTaskDate) {
      alert("Por favor ingresa un título y selecciona una fecha.");
      return;
    }
    if (!sessionUser) {
      alert("Debes iniciar sesión para guardar actividades.");
      return;
    }

    const eventToInsert = {
      id: crypto.randomUUID(),
      title: newTaskText.trim(),
      event_date: newTaskDate,
      event_time: newTaskTime ? (newTaskTime.length === 5 ? `${newTaskTime}:00` : newTaskTime) : '09:00:00',
      user_id: sessionUser.id,
      household_id: sessionUser.household_id,
      is_completed: false,
      is_expense: esPagoProgramado && tipoMovimiento === 'expense',
      icon_url: null,
      is_pago: esPagoProgramado,
      monto: esPagoProgramado && montoPago ? parseFloat(montoPago) : 0,
      transaction_type: tipoMovimiento,
      category: categoriaPago.trim().toUpperCase() || 'GENERAL',
      recurrence: esPagoProgramado ? frecuenciaPago : 'single'
    };

    try {
      if (isOffline) {
        await agregarAColaOffline('INSERT', 'agenda_events', eventToInsert);
        const cachedData = obtenerDeStorage(EVENTS_CACHE_KEY, []);
        cachedData.push(eventToInsert);
        guardarEnStorage(EVENTS_CACHE_KEY, cachedData);
        setDayTasks(agruparEventos(cachedData));
        triggerSuccess('Actividad guardada localmente');
      } else {
        const { id, ...dataToInsert } = eventToInsert;
        const { error } = await supabase.from('agenda_events').insert([dataToInsert]);
        if (error) throw error;
        triggerSuccess('¡Actividad programada con éxito!');
        fetchActivities(); 
      }

      setNewTaskText('');
      setEsPagoProgramado(false);
      setMontoPago('');
      setCategoriaPago('GENERAL');
      setFrecuenciaPago('single');
      setSelectedDate(null);
    } catch (error) {
      console.error("Error al guardar:", error);
      alert(`Error al guardar: ${error.message || JSON.stringify(error)}`);
    }
  };

  // 4. ELIMINAR TAREA
  const handleDeleteTask = async (taskId) => {
    const confirmDelete = window.confirm("¿Seguro que deseas borrar esta actividad?");
    if (!confirmDelete) return;

    try {
      if (isOffline) {
        await agregarAColaOffline('DELETE', 'agenda_events', { id: taskId });
        const cachedData = obtenerDeStorage(EVENTS_CACHE_KEY, []).filter(t => t.id !== taskId);
        guardarEnStorage(EVENTS_CACHE_KEY, cachedData);
        setDayTasks(agruparEventos(cachedData));
        triggerSuccess('Actividad eliminada');
      } else {
        const { error } = await supabase.from('agenda_events').delete().eq('id', taskId);
        if (error) throw error;
        triggerSuccess('Actividad eliminada');
        fetchActivities();
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
    }
  };

  // 5. COMPLETAR Y REGISTRAR TRANSACCIÓN
  const handleToggleComplete = async (task) => {
    const nuevoEstado = !task.is_completed;
    const taskUpdateData = { id: task.id, is_completed: nuevoEstado };

    try {
      let transactionData = null;
      if (task.is_pago && nuevoEstado && task.monto > 0) {
        transactionData = {
          concept: `Movimiento: ${task.text}`,
          amount: task.monto,
          transaction_type: task.transaction_type || 'expense',
          category: task.category || 'GENERAL',
          auth_user_email: sessionUser.email
        };
      }

      if (isOffline) {
        await agregarAColaOffline('UPDATE', 'agenda_events', taskUpdateData);
        if (transactionData) {
          await agregarAColaOffline('INSERT', 'transactions', transactionData);
        }
        const cachedData = obtenerDeStorage(EVENTS_CACHE_KEY, []);
        const index = cachedData.findIndex(t => t.id === task.id);
        if (index !== -1) cachedData[index].is_completed = nuevoEstado;
        guardarEnStorage(EVENTS_CACHE_KEY, cachedData);
        setDayTasks(agruparEventos(cachedData));
        triggerSuccess(nuevoEstado ? '¡Realizado!' : 'Actividad reabierta');
      } else {
        const { error } = await supabase.from('agenda_events').update({ is_completed: nuevoEstado }).eq('id', task.id);
        if (error) throw error;

        if (transactionData) {
          const { error: errorTrans } = await supabase.from('transactions').insert([transactionData]);
          if (!errorTrans) window.dispatchEvent(new CustomEvent('transaction-updated'));
        }
        triggerSuccess(nuevoEstado ? '✓ ¡Actividad marcada como realizada!' : 'Actividad reabierta');
        fetchActivities();
      }
    } catch (error) {
      console.error("Error al actualizar:", error.message);
      alert("Hubo un error al procesar el cambio.");
    }
  };

  const getSemaforoVisual = (task) => {
    if (task.is_completed) {
      return { badge: '🟢 Realizado', clase: 'bg-green-100 border-green-600 text-green-900' };
    }
    if (!task.is_pago) {
      return { badge: '📌 Pendiente', clase: 'bg-sky-100 border-black text-black' };
    }
    const hoy = new Date().toISOString().split('T')[0];
    const fechaEvento = task.event_date_db;
    if (fechaEvento === hoy) return { badge: '🔴 ¡Vence Hoy!', clase: 'bg-red-200 border-red-600 text-red-950 animate-pulse' };
    else if (fechaEvento < hoy) return { badge: '🔴 Vencido', clase: 'bg-red-300 border-red-700 text-red-950' };
    else return { badge: '🟡 Próximo', clase: 'bg-yellow-100 border-yellow-600 text-yellow-900' };
  };

  useEffect(() => {
    guardarEnStorage(NOTES_STORAGE_KEY, savedNotes);
  }, [savedNotes]);

  const handleSaveNote = async (base64Data) => {
    const dateStr = selectedDate || formatearFechaCorta(new Date());
    const newNote = { id: Date.now(), image: base64Data, date: dateStr };
    setSavedNotes(prev => [newNote, ...savedNotes]);

    if (sessionUser?.id) {
      let dbDate = new Date().toISOString().split('T')[0];
      if (selectedDate) {
        const [d, m, y] = selectedDate.split('/');
        dbDate = `${y}-${m}-${d}`;
      }

      const canvasEvent = {
        title: '✏️ NOTA / DIBUJO S-PEN',
        event_date: dbDate,
        event_time: '12:00:00',
        user_id: sessionUser.id,
        household_id: sessionUser.household_id,
        is_completed: false,
        is_expense: false,
        is_pago: false,
        monto: 0,
        transaction_type: 'expense',
        category: 'AGENDA',
        recurrence: 'single'
      };

      try {
        if (isOffline) {
          await agregarAColaOffline('INSERT', 'agenda_events', canvasEvent);
        } else {
          await supabase.from('agenda_events').insert([canvasEvent]);
          fetchActivities();
        }
      } catch (err) {
        console.error("Error sincronizando nota S-Pen:", err);
      }
    }

    setIsCanvasOpen(false);
    triggerSuccess('¡Nota guardada en el calendario!');
  };

  const handleSaveVoiceNote = async (textoDictado) => {
    if (!textoDictado) return;
    
    let dbDate = new Date().toISOString().split('T')[0];
    if (selectedDate) {
      const [d, m, y] = selectedDate.split('/');
      dbDate = `${y}-${m}-${d}`;
    }

    const voiceEvent = {
      id: crypto.randomUUID(),
      title: `🎙️ ${textoDictado.toUpperCase()}`,
      event_date: dbDate,
      event_time: '09:00:00',
      user_id: sessionUser?.id,
      household_id: sessionUser?.household_id,
      is_completed: false,
      is_expense: false,
      is_pago: false,
      monto: 0,
      transaction_type: 'expense',
      category: 'VOZ',
      recurrence: 'single'
    };

    try {
      if (isOffline) {
        await agregarAColaOffline('INSERT', 'agenda_events', voiceEvent);
        const cachedData = obtenerDeStorage(EVENTS_CACHE_KEY, []);
        cachedData.push(voiceEvent);
        guardarEnStorage(EVENTS_CACHE_KEY, cachedData);
        setDayTasks(agruparEventos(cachedData));
      } else {
        const { id, ...dataToInsert } = voiceEvent;
        await supabase.from('agenda_events').insert([dataToInsert]);
        fetchActivities();
      }
      triggerSuccess('🎙️ Nota de voz registrada');
    } catch (err) {
      console.error("Error guardando nota de voz:", err);
    }

    setIsVoiceOpen(false);
  };

  const triggerSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleDeleteNote = (id) => {
    setSavedNotes(prev => prev.filter(n => n.id !== id));
    triggerSuccess('Nota eliminada');
  };

  return (
    <div className="min-h-screen bg-[#Fef8e7] p-4 md:p-8 font-mono text-black pb-24 select-none relative">
      
      {/* --- BANNER DE MODO OFFLINE --- */}
      {isOffline && (
        <div className="w-full bg-yellow-400 text-black text-center font-bold text-xs py-2 border-b-4 border-black fixed top-0 left-0 z-50">
          ⚠️ ESTÁS EN MODO OFFLINE - Los cambios se guardarán automáticamente al tener internet.
        </div>
      )}

      {successMessage && (
        <div className="fixed top-12 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-400 border-4 border-black px-6 py-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black font-black text-xs uppercase animate-bounce">
          ✅ {successMessage}
        </div>
      )}

      <div className={`max-w-4xl mx-auto space-y-6 flex flex-col items-center ${isOffline ? 'mt-8' : ''}`}>
        
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

        {/* 🌟 SECCIÓN A PIE DE CALENDARIO: TARJETAS AGRUPADAS POR DÍA CON TODOS SUS EVENTOS */}
        <div className="w-full space-y-4 pt-4">
          <div className="border-b-4 border-black pb-2 flex justify-between items-center">
            <h3 className="font-black text-lg uppercase text-black">📋 AGENDA DIARIA Y EVENTOS</h3>
            <span className="bg-amber-300 border-2 border-black px-2.5 py-0.5 rounded-xl text-xs font-black">
              Días con actividad: {Object.keys(dayTasks).length}
            </span>
          </div>

          {Object.keys(dayTasks).length === 0 ? (
            <div className="bg-white border-4 border-black rounded-3xl p-6 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <p className="font-bold text-xs uppercase text-stone-600">No hay actividades ni pagos programados en el calendario.</p>
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
                    <div className="flex justify-between items-center border-b-3 border-black pb-2.5 bg-amber-100 -mx-5 -mt-5 p-4 rounded-t-3xl border-t-0 border-x-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">📅</span>
                        <h4 className="font-black text-base uppercase text-black">
                          Día: {dateStr}
                        </h4>
                      </div>
                      <span className={`border-2 border-black px-2.5 py-0.5 rounded-xl text-[10px] font-black uppercase ${totalPendientes === 0 ? 'bg-emerald-300 text-black' : 'bg-amber-300 text-black'}`}>
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
                            className={`border-3 border-black p-3.5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all ${
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
                                    {task.is_pago ? '💳 FINANZAS' : '📌 ACTIVIDAD'} ⏰ {task.time}
                                  </span>
                                  <span className="text-[10px] font-black uppercase text-stone-700 bg-white border border-black px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                    [{task.category || 'GENERAL'}]
                                  </span>
                                </div>
                                <h5 className={`font-black text-sm uppercase mt-1 ${isCompleted ? 'line-through text-stone-400' : 'text-black'}`}>
                                  {task.text} {task.recurrence === 'monthly' ? '🔁' : ''}
                                </h5>
                                {isPago && task.monto > 0 && (
                                  <p className="text-[11px] font-black text-emerald-700 mt-0.5">
                                    Monto: ${task.monto} ({task.transaction_type === 'expense' ? 'Pago' : 'Cobro'})
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                              <span className={`border-2 border-black px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${semaforo.clase}`}>
                                {semaforo.badge}
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

        {/* NOTAS Y DIBUJOS S-PEN GUARDADOS */}
        {savedNotes.filter(n => n.image || n.text).length > 0 && (
          <div className="w-full space-y-4 pt-4">
            <div className="border-b-4 border-black pb-2">
              <h3 className="font-black text-lg uppercase text-black">✍️ NOTAS Y DIBUJOS S-PEN</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {savedNotes.filter(note => note.image || note.text).map(note => (
                <div 
                  key={note.id} 
                  className="border-4 border-black bg-white p-4 rounded-3xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between relative"
                >
                  {note.image ? (
                    <div className="w-full bg-stone-50 border-2 border-black rounded-2xl overflow-hidden p-1">
                      <img src={note.image} alt="Nota S-Pen" className="w-full h-auto object-contain bg-white rounded-xl" />
                    </div>
                  ) : (
                    <div className="w-full bg-amber-50 border-2 border-black rounded-2xl p-4 min-h-30 flex items-center justify-center text-center">
                      <p className="text-xs font-bold uppercase tracking-wide text-black leading-relaxed">
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
        )}
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

            {/* FORMULARIO DE NUEVA ACTIVIDAD CON SELECTOR DE HORA RETRO-COMIC */}
            <div className="space-y-3 bg-amber-300 p-3.5 border-3 border-black rounded-2xl shadow-[3px_3px_0px_rgba(0,0,0,1)]">
              
              <div className="bg-white border-3 border-black rounded-2xl p-3 space-y-2">
                <div className="flex justify-between items-center font-black text-xs uppercase">
                  <span>📅 Fecha Seleccionada:</span>
                  <span className="bg-amber-200 border border-black px-2 py-0.5 rounded text-[10px]">
                    {newTaskDate || 'Ninguna'}
                  </span>
                </div>

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