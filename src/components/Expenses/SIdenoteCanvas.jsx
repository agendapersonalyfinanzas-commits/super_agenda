import React, { useRef, useState, useEffect } from 'react';
import { aMayusculas } from '../../utils/mayusculas.js';

export default function SIdenoteCanvas({ onClose, onSave }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [textInput, setTextInput] = useState('');
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 180; // Altura optimizada para que quepan el teclado y el lienzo en celulares
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    isDrawing.current = true;
    setHasDrawn(true);
    lastPos.current = getPos(e);
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const currentPos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();
    lastPos.current = currentPos;
  };

  const stop = () => {
    isDrawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTextInput('');
    setHasDrawn(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    const dataUrl = hasDrawn ? canvas.toDataURL('image/png') : null;
    if (!dataUrl && !textInput.trim()) return;
    onSave(dataUrl, textInput.trim());
  };

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-black/70 p-4 font-mono select-none overflow-y-auto">
      <div className="bg-[#Fef8e7] border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md my-auto flex flex-col overflow-hidden">
        
        {/* CABECERA */}
        <div className="flex justify-between items-center p-4 border-b-4 border-black bg-amber-400">
          <h3 className="font-black uppercase text-base text-black">
            {aMayusculas('Nueva Nota / Recordatorio')}
          </h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-black font-black text-2xl hover:text-stone-700 cursor-pointer"
          >
            ✕
          </button>
        </div>
        
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          
          {/* SECCIÓN TECLADO */}
          <div className="bg-white p-3 border-3 border-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <label className="block text-xs font-black uppercase text-black mb-1">
              ⌨️ {aMayusculas('Escribir con Teclado')}
            </label>
            <textarea
              rows={3}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Escribe tu nota aquí..."
              className="w-full bg-stone-50 border-2 border-black rounded-xl p-2.5 font-bold text-xs uppercase outline-none focus:bg-amber-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] resize-none"
            />
          </div>

          {/* SECCIÓN DIBUJO / S-PEN */}
          <div className="bg-white p-3 border-3 border-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-black uppercase text-black">
                ✏️ {aMayusculas('Dibujar (S-Pen / Dedo)')}
              </label>
              <button 
                type="button" 
                onClick={clear} 
                className="text-[10px] bg-rose-300 border-2 border-black px-2 py-0.5 rounded-md font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
              >
                LIMPIAR LIENZO
              </button>
            </div>
            <div className="border-3 border-black bg-stone-50 rounded-xl overflow-hidden touch-none w-full">
              <canvas
                ref={canvasRef}
                onMouseDown={start}
                onMouseMove={draw}
                onMouseUp={stop}
                onMouseLeave={stop}
                onTouchStart={start}
                onTouchMove={draw}
                onTouchEnd={stop}
                className="w-full cursor-crosshair block bg-white"
              />
            </div>
          </div>

        </div>

        {/* BOTÓN GUARDAR */}
        <div className="p-4 border-t-4 border-black bg-stone-100">
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-3 bg-amber-400 border-4 border-black rounded-2xl font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            {aMayusculas('Guardar Nota')}
          </button>
        </div>

      </div>
    </div>
  );
}