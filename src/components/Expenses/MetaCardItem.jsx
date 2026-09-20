import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function MetaCardItem({ meta, activeUser, onUpdate }) {
  const [montoAbono, setMontoAbono] = useState('');
  const [loadingAbono, setLoadingAbono] = useState(false);

  const actual = parseFloat(meta.current_amount || 0);
  const objetivo = parseFloat(meta.target_amount || 1);
  const porcentaje = Math.min(Math.round((actual / objetivo) * 100), 100);
  const isCompleted = porcentaje >= 100;
  const tituloMeta = meta.goal_name || 'Meta sin nombre';
  const fechaLimite = meta.fecha_limite;

  const handleAbonar = async () => {
    const abono = parseFloat(montoAbono);
    if (!abono || isNaN(abono) || abono <= 0) return;

    setLoadingAbono(true);
    const nuevoTotal = actual + abono;

    try {
      // 1. Actualizar current_amount en la tabla savings_goals
      const { error: errorMeta } = await supabase
        .from('savings_goals')
        .update({ current_amount: nuevoTotal })
        .eq('id', meta.id);

      if (errorMeta) throw errorMeta;

      // 2. Obtener el correo del usuario autenticado para cumplir con RLS
      const { data: authData } = await supabase.auth.getUser();
      const userEmail = authData?.user?.email || null;

      // 3. Registrar el abono en transactions
      const { error: errorTrans } = await supabase
        .from('transactions')
        .insert([
          {
            concept: `Abono a meta: ${tituloMeta}`,
            amount: abono,
            transaction_type: 'expense',
            category: 'AHORRO',
            auth_user_email: userEmail
          }
        ]);

      if (errorTrans) {
        console.error('Error al registrar la transacción de abono:', errorTrans.message);
      } else {
        // 4. 🔥 Disparar evento global para que la lista de transacciones y el balance se actualicen al instante
        window.dispatchEvent(new CustomEvent('transaction-updated'));
      }

      // Limpiar input local y actualizar vista de metas
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
    <div className={`border-[3px] border-black rounded-2xl p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all ${
      isCompleted ? 'bg-green-100' : 'bg-white'
    }`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl bg-white border-2 border-black p-1 rounded-xl shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            {meta.icon || '🎯'}
          </span>
          <div>
            <h3 className="font-black text-xs sm:text-sm uppercase tracking-wide">{tituloMeta}</h3>
            {fechaLimite && (
              <p className="text-[10px] font-mono text-gray-600">
                📅 Plazo límite: {new Date(fechaLimite).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <span className="font-mono font-black text-xs sm:text-sm bg-gray-100 border-2 border-black px-2.5 py-1 rounded-xl shadow-[2px_2px_0px_rgba(0,0,0,1)]">
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

      {/* Barra de Progreso */}
      <div className="w-full bg-gray-200 border-2 border-black rounded-full h-4 overflow-hidden my-3 relative shadow-inner">
        <div 
          className={`h-full border-r-2 border-black transition-all duration-500 ${
            isCompleted ? 'bg-green-400' : 'bg-[#FBBF24]'
          }`}
          style={{ width: `${porcentaje}%` }}
        ></div>
      </div>

      {/* Pie de tarjeta con abonos */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 border-t border-black/10">
        <span className="font-mono font-black text-[11px] uppercase flex items-center gap-1.5">
          {isCompleted ? '🎉 ¡Meta cumplida con éxito!' : `Progreso: ${porcentaje}% completado`}
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