import React, { useState, useRef, useEffect } from 'react';

// Utilidades centralizadas con rutas verificadas (dos niveles arriba: ../../utils/)
import { aMayusculas } from '../../utils/mayusculas.js';
import { obtenerMensajeError } from '../../utils/errores.js';

export default function SIdenoteCanvas({ onSave, onClose, date }) {
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [color, setColor] = useState('#000000');
  const [thickness, setThickness] = useState(5);
  const svgRef = useRef(null);
  
  // Estado del trazo inmune a retrasos de re-renderizado
  const activePathRef = useRef([]);
  const isDrawingRef = useRef(false);

  // Extractor de posición táctil/mouse para One UI / Android y PC
  const getPos = (e) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    
    const touchList = e.touches || (e.nativeEvent && e.nativeEvent.touches);
    if (touchList && touchList.length > 0) {
      return {
        x: touchList[0].clientX - rect.left,
        y: touchList[0].clientY - rect.top
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const handleStart = (e) => {
      if (e.cancelable) e.preventDefault(); // Evita scroll involuntario en celulares
      isDrawingRef.current = true;
      const pos = getPos(e);
      activePathRef.current = [pos];
      setCurrentPath([pos]);
    };

    const handleMove = (e) => {
      if (!isDrawingRef.current) return;
      if (e.cancelable) e.preventDefault();
      const pos = getPos(e);
      activePathRef.current.push(pos);
      setCurrentPath([...activePathRef.current]);
    };

    const handleStop = () => {
      if (isDrawingRef.current && activePathRef.current.length > 0) {
        setPaths(prev => [...prev, { points: [...activePathRef.current], color, thickness }]);
        activePathRef.current = [];
        setCurrentPath([]);
      }
      isDrawingRef.current = false;
    };

    // Eventos táctiles para pantalla y S-Pen
    svgEl.addEventListener('touchstart', handleStart, { passive: false });
    svgEl.addEventListener('touchmove', handleMove, { passive: false });
    svgEl.addEventListener('touchend', handleStop);
    svgEl.addEventListener('touchcancel', handleStop);

    // Eventos de respaldo para PC
    svgEl.addEventListener('mousedown', handleStart);
    svgEl.addEventListener('mousemove', handleMove);
    svgEl.addEventListener('mouseup', handleStop);
    svgEl.addEventListener('mouseleave', handleStop);

    return () => {
      svgEl.removeEventListener('touchstart', handleStart);
      svgEl.removeEventListener('touchmove', handleMove);
      svgEl.removeEventListener('touchend', handleStop);
      svgEl.removeEventListener('touchcancel', handleStop);
      svgEl.removeEventListener('mousedown', handleStart);
      svgEl.removeEventListener('mousemove', handleMove);
      svgEl.removeEventListener('mouseup', handleStop);
      svgEl.removeEventListener('mouseleave', handleStop);
    };
  }, [color, thickness]);

  const handleClear = () => {
    setPaths([]);
    setCurrentPath([]);
    activePathRef.current = [];
  };

  const handleSave = () => {
    try {
      if (!svgRef.current) return;
      const svgXml = new XMLSerializer().serializeToString(svgRef.current);
      const base64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgXml)));
      onSave(base64);
    } catch (err) {
      console.error('Error al exportar nota gráfica:', obtenerMensajeError(err));
      alert('Error al guardar la nota: ' + obtenerMensajeError(err));
    }
  };

  const colors = ['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B'];

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 font-mono text-black select-none">
      <div className="w-full max-w-lg bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4">
        
        {/* Cabecera Estilo Cómic */}
        <div className="flex justify-between items-center border-b-4 border-black pb-2 bg-amber-400 -mx-6 -mt-6 p-4 rounded-t-[20px]">
          <div>
            <h3 className="font-black uppercase text-sm text-black">
              {aMayusculas('Lienzo S-Pen')}
            </h3>
            <p className="text-[10px] font-bold text-amber-950 uppercase">
              {aMayusculas(date ? `Notas Gráficas: ${date}` : 'Notas Gráficas')}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-black font-black text-xl hover:text-stone-700 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Barra de Herramientas */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-50 border-2 border-black p-2 rounded-xl">
          <div className="flex gap-1.5">
            {colors.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 border-black transition-transform cursor-pointer ${color === c ? 'scale-110 ring-2 ring-amber-400' : 'hover:scale-105'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase">
              {aMayusculas('Grosor')}:
            </span>
            <input 
              type="range" 
              min="2" 
              max="15" 
              value={thickness} 
              onChange={(e) => setThickness(parseInt(e.target.value))}
              className="w-20 h-2 bg-stone-200 border border-black rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <button 
            type="button" 
            onClick={handleClear} 
            className="px-2 py-1 bg-white border-2 border-black rounded-lg text-[10px] font-black uppercase hover:bg-stone-100 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            {aMayusculas('Borrar Todo')}
          </button>
        </div>

        {/* Área de Dibujo Vectorial */}
        <div className="w-full flex justify-center bg-stone-100 border-4 border-black rounded-2xl overflow-hidden shadow-inner">
          <svg
            ref={svgRef}
            className="bg-white touch-none cursor-crosshair w-full h-64"
            style={{ touchAction: 'none' }}
          >
            {paths.map((path, idx) => (
              <path
                key={idx}
                d={path.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                fill="none"
                stroke={path.color}
                strokeWidth={path.thickness}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {currentPath.length > 0 && (
              <path
                d={currentPath.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                fill="none"
                stroke={color}
                strokeWidth={thickness}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </div>

        <button 
          type="button" 
          onClick={handleSave} 
          className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-black border-4 border-black rounded-xl font-black text-xs uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
        >
          {aMayusculas('Guardar Nota Gráfica')}
        </button>

      </div>
    </div>
  );
}