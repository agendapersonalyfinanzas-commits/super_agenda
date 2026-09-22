import React, { useState, useEffect } from 'react';
import QuickExpenseButton from './QuickExpenseButton';
import { PRESET_MAP } from '../UI/Icons';
import { supabase } from '../../supabaseClient';
import { obtenerDeStorage } from '../../utils/storage.js';
import CategoryManager from '../CategoryManager';

// Función auxiliar para resolver la ruta de la imagen
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
  const [isConfigCatOpen, setIsConfigCatOpen] = useState(false); // 🟢 Dropdown personalizado para config

  // Estados para transacción (NUEVO GASTO / INGRESO)
  const [transOpen, setTransOpen] = useState(false);
  const [transAction, setTransAction] = useState(null);
  const [transAmount, setTransAmount] = useState('');
  const [transConcept, setTransConcept] = useState('');
  const [transCat, setTransCat] = useState('VARIOS');
  const [isTransCatOpen, setIsTransCatOpen] = useState(false); // 🟢 Dropdown personalizado para transacción

  // Categorías dinámicas desde Supabase / Caché local
  const [categories, setCategories] = useState(() => 
    obtenerDeStorage('family_categories_cache', [])
  );
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // Drag & Drop
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Cargar categorías reales desde Supabase
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

  const saveTransaction = (e) => {
    e.preventDefault();
    const finalAmount = Number(transAmount);
    if (isNaN(finalAmount) || finalAmount <= 0) return alert('Ingresa un monto válido.');

    const transactionData = {
      amount: finalAmount,
      concept: transConcept.toUpperCase(),
      category: transCat.toUpperCase(),
      type: type
    };

    if (processTxHandler) {
      processTxHandler(transactionData, type);
    }
    setTransOpen(false);
  };

  return (
    <div className={`p-5 rounded-3xl border-4 border-black ${bgColor} mb-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] font-mono`}>
      
      <div className="flex items-center justify-between mb-4 border-b-4 border-black pb-2">
        <h3 className="font-black text-xl uppercase text-black tracking-wide">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-3 py-2 text-xs font-black rounded-xl border-4 border-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer ${
              isEditMode ? 'bg-black text-white' : 'bg-white text-black'
            }`}
          >
            {isEditMode ? '✓ LISTO' : '🛠️ EDITAR'}
          </button>
        </div>
      </div>

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
                
                {/* DROPDOWN RETRO-COMIC PERSONALIZADO PARA CONFIG */}
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
                  <label className="bg-blue-400 text-black text-xs font-black p-2 rounded-lg border-2 border-black text-center cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 w-full">
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
                  className="flex-1 bg-white border-4 border-black py-2 rounded-xl font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 cursor-pointer text-black"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-400 border-4 border-black py-2 rounded-xl font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 cursor-pointer text-black"
                >
                  GUARDAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🟢 MODAL DE NUEVO GASTO / NUEVO INGRESO (CON DROPDOWN RETRO-COMIC PERSONALIZADO) */}
      {transOpen && transAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className={`${type === 'expense' ? 'bg-rose-100' : 'bg-green-100'} border-4 border-black p-6 rounded-3xl w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-bounce-short`}>
            <div className="flex items-center gap-3 mb-4 border-b-4 border-black pb-4">
              <img src={getIconSrc(transAction.icon || transAction.image)} alt="icon" className="w-16 h-16 object-cover rounded-full border-4 border-black bg-white" />
              <div>
                <h2 className="text-xl font-black uppercase text-black">{type === 'expense' ? 'NUEVO GASTO' : 'NUEVO INGRESO'}</h2>
              </div>
            </div>

            <form onSubmit={saveTransaction} className="flex flex-col gap-4">
              {/* CONCEPTO */}
              <div className="flex flex-col">
                <label className="text-sm font-black uppercase mb-1 text-black">Concepto:</label>
                <input
                  type="text"
                  value={transConcept}
                  onChange={(e) => setTransConcept(e.target.value)}
                  className="border-4 border-black p-2 rounded-xl text-lg font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white focus:outline-none focus:translate-x-1 focus:translate-y-1 focus:shadow-none transition-all text-black"
                />
              </div>

              {/* CATEGORÍA (DROPDOWN RETRO-COMIC FILTRADO POR TIPO) + BOTÓN DE GESTIÓN */}
              <div className="flex flex-col relative">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-black uppercase text-black">Categoría:</label>
                  <button
                    type="button"
                    onClick={() => setShowCategoryManager(true)}
                    className="text-[10px] font-black uppercase bg-amber-300 border-2 border-black px-2 py-0.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-400 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer text-black"
                  >
                    🏷️ Crear / Editar
                  </button>
                </div>

                {/* BOTÓN PERSONALIZADO QUE SIMULA EL SELECT */}
                <button
                  type="button"
                  onClick={() => setIsTransCatOpen(!isTransCatOpen)}
                  className="border-4 border-black p-2.5 rounded-xl font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white cursor-pointer text-black text-left flex justify-between items-center text-sm"
                >
                  <span className="truncate">{transCat}</span>
                  <span className="font-black text-base">▼</span>
                </button>

                {/* LISTA DESPLEGABLE ESTILO COMIC */}
                {isTransCatOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border-4 border-black rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-h-48 overflow-y-auto z-50">
                    <div
                      onClick={() => {
                        setTransCat('VARIOS');
                        setIsTransCatOpen(false);
                      }}
                      className="p-3 font-black uppercase text-xs hover:bg-amber-200 cursor-pointer border-b-2 border-black flex items-center gap-2 text-black"
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
                          className="p-3 font-black uppercase text-xs hover:bg-amber-200 cursor-pointer border-b-2 border-black flex items-center gap-2 text-black"
                        >
                          <span>{c.icono || '📌'}</span> {c.nombre}
                        </div>
                    ))}
                  </div>
                )}
              </div>

              {/* MONTO */}
              <div className="flex flex-col">
                <label className="text-sm font-black uppercase mb-1 text-black">Monto ($):</label>
                <input
                  type="number"
                  step="0.01"
                  value={transAmount}
                  onChange={(e) => setTransAmount(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className="border-4 border-black p-2 rounded-xl text-2xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white focus:outline-none focus:translate-x-1 focus:translate-y-1 focus:shadow-none transition-all text-black"
                />
              </div>

              <div className="flex gap-4 mt-2">
                <button
                  type="button"
                  onClick={() => setTransOpen(false)}
                  className="flex-1 bg-white border-4 border-black py-2 rounded-xl font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 cursor-pointer text-black"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className={`flex-1 ${type === 'expense' ? 'bg-red-500' : 'bg-green-500'} text-white border-4 border-black py-2 rounded-xl font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 cursor-pointer`}
                >
                  GUARDAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GESTOR DE CATEGORÍAS */}
      {showCategoryManager && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <CategoryManager
            onClose={() => setShowCategoryManager(false)}
            onCategoryUpdated={() => {
              fetchCategories();
            }}
          />
        </div>
      )}

    </div>
  );
}