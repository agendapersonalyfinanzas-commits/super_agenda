import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function MetasAhorroSeccion({ activeUser }) {
  const [metas, setMetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevoMonto, setNuevoMonto] = useState('');
  const [montoAbono, setMontoAbono] = useState({});

  useEffect(() => {
    if (activeUser) {
      fetchMetas();
    }
  }, [activeUser]);

  const fetchMetas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('savings_goals') // Tabla técnica original
        .select('*')
        .eq('player_id', activeUser) // Columna técnica original
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMetas(data || []);
    } catch (error) {
      console.error('Error al cargar metas y ahorros:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeta = async (e) => {
    e.preventDefault();
    if (!nuevoTitulo.trim() || !nuevoMonto) return;

    try {
      const { error } = await supabase
        .from('savings_goals')
        .insert([
          { 
            titulo: nuevoTitulo.trim(), 
            monto_objetivo: parseFloat(nuevoMonto), 
            monto_actual: 0, 
            player_id: activeUser 
          }
        ]);

      if (error) throw error;

      setNuevoTitulo('');
      setNuevoMonto('');
      fetchMetas();
    } catch (error) {
      console.error('Error al crear la meta:', error.message);
    }
  };

  const handleAbonar = async (metaId, montoActualActual) => {
    const abono = parseFloat(montoAbono[metaId]);
    if (!abono || isNaN(abono) || abono <= 0) return;

    const nuevoTotal = parseFloat(montoActualActual) + abono;

    try {
      const { error } = await supabase
        .from('savings_goals')
        .update({ monto_actual: nuevoTotal })
        .eq('id', metaId);

      if (error) throw error;

      setMontoAbono({ ...montoAbono, [metaId]: '' });
      fetchMetas();
    } catch (error) {
      console.error('Error al abonar a la meta:', error.message);
    }
  };

  const handleDeleteMeta = async (metaId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta meta u objetivo de ahorro?')) return;

    try {
      const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', metaId);

      if (error) throw error;
      fetchMetas();
    } catch (error) {
      console.error('Error al eliminar la meta:', error.message);
    }
  };

  return (
    <div className="bg-[#FEF08A] border-4 border-black rounded-3xl p-4 sm:p-5 shadow-[6px_6px_0px_rgba(0,0,0,1)] w-full flex flex-col gap-4 select-none">
      
      {/* Título de la sección */}
      <div className="flex items-center justify-between border-b-2 border-black pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎯</span>
          <h2 className="font-black text-sm sm:text-base uppercase tracking-wider text-black">Metas / Ahorro</h2>
        </div>
        <span className="bg-white border-2 border-black px-2.5 py-0.5 rounded-full font-mono font-black text-xs shadow-[2px_2px_0px_rgba(0,0,0,1)]">
          {metas.length} Activas
        </span>
      </div>

      {/* Formulario para nueva meta */}
      <form onSubmit={handleCreateMeta} className="bg-white border-[3px] border-black rounded-2xl p-3 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row gap-2.5">
        <input 
          type="text" 
          placeholder="Nombre de la meta / ahorro (Ej. Viaje, Fondo)" 
          value={nuevoTitulo}
          onChange={(e) => setNuevoTitulo(e.target.value)}
          className="flex-1 border-2 border-black rounded-xl px-3 py-2 text-xs font-bold uppercase bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
        <input 
          type="number" 
          placeholder="Monto objetivo ($)" 
          value={nuevoMonto}
          onChange={(e) => setNuevoMonto(e.target.value)}
          className="w-full sm:w-36 border-2 border-black rounded-xl px-3 py-2 text-xs font-bold uppercase bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
        <button 
          type="submit"
          className="bg-[#38BDF8] border-2 border-black rounded-xl px-4 py-2 font-black text-xs uppercase shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer hover:bg-sky-300"
        >
          Crear Meta
        </button>
      </form>

      {/* Listado de Metas / Ahorros */}
      {loading ? (
        <div className="text-center py-6 font-mono font-black text-xs uppercase animate-pulse">
          Cargando metas y ahorros...
        </div>
      ) : metas.length === 0 ? (
        <div className="bg-white/60 border-2 border-dashed border-black rounded-2xl p-6 text-center">
          <p className="font-bold text-xs uppercase text-gray-700">No tienes metas o ahorros registrados todavía.</p>
          <p className="text-[10px] font-mono text-gray-500 mt-1">¡Crea una arriba para comenzar a acumular fondos!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {metas.map((meta) => {
            const porcentaje = Math.min(Math.round((meta.monto_actual / meta.monto_objetivo) * 100), 100);
            const isCompleted = porcentaje >= 100;

            return (
              <div 
                key={meta.id} 
                className={`border-[3px] border-black rounded-2xl p-3.5 shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all ${
                  isCompleted ? 'bg-green-100' : 'bg-white'
                }`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{isCompleted ? '🏆' : '🎯'}</span>
                    <span className="font-black text-xs sm:text-sm uppercase">{meta.titulo}</span>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="font-mono font-black text-xs">
                      ${Number(meta.monto_actual).toLocaleString()} /${Number(meta.monto_objetivo).toLocaleString()}
                    </span>
                    <button 
                      type="button"
                      onClick={() => handleDeleteMeta(meta.id)}
                      className="text-red-600 hover:text-red-800 font-bold text-xs px-1.5 py-0.5 border border-black rounded bg-white hover:bg-red-50 cursor-pointer"
                      title="Eliminar meta"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Barra de Progreso */}
                <div className="w-full bg-gray-200 border-2 border-black rounded-full h-3.5 overflow-hidden mb-2.5 relative">
                  <div 
                    className={`h-full border-r-2 border-black transition-all duration-500 ${
                      isCompleted ? 'bg-green-400' : 'bg-[#FBBF24]'
                    }`}
                    style={{ width: `${porcentaje}%` }}
                  ></div>
                </div>

                {/* Pie de tarjeta: Porcentaje e Input para Abonar */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-1 border-t border-black/10">
                  <span className="font-mono font-black text-[11px] uppercase">
                    {isCompleted ? '¡Meta cumplida! 🎉' : `Progreso: ${porcentaje}%`}
                  </span>

                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <input 
                      type="number"
                      placeholder="+ Monto"
                      value={montoAbono[meta.id] || ''}
                      onChange={(e) => setMontoAbono({ ...montoAbono, [meta.id]: e.target.value })}
                      className="w-full sm:w-24 border-2 border-black rounded-xl px-2 py-1 text-[11px] font-bold bg-gray-50 focus:outline-none"
                    />
                    <button 
                      type="button"
                      onClick={() => handleAbonar(meta.id, meta.monto_actual)}
                      className="bg-green-300 border-2 border-black rounded-xl px-3 py-1 font-black text-[11px] uppercase shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer whitespace-nowrap hover:bg-green-400"
                    >
                      Abonar
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}