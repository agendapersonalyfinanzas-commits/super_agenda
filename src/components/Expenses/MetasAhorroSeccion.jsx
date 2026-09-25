import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import MetaCardItem from './MetaCardItem';

export default function MetasAhorroSeccion({ activeUser, auditorMode, isMasterAuditor, usersList = [] }) {
  const [metas, setMetas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevoMonto, setNuevoMonto] = useState('');
  const [nuevaFecha, setNuevaFecha] = useState('');
  const nuevoIcon = '🎯'; // Icono predeterminado fijo al quitar el selector
  
  const [mensajeExito, setMensajeExito] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [filtroEstado, setFiltroEstado] = useState('todas');

  // 🌟 RESOLVER EL UUID REAL DEL OBJETIVO SI ESTAMOS EN MODO DIOS
  const targetUserId = React.useMemo(() => {
    if (auditorMode && isMasterAuditor) {
      if (!activeUser) return null;
      if (typeof activeUser === 'object' && activeUser !== null) {
        return activeUser.id || null;
      }
      if (typeof activeUser === 'string') {
        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(activeUser);
        if (isUUID) return activeUser;

        const nameUpper = activeUser.trim().toUpperCase();
        const found = usersList.find(u => (u.nombre || '').trim().toUpperCase().includes(nameUpper));
        if (found) return found.id;

        if (nameUpper.includes('IVONNE')) return '88ea108e-a3bb-489d-a82f-d0d5f0fdb6bf';
        if (nameUpper.includes('MARY')) return '74138fee-3bce-4ec1-b88a-6742a42a3315';
        if (nameUpper.includes('LUIS')) return '20864ee9-9e20-4e64-a634-d0b6a12dff6b';
      }
      return null;
    }
    return activeUser;
  }, [auditorMode, isMasterAuditor, activeUser, usersList]);

  useEffect(() => {
    if (targetUserId) {
      fetchMetas();
    }

    // 🌟 Sincronización automática con eventos globales
    const handleGoalUpdated = () => {
      fetchMetas();
    };

    window.addEventListener('goal-updated', handleGoalUpdated);
    return () => {
      window.removeEventListener('goal-updated', handleGoalUpdated);
    };
  }, [targetUserId]);

  const fetchMetas = async () => {
    if (!targetUserId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('player_id', targetUserId)
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
    if (!nuevoTitulo.trim() || !nuevoMonto || !targetUserId) return;

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
            player_id: targetUserId 
          }
        ]);

      if (error) throw error;

      setMensajeExito('🎉 ¡Meta creada y guardada con éxito en la base de datos!');
      setNuevoTitulo('');
      setNuevoMonto('');
      setNuevaFecha('');
      fetchMetas();

      setTimeout(() => {
        setMensajeExito('');
      }, 4000);

    } catch (error) {
      console.error('Error al crear la meta:', error.message);
      setErrorMsg(`❌ No se pudo guardar: ${error.message}`);
    }
  };

  const metasFiltradas = metas.filter((meta) => {
    const actual = parseFloat(meta.current_amount || 0);
    const objetivo = parseFloat(meta.target_amount || 1);
    const isCompleted = actual >= objetivo;

    if (filtroEstado === 'activas') return !isCompleted;
    if (filtroEstado === 'completadas') return isCompleted;
    return true;
  });

  const totalAhorradoGeneral = metas.reduce((acc, m) => acc + parseFloat(m.current_amount || 0), 0);
  const totalObjetivoGeneral = metas.reduce((acc, m) => acc + parseFloat(m.target_amount || 0), 0);
  const porcentajeGlobal = totalObjetivoGeneral > 0 ? Math.min(Math.round((totalAhorradoGeneral / totalObjetivoGeneral) * 100), 100) : 0;
  const metasLogradasCount = metas.filter(m => parseFloat(m.current_amount || 0) >= parseFloat(m.target_amount || 1)).length;

  return (
    <div className="bg-[#FEF08A] border-4 border-black rounded-3xl p-4 sm:p-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] w-full flex flex-col gap-5 select-none font-mono">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-black pb-3 gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🎯</span>
          <div>
            <h2 className="font-black text-base sm:text-lg uppercase tracking-wider text-black">Metas y Ahorros</h2>
            <p className="text-[10px] uppercase text-gray-700">Gestiona tus fondos y plazos financieros</p>
          </div>
        </div>
        
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

      {metas.length > 0 && (
        <div className="bg-white border-3 border-black rounded-2xl p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col gap-2 relative overflow-hidden">
          <div className="flex justify-between items-center text-xs font-black uppercase">
            <span className="flex items-center gap-2">
              <img 
                src="/joe-snoopy.png" 
                alt="Snoopy Clásico" 
                className="w-8 h-8 object-contain filter drop-shadow-[1px_1px_0px_rgba(0,0,0,1)]" 
              />
              {porcentajeGlobal >= 100 ? '🏆 ¡Snoopy Celebra Tus Logros Globales!' : '✨ ¡Snoopy Te Acompaña al Éxito Financiero!'}
            </span>
            <span className="bg-sky-200 border-2 border-black px-2 py-0.5 rounded-lg text-[11px]">
              {porcentajeGlobal}% Global ({metasLogradasCount}/{metas.length} Metas)
            </span>
          </div>

          <div className="relative w-full h-7 bg-gray-100 border-3 border-black rounded-xl overflow-visible my-1 shadow-inner">
            <div 
              className="h-full bg-linear-to-r from-sky-400 to-emerald-400 rounded-lg transition-all duration-500 border-r-2 border-black"
              style={{ width: `${porcentajeGlobal}%` }}
            />
          </div>

          <p className="text-[10px] text-gray-600 font-bold text-center uppercase tracking-wide">
            {porcentajeGlobal >= 100 
              ? '✨ ¡Increíble trabajo! Todas tus metas han alcanzado la meta.' 
              : `Sigue sumando aportaciones para completar tus objetivos de ahorro.`
            }
          </p>
        </div>
      )}

      <form onSubmit={handleCreateMeta} className="bg-white border-[3px] border-black rounded-2xl p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col gap-3">
        {mensajeExito && (
          <div className="bg-green-300 border-2 border-black rounded-xl p-2.5 text-xs font-black uppercase tracking-wide text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center justify-between">
            <span>{mensajeExito}</span>
            <button type="button" onClick={() => setMensajeExito('')} className="cursor-pointer font-bold px-1.5 py-0.5 rounded-lg hover:bg-green-400">✕</button>
          </div>
        )}

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
            <span className="text-[11px] font-black uppercase">Plazo / Fecha:</span>
            <input 
              type="date" 
              value={nuevaFecha}
              onChange={(e) => setNuevaFecha(e.target.value)}
              className="border-2 border-black rounded-xl px-2 py-1 text-xs font-bold bg-gray-50 focus:outline-none"
            />
          </div>

          <button 
            type="submit"
            className="w-full sm:w-auto bg-[#38BDF8] border-2 border-black rounded-xl px-5 py-2 font-black text-xs uppercase shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer hover:bg-sky-300"
          >
            + Crear Meta
          </button>
        </div>
      </form>

      {loading ? (
        <div className="text-center py-8 font-black text-xs uppercase animate-pulse">
          Cargando metas y ahorros...
        </div>
      ) : metasFiltradas.length === 0 ? (
        <div className="bg-white/60 border-2 border-dashed border-black rounded-2xl p-8 text-center">
          <p className="font-bold text-xs uppercase text-gray-700">No hay metas registradas en esta vista.</p>
          <p className="text-[10px] text-gray-500 mt-1">¡Crea un nuevo objetivo arriba para comenzar a acumular fondos!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {metasFiltradas.map((meta) => (
            <MetaCardItem 
              key={meta.id} 
              meta={meta} 
              activeUser={targetUserId} 
              onUpdate={fetchMetas} 
              auditorMode={auditorMode}
              isMasterAuditor={isMasterAuditor}
              usersList={usersList}
            />
          ))}
        </div>
      )}

    </div>
  );
}