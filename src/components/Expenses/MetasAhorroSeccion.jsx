import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import MetaCardItem from './MetaCardItem';

export default function MetasAhorroSeccion({ activeUser }) {
  const [metas, setMetas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para formulario de nueva meta
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevoMonto, setNuevoMonto] = useState('');
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevoIcon, setNuevoIcon] = useState('🎯');
  
  // Estados para alertas de retroalimentación visual (Feedback UX)
  const [mensajeExito, setMensajeExito] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Estado para filtro de visualización
  const [filtroEstado, setFiltroEstado] = useState('todas'); // 'todas', 'activas', 'completadas'

  const iconosDisponibles = ['🎯', '🚗', '🏠', '✈️', '💻', '🎓', '🛠️', '💰', '🏆', '🐶'];

  useEffect(() => {
    if (activeUser) {
      fetchMetas();
    }
  }, [activeUser]);

  const fetchMetas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('player_id', activeUser)
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

    const montoNum = parseFloat(nuevoMonto);
    setMensajeExito('');
    setErrorMsg('');

    try {
      const { error } = await supabase
        .from('savings_goals')
        .insert([
          { 
            goal_name: nuevoTitulo.trim(),
            target_amount: montoNum,
            current_amount: 0,
            fecha_limite: nuevaFecha || null,
            icon: nuevoIcon,
            player_id: activeUser 
          }
        ]);

      if (error) throw error;

      // Activar alerta visual de éxito
      setMensajeExito('🎉 ¡Meta creada y guardada con éxito en la base de datos!');

      // Limpiar formulario
      setNuevoTitulo('');
      setNuevoMonto('');
      setNuevaFecha('');
      setNuevoIcon('🎯');
      fetchMetas();

      // Ocultar alerta automáticamente después de 4 segundos
      setTimeout(() => {
        setMensajeExito('');
      }, 4000);

    } catch (error) {
      console.error('Error al crear la meta:', error.message);
      setErrorMsg(`❌ No se pudo guardar: ${error.message}`);
    }
  };

  // Filtrar metas según estado
  const metasFiltradas = metas.filter((meta) => {
    const actual = parseFloat(meta.current_amount || 0);
    const objetivo = parseFloat(meta.target_amount || 1);
    const isCompleted = actual >= objetivo;

    if (filtroEstado === 'activas') return !isCompleted;
    if (filtroEstado === 'completadas') return isCompleted;
    return true;
  });

  return (
    <div className="bg-[#FEF08A] border-4 border-black rounded-3xl p-4 sm:p-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] w-full flex flex-col gap-5 select-none">
      
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-black pb-3 gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🎯</span>
          <div>
            <h2 className="font-black text-base sm:text-lg uppercase tracking-wider text-black">Metas y Ahorros</h2>
            <p className="text-[10px] font-mono uppercase text-gray-700">Gestiona tus fondos y plazos financieros</p>
          </div>
        </div>
        
        {/* Filtros de visualización */}
        <div className="flex items-center gap-1.5 bg-white border-2 border-black p-1 rounded-2xl shadow-[2px_2px_0px_rgba(0,0,0,1)]">
          <button 
            type="button"
            onClick={() => setFiltroEstado('todas')}
            className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer ${filtroEstado === 'todas' ? 'bg-yellow-300 border border-black shadow-[1px_1px_0px_rgba(0,0,0,1)]' : 'hover:bg-gray-100'}`}
          >
            Todas ({metas.length})
          </button>
          <button 
            type="button"
            onClick={() => setFiltroEstado('activas')}
            className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer ${filtroEstado === 'activas' ? 'bg-yellow-300 border border-black shadow-[1px_1px_0px_rgba(0,0,0,1)]' : 'hover:bg-gray-100'}`}
          >
            Activas
          </button>
          <button 
            type="button"
            onClick={() => setFiltroEstado('completadas')}
            className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer ${filtroEstado === 'completadas' ? 'bg-green-300 border border-black shadow-[1px_1px_0px_rgba(0,0,0,1)]' : 'hover:bg-gray-100'}`}
          >
            Logradas
          </button>
        </div>
      </div>

      {/* Formulario para Crear Meta */}
      <form onSubmit={handleCreateMeta} className="bg-white border-[3px] border-black rounded-2xl p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col gap-3">
        
        {/* Alerta de Éxito */}
        {mensajeExito && (
          <div className="bg-green-300 border-2 border-black rounded-xl p-2.5 text-xs font-black uppercase tracking-wide text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center justify-between">
            <span>{mensajeExito}</span>
            <button type="button" onClick={() => setMensajeExito('')} className="cursor-pointer font-bold px-1.5 py-0.5 rounded-lg hover:bg-green-400">✕</button>
          </div>
        )}

        {/* Alerta de Error */}
        {errorMsg && (
          <div className="bg-red-300 border-2 border-black rounded-xl p-2.5 text-xs font-black uppercase tracking-wide text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center justify-between">
            <span>{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg('')} className="cursor-pointer font-bold px-1.5 py-0.5 rounded-lg hover:bg-red-400">✕</button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5">
          <input 
            type="text" 
            placeholder="Nombre de la meta (Ej. Viaje, Fondo de emergencia)" 
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
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-black/10">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[11px] font-black uppercase font-mono">Plazo / Fecha:</span>
            <input 
              type="date" 
              value={nuevaFecha}
              onChange={(e) => setNuevaFecha(e.target.value)}
              className="border-2 border-black rounded-xl px-2 py-1 text-xs font-bold bg-gray-50 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-black uppercase font-mono mr-1">Icono:</span>
            {iconosDisponibles.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setNuevoIcon(icon)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg border-2 border-black text-sm cursor-pointer transition-all ${
                  nuevoIcon === icon ? 'bg-yellow-300 scale-110 shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>

          <button 
            type="submit"
            className="w-full sm:w-auto bg-[#38BDF8] border-2 border-black rounded-xl px-5 py-2 font-black text-xs uppercase shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer hover:bg-sky-300"
          >
            + Crear Meta
          </button>
        </div>
      </form>

      {/* Lista de Metas */}
      {loading ? (
        <div className="text-center py-8 font-mono font-black text-xs uppercase animate-pulse">
          Cargando metas y ahorros...
        </div>
      ) : metasFiltradas.length === 0 ? (
        <div className="bg-white/60 border-2 border-dashed border-black rounded-2xl p-8 text-center">
          <p className="font-bold text-xs uppercase text-gray-700">No hay metas registradas en esta vista.</p>
          <p className="text-[10px] font-mono text-gray-500 mt-1">¡Crea un nuevo objetivo arriba para comenzar a acumular fondos!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {metasFiltradas.map((meta) => (
            <MetaCardItem 
              key={meta.id} 
              meta={meta} 
              activeUser={activeUser} 
              onUpdate={fetchMetas} 
            />
          ))}
        </div>
      )}

    </div>
  );
}