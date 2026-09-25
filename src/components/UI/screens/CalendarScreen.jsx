// src/components/UI/screens/CalendarScreen.jsx
import React, { useState, useEffect } from 'react';
import CalendarGrid from '../../Calendar/CalendarGrid';
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

// --- COMPONENTES MODULARIZADOS ---
import CalendarHeader from '../../Calendar/CalendarHeader';
import DailyAgendaList from '../../Calendar/DailyAgendaList';
import SavedNotesGallery from '../../Calendar/SavedNotesGallery';
import EventModal from '../../Calendar/EventModal';

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
            .maybeSingle(); // Uso profesional para prevenir errores 406 si el perfil aún no existe
          
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
        
        {/* HEADER COMPONENT (Con supabase inyectado para las notificaciones push) */}
        <CalendarHeader 
          setIsCanvasOpen={setIsCanvasOpen} 
          setIsVoiceOpen={setIsVoiceOpen} 
          supabase={supabase}
        />

        <CalendarGrid 
          onSelectDay={(dateStr) => setSelectedDate(dateStr)} 
          dayTasks={dayTasks} 
        />

        {/* AGENDA DIARIA Y EVENTOS */}
        <DailyAgendaList 
          dayTasks={dayTasks}
          getSemaforoVisual={getSemaforoVisual}
          handleToggleComplete={handleToggleComplete}
          handleDeleteTask={handleDeleteTask}
        />

        {/* NOTAS Y DIBUJOS S-PEN GUARDADOS */}
        <SavedNotesGallery 
          savedNotes={savedNotes}
          handleDeleteNote={handleDeleteNote}
        />

      </div>

      {/* MODAL TAREAS DEL DÍA */}
      <EventModal 
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        setIsCanvasOpen={setIsCanvasOpen}
        setIsVoiceOpen={setIsVoiceOpen}
        newTaskDate={newTaskDate}
        setModalCalendarDate={setModalCalendarDate}
        modalCalendarDate={modalCalendarDate}
        setNewTaskDate={setNewTaskDate}
        newTaskTime={newTaskTime}
        setNewTaskTime={setNewTaskTime}
        newTaskText={newTaskText}
        setNewTaskText={setNewTaskText}
        esPagoProgramado={esPagoProgramado}
        setEsPagoProgramado={setEsPagoProgramado}
        montoPago={montoPago}
        setMontoPago={setMontoPago}
        tipoMovimiento={tipoMovimiento}
        setTipoMovimiento={setTipoMovimiento}
        categoriaPago={categoriaPago}
        setCategoriaPago={setCategoriaPago}
        frecuenciaPago={frecuenciaPago}
        setFrecuenciaPago={setFrecuenciaPago}
        handleAddTask={handleAddTask}
        dayTasks={dayTasks}
        getSemaforoVisual={getSemaforoVisual}
        handleToggleComplete={handleToggleComplete}
        handleDeleteTask={handleDeleteTask}
      />

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