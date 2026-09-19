import React, { useState, useRef, useEffect } from 'react';
import { manejarInputMayusculas } from '../../utils/mayusculas.js';

export default function AddCustomButtonModal({ 
  onClose, 
  onSubmit, 
  name = '', 
  setName, 
  amount = '', 
  setAmount, 
  cat = 'VARIOS', 
  setCat,
  presetIcons = [],
  onSelectIcon 
}) {
  // Estado local para garantizar fluidez inmediata al escribir
  const [internalName, setInternalName] = useState(name);
  const [internalAmount, setInternalAmount] = useState(amount);
  const [internalCat, setInternalCat] = useState(cat);

  const [selectedIconIdx, setSelectedIconIdx] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  // Sincronizar si las props cambian externamente
  useEffect(() => { setInternalName(name); }, [name]);
  useEffect(() => { setInternalAmount(amount); }, [amount]);
  useEffect(() => { setInternalCat(cat); }, [cat]);

  const handleChooseIcon = (iconUrl, index) => {
    setSelectedIconIdx(index);
    if (onSelectIcon) onSelectIcon(iconUrl);
  };

  // Subir archivo desde dispositivo
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChooseIcon(reader.result, 'custom-file');
      };
      reader.readAsDataURL(file);
    }
  };

  // Iniciar la cámara del dispositivo
  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('No se pudo acceder a la cámara.');
      setShowCamera(false);
    }
  };

  // Capturar foto
  const takePhoto = () => {
    const video = videoRef.current;
    if (video) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 300;
      canvas.height = video.videoHeight || 300;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');

      const stream = video.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      handleChooseIcon(dataUrl, 'custom-camera');
      setShowCamera(false);
    }
  };

  // Manejadores seguros que actualizan el estado local y notifican al padre
  const updateName = manejarInputMayusculas((val) => {
    setInternalName(val);
    if (typeof setName === 'function') setName(val);
  });

  const updateAmount = (e) => {
    const val = e.target.value;
    setInternalAmount(val);
    if (typeof setAmount === 'function') setAmount(val);
  };

  const updateCat = (e) => {
    const val = e.target.value.toUpperCase();
    setInternalCat(val);
    if (typeof setCat === 'function') setCat(val);
  };

  // Blindaje clave: Evita que el navegador recargue la página al hacer click en Guardar
  const handleFormSubmit = (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (typeof onSubmit === 'function') {
      onSubmit(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center p-4 font-mono select-none">
      <div className="w-full max-w-md bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        
        <div className="flex justify-between items-center border-b-4 border-black pb-2 bg-amber-100 -mx-6 -mt-6 p-4 rounded-t-[20px]">
          <h3 className="font-black uppercase text-sm text-black">✨ Configurar Botón Rápido</h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-black font-black text-xl hover:scale-110 active:scale-95 transition-transform cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-[10px] font-black uppercase mb-1 text-stone-600">
              Concepto / Nombre
            </label>
            <input 
              type="text" 
              required 
              placeholder="EJ: GASOLINA, SUPER, CINE" 
              value={internalName} 
              onChange={updateName} 
              className="w-full px-3 py-2 border-2 border-black rounded-xl text-sm font-bold text-black uppercase focus:outline-none focus:ring-2 focus:ring-amber-400" 
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-black uppercase mb-1 text-stone-600">
                Monto Predeterminado
              </label>
              <input 
                type="number" 
                required 
                min="0" 
                step="any" 
                placeholder="0.00" 
                value={internalAmount} 
                onChange={updateAmount} 
                className="w-full px-3 py-2 border-2 border-black rounded-xl text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-amber-400" 
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase mb-1 text-stone-600">
                Categoría
              </label>
              <select 
                value={internalCat} 
                onChange={updateCat} 
                className="w-full px-3 py-2 border-2 border-black rounded-xl text-sm font-bold bg-white text-black uppercase focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
              >
                <option value="MERCADO">MERCADO</option>
                <option value="ALIMENTACIÓN">ALIMENTACIÓN</option>
                <option value="TRANSPORTE">TRANSPORTE</option>
                <option value="SERVICIOS">SERVICIOS</option>
                <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                <option value="VARIOS">VARIOS</option>
              </select>
            </div>
          </div>

          {/* Opciones de Icono: Precargados, Archivo Local o Cámara */}
          <div>
            <label className="block text-[10px] font-black uppercase mb-2 text-stone-600">
              Imagen o Personaje
            </label>

            {presetIcons.length > 0 && (
              <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-2 border-2 border-black rounded-xl bg-stone-50 mb-3">
                {presetIcons.map((iconUrl, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => handleChooseIcon(iconUrl, idx)}
                    className={`h-16 w-full border-2 rounded-xl overflow-hidden flex items-center justify-center transition-all cursor-pointer ${
                      selectedIconIdx === idx 
                        ? 'border-black bg-amber-300 scale-105 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                        : 'border-stone-200 hover:border-black bg-white'
                    }`}
                  >
                    <img 
                      src={iconUrl} 
                      alt="Preset" 
                      className="w-full h-full object-cover object-center" 
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-black border-2 border-black rounded-xl font-bold text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
              >
                📁 Subir Archivo
              </button>
              <button
                type="button"
                onClick={startCamera}
                className="flex-1 py-2 bg-sky-200 hover:bg-sky-300 text-black border-2 border-black rounded-xl font-bold text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
              >
                📷 Usar Cámara
              </button>
            </div>
          </div>

          {showCamera && (
            <div className="p-2 border-2 border-black rounded-2xl bg-black flex flex-col items-center gap-2">
              <video ref={videoRef} autoPlay playsInline className="w-full h-40 object-cover rounded-xl border border-white" />
              <button
                type="button"
                onClick={takePhoto}
                className="w-full py-2 bg-emerald-400 text-black border-2 border-black rounded-xl font-black text-xs uppercase cursor-pointer"
              >
                📸 Tomar Foto
              </button>
            </div>
          )}

          <button 
            type="submit" 
            className="w-full py-3 bg-amber-400 text-black border-4 border-black rounded-xl font-black text-xs uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-300 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer mt-2"
          >
            Guardar Acceso
          </button>
        </form>
      </div>
    </div>
  );
}