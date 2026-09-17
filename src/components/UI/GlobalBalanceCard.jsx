import React, { useState } from 'react';
import { formatearMoneda } from '../../utils/moneda.js';
import PDFPreviewModal from './PDFPreviewModal.jsx'; // <--- Importamos el modal con zoom

export default function GlobalBalanceCard({ totalIncome, weeklyTotal, bgImage, transactions = [] }) {
  const netBalance = totalIncome - weeklyTotal;
  const [isPreviewOpen, setIsPreviewOpen] = useState(false); // <--- Estado para el modal de zoom

  return (
    <>
      <div className="relative border-4 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden p-6 min-h-48 flex flex-col justify-between bg-white">
        <img 
          src={bgImage} 
          alt="Lucy Analytics" 
          className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none" 
        />
        
        <div className="relative z-10 space-y-1">
          {/* Cabecera con título y botón PDF con Zoom */}
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-black uppercase text-stone-600">Balance Neto Global</h2>
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              title="Ver reporte con Zoom"
              className="bg-amber-300 border-2 border-black px-2.5 py-1 rounded-xl text-[9px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-200 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all flex items-center gap-1"
            >
              <span>🔍 📥 PDF</span>
            </button>
          </div>

          <div className="text-[9px] font-bold text-stone-500 uppercase tracking-tight">
            Ingresos: {formatearMoneda(totalIncome)} | Gastos: {formatearMoneda(weeklyTotal)}
          </div>
        </div>

        <div className={`relative z-10 mt-auto border-4 border-black px-4 py-2 rounded-xl w-fit shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black text-2xl ${
          netBalance >= 0 ? 'bg-emerald-400' : 'bg-red-400'
        }`}>
          {formatearMoneda(netBalance)}
        </div>
      </div>

      {/* MODAL DE VISTA PREVIA CON ZOOM PARA EL BALANCE */}
      <PDFPreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        transactions={transactions}
      />
    </>
  );
}