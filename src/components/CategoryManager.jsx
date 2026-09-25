import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { guardarEnStorage, obtenerDeStorage } from '../utils/storage';
import { agregarAColaOffline } from '../utils/offlineSync';

const CATEGORIES_CACHE_KEY = 'family_categories_cache';

const PRESET_EMOJIS = ['🛒', '💡', '🚗', '🍿', '💵', '🏠', '💳', '🩺', '🎓', '✈️', '🐶', '🍔', '🎁', '📌'];
const PUBLIC_PRESETS = [
  '/charlie-market.png',
  '/snoopy-worker.png',
  '/snoopy-food.png',
  '/woodstock.png',
  '/lucy-finance.png'
];

export default function CategoryManager({ onClose, onCategoryUpdated }) {
  const [categories, setCategories] = useState(() =>
    obtenerDeStorage(CATEGORIES_CACHE_KEY, [])
  );
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Formulario
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('expense');
  const [icono, setIcono] = useState('📌');
  const [color, setColor] = useState('#FBBF24');

  // Estados para cámara y archivos
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    if (!navigator.onLine) {
      setCategories(obtenerDeStorage(CATEGORIES_CACHE_KEY, []));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('nombre', { ascending: true });

      if (!error && data) {
        setCategories(data);
        guardarEnStorage(CATEGORIES_CACHE_KEY, data);
      }
    } catch (err) {
      console.error('Error al cargar categorías:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setIcono(reader.result);
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

      setIcono(dataUrl);
      setShowCamera(false);
    }
  };

  const triggerSuccessAlert = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Debes estar autenticado para gestionar categorías');
      return;
    }

    const payloadData = {
      user_id: user.id,
      nombre: nombre.trim().toUpperCase(),
      tipo,
      icono,
      color
    };

    if (editingId) {
      // ✏️ ACTUALIZAR CATEGORÍA
      if (navigator.onLine) {
        const { error } = await supabase
          .from('categories')
          .update({
            nombre: payloadData.nombre,
            tipo: payloadData.tipo,
            icono: payloadData.icono,
            color: payloadData.color
          })
          .eq('id', editingId);

        if (error) {
          alert('Error al actualizar categoría: ' + error.message);
          return;
        }
      } else {
        agregarAColaOffline({
          tabla: 'categories',
          operacion: 'UPDATE',
          payload: { id: editingId, ...payloadData }
        });
      }

      const updated = categories.map((c) =>
        c.id === editingId ? { ...c, ...payloadData } : c
      );
      setCategories(updated);
      guardarEnStorage(CATEGORIES_CACHE_KEY, updated);
      triggerSuccessAlert('¡Categoría actualizada con éxito! ✏️');
    } else {
      // ➕ CREAR NUEVA CATEGORÍA
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('categories')
          .insert([payloadData])
          .select()
          .single();

        if (error) {
          alert('Error al guardar categoría: ' + error.message);
          return;
        }

        if (data) {
          const updated = [...categories, data];
          setCategories(updated);
          guardarEnStorage(CATEGORIES_CACHE_KEY, updated);
        }
      } else {
        const tempCategory = {
          id: `temp-${Date.now()}`,
          ...payloadData,
          created_at: new Date().toISOString()
        };

        agregarAColaOffline({
          tabla: 'categories',
          operacion: 'INSERT',
          payload: payloadData
        });

        const updated = [...categories, tempCategory];
        setCategories(updated);
        guardarEnStorage(CATEGORIES_CACHE_KEY, updated);
      }
      triggerSuccessAlert('¡Categoría guardada con éxito! 🎉');
    }

    resetForm();
    if (onCategoryUpdated) onCategoryUpdated();
  };

  const handleEdit = (cat) => {
    setEditingId(cat.id);
    setNombre(cat.nombre);
    setTipo(cat.tipo || 'expense');
    setIcono(cat.icono || '');
    setColor(cat.color || '#FBBF24');
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        '¿Deseas eliminar esta categoría? Sus transacciones registradas no se borrarán, solo quedarán marcadas sin categoría.'
      )
    ) {
      return;
    }

    if (navigator.onLine) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) {
        alert('Error al eliminar categoría: ' + error.message);
        return;
      }
    } else {
      agregarAColaOffline({
        tabla: 'categories',
        operacion: 'DELETE',
        payload: { id }
      });
    }

    const filtered = categories.filter((c) => c.id !== id);
    setCategories(filtered);
    guardarEnStorage(CATEGORIES_CACHE_KEY, filtered);

    if (editingId === id) resetForm();
    if (onCategoryUpdated) onCategoryUpdated();
  };

  const resetForm = () => {
    setEditingId(null);
    setNombre('');
    setTipo('expense');
    setIcono('📌');
    setColor('#FBBF24');
  };

  // Helper para renderizar emojis o imágenes dinámicas
  const renderIconContent = (iconStr, className = "w-full h-full object-cover rounded") => {
    if (!iconStr) return null;
    if (iconStr.startsWith('/') || iconStr.startsWith('http') || iconStr.startsWith('data:')) {
      return <img src={iconStr} alt="Icono" className={className} onError={(e) => { e.target.style.display = 'none'; }} />;
    }
    return <span>{iconStr}</span>;
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white border-4 border-black p-4 sm:p-5 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-mono select-none">
      
      {/* CABECERA */}
      <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-3">
        <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">
          🏷️ Mis Categorías
        </h2>
        <button
          type="button"
          onClick={() => {
            if (onClose) {
              onClose();
            } else {
              const modalElement = document.getElementById('category-manager-modal');
              if (modalElement) modalElement.style.display = 'none';
            }
          }}
          className="px-2.5 py-1 bg-rose-400 border-2 border-black rounded-lg font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* MENSAJE DE ÉXITO */}
      {successMessage && (
        <div className="mb-4 p-2 bg-emerald-300 border-2 border-black rounded-xl text-center text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-bounce">
          {successMessage}
        </div>
      )}

      {/* FORMULARIO CRUD */}
      <form
        onSubmit={handleSave}
        className="bg-amber-100 border-3 border-black p-3 rounded-2xl mb-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-3"
      >
        <div className="text-xs font-black uppercase text-black">
          {editingId ? '✏️ Modificar Categoría' : '➕ Crear Nueva Categoría'}
        </div>

        {/* Nombre de Categoría */}
        <div>
          <label className="block text-[10px] font-black uppercase mb-1 text-stone-700">
            Nombre de la Categoría
          </label>
          <input
            type="text"
            placeholder="EJ: GIMNASIO, MASCOTAS..."
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full bg-white border-2 border-black rounded-xl px-3 py-2 text-xs font-black placeholder:text-stone-400 outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            required
          />
        </div>

        {/* Tipo (Gasto / Ingreso) y Color */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex border-2 border-black rounded-xl overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[10px] font-black">
            <button
              type="button"
              onClick={() => setTipo('expense')}
              className={`px-3 py-1 uppercase transition-all cursor-pointer ${
                tipo === 'expense' ? 'bg-rose-400 text-black' : 'bg-white text-stone-500'
              }`}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => setTipo('income')}
              className={`px-3 py-1 uppercase transition-all cursor-pointer ${
                tipo === 'income' ? 'bg-emerald-300 text-black' : 'bg-white text-stone-500'
              }`}
            >
              Ingreso
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase">Color:</span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-7 h-7 rounded-lg border-2 border-black cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] p-0"
            />
          </div>
        </div>

        {/* SELECCIÓN LIBRE DE ICONO */}
        <div className="space-y-2 pt-1 border-t-2 border-black/10">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase text-stone-700">
              Icono / Imagen / Foto
            </label>
            <div className="w-6 h-6 border border-black rounded flex items-center justify-center text-xs overflow-hidden" style={{ backgroundColor: color }}>
              {renderIconContent(icono) || '—'}
            </div>
          </div>

          {/* Opción Sin Icono */}
          <button
            type="button"
            onClick={() => setIcono('')}
            className={`w-full py-1.5 px-2 border-2 border-black rounded-xl font-black text-[11px] uppercase transition-all cursor-pointer flex items-center justify-between ${
              icono === '' ? 'bg-amber-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white hover:bg-stone-50'
            }`}
          >
            <span>🚫 Sin Icono (Solo Texto)</span>
            {icono === '' && <span>✓</span>}
          </button>

          {/* Emojis Predeterminados */}
          <div className="text-[9px] font-black uppercase text-stone-500">Emojis Frecuentes</div>
          <div className="flex flex-wrap gap-1 bg-white p-1.5 border-2 border-black rounded-xl">
            {PRESET_EMOJIS.map((e) => (
              <button
                type="button"
                key={e}
                onClick={() => setIcono(e)}
                className={`w-7 h-7 flex items-center justify-center text-sm rounded border transition-all cursor-pointer ${
                  icono === e ? 'bg-amber-300 border-black font-bold scale-110' : 'border-transparent hover:border-black/30'
                }`}
              >
                {e}
              </button>
            ))}
          </div>

          {/* Personajes de la App */}
          <div className="text-[9px] font-black uppercase text-stone-500">Personajes (/public)</div>
          <div className="flex gap-1.5 overflow-x-auto p-1.5 bg-white border-2 border-black rounded-xl">
            {PUBLIC_PRESETS.map((p, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => setIcono(p)}
                className={`w-9 h-9 border-2 rounded-lg overflow-hidden shrink-0 transition-all cursor-pointer ${
                  icono === p ? 'border-black bg-amber-300 scale-105 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' : 'border-stone-200 hover:border-black'
                }`}
              >
                <img src={p} alt="Preset" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
              </button>
            ))}
          </div>

          {/* Botones para Subir Foto o Usar Cámara */}
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
              className="flex-1 py-1.5 bg-stone-100 hover:bg-stone-200 border-2 border-black rounded-xl font-black text-[10px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            >
              📁 Subir Imagen
            </button>
            <button
              type="button"
              onClick={startCamera}
              className="flex-1 py-1.5 bg-sky-200 hover:bg-sky-300 border-2 border-black rounded-xl font-black text-[10px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            >
              📷 Tomar Foto
            </button>
          </div>
        </div>

        {/* CÁMARA EN VIVO */}
        {showCamera && (
          <div className="p-2 border-2 border-black rounded-2xl bg-black flex flex-col items-center gap-2">
            <video ref={videoRef} autoPlay playsInline className="w-full h-32 object-cover rounded-xl border border-white" />
            <button
              type="button"
              onClick={takePhoto}
              className="w-full py-1.5 bg-emerald-400 text-black border-2 border-black rounded-xl font-black text-xs uppercase cursor-pointer"
            >
              📸 Capturar Foto
            </button>
          </div>
        )}

        {/* ACCIONES DEL FORMULARIO */}
        <div className="flex gap-2 mt-1">
          <button
            type="submit"
            className="flex-1 py-2 bg-emerald-400 border-2 border-black rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
          >
            {editingId ? 'Guardar Cambios' : 'Crear Categoría'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-2 bg-stone-200 border-2 border-black rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* LISTA DE CATEGORÍAS REGISTRADAS */}
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
        {loading ? (
          <div className="text-center font-black text-xs py-3">Cargando categorías...</div>
        ) : categories.length === 0 ? (
          <div className="text-center font-bold text-xs text-stone-500 py-3">
            No tienes categorías aún. ¡Crea la primera arriba!
          </div>
        ) : (
          categories.map((cat) => (
            <div
              key={cat.id || cat.nombre}
              className="flex items-center justify-between p-2 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <span
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-black text-xs shrink-0 overflow-hidden"
                  style={{ backgroundColor: cat.color || '#FBBF24' }}
                >
                  {renderIconContent(cat.icono) || '📌'}
                </span>
                <div className="flex flex-col truncate">
                  <span className="text-xs font-black truncate">{cat.nombre}</span>
                  <span
                    className={`text-[8px] font-black uppercase w-fit px-1 rounded border border-black ${
                      cat.tipo === 'income' ? 'bg-emerald-200' : 'bg-rose-200'
                    }`}
                  >
                    {cat.tipo === 'income' ? 'Ingreso' : 'Gasto'}
                  </span>
                </div>
              </div>

              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleEdit(cat)}
                  className="px-2 py-1 bg-amber-300 border border-black rounded-md font-black text-[10px] uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:shadow-none cursor-pointer"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(cat.id)}
                  className="px-2 py-1 bg-rose-400 border border-black rounded-md font-black text-[10px] uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:shadow-none cursor-pointer"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}