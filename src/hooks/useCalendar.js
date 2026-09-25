// src/hooks/useCalendar.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { guardarEnStorage, obtenerDeStorage } from '../utils/storage.js';
import { formatearFechaCorta } from '../utils/fechas.js';
import { agregarAColaOffline, procesarColaOffline } from '../utils/offlineSync.js';

const NOTES_STORAGE_KEY = 'family_spen_notes';
const EVENTS_CACHE_KEY = 'family_agenda_events_cache';
const USER_CACHE_KEY = 'family_current_user_profile';

export function useCalendar() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [sessionUser, setSessionUser] = useState(() => obtenerDeStorage(USER_CACHE_KEY, null));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('09:00');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [modalCalendarDate, setModalCalendarDate] = useState(new Date());

  const [esPagoProgramado, setEsPagoProgramado] = useState(false);
  const [montoPago, setMontoPago] = useState('');
  const [tipoMovimiento, setTipoMovimiento] = useState('expense');
  const [categoriaPago, setCategoriaPago] = useState('GENERAL');
  const [frecuenciaPago, setFrecuenciaPago] = useState('single');

  const [taskEvents, setTaskEvents] = useState(() => obtenerDeStorage(EVENTS_CACHE_KEY, []));
  const [savedNotes, setSavedNotes] = useState(() => obtenerDeStorage(NOTES_STORAGE_KEY, []));

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      procesarColaOffline();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setSessionUser(user);
          guardarEnStorage(USER_CACHE_KEY, user);
        }
      } catch (err) {
        console.warn('Modo offline:', err);
      }
    };
    fetchUser();
  }, []);

  const cargarDatos = useCallback(async () => {
    const notesCache = obtenerDeStorage(NOTES_STORAGE_KEY, []);
    setSavedNotes(notesCache);

    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('date', { ascending: true });

        if (!error && data) {
          setTaskEvents(data);
          guardarEnStorage(EVENTS_CACHE_KEY, data);
          return;
        }
      } catch (err) {}
    }

    const cachedTasks = obtenerDeStorage(EVENTS_CACHE_KEY, []);
    setTaskEvents(cachedTasks);
  }, []);

  useEffect(() => {
    cargarDatos();

    if (navigator.onLine) {
      const channel = supabase
        .channel('tasks-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, cargarDatos)
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [cargarDatos]);

  const handleSelectDate = (dateStr) => {
    setSelectedDate(dateStr);
    setNewTaskDate(dateStr);
    setIsModalOpen(true); 
    const [y, m] = dateStr.split('-');
    setModalCalendarDate(new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1));
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
    setNewTaskText('');
    setMontoPago('');
    setEsPagoProgramado(false);
    setNewTaskDate('');
  };

  const handleAddTask = async () => {
    if (!newTaskText.trim()) return;

    const fechaFinal = newTaskDate || selectedDate || formatearFechaCorta(new Date());

    const newTask = {
      id: crypto.randomUUID(),
      user_id: sessionUser?.id || 'offline_user',
      text: newTaskText.trim(),
      date: fechaFinal,
      time: newTaskTime || '09:00',
      is_completed: false,
      is_pago: esPagoProgramado,
      monto: esPagoProgramado ? parseFloat(montoPago) || 0 : 0,
      transaction_type: tipoMovimiento,
      category: categoriaPago,
      recurrence: frecuenciaPago,
      created_at: new Date().toISOString()
    };

    const updatedTasks = [...taskEvents, newTask];
    setTaskEvents(updatedTasks);
    guardarEnStorage(EVENTS_CACHE_KEY, updatedTasks);

    setNewTaskText('');
    setMontoPago('');
    setEsPagoProgramado(false);

    if (navigator.onLine) {
      try {
        await supabase.from('tasks').insert([newTask]);
      } catch (err) {
        agregarAColaOffline('INSERT_TASK', newTask);
      }
    } else {
      agregarAColaOffline('INSERT_TASK', newTask);
    }
  };

  const handleDeleteTask = async (taskId) => {
    const updatedTasks = taskEvents.filter(t => t.id !== taskId);
    setTaskEvents(updatedTasks);
    guardarEnStorage(EVENTS_CACHE_KEY, updatedTasks);

    if (navigator.onLine) {
      try {
        await supabase.from('tasks').delete().eq('id', taskId);
      } catch (err) {
        agregarAColaOffline('DELETE_TASK', { id: taskId });
      }
    } else {
      agregarAColaOffline('DELETE_TASK', { id: taskId });
    }
  };

  const handleToggleComplete = async (task) => {
    const updatedTask = { ...task, is_completed: !task.is_completed };
    const updatedTasks = taskEvents.map(t => t.id === task.id ? updatedTask : t);

    setTaskEvents(updatedTasks);
    guardarEnStorage(EVENTS_CACHE_KEY, updatedTasks);

    if (updatedTask.is_pago && updatedTask.is_completed) {
      const newTransaction = {
        id: crypto.randomUUID(),
        user_id: sessionUser?.id || 'offline_user',
        amount: updatedTask.monto,
        type: updatedTask.transaction_type,
        category: updatedTask.category,
        description: `Pago programado: ${updatedTask.text}`,
        date: updatedTask.date,
        created_at: new Date().toISOString()
      };

      if (navigator.onLine) {
        try {
          await supabase.from('transactions').insert([newTransaction]);
        } catch (err) {
          agregarAColaOffline('INSERT_TRANSACTION', newTransaction);
        }
      } else {
        agregarAColaOffline('INSERT_TRANSACTION', newTransaction);
      }
    }

    if (navigator.onLine) {
      try {
        await supabase.from('tasks').update({ is_completed: updatedTask.is_completed }).eq('id', task.id);
      } catch (err) {
        agregarAColaOffline('UPDATE_TASK', updatedTask);
      }
    } else {
      agregarAColaOffline('UPDATE_TASK', updatedTask);
    }
  };

  const handleSaveCanvasNote = (noteData) => {
    const newNote = {
      id: crypto.randomUUID(),
      text: typeof noteData === 'string' ? noteData : noteData?.text || 'Nota S-Pen',
      image: noteData?.image || null,
      date: formatearFechaCorta(new Date()),
      created_at: new Date().toISOString()
    };

    const updatedNotes = [newNote, ...savedNotes];
    setSavedNotes(updatedNotes);
    guardarEnStorage(NOTES_STORAGE_KEY, updatedNotes);
    setIsCanvasOpen(false);
  };

  const handleSaveVoiceNote = (text) => {
    if (text) setNewTaskText(text);
    setIsVoiceOpen(false);
  };

  const handleDeleteNote = (noteId) => {
    const updatedNotes = savedNotes.filter(n => n.id !== noteId);
    setSavedNotes(updatedNotes);
    guardarEnStorage(NOTES_STORAGE_KEY, updatedNotes);
  };

  const getSemaforoVisual = (task) => {
    if (task.is_completed) {
      return { badge: 'Pagado / Hecho', clase: 'bg-emerald-200 text-emerald-900 border-emerald-500' };
    }
    const today = new Date().toISOString().split('T')[0];
    if (task.date < today) {
      return { badge: 'Vencido', clase: 'bg-rose-200 text-rose-900 border-rose-500' };
    } else if (task.date === today) {
      return { badge: 'Hoy', clase: 'bg-amber-200 text-amber-900 border-amber-500' };
    }
    return { badge: 'Próximo', clase: 'bg-sky-200 text-sky-900 border-sky-500' };
  };

  const dayTasksMap = useMemo(() => {
    return taskEvents.reduce((acc, task) => {
      if (!acc[task.date]) acc[task.date] = [];
      acc[task.date].push(task);
      return acc;
    }, {});
  }, [taskEvents]);

  const selectedDayTasks = useMemo(() => {
    if (!selectedDate) return [];
    return dayTasksMap[selectedDate] || [];
  }, [selectedDate, dayTasksMap]);

  return {
    isOffline,
    sessionUser,
    isModalOpen,
    isCanvasOpen, setIsCanvasOpen,
    isVoiceOpen, setIsVoiceOpen,
    selectedDate, setSelectedDate,
    newTaskText, setNewTaskText,
    newTaskTime, setNewTaskTime,
    newTaskDate, setNewTaskDate,
    modalCalendarDate, setModalCalendarDate,
    esPagoProgramado, setEsPagoProgramado,
    montoPago, setMontoPago,
    tipoMovimiento, setTipoMovimiento,
    categoriaPago, setCategoriaPago,
    frecuenciaPago, setFrecuenciaPago,
    taskEvents,
    savedNotes,
    dayTasksMap,
    dayTasks: selectedDayTasks,
    handleSelectDate,
    handleCloseModal,
    handleAddTask,
    handleDeleteTask,
    handleToggleComplete,
    handleSaveCanvasNote,
    handleSaveVoiceNote,
    handleDeleteNote,
    getSemaforoVisual
  };
}