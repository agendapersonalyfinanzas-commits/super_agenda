import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function CalendarGrid({ onSelectDay }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState({})
  const [loading, setLoading] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthsEs = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  useEffect(() => {
    fetchMonthIndicators()
  }, [currentDate])

  const fetchMonthIndicators = async () => {
    setLoading(true)
    const firstDay = new Date(year, month, 1).toISOString().split('T')[0]
    const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('agenda_events')
      .select('event_date, has_pending_tasks')
      .gte('event_date', firstDay)
      .lte('event_date', lastDay)

    if (!error && data) {
      const indicators = data.reduce((acc, curr) => {
        const dateStr = curr.event_date
        if (!acc[dateStr]) {
          acc[dateStr] = { hasEvent: true, hasPending: curr.has_pending_tasks }
        } else if (curr.has_pending_tasks) {
          acc[dateStr].hasPending = true
        }
        return acc
      }, {})
      setEvents(indicators)
    }
    setLoading(false)
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayIndex = new Date(year, month, 1).getDay()

  const blanks = Array(firstDayIndex).fill(null)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const calendarCells = [...blanks, ...days]

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  return (
    <div className="w-full max-w-xl bg-white border-4 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden font-mono tracking-tight text-black">
      <div className="p-4 border-b-4 border-black flex justify-between items-center bg-amber-100">
        <h2 className="font-black text-lg uppercase tracking-wide">
          {monthsEs[month]} {year}
        </h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="px-3 py-1 bg-white border-2 border-black rounded-lg font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all">
            Anterior
          </button>
          <button onClick={nextMonth} className="px-3 py-1 bg-white border-2 border-black rounded-lg font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all">
            Siguiente
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-7 gap-1 text-center font-black text-xs uppercase tracking-wide text-stone-500 mb-4">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d, i) => <div key={i}>{d}</div>)}
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center font-black text-xs uppercase tracking-widest animate-pulse text-stone-400">
            Buscando Notas...
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-y-3 gap-x-1 justify-items-center">
            {calendarCells.map((day, idx) => {
              if (day === null) {
                return <div key={`blank-${idx}`} className="w-10 h-10 bg-stone-50 border border-dashed border-stone-200 rounded-lg" />
              }

              let dayStr = String(day)
              if (day < 10) dayStr = '0' + dayStr

              let monthNumber = month + 1
              let monthStr = String(monthNumber)
              if (monthNumber < 10) monthStr = '0' + monthStr

              const dateKey = year + '-' + monthStr + '-' + dayStr
              const dayMeta = events[dateKey]

              const today = new Date()
              const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year

              let btnStyle = 'w-10 h-10 rounded-xl relative flex flex-col items-center justify-center font-black text-sm transition-all border-2 '
              if (isToday) {
                btnStyle = btnStyle + 'bg-amber-400 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              } else {
                btnStyle = btnStyle + 'bg-white border-stone-300 hover:border-black hover:bg-stone-50'
              }

              return (
                <button key={`day-${day}`} onClick={() => onSelectDay(dateKey)} className={btnStyle}>
                  <span>{day}</span>
                  <div className="absolute bottom-1 flex gap-0.5 justify-center w-full">
                    {dayMeta && dayMeta.hasEvent && !isToday && (
                      <span className="w-1.5 h-1.5 bg-black border border-black rounded-full" />
                    )}
                    {dayMeta && dayMeta.hasPending && (
                      <span className="w-1.5 h-1.5 bg-sky-400 border border-black rounded-full" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <div className="mt-6 pt-4 border-t-2 border-black flex justify-center gap-6 text-[10px] font-black uppercase tracking-wider text-stone-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-black border border-black rounded-full" />
            <span>Eventos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-sky-400 border border-black rounded-full" />
            <span>Pendientes</span>
          </div>
        </div>
      </div>
    </div>
  )
}
