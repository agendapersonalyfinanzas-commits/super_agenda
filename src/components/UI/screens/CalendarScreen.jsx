import React, { useState, useEffect, useMemo } from 'react';
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

// 🛠️ FUNCIÓN SEGURA PARA OBTENER LA FECHA LOCAL EN FORMATO YYYY-MM-DD (EVITA DESFASE UTC)
const getLocalTodayISOString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 🛠️ FUNCIÓN SEGURA PARA PARSEAR FECHAS LOCALES
const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  const clean = String(dateStr).split('T')[0];
  const [y, m, d] = clean.split('-');
  if (!y || !m || !d) return new Date(dateStr);
  return new Date(Number(y), Number(m) - 1, Number(d));
};

export default function CalendarScreen({ activeUser, auditorMode, isMasterAuditor, usersList = [] }) {
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

  // 🌟 ESTADO PARA EL NOMBRE REAL DESDE LA BASE DE DATOS (FUENTE DE VERDAD)
  const [auditedUserNameDb, setAuditedUserNameDb] = useState('');

  // 🌟 ESTADO DE ALERTAS Y NOTIFICACIONES PUSH
  const [alertStatus, setAlertStatus] = useState('default');

  useEffect(() => {
    if ('Notification' in window) {
      setAlertStatus(Notification.permission);
    }
  }, []);

  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (err) {
      console.warn('Audio Context no permitido sin interacción previa:', err);
    }
  };

  const handleEnableAlerts = async () => {
    if (!('Notification' in window)) {
      alert('Tu navegador no soporta notificaciones de escritorio.');
      return;
    }

    if (Notification.permission === 'granted') {
      playAlertSound();
      new Notification('🔔 ALERTAS ACTIVADAS', {
        body: 'Las notificaciones de tus pagos y eventos programados están activas.',
        icon: '/favicon.ico'
      });
      setAlertStatus('granted');
      return;
    }

    if (Notification.permission === 'denied') {
      alert('Las notificaciones están bloqueadas en tu navegador.');
      setAlertStatus('denied');
      return;
    }

    const permission = await Notification.requestPermission();
    setAlertStatus(permission);

    if (permission === 'granted') {
      playAlertSound();
      new Notification('🎉 ¡ALERTAS ACTIVADAS CON ÉXITO!', {
        body: 'Te avisaremos de tus actividades y pagos programados a tiempo.',
        icon: '/favicon.ico'
      });
    }
  };

  useEffect(() => {
    if (alertStatus !== 'granted') return;

    const checkTodayEvents = () => {
      const dateStr = getLocalTodayISOString();
      const todayTasks = dayTasks[dateStr] || [];
      
      todayTasks.forEach(evt => {
        if (!evt.is_completed && !evt.notified) {
          playAlertSound();
          new Notification(`📌 RECORDATORIO: ${evt.text || 'Evento Programado'}`, {
            body: evt.is_pago ? `Pago programado por $${evt.monto} (${evt.category})` : `Tienes una actividad programada para hoy.`,
            icon: '/favicon.ico'
          });
          evt.notified = true;
        }
      });
    };

    const interval = setInterval(checkTodayEvents, 60000);
    checkTodayEvents();

    return () => clearInterval(interval);
  }, [alertStatus, dayTasks]);

  const targetUserId = useMemo(() => {
    if (auditorMode && isMasterAuditor) {
      if (!activeUser) return null;
      if (typeof activeUser === 'object' && activeUser !== null) {
        return activeUser.id || null;
      }
      if (typeof activeUser === 'string') {
        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(activeUser);
        if (isUUID) return activeUser;

        const nameUpper = activeUser.trim().toUpperCase();
        const found = usersList.find(u => (u.nombre || '').trim().toUpperCase() === nameUpper);
        if (found) return found.id;

        return activeUser;
      }
      return null;
    }
    return sessionUser?.id || null;
  }, [auditorMode, isMasterAuditor, activeUser, sessionUser, usersList]);

  // 🌟 CONSULTA DIRECTA A SUPABASE (FUENTE DE VERDAD) PARA EXTRAER EL NOMBRE REAL
  useEffect(() => {
    const fetchAuditedUserProfile = async () => {
      if (auditorMode && targetUserId) {
        // 1. Buscar en la lista en memoria si ya existe
        const found = usersList.find(u => u.id === targetUserId || u.nombre === targetUserId);
        if (found) {
          const fullName = `${found.nombre || ''} ${found.apellido_paterno || ''}`.trim();
          setAuditedUserNameDb(fullName || found.email || 'USUARIO');
          return;
        }

        // 2. Si es un UUID, consultar directamente a Supabase (profiles / users)
        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(targetUserId);
        if (isUUID) {
          try {
            // Consultar tabla profiles
            const { data: profileData } = await supabase
              .from('profiles')
              .select('nombre, apellido_paterno')
              .eq('id', targetUserId)
              .maybeSingle();

            if (profileData && (profileData.nombre || profileData.apellido_paterno)) {
              setAuditedUserNameDb(`${profileData.nombre || ''} ${profileData.apellido_paterno || ''}`.trim());
              return;
            }

            // Consultar tabla users
            const { data: userData } = await supabase
              .from('users')
              .select('nombre, apellido_paterno, email')
              .eq('id', targetUserId)
              .maybeSingle();

            if (userData) {
              const fullName = `${userData.nombre || ''} ${userData.apellido_paterno || ''}`.trim();
              setAuditedUserNameDb(fullName || userData.email || targetUserId);
            } else {
              setAuditedUserNameDb(targetUserId);
            }
          } catch (err) {
            console.error("Error al consultar nombre real en BD:", err);
            setAuditedUserNameDb(targetUserId);
          }
        } else {
          setAuditedUserNameDb(targetUserId);
        }
      } else {
        setAuditedUserNameDb('');
      }
    };

    fetchAuditedUserProfile();
  }, [auditorMode, targetUserId, usersList]);

  const auditedDisplayName = useMemo(() => {
    if (auditorMode) {
      if (auditedUserNameDb) return auditedUserNameDb;
      if (typeof activeUser === 'object' && activeUser !== null) {
        return `${activeUser.nombre || ''} ${activeUser.apellido_paterno || ''}`.trim() || activeUser.email || 'USUARIO';
      }
      return 'CARGANDO DESDE BD...';
    }
    return sessionUser?.email?.split('@')[0] || 'USUARIO';
  }, [auditorMode, activeUser, auditedUserNameDb, sessionUser]);

  const parseSelectedDateToISO = (dateStr) => {
    if (!dateStr) return getLocalTodayISOString();
    if (dateStr.includes('-')) return dateStr;
    const [d, m, y] = dateStr.split('/');
    if (d && m && y) return `${y}-${m}-${d}`;
    return getLocalTodayISOString();
  };

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
            .maybeSingle(); 
          
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
      const isoDate = parseSelectedDateToISO(selectedDate);
      setNewTaskDate(isoDate);
      const [y, m, d] = isoDate.split('-');
      setModalCalendarDate(new Date(Number(y), Number(m) - 1, Number(d)));
    } else {
      const hoy = getLocalTodayISOString();
      setNewTaskDate(hoy);
      setModalCalendarDate(new Date());
    }
  }, [selectedDate]);

  const agruparEventos = (data) => {
    const grouped = {};
    data.forEach(task => {
      let dbDate = task.event_date;
      if (task.recurrence === 'monthly' && dbDate) {
        const parts = dbDate.split('-');
        const day = parts.length === 3 ? parts[2] : '01';
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
        dbDate = `${currentYear}-${currentMonth}-${day}`;
      }
      if (!dbDate) return;
      
      if (!grouped[dbDate]) grouped[dbDate] = [];
      grouped[dbDate].push({
        ...task,
        text: task.title,
        time: task.event_time ? task.event_time.substring(0, 5) : '09:00',
        event_date_db: dbDate,
        displayDate: dbDate
      });
    });

    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => a.time.localeCompare(b.time));
    });
    return grouped;
  };

  const fetchActivities = async () => {
    if (auditorMode && isMasterAuditor && !targetUserId) {
      setDayTasks({});
      return;
    }
    if (!targetUserId && !sessionUser?.id) return;

    const queryUserId = targetUserId;

    if (isOffline) {
      const cachedData = obtenerDeStorage(EVENTS_CACHE_KEY, []);
      const filtered = cachedData.filter(t => t.user_id === queryUserId);
      setDayTasks(agruparEventos(filtered));
      return;
    }

    try {
      const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(queryUserId);
      
      let query = supabase.from('agenda_events').select('*');
      if (isUUID) {
        query = query.eq('user_id', queryUserId);
      } else {
        const { data: usr } = await supabase.from('users').select('id').ilike('nombre', `%${queryUserId}%`).maybeSingle();
        if (usr) {
          query = query.eq('user_id', usr.id);
        } else {
          setDayTasks({});
          return;
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setDayTasks(agruparEventos(data || []));
    } catch (error) {
      console.error("Error al cargar eventos:", error);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [sessionUser, isOffline, targetUserId, auditorMode]);

  const handleAddTask = async () => {
    if (!newTaskText.trim() || !newTaskDate) {
      alert("Por favor ingresa un título y selecciona una fecha.");
      return;
    }
    const creatorId = targetUserId || sessionUser?.id;
    if (!creatorId) {
      alert("Debes iniciar sesión o seleccionar un usuario válido.");
      return;
    }

    const eventToInsert = {
      id: crypto.randomUUID(),
      title: newTaskText.trim(),
      event_date: newTaskDate,
      event_time: newTaskTime ? (newTaskTime.length === 5 ? `${newTaskTime}:00` : newTaskTime) : '09:00:00',
      user_id: creatorId,
      household_id: sessionUser?.household_id || null,
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
        setDayTasks(agruparEventos(cachedData.filter(t => t.user_id === creatorId)));
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

  const handleDeleteTask = async (taskId) => {
    const confirmDelete = window.confirm("¿Seguro que deseas borrar esta actividad?");
    if (!confirmDelete) return;

    try {
      if (isOffline) {
        await agregarAColaOffline('DELETE', 'agenda_events', { id: taskId });
        const cachedData = obtenerDeStorage(EVENTS_CACHE_KEY, []).filter(t => t.id !== taskId);
        guardarEnStorage(EVENTS_CACHE_KEY, cachedData);
        setDayTasks(agruparEventos(cachedData.filter(t => t.user_id === targetUserId)));
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
          auth_user_email: sessionUser?.email
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
        setDayTasks(agruparEventos(cachedData.filter(t => t.user_id === targetUserId)));
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
    const hoy = getLocalTodayISOString();
    const fechaEvento = task.event_date_db;
    if (fechaEvento === hoy) return { badge: '🔴 ¡Vence Hoy!', clase: 'bg-red-200 border-red-600 text-red-950 animate-pulse' };
    else if (fechaEvento < hoy) return { badge: '🔴 Vencido', clase: 'bg-red-300 border-red-700 text-red-950' };
    else return { badge: '🟡 Próximo', clase: 'bg-yellow-100 border-yellow-600 text-yellow-900' };
  };

  useEffect(() => {
    guardarEnStorage(NOTES_STORAGE_KEY, savedNotes);
  }, [savedNotes]);

  const handleSaveNote = async (base64Data) => {
    const dateStr = parseSelectedDateToISO(selectedDate);
    const newNote = { id: Date.now(), image: base64Data, date: dateStr };
    setSavedNotes(prev => [newNote, ...savedNotes]);

    const creatorId = targetUserId || sessionUser?.id;
    if (creatorId) {
      const canvasEvent = {
        title: '✏️ NOTA / DIBUJO S-PEN',
        event_date: dateStr,
        event_time: '12:00:00',
        user_id: creatorId,
        household_id: sessionUser?.household_id || null,
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

  const handleSaveVoiceNote = async (dataInput) => {
    if (!dataInput) return;

    const isObj = typeof dataInput === 'object';
    const texto = isObj ? dataInput.text : dataInput;
    
    let dbDate = getLocalTodayISOString();
    if (isObj && dataInput.date) {
      dbDate = dataInput.date;
    } else if (selectedDate) {
      dbDate = parseSelectedDateToISO(selectedDate);
    }

    if (!texto) {
      alert("Por favor ingresa o dicta el contenido de la nota.");
      return;
    }

    const creatorId = targetUserId || sessionUser?.id;
    if (!creatorId) {
      alert("Debes iniciar sesión o seleccionar un usuario válido.");
      return;
    }

    const voiceEvent = {
      id: crypto.randomUUID(),
      title: `🎙️ ${texto.toUpperCase()}`,
      event_date: dbDate,
      event_time: '09:00:00',
      user_id: creatorId,
      household_id: sessionUser?.household_id || null,
      is_completed: false,
      is_expense: isObj ? (dataInput.is_pago && dataInput.transaction_type === 'expense') : false,
      icon_url: null,
      is_pago: isObj ? !!dataInput.is_pago : false,
      monto: isObj && dataInput.is_pago && dataInput.monto ? parseFloat(dataInput.monto) : 0,
      transaction_type: isObj ? dataInput.transaction_type : 'expense',
      category: isObj && dataInput.category ? dataInput.category.toUpperCase() : 'VOZ',
      recurrence: isObj && dataInput.recurrence ? dataInput.recurrence : 'single'
    };

    try {
      if (isOffline) {
        await agregarAColaOffline('INSERT', 'agenda_events', voiceEvent);
        const cachedData = obtenerDeStorage(EVENTS_CACHE_KEY, []);
        cachedData.push(voiceEvent);
        guardarEnStorage(EVENTS_CACHE_KEY, cachedData);
        setDayTasks(agruparEventos(cachedData.filter(t => t.user_id === creatorId)));
        triggerSuccess('⚠️ Guardado offline (Se sincronizará al recuperar internet)');
      } else {
        const { id, ...dataToInsert } = voiceEvent;
        const { error } = await supabase.from('agenda_events').insert([dataToInsert]);
        if (error) throw error;
        triggerSuccess('🎙️ ¡Nota o pago de voz registrado con éxito!');
        fetchActivities();
      }
    } catch (err) {
      console.error("Error guardando nota de voz:", err);
      alert(`Error al guardar en base de datos: ${err.message || JSON.stringify(err)}`);
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

  const handleCloseModal = () => {
    setSelectedDate(null);
  };

  return (
    <div className="min-h-screen bg-[#Fef8e7] p-4 md:p-8 font-mono text-black pb-24 select-none relative">
      
      {isOffline && (
        <div className="w-full bg-yellow-400 text-black text-center font-bold text-xs py-2 border-b-4 border-black fixed top-0 left-0 z-50">
          ⚠️ ESTÁS EN MODO OFFLINE - Los cambios se guardarán automáticamente al tener internet.
        </div>
      )}

      {auditorMode && (
        <div className="w-full bg-red-500 text-white text-center font-black text-xs py-2 border-4 border-black mb-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase">
          🔍 Modo Dios (Auditoría de Agenda) Activo - Auditando a: {auditedDisplayName}
        </div>
      )}

      {successMessage && (
        <div className="fixed top-12 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-400 border-4 border-black px-6 py-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black font-black text-xs uppercase animate-bounce">
          ✅ {successMessage}
        </div>
      )}

      <div className={`max-w-4xl mx-auto space-y-6 flex flex-col items-center ${isOffline ? 'mt-8' : ''}`}>
        
        <div className="w-full space-y-4">
          <CalendarHeader 
            setIsCanvasOpen={setIsCanvasOpen} 
            setIsVoiceOpen={setIsVoiceOpen} 
            supabase={supabase}
            alertStatus={alertStatus}
            handleEnableAlerts={handleEnableAlerts}
          />

          <div className="bg-white border-4 border-black p-3.5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔔</span>
              <div>
                <h4 className="font-black text-xs uppercase">Notificaciones y Alertas</h4>
                <p className="text-[10px] font-bold text-stone-500 uppercase">
                  {alertStatus === 'granted' 
                    ? 'Alertas activas para pagos y actividades del día' 
                    : alertStatus === 'denied' 
                    ? 'Bloqueadas en la configuración del navegador' 
                    : 'Activa las alertas para recibir recordatorios sonoros'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleEnableAlerts}
              className={`px-4 py-2 border-3 border-black rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer transition-all ${
                alertStatus === 'granted'
                  ? 'bg-emerald-300 hover:bg-emerald-400 text-black'
                  : alertStatus === 'denied'
                  ? 'bg-rose-300 hover:bg-rose-400 text-black'
                  : 'bg-amber-300 hover:bg-amber-400 text-black animate-pulse'
              }`}
            >
              {alertStatus === 'granted' ? '🔔 ALERTAS ACTIVAS' : alertStatus === 'denied' ? '🔕 ALERTAS BLOQUEADAS' : '🔔 ACTIVAR ALERTAS'}
            </button>
          </div>
        </div>

        <CalendarGrid 
          onSelectDay={(dateStr) => setSelectedDate(dateStr)} 
          dayTasks={dayTasks} 
          isAuditor={auditorMode}
          auditedUserName={auditedDisplayName}
        />

        <DailyAgendaList 
          dayTasks={dayTasks}
          getSemaforoVisual={getSemaforoVisual}
          handleToggleComplete={handleToggleComplete}
          handleDeleteTask={handleDeleteTask}
          isAuditor={auditorMode}
          auditedUserName={auditedDisplayName}
        />

        <SavedNotesGallery 
          savedNotes={savedNotes}
          handleDeleteNote={handleDeleteNote}
          isAuditor={auditorMode}
          auditedUserName={auditedDisplayName}
        />

      </div>

      {selectedDate && (
        <EventModal 
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          onClose={handleCloseModal}
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
          isAuditor={auditorMode}
          auditedUserName={auditedDisplayName}
        />
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
          modalCalendarDate={modalCalendarDate}
          setModalCalendarDate={setModalCalendarDate}
          newTaskDate={newTaskDate}
          setNewTaskDate={setNewTaskDate}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
}