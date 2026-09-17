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

  // Persistencia de notas rápidas y tareas por fecha
  const [savedNotes, setSavedNotes] = useState(() => 
    obtenerDeStorage(NOTES_STORAGE_KEY, [])
  );
  const [dayTasks, setDayTasks] = useState(() => 
    obtenerDeStorage(TASKS_STORAGE_KEY, {})
  );

  useEffect(() => {
    guardarEnStorage(NOTES_STORAGE_KEY, savedNotes);
  }, [savedNotes]);

  useEffect(() => {
    guardarEnStorage(TASKS_STORAGE_KEY, dayTasks);
  }, [dayTasks]);

  // Manejador para guardar lienzo manuscrito
  const handleSaveNote = (base64Data) => {
    try {
      const newNote = { 
        id: Date.now(), 
        image: base64Data, 
        date: selectedDate || formatearFechaCorta(new Date()) 
      };
      setSavedNotes(prev => [newNote, ...prev]);
      setIsCanvasOpen(false);
    } catch (err) {
      console.error('Error al guardar nota:', obtenerMensajeError(err));
    }
  };

  // Manejador para recibir voz: asigna al campo "Nueva tarea" si el modal del día está abierto
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
      }
      setIsVoiceOpen(false);
    } catch (err) {
      console.error('Error al guardar dictado:', obtenerMensajeError(err));
    }
  };

  // Agregar nueva tarea a la fecha seleccionada
  const handleAddTask = () => {
    if (!newTaskText.trim() || !selectedDate) return;
    const currentList = dayTasks[selectedDate] || [];
    const updatedList = [...currentList, { id: Date.now(), text: newTaskText.trim() }];
    
    setDayTasks({ ...dayTasks, [selectedDate]: updatedList });
    setNewTaskText('');
  };

  const handleDeleteTask = (taskId) => {
    if (!selectedDate) return;
    const updatedList = (dayTasks[selectedDate] || []).filter(t => t.id !== taskId);
    setDayTasks({ ...dayTasks, [selectedDate]: updatedList });
  };

  const handleDeleteNote = (id) => {
    setSavedNotes(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#Fef8e7] p-4 md:p-8 font-mono text-black pb-24 select-none">
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

        {/* CUADRÍCULA DEL CALENDARIO */}
        <CalendarGrid onSelectDay={(dateStr) => setSelectedDate(dateStr)} />

        {/* TABLERO DE VIÑETAS CÓMICAS (NOTAS GUARDADAS) */}
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

      {/* MODAL TAREAS DEL DÍA SELECCIONADO */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 font-mono select-none">
          <div className="w-full max-w-md bg-amber-400 border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4">
            
            <div className="flex justify-between items-center border-b-4 border-black pb-3">
              <div>
                <h3 className="font-black uppercase text-base text-black">
                  {aMayusculas('Tareas del Día')}
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

            {/* BOTÓN PARA ABRIR LIENZO S-PEN PARA ESTA FECHA */}
            <button
              type="button"
              onClick={() => setIsCanvasOpen(true)}
              className="w-full py-2.5 bg-white border-4 border-black rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            >
              ✏️ {aMayusculas('Abrir Lienzo S-Pen')}
            </button>

            {/* CAMPO CON BOTÓN DE MICRÓFONO CONECTADO */}
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Nueva tarea..."
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                className="flex-1 p-3 bg-white border-4 border-black rounded-xl text-xs font-bold uppercase focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setIsVoiceOpen(true)}
                className="p-3 bg-white border-4 border-black rounded-xl font-black text-base shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                title="Dictar tarea por voz"
              >
                🎙️
              </button>
              <button
                type="button"
                onClick={handleAddTask}
                className="p-3 bg-white border-4 border-black rounded-xl font-black text-base shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
              >
                +
              </button>
            </div>

            {/* LISTA DE TAREAS REGISTRADAS EN LA FECHA */}
            <div className="space-y-2 max-h-48 overflow-y-auto pt-2">
              {(dayTasks[selectedDate] || []).map((task) => (
                <div 
                  key={task.id} 
                  className="flex justify-between items-center p-2.5 bg-white border-2 border-black rounded-xl text-xs font-bold uppercase"
                >
                  <span className="break-all">{task.text}</span>
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
                  No hay tareas programadas
                </p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* MODAL LIENZO DE DIBUJO / MANUSCRITO */}
      {isCanvasOpen && (
        <SIdenoteCanvas 
          onClose={() => setIsCanvasOpen(false)} 
          onSave={handleSaveNote} 
        />
      )}

      {/* MODAL DE DICTADO POR VOZ */}
      {isVoiceOpen && (
        <VoiceNoteModal 
          onClose={() => setIsVoiceOpen(false)} 
          onSave={handleSaveVoiceNote} 
        />
      )}
    </div>
  );
}