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

// Solo conservamos el storage para las notas de dibujo temporalmente
const NOTES_STORAGE_KEY = 'family_spen_notes';

export default function CalendarScreen() {
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('09:00');
  
  const [successMessage, setSuccessMessage] = useState('');

  // Persistencia de notas rápidas (localStorage por ahora)
  const [savedNotes, setSavedNotes] = useState(() => 
    obtenerDeStorage(NOTES_STORAGE_KEY, [])
  );
  
  // Tareas del día ahora inician vacías, se llenarán con Supabase
  const [dayTasks, setDayTasks] = useState({});

  // ----------------------------------------------------------------
  // NUEVO: FUNCIONES DE SUPABASE (Paso 1)
  // ----------------------------------------------------------------
  
  const fetchActivities = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) return; // Si no hay usuario, no hacemos nada

      const { data, error } = await supabase
        .from('agenda_events')
        .select('*')
        .eq('user_id', userData.user.id);

      if (error) throw error;

      // Convertimos el arreglo de Supabase al formato que necesita tu CalendarGrid:
      // { '19/09/2026': [ {id, text, time}, ... ] }
      const grouped = {};
      data.forEach(task => {
        // La BD entrega 'YYYY-MM-DD'
        const [year, month, day] = task.event_date.split('-');
        const dateStr = `${day}/${month}/${year}`;
        
        if (!grouped[dateStr]) grouped[dateStr] = [];
        grouped[dateStr].push({
          id: task.id, // Ahora es un UUID de Supabase
          text: task.title,
          time: task.event_time ? task.event_time.substring(0, 5) : '00:00', // Cortamos 'HH:mm:ss' a 'HH:mm'
          is_completed: task.is_completed,
          is_expense: task.is_expense,
          icon_url: task.icon_url
        });
      });

      // Ordenamos las actividades de cada día por hora
      Object.keys(grouped).forEach(date => {
        grouped[date].sort((a, b) => a.time.localeCompare(b.time));
      });

      setDayTasks(grouped);
    } catch (error) {
      console.error("Error al cargar eventos de Supabase:", error);
    }
  };

  // Cargar actividades al abrir la pantalla
  useEffect(() => {
    fetchActivities();
  }, []);

  const handleAddTask = async () => {
    if (!newTaskText.trim() || !selectedDate) return;
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user.id;

      // Obtener el household_id (Requerido por tus políticas RLS)
      const { data: profileData } = await supabase
        .from('users')
        .select('household_id')
        .eq('id', userId)
        .single();

      // Convertir 'DD/MM/YYYY' (UI) a 'YYYY-MM-DD' (Supabase)
      const [day, month, year] = selectedDate.split('/');
      const dbDate = `${year}-${month}-${day}`;

      const eventToInsert = {
        title: newTaskText.trim(),
        event_date: dbDate,
        event_time: newTaskTime || '00:00',
        user_id: userId,
        household_id: profileData?.household_id,
        is_completed: false,
        is_expense: false,
        icon_url: null
      };

      const { error } = await supabase
        .from('agenda_events')
        .insert([eventToInsert]);

      if (error) throw error;

      // Limpiar formulario y recargar lista real
      setNewTaskText('');
      triggerSuccess('¡Actividad guardada en la nube!');
      fetchActivities(); 

    } catch (error) {
      console.error("Error al guardar en Supabase:", error.message);
      alert("Hubo un error al guardar la actividad en la nube.");
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
      fetchActivities(); // Recargar datos actualizados
    } catch (error) {
      console.error("Error al eliminar:", error.message);
      alert("Hubo un error al eliminar.");
    }
  };

  // ----------------------------------------------------------------
  // NUEVO: FUNCIÓN PARA TACHAR TAREAS (Paso 2)
  // ----------------------------------------------------------------
  const handleToggleComplete = async (taskId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('agenda_events')
        .update({ is_completed: !currentStatus }) // Invierte el estado actual
        .eq('id', taskId);

      if (error) throw error;

      triggerSuccess(currentStatus ? 'Actividad reabierta' : '¡Actividad completada!');
      fetchActivities(); // Recarga la lista para aplicar el cambio visual
    } catch (error) {
      console.error("Error al actualizar estado:", error.message);
      alert("Hubo un error al actualizar la actividad.");
    }
  };

  // ----------------------------------------------------------------
  // RESTO DE TU CÓDIGO (Intacto)
  // ----------------------------------------------------------------

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('Permiso de notificaciones concedido.');
        }
      });
    }
  }, []);

  useEffect(() => {
    const timers = [];
    const now = new Date();

    Object.entries(dayTasks).forEach(([dateStr, tasks]) => {
      tasks.forEach((task) => {
        if (!task.time) return;

        const [day, month, year] = dateStr.split('/');
        const [hours, minutes] = task.time.split(':');
        const taskDate = new Date(year, month - 1, day, hours, minutes, 0);

        const timeToTask = taskDate.getTime() - now.getTime();

        if (timeToTask > 0) {
          const timer = setTimeout(() => {
            if (Notification.permission === 'granted') {
              new Notification('🔔 Actividad Próxima', {
                body: `${task.time} - ${task.text}`,
                icon: '/super-snoopy.png'
              });
            } else {
              alert(`🔔 Actividad [${task.time}]: ${task.text}`);
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
      
      {/* NOTIFICACIÓN FLOTANTE DE ÉXITO (TOAST) */}
      {successMessage && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-400 border-4 border-black px-6 py-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black font-black text-xs uppercase animate-bounce">
          ✅ {successMessage}
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6 flex flex-col items-center">
        
        {/* CABECERA */}
        <header className="w-full flex flex-wrap justify-between items-center border-4 border-black bg-amber-400 p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] gap-4">
          <div>
            <h1 className="text-2xl font-black uppercase text-black tracking-tight">
              {aMayusculas('Agenda y Pendientes')}
            </h1>
            <p className="text-xs font-bold text-amber-950 uppercase mt-0.5 tracking-tight">
              {aMayusculas('Organización y Notas')}
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

        {/* CALENDARIO CON SEMÁFORO Y HOY EN AZUL */}
        <CalendarGrid 
          onSelectDay={(dateStr) => setSelectedDate(dateStr)} 
          dayTasks={dayTasks} 
        />

        {/* NOTAS GUARDADAS */}
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
          <div className="w-full max-w-md bg-amber-400 border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4">
            
            <div className="flex justify-between items-center border-b-4 border-black pb-3">
              <div>
                <h3 className="font-black uppercase text-base text-black">
                  {aMayusculas('Actividades del Día')}
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

            {/* FORMULARIO DE NUEVA ACTIVIDAD CON BOTÓN EXPLÍCITO DE GUARDAR */}
            <div className="space-y-2 bg-amber-300 p-3 border-2 border-black rounded-2xl">
              <div className="flex gap-2">
                <input
                  type="time"
                  value={newTaskTime}
                  onChange={(e) => setNewTaskTime(e.target.value)}
                  className="p-2.5 bg-white border-4 border-black rounded-xl text-xs font-bold uppercase focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Ej. Cita con el dr..."
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  className="flex-1 p-2.5 bg-white border-4 border-black rounded-xl text-xs font-bold uppercase focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsVoiceOpen(true)}
                  className="flex-1 py-2.5 bg-white border-4 border-black rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                >
                  🎙️ {aMayusculas('Dictar')}
                </button>
                <button
                  type="button"
                  onClick={handleAddTask}
                  className="flex-1 py-2.5 bg-emerald-400 hover:bg-emerald-300 border-4 border-black rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                >
                  💾 {aMayusculas('Guardar Actividad')}
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pt-2">
              {/* AQUÍ ESTÁ LA NUEVA LISTA CON EL TACHADO VISUAL */}
              {(dayTasks[selectedDate] || []).map((task) => (
                <div 
                  key={task.id} 
                  className={`flex justify-between items-center p-2.5 border-2 border-black rounded-xl text-xs font-bold uppercase transition-all duration-300 ${
                    task.is_completed ? 'bg-stone-200 opacity-70' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className={`border border-black px-1.5 py-0.5 rounded text-[10px] font-black ${
                      task.is_completed ? 'bg-stone-400 text-stone-800' : 'bg-amber-200 text-black'
                    }`}>
                      {task.time}
                    </span>
                    <span className={`break-all font-bold ${
                      task.is_completed ? 'line-through text-stone-500' : 'text-black'
                    }`}>
                      {task.text}
                    </span>
                  </div>
                  
                  {/* Botones de acción (Completar y Eliminar) */}
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <button 
                      type="button"
                      onClick={() => handleToggleComplete(task.id, task.is_completed)}
                      className="text-lg cursor-pointer hover:scale-125 transition-transform"
                      title={task.is_completed ? "Desmarcar" : "Completar"}
                    >
                      {task.is_completed ? '↩️' : '✅'}
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
              ))}
              {(!dayTasks[selectedDate] || dayTasks[selectedDate].length === 0) && (
                <p className="text-center text-xs font-black text-amber-950 uppercase pt-2">
                  No hay actividades programadas
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