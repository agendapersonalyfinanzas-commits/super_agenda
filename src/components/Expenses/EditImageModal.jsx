import React, { useRef, useState, useEffect } from 'react';

// Importaciones con rutas relativas a src/components/Expenses/
import { manejarInputMayusculas } from '../../utils/mayusculas.js';
import { supabase } from '../../supabaseClient';
import { obtenerDeStorage } from '../../utils/storage';
import CategoryManager from '../CategoryManager';

export default function EditImageModal({ 
  onClose, 
  currentLabel = '', 
  currentCategory = 'VARIOS',
  currentAmount = '',
  currentIcon = '',
  action, 
  onSaveConfig 
}) {
  const fileInputRef = useRef(null);

  // Inicializar estados soportando props directas o el objeto action
  const initialLabel = action?.label || action?.name || action?.concept || currentLabel || '';
  const initialCategory = action?.category || currentCategory || 'VARIOS';
  const initialAmount = action?.amount || currentAmount || '';
  const initialIcon = action?.icon || action?.image || currentIcon || '/charlie-market.png';

  const [newLabel, setNewLabel] = useState(initialLabel);
  const [category, setCategory] = useState(initialCategory);
  const [amount, setAmount] = useState(initialAmount);
  const [selectedIcon, setSelectedIcon] = useState(initialIcon);

  // Categorías dinámicas desde Supabase o Caché local
  const [categories, setCategories] = useState(() =>
    obtenerDeStorage('family_categories_cache', [])
  );

  const [showCategoryManager, setShowCategoryManager] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

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
      console.error('Error cargando categorías en EditImageModal:', err);
    }
  };

  const presets = [
    { name: 'Súper Charlie', path: '/charlie-market.png' },
    { name: 'Reparaciones', path: '/snoopy-repair.png' },
    { name: 'Comidas Snoopy', path: '/snoopy-food.png' },
    { name: 'Viajes Woodstock', path: '/woodstock-travel.png' },
    { name: 'Gasolina', path: '/snoopy-gasolina.png' },
    { name: 'Joe Snoopy', path: '/joe-snoopy.png' },
    { name: 'Lucy Contable', path: '/lucy-analytics.png' }
  ];

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setSelectedIcon(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof onSaveConfig === 'function') {
      onSaveConfig({
        ...action,
        label: newLabel,
        name: newLabel,
        concept: newLabel,
        category: category,
        amount: amount,
        icon: selectedIcon,
        image: selectedIcon
      });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center p-4 font-mono select-none">
        <div className="w-full max-w-md bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          
          {/* CABECERA */}
          <div className="flex justify-between items-center border-b-4 border-black pb-2 bg-amber-100 -mx-6 -mt-6 p-4 rounded-t-[20px]">
            <h3 className="font-black uppercase text-sm text-black">Editar Gasto Rápido</h3>
            <button 
              type="button"
              onClick={onClose} 
              className="text-black font-black text-xl hover:scale-110 active:scale-95 transition-transform cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 pt-2">
            {/* Nombre del Botón */}
            <div>
              <h4 className="text-xs font-black uppercase text-stone-600 mb-1">Nombre del Botón (Pie)</h4>
              <input 
                type="text" 
                value={newLabel} 
                onChange={manejarInputMayusculas(setNewLabel)} 
                className="w-full px-3 py-2 border-2 border-black rounded-xl text-sm font-bold text-black uppercase focus:outline-none focus:ring-2 focus:ring-amber-400" 
                placeholder="CAMBIAR NOMBRE..." 
              />
            </div>

            {/* Selector de Categoría Dinámica */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-xs font-black uppercase text-stone-600">Categoría</h4>
                <button
                  type="button"
                  onClick={() => setShowCategoryManager(true)}
                  className="text-[10px] font-black uppercase bg-amber-300 border-2 border-black px-2 py-0.5 rounded-lg shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                >
                  🏷️ Crear / Editar Categorías
                </button>
              </div>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
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

            {/* Monto Predeterminado */}
            <div>
              <h4 className="text-xs font-black uppercase text-stone-600 mb-1">Monto Predeterminado</h4>
              <input 
                type="number" 
                step="any"
                min="0"
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                className="w-full px-3 py-2 border-2 border-black rounded-xl text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-amber-400" 
                placeholder="0.00" 
              />
            </div>

            {/* Botón Guardar Cambios */}
            <button 
              type="submit" 
              className="w-full py-2.5 bg-amber-400 text-black border-2 border-black rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-300 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer mt-1"
            >
              💾 Guardar Configuración
            </button>
          </form>

          {/* Subir nueva foto */}
          <div className="space-y-2 pt-2 border-t-2 border-dashed border-stone-200">
            <h4 className="text-xs font-black uppercase text-stone-600">Subir nueva foto</h4>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()} 
              className="w-full py-2.5 bg-stone-100 border-2 border-black rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black hover:bg-stone-200 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            >
              📸 Cargar desde dispositivo
            </button>
          </div>

          {/* Cambiar Personaje de la App */}
          <div className="space-y-2 pt-2 border-t-2 border-dashed border-stone-200">
            <h4 className="text-xs font-black uppercase text-stone-600">Cambiar Personaje de la App</h4>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedIcon(preset.path);
                  }}
                  className={`flex flex-col items-center p-2 border-2 rounded-xl transition-all cursor-pointer ${
                    selectedIcon === preset.path
                      ? 'border-black bg-amber-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] scale-105'
                      : 'border-black bg-stone-50 hover:bg-amber-100'
                  }`}
                >
                  <div className="w-10 h-10 overflow-hidden rounded-full border border-black bg-white flex items-center justify-center">
                    <img 
                      src={preset.path} 
                      alt={preset.name} 
                      className="w-full h-full object-cover scale-125 pointer-events-none"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-center mt-1 text-black block truncate w-full uppercase">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* MODAL PARA CREAR O EDITAR CATEGORÍAS DIRECTAMENTE */}
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