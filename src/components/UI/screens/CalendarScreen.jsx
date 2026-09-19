import React, { useState, useEffect } from 'react';
import CalendarGrid from '../../../services/CalendarGrid';
import SIdenoteCanvas from '../../Expenses/SIdenoteCanvas';
import VoiceNoteModal from '../../Notes/VoiceNoteModal';

// Utilidades centralizadas
import { guardarEnStorage, obtenerDeStorage } from '../../../utils/storage.js';
import { formatearFechaCorta } from '../../../utils/fechas.js';
import { aMayusculas } from '../../../utils/mayusculas.js';
import { obtenerMensajeError } from '../../../utils/errores.js';

const NOTES_STORAGE_KEY = 'family_spen_notes';
const TASKS_STORAGE_KEY = 'family_calendar_tasks';

export default function CalendarScreen() {
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('09:00');
  
  // Estado para el aviso visual de guardado con éxito
  const [successMessage, setSuccessMessage] = useState('');

  // Persistencia de notas rápidas y tareas por fecha
  const [savedNotes, setSavedNotes] = useState(() => 
    obtenerDeStorage(NOTES_STORAGE_KEY, [])
  );
  const [dayTasks, setDayTasks] = useState(() => 
    obtenerDeStorage(TASKS_STORAGE_KEY, {})
  );

  // Solicitar permisos de notificación nativos
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('Permiso de notificaciones concedido.');
        }
      });
    }
  }, []);

  // Programar alarmas para las actividades
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

  useEffect(() => {
    guardarEnStorage(TASKS_STORAGE_KEY, dayTasks);
  }, [dayTasks]);

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

  // Disparador de alerta visual temporal de éxito
  const triggerSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleAddTask = () => {
    if (!newTaskText.trim() || !selectedDate) return;
    const currentList = dayTasks[selectedDate] || [];
    
    const newTask = { 
      id: Date.now(), 
      text: newTaskText.trim(), 
      time: newTaskTime || '00:00' 
    };

    const updatedList = [...currentList, newTask].sort((a, b) => a.time.localeCompare(b.time));
    
    setDayTasks({ ...dayTasks, [selectedDate]: updatedList });
    setNewTaskText('');
    triggerSuccess('¡Actividad guardada con éxito!');
  };

  const handleDeleteTask = (taskId) => {
    if (!selectedDate) return;
    const updatedList = (dayTasks[selectedDate] || []).filter(t => t.id !== taskId);
    setDayTasks({ ...dayTasks, [selectedDate]: updatedList });
    triggerSuccess('Actividad eliminada');
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
              {(dayTasks[selectedDate] || []).map((task) => (
                <div 
                  key={task.id} 
                  className="flex justify-between items-center p-2.5 bg-white border-2 border-black rounded-xl text-xs font-bold uppercase"
                >
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-200 border border-black px-1.5 py-0.5 rounded text-[10px] font-black">
                      {task.time}
                    </span>
                    <span className="break-all font-bold">{task.text}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-rose-600 font-black ml-2 cursor-pointer hover:underline"
                  >
                    ✕
                  </button>
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