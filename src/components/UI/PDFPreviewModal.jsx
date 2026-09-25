import React, { useState } from 'react';
import { formatearMoneda, aNumero } from '../../utils/moneda.js';
import { exportTransactionsToPDF } from '../../utils/pdfExportPlugin.js';

export default function PDFPreviewModal({ isOpen, onClose, transactions = [] }) {
  const [scale, setScale] = useState(1); // Control de zoom interno (lupa)

  if (!isOpen) return null;

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.2, 2));   // Lupa + (máximo 200%)
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.7)); // Lupa - (mínimo 70%)
  const handleResetZoom = () => setScale(1);                               // Restablecer 100%

  // 1. ORDENAR: Primero todos los Ingresos, luego los Egresos
  const sortedTransactions = [...transactions].sort((a, b) => {
    if (a.transaction_type === 'income' && b.transaction_type !== 'income') return -1;
    if (a.transaction_type !== 'income' && b.transaction_type === 'income') return 1;
    return 0;
  });

  // 2. Calcular totales para las tarjetas al final
  const totalIncome = transactions
    .filter(t => t.transaction_type === 'income')
    .reduce((acc, curr) => acc + aNumero(curr.amount), 0);

  const totalExpense = transactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((acc, curr) => acc + aNumero(curr.amount), 0);

  const netBalance = totalIncome - totalExpense;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 font-mono select-none">
      <div className="bg-white border-4 border-black rounded-3xl w-full max-w-2xl max-h-[94vh] flex flex-col shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        
        {/* BARRA DE HERRAMIENTAS / LUPA Y ZOOM */}
        <div className="bg-amber-300 border-b-4 border-black p-3.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-black">🔍 Vista Previa Zoom</span>
            <span className="text-[10px] bg-black text-amber-300 px-2 py-0.5 rounded-full font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              {Math.round(scale * 100)}%
            </span>
          </div>

          {/* Botones de Lupa / Zoom Interactivo */}
          <div className="flex items-center gap-1 bg-white p-1 border-2 border-black rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <button
              type="button"
              onClick={handleZoomOut}
              className="w-7 h-7 bg-stone-100 border border-black rounded-xl font-black text-xs hover:bg-stone-200 cursor-pointer flex items-center justify-center active:scale-95"
              title="Alejar Zoom (-)"
            >
              ➖
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-2 h-7 bg-stone-100 border border-black rounded-xl font-black text-[10px] hover:bg-stone-200 cursor-pointer uppercase"
              title="Restablecer"
            >
              100%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className="w-7 h-7 bg-stone-100 border border-black rounded-xl font-black text-xs hover:bg-stone-200 cursor-pointer flex items-center justify-center active:scale-95"
              title="Acercar Zoom (+)"
            >
              ➕
            </button>
          </div>

          {/* Botón Cerrar */}
          <button
            type="button"
            onClick={onClose}
            className="bg-red-500 text-white border-2 border-black w-8 h-8 rounded-xl font-black flex items-center justify-center text-xs cursor-pointer shadow hover:bg-red-600 active:translate-x-0.5 active:translate-y-0.5"
          >
            ✕
          </button>
        </div>

        {/* CONTENEDOR CON ZOOM APLICADO A LA HOJA */}
        <div className="flex-1 overflow-auto p-4 bg-stone-100 flex justify-center">
          <div 
            className="bg-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform duration-200 origin-top w-full max-w-xl space-y-4"
            style={{ transform: `scale(${scale})` }}
          >
            {/* Cabecera */}
            <div className="border-b-4 border-black pb-2.5 flex justify-between items-end">
              <div>
                <h2 className="text-xs font-black uppercase">📄 Reporte Ejecutivo</h2>
                <p className="text-[9px] font-bold text-stone-600 uppercase">Super Agenda & Finanzas</p>
              </div>
              <span className="text-[8px] font-bold text-stone-500 uppercase">{new Date().toLocaleString()}</span>
            </div>

            {/* Tabla con Semáforos Limpios */}
            <div className="border-2 border-black rounded-xl overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="bg-amber-300 border-b-2 border-black font-black uppercase">
                    <th className="p-2 border-r-2 border-black">Concepto</th>
                    <th className="p-2 border-r-2 border-black">Tipo</th>
                    <th className="p-2 border-r-2 border-black">Usuario</th>
                    <th className="p-2 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTransactions.map((tx, idx) => {
                    const isIncome = tx.transaction_type === 'income';
                    return (
                      <tr 
                        key={tx.id || idx} 
                        className={`border-b-2 border-black/20 bg-white`}
                      >
                        <td className="p-2 border-r-2 border-black font-black uppercase text-black">{tx.concept || tx.category || 'GENERAL'}</td>
                        <td className="p-2 border-r-2 border-black font-bold uppercase flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full border border-black shrink-0 ${isIncome ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span className={isIncome ? 'text-emerald-700' : 'text-rose-700'}>{isIncome ? 'Ingreso' : 'Egreso'}</span>
                        </td>
                        <td className="p-2 border-r-2 border-black font-bold uppercase text-stone-700">{tx.user_name || 'LUIS'}</td>
                        <td className={`p-2 text-right font-black ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {isIncome ? '+' : '-'}{formatearMoneda(tx.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Resumen Total y Balance */}
            <div className="space-y-2 pt-1">
              <h3 className="text-[11px] font-black uppercase">📊 Suma Total y Balance Final</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="border-2 border-black bg-stone-50 p-2.5 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <span className="text-[8px] font-bold text-stone-600 block uppercase truncate">Ingresos</span>
                  <span className="text-[11px] font-black text-emerald-700 block mt-0.5 truncate">+{formatearMoneda(totalIncome)}</span>
                </div>
                <div className="border-2 border-black bg-stone-50 p-2.5 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <span className="text-[8px] font-bold text-stone-600 block uppercase truncate">Egresos</span>
                  <span className="text-[11px] font-black text-rose-700 block mt-0.5 truncate">-{formatearMoneda(totalExpense)}</span>
                </div>
                <div className={`border-2 border-black p-2.5 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${netBalance >= 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                  <span className="text-[8px] font-bold text-stone-600 block uppercase truncate">Neto</span>
                  <span className={`text-[11px] font-black block mt-0.5 truncate ${netBalance >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                    {formatearMoneda(netBalance)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t-2 border-dashed border-black text-center text-[8px] font-bold text-stone-500 uppercase">
              Super Agenda & Finanzas • Documento Oficial
            </div>
          </div>
        </div>

        {/* PIE DE MODAL */}
        <div className="bg-white border-t-4 border-black p-3.5 flex justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 border-2 border-black rounded-xl font-black text-xs uppercase cursor-pointer shadow hover:bg-stone-300"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => exportTransactionsToPDF(transactions)}
            className="px-4 py-2 bg-emerald-400 border-2 border-black rounded-xl font-black text-xs uppercase cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-300 flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5"
          >
            <span>📥 Imprimir PDF Real</span>
          </button>
        </div>

      </div>
    </div>
  );
}