import React, { useState, useRef, useEffect } from 'react';
import { manejarInputMayusculas } from '../../utils/mayusculas.js';
import { supabase } from '../../supabaseClient';
import { obtenerDeStorage } from '../../utils/storage.js';
import CategoryManager from '../CategoryManager';
import { parseNaturalLanguageExpense } from '../../services/aiParserService'; // 🤖 Importamos el servicio de IA

export default function AddCustomButtonModal({ 
  onClose, 
  onSubmit, 
  name = '', 
  setName, 
  amount = '', 
  setAmount, 
  cat = 'VARIOS', 
  setCat,
  date = new Date().toISOString().split('T')[0],
  setDate,
  presetIcons = [],
  onSelectIcon 
}) {
  const [internalName, setInternalName] = useState(name);
  const [internalAmount, setInternalAmount] = useState(amount);
  const [internalCat, setInternalCat] = useState(cat);
  const [internalDate, setInternalDate] = useState(date);
  
  // 🎙️ Estados nuevos para la asistencia por IA y Dictado
  const [aiPromptText, setAiPromptText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedItems, setDetectedItems] = useState([]);

  const [categories, setCategories] = useState(() => 
    obtenerDeStorage('family_categories_cache', [])
  );

  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [selectedIconIdx, setSelectedIconIdx] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => { setInternalName(name); }, [name]);
  useEffect(() => { setInternalAmount(amount); }, [amount]);
  useEffect(() => { setInternalCat(cat); }, [cat]);
  useEffect(() => { setInternalDate(date); }, [date]);

  const fetchCategories = async () => {
    if (!navigator.onLine) return;
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('nombre', { ascending: true });

      if (!error && data && data.length > 0) {
        setCategories(data);
      }
    } catch (err) {
      console.error('Error cargando categorías en modal:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // 🎙️ Función para iniciar el reconocimiento de voz nativo del navegador
  const handleStartVoiceDictation = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta el dictado por voz. Puedes escribir tu gasto abajo.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-MX';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      setAiPromptText(speechToText);
      setIsListening(false);
      // Auto-procesamos con IA al terminar de hablar
      handleProcessWithAI(speechToText);
    };

    recognition.onerror = (event) => {
      console.error('Error en reconocimiento de voz:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // 🤖 Procesar texto libre o dictado con IA
  const handleProcessWithAI = async (textToProcess = aiPromptText) => {
    if (!textToProcess.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await parseNaturalLanguageExpense(textToProcess);
      
      if (result) {
        // Llenamos automáticamente los campos con lo que extrajo la IA
        setInternalName(result.concept);
        if (typeof setName === 'function') setName(result.concept);

        setInternalAmount(result.amount);
        if (typeof setAmount === 'function') setAmount(result.amount);

        if (result.category) {
          setInternalCat(result.category);
          if (typeof setCat === 'function') setCat(result.category);
        }

        // Guardamos los items detectados para enviarlos al radar de precios en el submit
        if (result.items && result.items.length > 0) {
          setDetectedItems(result.items);
        }
      }
    } catch (error) {
      console.error('Error procesando con IA:', error);
      alert('No pudimos interpretar el gasto con IA. Puedes llenar los datos manualmente.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleChooseIcon = (iconUrl, index) => {
    setSelectedIconIdx(index);
    if (onSelectIcon) onSelectIcon(iconUrl);
  };

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

  const updateDate = (e) => {
    const val = e.target.value;
    setInternalDate(val);
    if (typeof setDate === 'function') setDate(val);
  };

  const handleFormSubmit = (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    
    // 🌟 Enviamos tanto el evento como los ítems detectados de la IA para alimentar el Radar de Precios
    if (typeof onSubmit === 'function') {
      onSubmit(e, detectedItems);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center p-4 font-mono select-none">
        <div className="w-full max-w-md bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
          
          <div className="flex justify-between items-center border-b-4 border-black pb-2 bg-amber-100 -mx-6 -mt-6 p-4 rounded-t-[20px]">
            <h3 className="font-black uppercase text-sm text-black">✨ Configurar Botón / Registro</h3>
            <button 
              type="button" 
              onClick={onClose} 
              className="text-black font-black text-xl hover:scale-110 active:scale-95 transition-transform cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* 🤖 NUEVA SECCIÓN: Asistente de Dictado y Texto Inteligente con IA */}
          <div className="p-3 bg-sky-50 border-2 border-black rounded-2xl space-y-2">
            <label className="block text-[10px] font-black uppercase text-sky-900">
              🎙️ Registro Rápido por Voz o IA
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Ej: Compré leche a 35 y pan a 40 en OXXO" 
                value={aiPromptText}
                onChange={(e) => setAiPromptText(e.target.value)}
                className="flex-1 px-3 py-1.5 border-2 border-black rounded-xl text-xs font-bold text-black bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleStartVoiceDictation}
                className={`px-3 py-1.5 border-2 border-black rounded-xl font-black text-xs cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 ${
                  isListening ? 'bg-red-400 animate-pulse' : 'bg-amber-300 hover:bg-amber-400'
                }`}
                title="Dictar por voz"
              >
                {isListening ? '🔴 Escuchando...' : '🎤 Hablar'}
              </button>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-[9px] font-bold text-stone-600">
                {detectedItems.length > 0 ? `✨ ${detectedItems.length} ítems detectados para el radar` : 'Habla o escribe para rellenar con IA'}
              </span>
              <button
                type="button"
                disabled={isAnalyzing || !aiPromptText.trim()}
                onClick={() => handleProcessWithAI(aiPromptText)}
                className="px-3 py-1 bg-emerald-300 hover:bg-emerald-400 disabled:bg-stone-200 text-black border-2 border-black rounded-lg text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
              >
                {isAnalyzing ? 'Analizando...' : '✨ Autorellenar'}
              </button>
            </div>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  Fecha del Registro
                </label>
                <input 
                  type="date" 
                  required 
                  value={internalDate} 
                  onChange={updateDate} 
                  className="w-full px-3 py-2 border-2 border-black rounded-xl text-sm font-bold text-black bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer" 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-black uppercase text-stone-600">
                  Categoría
                </label>
              </div>
              <select 
                value={internalCat} 
                onChange={updateCat} 
                className="w-full px-3 py-2 border-2 border-black rounded-xl text-sm font-bold bg-white text-black uppercase focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
              >
                <option value="VARIOS">📌 VARIOS</option>
                {categories.map((c) => (
                  <option key={c.id || c.nombre} value={c.nombre}>
                    {c.icono || '📌'} {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowCategoryManager(true)}
                className="text-[10px] font-black uppercase bg-amber-300 border-2 border-black px-2 py-1 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-400 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
              >
                🏷️ Crear / Editar Categorías
              </button>
            </div>

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
              Guardar Registro
            </button>
          </form>
        </div>
      </div>

      {showCategoryManager && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
          <CategoryManager
            onClose={() => setShowCategoryManager(false)}
            onCategoryUpdated={() => {
              fetchCategories();
            }}
          />
        </div>
      )}
    </>
  );
}