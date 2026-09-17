import React, { useState } from 'react';
import QuickActionGrid from './QuickActionGrid';
import RecentTransactions from './RecentTransactions';
import { formatearMoneda } from '../../utils/moneda.js';

export default function QuickActionSection({
  expenseActions = [],
  incomeActions = [],
  recentTransactions = [],
  onSaveTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  isEditMode,
  onEditImage,
  onDeleteButton,
  onAddCustomButton
}) {
  const [lastSavedTx, setLastSavedTx] = useState(null);

  // Manejar el guardado con soporte para el Toast de "Deshacer"
  const handleSave = async (txData) => {
    try {
      const saved = await onSaveTransaction(txData);
      if (saved) {
        setLastSavedTx(saved);
        setTimeout(() => {
          setLastSavedTx(null);
        }, 5000); // 5 segundos para deshacer al instante
      }
    } catch (err) {
      console.error("Error al registrar en QuickActionSection:", err);
    }
  };

  const handleUndo = async () => {
    if (!lastSavedTx || !onDeleteTransaction) return;
    await onDeleteTransaction(lastSavedTx.id);
    setLastSavedTx(null);
  };

  return (
    <div className="space-y-6 relative">
      {/* Cuadrícula de Egresos / Gastos Rápidos */}
      <QuickActionGrid
        title="Registrar Egresos"
        subtitle="Toca un botón para registrar o ajustar monto"
        actions={expenseActions}
        onSave={handleSave}
        isEditMode={isEditMode}
        onEditImage={onEditImage}
        onDelete={onDeleteButton}
        onAddCustom={onAddCustomButton}
        bgColor="bg-rose-500/15"
        titleColor="text-rose-950"
        subtitleColor="text-rose-800"
        isExpense={true}
      />

      {/* Historial Rápido para corregir o borrar directamente en Supabase */}
      <RecentTransactions 
        transactions={recentTransactions}
        onDelete={onDeleteTransaction}
        onUpdate={onUpdateTransaction}
      />

      {/* Toast Flotante de Deshacer (Inmediato) */}
      {lastSavedTx && (
        <div className="fixed bottom-6 right-6 z-50 bg-black text-white border-4 border-amber-400 p-4 rounded-3xl shadow-[8px_8px_0px_0px_rgba(251,191,36,1)] flex items-center gap-4 animate-in slide-in-from-bottom-5 font-mono">
          <div>
            <p className="text-xs font-black uppercase text-amber-300">✨ Gasto Registrado</p>
            <p className="text-[11px] text-stone-300">{lastSavedTx.concept}: {formatearMoneda(lastSavedTx.amount)}</p>
          </div>
          <button
            type="button"
            onClick={handleUndo}
            className="bg-amber-400 text-black border-2 border-black px-3 py-2 rounded-2xl font-black text-xs uppercase cursor-pointer hover:bg-amber-300 shadow active:translate-x-0.5 active:translate-y-0.5"
          >
            Deshacer / Borrar
          </button>
        </div>
      )}
    </div>
  );
}