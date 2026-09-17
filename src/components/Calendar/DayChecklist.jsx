import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

export default function DayChecklist({ selectedDate, onClose, onSwitchToCanvas }) {
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')
  const [loading, setLoading] = useState(true)
  const [isListening, setIsListening] = useState(false)

  useEffect(() => {
    fetchDayData()
  }, [selectedDate])

  const fetchDayData = async () => {
    setLoading(true)
    try {
      // Bloque de contingencia: controlamos el error pasivamente para evitar bloqueos de hilo
      const { data, error } = await supabase
        .from('event_notes')
        .select('id, checklist')
        .eq('event_date', selectedDate)
        .maybeSingle() // Usamos maybeSingle para mitigar excepciones de filas vacías

      if (!error && data) {
        setTasks(data.checklist || [])
      } else {
        setTasks([])
      }
    } catch (err) {
      console.warn('Supabase REST 406 - Usando respaldo de canal seguro pasivo:', err)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  const saveTasks = async (updatedTasks) => {
    const hasPending = updatedTasks.some(t => !t.done)
    
    try {
      const { error } = await supabase
        .from('event_notes')
        .upsert({
          event_date: selectedDate,
          checklist: updatedTasks
        }, { onConflict: 'event_date' })

      if (!error) {
        await supabase
          .from('agenda_events')
          .upsert({
            event_date: selectedDate,
            has_pending_tasks: hasPending
          }, { onConflict: 'event_date' })
      }
    } catch (err) {
      console.error('Error al guardar datos de agenda:', err)
    }
  }

  const handleAddTask = (e) => {
    if (e) e.preventDefault()
    if (newTask.trim() === '') return
    
    const updated = [...tasks, { id: Date.now().toString(), task: newTask.trim(), done: false }]
    setTasks(updated)
    setNewTask('')
    saveTasks(updated)
  }
  const handleToggleTask = (id) => {
    const updated = tasks.map(t => {
      if (t.id === id) {
        return { ...t, done: !t.done }
      }
      return t
    })
    setTasks(updated)
    saveTasks(updated)
  }

  const handleDeleteTask = (id) => {
    const updated = tasks.filter(t => t.id !== id)
    setTasks(updated)
    saveTasks(updated)
  }

  const startVoiceRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta el reconocimiento de voz.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'es-MX'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript
      if (speechToText.trim() !== '') {
        setNewTask(speechToText)
      }
    }

    recognition.start()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center p-4 font-mono tracking-tight text-black">
      <div className="w-full max-w-md bg-white border-4 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        
        <div className="p-4 bg-amber-400 border-b-4 border-black flex justify-between items-center">
          <div>
            <h3 className="font-black text-lg uppercase tracking-wide">Tareas del Día</h3>
            <p className="text-xs font-bold text-amber-950 uppercase">{selectedDate}</p>
          </div>
          <button onClick={onClose} className="text-black font-black text-xl hover:text-stone-600 transition-colors">✕</button>
        </div>

        <div className="p-6 bg-white space-y-6 max-h-[70vh] overflow-y-auto">
          <button
            type="button"
            onClick={onSwitchToCanvas}
            className="w-full py-3 bg-white border-4 border-black rounded-xl font-black text-xs uppercase tracking-wide shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 hover:bg-stone-50"
          >
            ✏️ Abrir Lienzo S-Pen
          </button>

          <form onSubmit={handleAddTask} className="flex gap-2 items-center">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Nueva tarea..."
              className="flex-1 px-4 py-3 border-4 border-black rounded-xl font-black text-sm focus:outline-none focus:bg-stone-50"
            />
            
            <button
              type="button"
              onClick={startVoiceRecognition}
              className={`p-3 border-4 border-black rounded-xl font-black text-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all ${isListening ? 'bg-red-400' : 'bg-white hover:bg-stone-50'}`}
            >
              {isListening ? '🛑' : '🎙️'}
            </button>

            <button
              type="submit"
              className="px-4 py-3 bg-amber-400 border-4 border-black rounded-xl font-black text-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all hover:bg-amber-300"
            >
              +
            </button>
          </form>

          {loading ? (
            <p className="text-center font-black uppercase text-xs animate-pulse py-4 text-stone-400">Cargando pendientes...</p>
          ) : (
            <ul className="space-y-3">
              {tasks.map(item => {
                let textStyle = 'font-bold text-sm flex-1 '
                if (item.done) {
                  textStyle = textStyle + 'line-through text-stone-400'
                } else {
                  textStyle = textStyle + 'text-black'
                }

                let checkStyle = 'w-6 h-6 border-4 border-black rounded-md flex items-center justify-center transition-colors '
                if (item.done) {
                  checkStyle = checkStyle + 'bg-amber-400'
                } else {
                  checkStyle = checkStyle + 'bg-white'
                }

                return (
                  <li key={item.id} className="flex items-center justify-between gap-3 p-3 border-4 border-black rounded-xl bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <button type="button" onClick={() => handleToggleTask(item.id)} className={checkStyle}>
                      {item.done && <span className="font-black text-xs text-black">✓</span>}
                    </button>
                    <span className={textStyle}>{item.task}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(item.id)}
                      className="text-stone-400 hover:text-red-600 font-black text-sm px-2 transition-colors"
                    >
                      ✕
                    </button>
                  </li>
                )
              })}

              {tasks.length === 0 && (
                <p className="text-center font-bold text-stone-400 uppercase text-xs py-6">No hay tareas programadas</p>
              )}
            </ul>
          )}
        </div>

      </div>
    </div>
  )
}
