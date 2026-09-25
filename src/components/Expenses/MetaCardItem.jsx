import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function MetaCardItem({ meta, activeUser, onUpdate, auditorMode, isMasterAuditor, usersList = [] }) {
  const [montoAbono, setMontoAbono] = useState('');
  const [loadingAbono, setLoadingAbono] = useState(false);

  const actual = parseFloat(meta.current_amount || 0);
  const objetivo = parseFloat(meta.target_amount || 1);
  const porcentaje = Math.min(Math.round((actual / objetivo) * 100), 100);
  const isCompleted = porcentaje >= 100;
  const tituloMeta = meta.goal_name || 'Meta sin nombre';
  const fechaLimite = meta.fecha_limite;

  // 🌟 RESOLVER EL UUID O CORREO DEL USUARIO OBJETIVO SI ESTAMOS EN MODO DIOS
  const targetUserIdOrEmail = React.useMemo(() => {
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
    return null; // En modo normal se usa la sesión del usuario autenticado por defecto
  }, [auditorMode, isMasterAuditor, activeUser, usersList]);

  const getMensajeWoodstock = (p) => {
    if (p >= 100) return "¡Lo lograste, felicidades! 🏆🎉";
    if (p >= 85) return "¡Ya casi es tuyo! 🔥";
    if (p >= 75) return "¡Ya falta menos! 🚀";
    if (p >= 65) return "¡No pares! 💪";
    if (p >= 45) return "¡Ánimo! 🌟";
    if (p >= 25) return "¡Vamos bien! 🐥";
    return "¡Comenzamos! 🎯";
  };

  const handleAbonar = async () => {
    const abono = parseFloat(montoAbono);
    if (!abono || isNaN(abono) || abono <= 0) return;

    setLoadingAbono(true);
    const nuevoTotal = actual + abono;

    try {
      // 1. Actualizar current_amount en la base de datos
      const { error: errorMeta } = await supabase
        .from('savings_goals')
        .update({ current_amount: nuevoTotal })
        .eq('id', meta.id);

      if (errorMeta) throw errorMeta;

      // 2. Obtener el correo o asignar el usuario auditado correspondiente
      const { data: authData } = await supabase.auth.getUser();
      let userEmail = authData?.user?.email || null;
      let targetUuidToSave = meta.user_id || authData?.user?.id;

      if (auditorMode && isMasterAuditor && targetUserIdOrEmail) {
        targetUuidToSave = targetUserIdOrEmail;
        // Si el usuario auditado tiene un correo asociado en usersList, lo asignamos
        const foundProfile = usersList.find(u => u.id === targetUserIdOrEmail);
        if (foundProfile && foundProfile.email) {
          userEmail = foundProfile.email;
        }
      }

      // 3. Registrar transacción vinculada al perfil correcto
      const { error: errorTrans } = await supabase
        .from('transactions')
        .insert([
          {
            concept: `Abono a meta: ${tituloMeta}`,
            amount: abono,
            transaction_type: 'expense',
            category: 'AHORRO',
            auth_user_email: userEmail,
            user_id: targetUuidToSave,
            player_id: targetUuidToSave
          }
        ]);

      if (errorTrans) {
        console.error('Error al registrar transacción:', errorTrans.message);
      } else {
        window.dispatchEvent(new CustomEvent('transaction-updated'));
      }

      setMontoAbono('');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error al abonar a la meta:', error.message);
      alert(`No se pudo completar el abono: ${error.message}`);
    } finally {
      setLoadingAbono(false);
    }
  };

  const handleDeleteMeta = async () => {
    if (!window.confirm('¿Estás seguro de eliminar esta meta u objetivo de ahorro?')) return;

    try {
      const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', meta.id);

      if (error) throw error;
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error al eliminar la meta:', error.message);
    }
  };

  return (
    <div className={`border-[3px] border-black rounded-2xl p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all font-mono relative overflow-hidden ${
      isCompleted ? 'bg-green-100 animate-pulse' : 'bg-white'
    }`}>
      {/* 🌟 Efecto visual de luces de sirena intermitentes en las esquinas si está completada */}
      {isCompleted && (
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-red-500 via-yellow-400 to-blue-500 animate-pulse z-30" />
      )}

      {/* Insignia permanente de meta alcanzada */}
      {isCompleted && (
        <div className="absolute -top-4 right-4 bg-yellow-300 border-2 border-black rounded-xl px-3 py-0.5 text-[10px] font-black uppercase shadow-[2px_2px_0px_rgba(0,0,0,1)] z-20">
          🎉 ¡Completada! 🎉
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl bg-white border-2 border-black p-1 rounded-xl shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            {meta.icon || '🎯'}
          </span>
          <div>
            <h3 className="font-black text-xs sm:text-sm uppercase tracking-wide">{tituloMeta}</h3>
            {fechaLimite && (
              <p className="text-[10px] text-gray-600">
                📅 Plazo límite: {new Date(fechaLimite).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <span className="font-black text-xs sm:text-sm bg-gray-100 border-2 border-black px-2.5 py-1 rounded-xl shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            ${actual.toLocaleString()} /${objetivo.toLocaleString()}
          </span>
          <button 
            type="button"
            onClick={handleDeleteMeta}
            className="text-red-600 hover:text-red-800 font-bold text-xs px-2 py-1 border-2 border-black rounded-xl bg-white hover:bg-red-50 shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer transition-all"
            title="Eliminar meta"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Barra de Progreso con Woodstock fijo al 100% del extremo si está completada */}
      <div className="relative w-full h-8 bg-gray-100 border-3 border-black rounded-xl overflow-visible my-8 shadow-inner">
        <div 
          className={`h-full border-r-2 border-black transition-all duration-500 rounded-lg ${
            isCompleted ? 'bg-green-400' : 'bg-[#FBBF24]'
          }`}
          style={{ width: `${porcentaje}%` }}
        />

        <div 
          className="absolute -top-6 transition-all duration-500 transform -translate-x-1/2 flex flex-col items-center pointer-events-none"
          style={{ left: isCompleted ? '97%' : `${Math.max(5, Math.min(porcentaje, 97))}%` }}
        >
          <div className="bg-white border-2 border-black rounded-xl px-2 py-0.5 text-[9px] font-black uppercase whitespace-nowrap shadow-[2px_2px_0px_rgba(0,0,0,1)] mb-1 relative">
            {getMensajeWoodstock(porcentaje)}
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-white border-r-2 border-b-2 border-black rotate-45" />
          </div>

          <img 
            src="/juego-woodstock.png" 
            alt="Woodstock volando" 
            className="w-9 h-9 object-contain filter drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]" 
          />
        </div>
      </div>

      {/* Pie de tarjeta simplificado (sin texto estático de éxito) */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 border-t border-black/10">
        <span className="font-black text-[11px] uppercase text-gray-500">
          {!isCompleted && `Progreso: ${porcentaje}% completado`}
        </span>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!isCompleted && (
            <>
              <input 
                type="number"
                placeholder="+ Monto"
                value={montoAbono}
                onChange={(e) => setMontoAbono(e.target.value)}
                className="w-full sm:w-28 border-2 border-black rounded-xl px-2.5 py-1.5 text-xs font-bold bg-gray-50 focus:outline-none"
              />
              <button 
                type="button"
                onClick={handleAbonar}
                disabled={loadingAbono}
                className="bg-green-300 border-2 border-black rounded-xl px-3.5 py-1.5 font-black text-xs uppercase shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer whitespace-nowrap hover:bg-green-400 transition-all disabled:opacity-50"
              >
                {loadingAbono ? 'Abonando...' : 'Abonar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}