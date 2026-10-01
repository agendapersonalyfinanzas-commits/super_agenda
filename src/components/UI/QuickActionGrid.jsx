// src/components/QuickActionGrid.jsx

import React, { useState, useEffect } from 'react';
import QuickExpenseButton from './QuickExpenseButton';
import { PRESET_MAP } from '../UI/Icons';
import { supabase } from '../../supabaseClient';
import { obtenerDeStorage } from '../../utils/storage.js';
import CategoryManager from '../CategoryManager';
import { parseNaturalLanguageExpense } from '../../services/aiParserService';
import { createSpeechListener, isSpeechSupported } from '../../services/speechService';
import { analyzeAndUpdatePrices } from '../../services/priceRadarService';
import { guardarPlantillaLocalYNube } from '../../services/templateService';

const getIconSrc = (iconValue) => {
  if (!iconValue) return '/charlie-market.png';
  if (iconValue.startsWith('data:image')) return iconValue;
  if (iconValue.startsWith('/')) return iconValue;
  
  const cleanKey = iconValue.replace(/^\//, '').replace(/\.png$/, '');
  if (PRESET_MAP[cleanKey]) {
    return PRESET_MAP[cleanKey];
  }
  return `/${cleanKey}.png`;
};

const STATIC_PRESETS = Object.values(PRESET_MAP);
const DEFAULT_PRESET_ICONS = Array.from(new Set(STATIC_PRESETS));

export default function QuickActionGrid(props) {
  const {
    title,
    bgColor = 'bg-rose-100',
    actions = [],
    type = 'expense',
    onReorderActions
  } = props;

  const processTxHandler = props.onProcessTransaction || props.onActionClick;
  const saveActionHandler = props.onSaveAction || props.onAddClick || props.onAddCustom;
  const updateActionHandler = props.onUpdateAction || props.onEditAction;
  const deleteActionHandler = props.onDeleteAction || props.onDelete;

  const [isEditMode, setIsEditMode] = useState(false);

  // Estados para configurar botón
  const [configOpen, setConfigOpen] = useState(false);
  const [editingAction, setEditingAction] = useState(null);
  const [btnName, setBtnName] = useState('');
  const [btnCat, setBtnCat] = useState('VARIOS');
  const [btnIcon, setBtnIcon] = useState(DEFAULT_PRESET_ICONS[0]);
  const [isConfigCatOpen, setIsConfigCatOpen] = useState(false);

  // Estados para transacción (NUEVO GASTO / INGRESO)
  const [transOpen, setTransOpen] = useState(false);
  const [transAction, setTransAction] = useState(null);
  const [transAmount, setTransAmount] = useState('');
  const [transConcept, setTransConcept] = useState('');
  const [transCat, setTransCat] = useState('VARIOS');
  const [isRetroactive, setIsRetroactive] = useState(false);
  const [transDate, setTransDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isTransCatOpen, setIsTransCatOpen] = useState(false);

  // 🤖 Estados para asistencia por voz e IA local (SAF-LE)
  const [aiPromptText, setAiPromptText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedItems, setDetectedItems] = useState([]);
  const [parserConfidence, setParserConfidence] = useState(1.0);

  // Categorías dinámicas
  const [categories, setCategories] = useState(() => 
    obtenerDeStorage('family_categories_cache', [])
  );
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const [draggedIndex, setDraggedIndex] = useState(null);

  const fetchCategories = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('nombre', { ascending: true });

      if (!error && data && data.length > 0) {
        setCategories(data);
      }
    } catch (err) {
      console.error('Error cargando categorías:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const items = [...actions];
    const [draggedItem] = items.splice(draggedIndex, 1);
    items.splice(targetIndex, 0, draggedItem);

    if (onReorderActions) {
      onReorderActions(items, type);
    }
    setDraggedIndex(null);
  };

  const handleDragEnd = () => setDraggedIndex(null);

  const handleActionClick = (action) => {
    if (isEditMode) {
      setEditingAction(action);
      setBtnName(action.label || action.name || '');
      setBtnCat(action.category || 'VARIOS');
      setBtnIcon(action.icon || action.image || DEFAULT_PRESET_ICONS[0]);
      setConfigOpen(true);
    } else {
      setTransAction(action);
      setTransAmount(action.amount > 0 ? action.amount.toString() : '');
      setTransConcept(action.label || action.name || action.concept || '');
      setTransCat(action.category || 'VARIOS');
      setIsRetroactive(false); 
      setTransDate(new Date().toISOString().split('T')[0]);
      setAiPromptText('');
      setDetectedItems([]);
      setParserConfidence(1.0);
      setTransOpen(true);
    }
  };

  const handleAddClick = () => {
    setEditingAction(null);
    setBtnName('');
    setBtnCat('VARIOS');
    setBtnIcon(DEFAULT_PRESET_ICONS[0]);
    setConfigOpen(true);
  };

  const handleStartVoiceDictation = () => {
    if (!isSpeechSupported()) {
      alert('Tu navegador no soporta el reconocimiento de voz. Utiliza Chrome o Edge.');
      return;
    }

    const listener = createSpeechListener({
      onStart: () => setIsListening(true),
      onResult: (transcript) => {
        setAiPromptText(transcript);
        setIsListening(false);
        handleProcessWithAI(transcript);
      },
      onError: (errorMsg) => {
        setIsListening(false);
        alert(`Error de micrófono: ${errorMsg}`);
      },
      onEnd: () => setIsListening(false)
    });

    if (listener) {
      listener.start();
    }
  };

  const handleProcessWithAI = async (textToProcess = aiPromptText) => {
    if (!textToProcess || !textToProcess.trim()) return;
    setIsAnalyzing(true);

    try {
      const result = await parseNaturalLanguageExpense(textToProcess);
      
      if (result) {
        if (result.concept) setTransConcept(result.concept.toUpperCase());
        if (result.amount) setTransAmount(result.amount.toString());
        if (result.category) setTransCat(result.category.toUpperCase());
        if (result.confidence) setParserConfidence(result.confidence);
        if (result.items && result.items.length > 0) {
          setDetectedItems(result.items);
        }
      }
    } catch (error) {
      console.error('Error al procesar con IA local:', error);
      alert('No se pudo interpretar el texto ingresado.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateRadarItem = (index, field, value) => {
    const updated = [...detectedItems];
    let val = value;

    if (field === 'quantity') {
      val = parseFloat(value) || 1;
    } else if (field === 'price') {
      val = parseFloat(value) || 0;
    } else if (field === 'name') {
      val = value.toUpperCase();
    }

    updated[index] = {
      ...updated[index],
      [field]: val
    };

    setDetectedItems(updated);

    const newTotal = updated.reduce(
      (sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 
      0
    );
    if (newTotal > 0) {
      setTransAmount(newTotal.toString());
    }
  };

  const handleAddRadarItem = () => {
    setDetectedItems(prev => [
      ...prev,
      { name: 'NUEVO PRODUCTO', quantity: 1, price: 0 }
    ]);
  };

  const handleRemoveRadarItem = (index) => {
    const updated = detectedItems.filter((_, i) => i !== index);
    setDetectedItems(updated);

    const newTotal = updated.reduce(
      (sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 1)), 
      0
    );
    setTransAmount(newTotal > 0 ? newTotal.toString() : '');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 150;
        canvas.height = 150;
        ctx.drawImage(img, 0, 0, 150, 150);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setBtnIcon(compressedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const saveConfig = (e) => {
    e.preventDefault();
    const isEditing = Boolean(editingAction);

    const actionData = {
      id: editingAction?.id || `btn_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: btnName.toUpperCase(),
      label: btnName.toUpperCase(),
      concept: btnName.toUpperCase(),
      category: btnCat.toUpperCase(),
      icon: btnIcon,
      image: btnIcon,
      amount: editingAction?.amount || 0,
      type: type
    };

    if (isEditing && updateActionHandler) {
      updateActionHandler(actionData, type);
    } else if (saveActionHandler) {
      saveActionHandler(actionData, type, isEditing);
    }
    setConfigOpen(false);
  };

  const saveTransaction = async (e) => {
    e.preventDefault();
    const finalAmount = Number(transAmount);
    if (isNaN(finalAmount) || finalAmount <= 0) return alert('Ingresa un monto válido.');

    const finalDate = isRetroactive ? transDate : new Date().toISOString().split('T')[0];
    const conceptName = transConcept.trim().toUpperCase() || 'NUEVO';

    const transactionData = {
      amount: finalAmount,
      concept: conceptName,
      category: transCat.toUpperCase(),
      type: type,
      date: finalDate,
      items: detectedItems,
      is_retroactive: Boolean(isRetroactive)
    };

    if (processTxHandler) {
      processTxHandler(transactionData, type);
    }

    // 🧠 CICLO DE APRENDIZAJE: Guardar plantilla local y en nube
    try {
      await guardarPlantillaLocalYNube({
        concept: conceptName,
        category: transCat.toUpperCase(),
        itemsCount: detectedItems.length
      });
    } catch (err) {
      console.error('Error al guardar plantilla de aprendizaje:', err);
    }

    // 🌟 Alimentación automática del Radar de Precios
    if (detectedItems && detectedItems.length > 0) {
      try {
        await analyzeAndUpdatePrices(detectedItems, conceptName);
      } catch (err) {
        console.error('Error al actualizar el radar de precios:', err);
      }
    }

    setTransOpen(false);
  };

  return (
    <div className={`p-5 rounded-3xl border-4 border-black ${bgColor} mb-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] font-mono`}>
      
      {/* Encabezado Principal */}
      <div className="flex items-center justify-between mb-4 border-b-4 border-black pb-2 flex-wrap gap-2">
        <h3 className="font-black text-xl uppercase text-black tracking-wide">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-3 py-2 text-xs font-black rounded-xl border-4 border-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 transition-all cursor-pointer ${
              isEditMode ? 'bg-black text-white' : 'bg-white text-black'
            }`}
          >
            {isEditMode ? '✓ LISTO' : '🛠️ EDITAR'}
          </button>
        </div>
      </div>

      {/* Rejilla de Botones */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-6 pt-2" onDragOver={handleDragOver}>
        {actions.map((action, idx) => {
          const uniqueKey = `${action.id || 'btn'}_${idx}`;
          const resolvedAction = {
            ...action,
            icon: getIconSrc(action.icon || action.image),
            image: getIconSrc(action.icon || action.image)
          };

          return (
            <QuickExpenseButton
              key={uniqueKey}
              action={resolvedAction}
              index={idx}
              isEditMode={isEditMode}
              onClick={handleActionClick}
              onDelete={(id) => {
                if (deleteActionHandler) {
                  deleteActionHandler(id || action.id, type, idx);
                }
              }}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
            />
          );
        })}

        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={handleAddClick}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-dashed border-black bg-white flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 transition-all cursor-pointer hover:bg-amber-100"
          >
            <span className="text-4xl font-black text-black">+</span>
          </button>
          <span className="mt-3 text-xs font-black uppercase text-black bg-amber-400 px-2 py-1 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            AÑADIR
          </span>
        </div>
      </div>

      {/* MODAL CONFIGURACIÓN BOTÓN */}
      {configOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-amber-100 border-4 border-black p-5 rounded-3xl w-full max-w-md shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xl font-black uppercase mb-4 border-b-4 border-black pb-2 text-black">
              {editingAction ? 'EDITAR BOTÓN' : 'CREAR NUEVO BOTÓN'}
            </h2>
            <form onSubmit={saveConfig} className="flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-black uppercase text-black">Nombre corto:</label>
                  <input
                    type="text"
                    maxLength={12}
                    value={btnName}
                    onChange={(e) => setBtnName(e.target.value)}
                    required
                    className="w-full border-4 border-black p-2 rounded-xl font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white text-black"
                  />
                </div>
                
                <div className="flex-1 relative">
                  <label className="text-xs font-black uppercase text-black block mb-1">Categoría:</label>
                  <button
                    type="button"
                    onClick={() => setIsConfigCatOpen(!isConfigCatOpen)}
                    className="w-full border-4 border-black p-2 rounded-xl font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white text-black text-xs flex justify-between items-center cursor-pointer"
                  >
                    <span className="truncate">{btnCat}</span>
                    <span className="font-black text-sm">▼</span>
                  </button>

                  {isConfigCatOpen && (
                    <div className="absolute left-0 right-0 mt-2 bg-white border-4 border-black rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-h-40 overflow-y-auto z-50">
                      <div
                        onClick={() => {
                          setBtnCat('VARIOS');
                          setIsConfigCatOpen(false);
                        }}
                        className="p-2.5 font-black uppercase text-xs hover:bg-amber-200 cursor-pointer border-b-2 border-black flex items-center gap-2 text-black"
                      >
                        <span>📌</span> VARIOS
                      </div>
                      {categories
                        .filter(c => (c.tipo || 'expense').toLowerCase() === (type || 'expense').toLowerCase())
                        .map((c) => (
                          <div
                            key={c.id || c.nombre}
                            onClick={() => {
                              setBtnCat(c.nombre);
                              setIsConfigCatOpen(false);
                            }}
                            className="p-2.5 font-black uppercase text-xs hover:bg-amber-200 cursor-pointer border-b-2 border-black flex items-center gap-2 text-black"
                          >
                            <span>{c.icono || '📌'}</span> {c.nombre}
                          </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase mb-2 block text-black">Imagen del botón:</label>
                <div className="flex items-center gap-4 mb-3 p-3 bg-white border-4 border-black rounded-xl">
                  <img src={getIconSrc(btnIcon)} alt="preview" className="w-16 h-16 object-cover rounded-full border-2 border-black" />
                  <label className="bg-blue-400 text-black text-xs font-black p-2 rounded-lg border-2 border-black text-center cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] w-full">
                    📸 CÁMARA / GALERÍA
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>

                <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-2 bg-white border-4 border-black rounded-xl">
                  {DEFAULT_PRESET_ICONS.map((preset, idx) => (
                    <img 
                      key={idx}
                      src={preset}
                      alt={`preset-${idx}`}
                      onClick={() => setBtnIcon(preset)}
                      className={`w-full aspect-square object-cover rounded-xl border-2 cursor-pointer ${btnIcon === preset ? 'border-red-500 bg-red-100 border-4' : 'border-black'}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-4 mt-2">
                <button
                  type="button"
                  onClick={() => setConfigOpen(false)}
                  className="flex-1 bg-white border-4 border-black py-2 rounded-xl font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer text-black"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-400 border-4 border-black py-2 rounded-xl font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer text-black"
                >
                  GUARDAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE NUEVO GASTO / INGRESO */}
      {transOpen && transAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className={`${type === 'expense' ? 'bg-rose-100' : 'bg-green-100'} border-4 border-black p-6 rounded-3xl w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto`}>
            
            <div className="flex items-center gap-3 mb-3 border-b-4 border-black pb-3">
              <img src={getIconSrc(transAction.icon || transAction.image)} alt="icon" className="w-14 h-14 object-cover rounded-full border-4 border-black bg-white" />
              <div>
                <h2 className="text-lg font-black uppercase text-black">{type === 'expense' ? 'NUEVO GASTO' : 'NUEVO INGRESO'}</h2>
              </div>
            </div>

            {/* ASISTENTE POR VOZ / IA */}
            <div className="p-3 bg-sky-50 border-2 border-black rounded-2xl space-y-2 mb-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <label className="block text-[10px] font-black uppercase text-sky-900">
                🎙️ Registro Rápido por Voz o IA
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Ej: Compré 1.5 kg de limones a 35 y un café de 40" 
                  value={aiPromptText}
                  onChange={(e) => setAiPromptText(e.target.value)}
                  className="flex-1 px-3 py-1.5 border-2 border-black rounded-xl text-xs font-bold text-black bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleStartVoiceDictation}
                  className={`px-3 py-1.5 border-2 border-black rounded-xl font-black text-xs cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-300 hover:bg-amber-400 text-black'
                  }`}
                >
                  {isListening ? '🔴 Escuchando...' : '🎤 Hablar'}
                </button>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-[9px] font-bold text-stone-600">
                  {detectedItems.length > 0 ? `✨ ${detectedItems.length} ítems en radar` : 'Habla o escribe para autorellenar'}
                </span>
                <button
                  type="button"
                  disabled={isAnalyzing || !aiPromptText.trim()}
                  onClick={() => handleProcessWithAI(aiPromptText)}
                  className="px-3 py-1 bg-emerald-300 hover:bg-emerald-400 disabled:bg-stone-200 text-black border-2 border-black rounded-lg text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                >
                  {isAnalyzing ? 'Analizando...' : '⚡ Autorellenar'}
                </button>
              </div>
            </div>

            {/* RADAR DE ÍTEMS CON ALERTA DE CONFIANZA */}
            <div className={`border-2 border-black rounded-2xl p-3 mb-3 font-mono shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
              parserConfidence < 0.7 ? 'bg-amber-100' : 'bg-amber-50'
            }`}>
              {parserConfidence < 0.7 && (
                <div className="text-[9px] font-black text-amber-900 bg-amber-200 p-1 rounded border border-black mb-2">
                  ⚠ Confianza baja ({Math.round(parserConfidence * 100)}%). Verifica los montos.
                </div>
              )}

              <div className="flex justify-between items-center mb-2 pb-1 border-b-2 border-black/20">
                <span className="text-[11px] font-black uppercase text-amber-950 flex items-center gap-1">
                  🛒 Ítems en Radar ({detectedItems.length})
                </span>
                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={handleAddRadarItem}
                    className="text-[9px] font-black uppercase bg-pink-500 text-white px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-pink-600"
                  >
                    + Agregar
                  </button>
                  {detectedItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDetectedItems([])}
                      className="text-[9px] font-bold text-red-600 hover:underline cursor-pointer"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {detectedItems.length === 0 ? (
                <p className="text-[10px] text-stone-400 italic text-center py-2">
                  No hay ítems detectados. Usa la voz o añade uno manualmente.
                </p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {detectedItems.map((item, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between bg-white border-2 border-black p-2 rounded-xl text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] gap-1.5"
                    >
                      <div className="flex items-center bg-amber-300 text-[10px] px-1 py-0.5 rounded-md border border-black font-black shrink-0">
                        <input
                          type="number"
                          step="any"
                          min="0.1"
                          value={item.quantity || 1}
                          onChange={(e) => handleUpdateRadarItem(index, 'quantity', e.target.value)}
                          className="w-8 bg-transparent text-center focus:outline-none font-black"
                        />
                        <span>x</span>
                      </div>

                      <input
                        type="text"
                        value={item.name || ''}
                        onChange={(e) => handleUpdateRadarItem(index, 'name', e.target.value)}
                        className="font-black uppercase bg-transparent text-black text-xs focus:outline-none flex-1 min-w-0 border-b border-dashed border-stone-300 px-1"
                        placeholder="Producto"
                      />

                      <div className="flex items-center gap-0.5 shrink-0">
                        <span className="text-[10px] text-stone-500 font-black">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.price ?? 0}
                          onChange={(e) => handleUpdateRadarItem(index, 'price', e.target.value)}
                          className="w-14 p-1 border border-black rounded-lg text-right font-black text-xs bg-amber-50 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveRadarItem(index)}
                          className="text-stone-400 hover:text-red-500 font-black px-1 text-sm cursor-pointer ml-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={saveTransaction} className="flex flex-col gap-3">
              <div className="flex flex-col">
                <label className="text-xs font-black uppercase mb-1 text-black">Concepto:</label>
                <input
                  type="text"
                  value={transConcept}
                  onChange={(e) => setTransConcept(e.target.value.toUpperCase())}
                  className="border-4 border-black p-2 rounded-xl text-sm font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white focus:outline-none text-black"
                />
              </div>

              <div className="flex flex-col relative">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-black uppercase text-black">Categoría:</label>
                  <button
                    type="button"
                    onClick={() => setShowCategoryManager(true)}
                    className="text-[9px] font-black uppercase bg-amber-300 border-2 border-black px-2 py-0.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer text-black"
                  >
                    🏷️ Crear / Editar
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTransCatOpen(!isTransCatOpen)}
                  className="border-4 border-black p-2 rounded-xl font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white cursor-pointer text-black text-left flex justify-between items-center text-xs"
                >
                  <span className="truncate">{transCat}</span>
                  <span className="font-black text-sm">▼</span>
                </button>

                {isTransCatOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border-4 border-black rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-h-40 overflow-y-auto z-50">
                    <div
                      onClick={() => {
                        setTransCat('VARIOS');
                        setIsTransCatOpen(false);
                      }}
                      className="p-2.5 font-black uppercase text-xs hover:bg-amber-200 cursor-pointer border-b-2 border-black flex items-center gap-2 text-black"
                    >
                      <span>📌</span> VARIOS
                    </div>
                    {categories
                      .filter(c => (c.tipo || 'expense').toLowerCase() === (type || 'expense').toLowerCase())
                      .map((c) => (
                        <div
                          key={c.id || c.nombre}
                          onClick={() => {
                            setTransCat(c.nombre);
                            setIsTransCatOpen(false);
                          }}
                          className="p-2.5 font-black uppercase text-xs hover:bg-amber-200 cursor-pointer border-b-2 border-black flex items-center gap-2 text-black"
                        >
                          <span>{c.icono || '📌'}</span> {c.nombre}
                        </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 bg-white/60 border-2 border-black p-2.5 rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="retroToggle"
                    checked={isRetroactive}
                    onChange={(e) => setIsRetroactive(e.target.checked)}
                    className="w-4 h-4 accent-amber-400 border-2 border-black rounded cursor-pointer"
                  />
                  <label htmlFor="retroToggle" className="text-[11px] font-black uppercase text-black cursor-pointer select-none">
                    📅 ¿Es un movimiento con fecha pasada?
                  </label>
                </div>

                {isRetroactive && (
                  <div className="flex flex-col mt-1 pt-1 border-t-2 border-black/20">
                    <label className="text-[10px] font-black uppercase mb-1 text-stone-700">Fecha en que ocurrió:</label>
                    <input
                      type="date"
                      value={transDate}
                      onChange={(e) => setTransDate(e.target.value)}
                      className="border-2 border-black p-1.5 rounded-xl text-xs font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white focus:outline-none text-black cursor-pointer"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-black uppercase mb-1 text-black">Monto ($):</label>
                <input
                  type="number"
                  step="0.01"
                  value={transAmount}
                  onChange={(e) => setTransAmount(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className="border-4 border-black p-2 rounded-xl text-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white focus:outline-none text-black"
                />
              </div>

              <div className="flex gap-4 mt-1">
                <button
                  type="button"
                  onClick={() => setTransOpen(false)}
                  className="flex-1 bg-white border-4 border-black py-2 rounded-xl font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer text-black text-xs"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className={`flex-1 ${type === 'expense' ? 'bg-red-500' : 'bg-green-500'} text-white border-4 border-black py-2 rounded-xl font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer text-xs`}
                >
                  GUARDAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}