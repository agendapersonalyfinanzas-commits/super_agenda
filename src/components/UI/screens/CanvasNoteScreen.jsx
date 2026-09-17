import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../supabaseClient'

export default function CanvasNoteScreen({ selectedDate, onClose }) {
  const [loading, setLoading] = useState(false)
  const [color, setColor] = useState('#000000')
  const [lineWidth, setLineWidth] = useState(4)
  const [isDrawing, setIsDrawing] = useState(false)
  const canvasRef = useRef(null)
  const contextRef = useRef(null)

  useEffect(() => {
    initCanvas()
    fetchCanvasNote()
  }, [selectedDate])

  const initCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = 600
    canvas.height = 400
    canvas.style.width = '100%'
    canvas.style.height = '100%'

    const context = canvas.getContext('2d')
    if (!context) return

    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = color
    context.lineWidth = lineWidth
    contextRef.current = context

    context.fillStyle = '#FFFFFF'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = color
      contextRef.current.lineWidth = lineWidth
    }
  }, [color, lineWidth])

  const fetchCanvasNote = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('event_notes')
      .select('svg_canvas')
      .eq('event_date', selectedDate)
      .single()

    if (!error && data && data.svg_canvas) {
      const img = new Image()
      img.onload = () => {
        contextRef.current?.drawImage(img, 0, 0)
      }
      img.src = data.svg_canvas
    }
    setLoading(false)
  }

  const startDrawing = (e) => {
    const canvas = canvasRef.current
    if (!canvas || !contextRef.current) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    let clientX = e.clientX
    let clientY = e.clientY

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches.clientX
      clientY = e.touches.clientY
    }

    const x = (clientX - rect.left) * scaleX
    const y = (clientY - rect.top) * scaleY

    contextRef.current.beginPath()
    contextRef.current.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e) => {
    if (!isDrawing || !canvasRef.current || !contextRef.current) return
    e.preventDefault()

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    let clientX = e.clientX
    let clientY = e.clientY

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches.clientX
      clientY = e.touches.clientY
    }

    const x = (clientX - rect.left) * scaleX
    const y = (clientY - rect.top) * scaleY

    contextRef.current.lineTo(x, y)
    contextRef.current.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    contextRef.current?.closePath()
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const context = contextRef.current
    if (!canvas || !context) return
    context.fillStyle = '#FFFFFF'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }

  const saveCanvasNote = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    setLoading(true)
    const dataUrl = canvas.toDataURL('image/png')

    await supabase
      .from('event_notes')
      .upsert({
        event_date: selectedDate,
        svg_canvas: dataUrl
      }, { onConflict: 'event_date' })

    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center p-4 font-sans text-black">
      <div className="w-full max-w-2xl bg-white border-4 border-black rounded-t-3xl sm:rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        
        <div className="p-4 bg-amber-400 border-b-4 border-black flex justify-between items-center">
          <div>
            <h3 className="font-black text-lg uppercase tracking-wider">Lienzo S-Pen</h3>
            <p className="text-xs font-bold text-amber-950 uppercase">Notas Graficas: {selectedDate}</p>
          </div>
          <button onClick={onClose} disabled={loading} className="text-black font-black text-2xl hover:text-red-600 transition-colors">✕</button>
        </div>

        <div className="p-6 bg-white space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between border-4 border-black p-3 bg-stone-100 rounded-xl">
            <div className="flex gap-2">
              <button onClick={() => setColor('#000000')} className="w-8 h-8 rounded-full border-2 border-black bg-black active:scale-95 transition-transform" />
              <button onClick={() => setColor('#EF4444')} className="w-8 h-8 rounded-full border-2 border-black bg-red-500 active:scale-95 transition-transform" />
              <button onClick={() => setColor('#3B82F6')} className="w-8 h-8 rounded-full border-2 border-black bg-blue-500 active:scale-95 transition-transform" />
              <button onClick={() => setColor('#10B981')} className="w-8 h-8 rounded-full border-2 border-black bg-emerald-500 active:scale-95 transition-transform" />
              <button onClick={() => setColor('#FBBF24')} className="w-8 h-8 rounded-full border-2 border-black bg-amber-400 active:scale-95 transition-transform" />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-black text-xs uppercase">Grosor:</span>
              <input
                type="range"
                min="2"
                max="12"
                value={lineWidth}
                onChange={(e) => setLineWidth(parseInt(e.target.value))}
                className="w-24 accent-black"
              />
            </div>

            <button
              onClick={clearCanvas}
              className="px-3 py-1 bg-white border-2 border-black rounded-lg font-black text-xs uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              Borrar Todo
            </button>
          </div>

          <div className="w-full aspect-[3/2] border-4 border-black bg-white rounded-2xl overflow-hidden relative touch-none">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {loading ? (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center font-black uppercase text-xs tracking-widest animate-pulse">
                Procesando Trazos...
              </div>
            ) : null}
          </div>

          <button
            onClick={saveCanvasNote}
            disabled={loading}
            className="w-full py-4 bg-amber-400 border-4 border-black rounded-xl font-black text-xl uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 text-black"
          >
            {loading ? 'Guardando Lienzo...' : 'Guardar Nota Grafica'}
          </button>
        </div>

      </div>
    </div>
  )
}
