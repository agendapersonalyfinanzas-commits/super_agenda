import React, { useState, useRef, useEffect } from 'react';
import { aMayusculas } from '../../../utils/mayusculas.js';
import { obtenerDeStorage, guardarEnStorage } from '../../../utils/storage.js';

export default function CanvasNotesScreen() {
  const [notes, setNotes] = useState(() => obtenerDeStorage('family_canvas_notes', []));
  const [textInput, setTextInput] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [isDrawingMode, setIsDrawingMode] = useState(true);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(4);
  const [savedMessage, setSavedMessage] = useState(false);

  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Inicializar canvas y redimensionar correctamente
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Configurar tamaño real del canvas
    canvas.width = canvas.parentElement.clientWidth - 32;
    canvas.height = 320;
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
  }, []);

  // Actualizar estilos del pincel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
  }, [brushColor, brushSize]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Soporte para Touch (Dedos / S-Pen) y Mouse
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    if (!isDrawingMode) return;
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = getCoordinates(e);
  };

  const draw = (e) => {
    if (!isDrawing.current || !isDrawingMode) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const currentPos = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();

    lastPos.current = currentPos;
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSaveNote = () => {
    const canvas = canvasRef.current;
    const drawingDataUrl = canvas ? canvas.toDataURL() : '';

    if (!noteTitle.trim() && !textInput.trim() && !drawingDataUrl) return;

    const newNote = {
      id: Date.now(),
      title: aMayusculas(noteTitle || 'Nota Rápida'),
      text: textInput,
      drawing: drawingDataUrl,
      date: new Date().toLocaleDateString('es-MX')
    };

    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    guardarEnStorage('family_canvas_notes', updatedNotes);

    // Limpiar formulario
    setNoteTitle('');
    setTextInput('');
    clearCanvas();
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  const deleteNote = (id) => {
    const updatedNotes = notes.filter(n => n.id !== id);
    setNotes(updatedNotes);
    guardarEnStorage('family_canvas_notes', updatedNotes);
  };

  return (
    <div className="min-h-screen bg-[#Fef8e7] p-4 md:p-8 font-mono text-black pb-24 select-none">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* CABECERA */}
        <header className="flex items-center gap-4 border-4 border-black bg-white p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="w-14 h-14 bg-amber-400 border-2 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-2xl shrink-0">
            📝
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-black">
              {aMayusculas('Notas y Dibujo Libre')}
            </h1>
            <p className="text-xs font-bold text-stone-600 uppercase tracking-tight">
              {aMayusculas('Escribe con teclado o dibuja con S-Pen y tu dedo')}
            </p>
          </div>
        </header>

        {/* MENSAJE DE ÉXITO */}
        {savedMessage && (
          <div className="border-4 border-black bg-emerald-300 p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-xs font-black uppercase">
            ✅ ¡NOTA GUARDADA EXITOSAMENTE EN PANTALLA!
          </div>
        )}

        {/* EDITOR DE NOTAS */}
        <div className="bg-white border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
          
          {/* TÍTULO DE LA NOTA */}
          <div>
            <label className="block text-xs font-black uppercase text-stone-600 mb-1">
              {aMayusculas('Título de la Nota')}
            </label>
            <input 
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Ej: Compras o Ideas..."
              className="w-full bg-stone-50 border-3 border-black rounded-xl p-3 font-black text-sm uppercase outline-none focus:bg-amber-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            />
          </div>

          {/* ESCRITURA POR TECLADO */}
          <div>
            <label className="block text-xs font-black uppercase text-stone-600 mb-1">
              {aMayusculas('Escribir Nota con el Teclado')}
            </label>
            <textarea 
              rows={3}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Escribe tu texto aquí..."
              className="w-full bg-stone-50 border-3 border-black rounded-xl p-3 font-bold text-xs uppercase outline-none focus:bg-amber-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] resize-none"
            />
          </div>

          {/* HERRAMIENTAS DE DIBUJO (S-Pen / Dedos) */}
          <div className="space-y-2">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <label className="text-xs font-black uppercase text-stone-600">
                {aMayusculas('Área de Dibujo (S-Pen / Dedo)')}
              </label>
              
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border-2 border-black cursor-pointer bg-transparent"
                  title="Color del Pincel"
                />
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="px-3 py-1 bg-rose-300 border-2 border-black rounded-lg text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                >
                  {aMayusculas('Limpiar Lienzo')}
                </button>
              </div>
            </div>

            {/* LIENZO DE CANVAS */}
            <div className="border-4 border-black bg-stone-50 rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] touch-none">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full cursor-crosshair bg-white block"
              />
            </div>
          </div>

          {/* BOTÓN GUARDAR NOTA */}
          <button
            type="button"
            onClick={handleSaveNote}
            className="w-full py-3 bg-amber-400 border-4 border-black rounded-2xl font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
          >
            {aMayusculas('Guardar Nota Completa')}
          </button>
        </div>

        {/* LISTA DE NOTAS GUARDADAS */}
        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-stone-700">
            {aMayusculas('Notas Guardadas en Pantalla')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notes.map((note) => (
              <div key={note.id} className="bg-white border-4 border-black p-5 rounded-3xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-black text-sm uppercase">{note.title}</h3>
                    <span className="text-[10px] font-bold bg-amber-100 border-2 border-black px-2 py-0.5 rounded-md">
                      {note.date}
                    </span>
                  </div>

                  {note.text && (
                    <p className="text-xs font-bold text-stone-800 uppercase bg-stone-50 p-3 rounded-xl border-2 border-black">
                      {note.text}
                    </p>
                  )}

                  {note.drawing && (
                    <div className="border-2 border-black rounded-xl overflow-hidden bg-white">
                      <img src={note.drawing} alt="Dibujo nota" className="w-full h-36 object-contain" />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => deleteNote(note.id)}
                  className="w-full py-2 bg-rose-400 border-2 border-black rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                >
                  {aMayusculas('Eliminar Nota')}
                </button>
              </div>
            ))}

            {notes.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white border-4 border-black rounded-3xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] text-stone-400 font-black text-xs uppercase">
                {aMayusculas('No hay notas guardadas todavía.')}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}