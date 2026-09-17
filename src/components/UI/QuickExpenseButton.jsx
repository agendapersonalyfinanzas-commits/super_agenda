import React, { useState } from 'react';

// Importación de utilidades con extensión .js para Vite
import { aNumero, formatearMoneda } from '../../utils/moneda.js';
import { aMayusculas } from '../../utils/mayusculas.js';

export default function QuickExpenseButton({ icon, label = 'GASTO', defaultAmount = 0, category = 'GENERAL', onSave }) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState((defaultAmount || 0).toString());
  const [concept, setConcept] = useState('');
  const [isPressed, setIsPressed] = useState(false);

  const handleKeyPress = (val) => {
    if (val === 'C') {
      setAmount('');
    } else if (val === '⌫') {
      setAmount(prev => prev.slice(0, -1));
    } else {
      setAmount(prev => prev + val);
    }
  };

  const handleSubmit = () => {
    const numAmount = aNumero(amount);
    if (numAmount > 0) {
      onSave({
        amount: numAmount,
        category: aMayusculas(category || 'GENERAL'),
        concept: aMayusculas(concept.trim() || label || 'GASTO'),
        timestamp: new Date().toISOString()
      });
      setConcept('');
      setIsOpen(false);
    }
  };

  // Soporte dinámico para imágenes PNG/JPG, SVGs o Emojis en texto
  const renderIcon = () => {
    if (!icon) return null;
    
    if (React.isValidElement(icon)) {
      return React.cloneElement(icon, { className: 'w-full h-full object-cover scale-125 pointer-events-none' });
    }
    
    if (typeof icon === 'string') {
      const isImageUrl = icon.includes('.') || icon.startsWith('data:') || icon.startsWith('http') || icon.startsWith('/') || icon.includes('assets');
      if (isImageUrl) {
        return <img src={icon} alt={label} className="w-full h-full object-cover scale-125 pointer-events-none" />;
      }
      return <span className="text-4xl pointer-events-none select-none">{icon}</span>;
    }
    
    return null;
  };

  const button3DStyles = `w-28 h-28 flex items-center justify-center p-0 bg-white border-4 border-black rounded-full overflow-hidden relative pointer-events-auto transition-all duration-75 select-none md:hover:-translate-x-0.5 md:hover:-translate-y-0.5 md:hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] ` + 
    (isPressed 
      ? 'translate-x-1 translate-y-1 shadow-none bg-stone-100' 
      : 'shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]'
    );

  return (
    <>
      <div className="flex flex-col items-center gap-3 select-none" style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}>
        <button
          type="button"
          onClick={() => { setAmount((defaultAmount || 0).toString()); setConcept(''); setIsOpen(true); }}
          onTouchStart={() => setIsPressed(true)}
          onTouchEnd={() => setIsPressed(false)}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onMouseLeave={() => setIsPressed(false)}
          title={`${aMayusculas(label)} - ${formatearMoneda(defaultAmount)}`}
          className={button3DStyles}
          style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
        >
          <div className="w-full h-full absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
            {renderIcon()}
          </div>
        </button>
        
        <span className="text-[12px] font-black text-black uppercase tracking-wider text-center bg-white border-2 border-black px-2 py-0.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] select-none">
          {aMayusculas(label)}
        </span>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center p-4 font-mono select-none">
          <div className="w-full max-w-md bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <div className="p-4 bg-amber-400 border-b-4 border-black flex justify-between items-center">
              <h3 className="font-black text-sm uppercase text-black">REGISTRAR {aMayusculas(label)}</h3>
              <button 
                type="button" 
                onClick={() => setIsOpen(false)} 
                className="text-black font-black text-xl hover:scale-110 active:scale-95 transition-transform cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-stone-600 block">¿EN QUÉ GASTASTE? (CONCEPTO)</label>
                <input 
                  type="text" 
                  placeholder="EJ: GALLETAS, GAS DE LA SEMANA..."
                  value={concept}
                  onChange={(e) => setConcept(aMayusculas(e.target.value))}
                  className="w-full px-3 py-2 border-4 border-black rounded-xl text-sm font-bold text-black uppercase focus:outline-none focus:bg-stone-50 placeholder-stone-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-stone-600 block">MONTO A REGISTRAR</label>
                <div className="flex items-center justify-between p-3 border-4 border-black bg-stone-50 rounded-2xl h-14 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <span className="text-xs font-black uppercase text-stone-500">TOTAL:</span>
                  <span className="text-2xl font-black text-black">{formatearMoneda(aNumero(amount))}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((char) => (
                  <button
                    key={char}
                    type="button"
                    onClick={() => handleKeyPress(char)}
                    className="h-10 font-black text-base border-4 border-black rounded-xl bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all text-black hover:bg-amber-100 cursor-pointer"
                  >
                    {char}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                className="w-full py-3.5 bg-orange-500 text-black border-4 border-black rounded-xl font-black text-xs uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all hover:bg-orange-400 cursor-pointer"
              >
                CONFIRMAR TRANSACCIÓN
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}