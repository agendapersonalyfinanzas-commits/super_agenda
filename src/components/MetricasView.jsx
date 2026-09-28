import React, { useState, useEffect } from 'react';

export default function MetricasView() {
  const [categoryTotals, setCategoryTotals] = useState({});
  const [grandTotal, setGrandTotal] = useState(0);

  useEffect(() => {
    try {
      const data = localStorage.getItem('user_expenses');
      if (data) {
        const expenses = JSON.parse(data);
        
        let totalSum = 0;
        const totals = {};

        expenses.forEach(item => {
          const cat = item.category || 'OTROS';
          const amt = Number(item.amount) || 0;
          
          totalSum += amt;
          totals[cat] = (totals[cat] || 0) + amt;
        });

        setGrandTotal(totalSum);
        setCategoryTotals(totals);
      }
    } catch (error) {
      console.error('Error al calcular métricas:', error);
    }
  }, []);

  return (
    <div className="p-4 font-mono max-w-xl mx-auto text-black">
      <h2 className="text-xl font-black uppercase mb-4 text-center">📊 Métricas y Estadísticas</h2>

      {/* Tarjeta de Gasto Total */}
      <div className="bg-amber-300 border-4 border-black p-5 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-6 text-center">
        <p className="text-xs font-black uppercase text-stone-800">Gasto Total Acumulado</p>
        <p className="text-3xl font-black mt-1">${grandTotal.toFixed(2)}</p>
      </div>

      {/* Desglose por Categoría */}
      <div className="bg-[#Fef8e7] border-4 border-black p-5 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
        <h3 className="text-sm font-black uppercase border-b-2 border-black pb-2">Gastos por Rubro</h3>

        {Object.keys(categoryTotals).length === 0 ? (
          <p className="text-xs font-bold text-stone-600 text-center py-4">Aún no hay suficientes datos para generar estadísticas.</p>
        ) : (
          Object.entries(categoryTotals).map(([category, total]) => {
            const percentage = grandTotal > 0 ? ((total / grandTotal) * 100).toFixed(1) : 0;
            
            return (
              <div key={category} className="space-y-1">
                <div className="flex justify-between text-xs font-black uppercase">
                  <span>{category}</span>
                  <span>${total.toFixed(2)} ({percentage}%)</span>
                </div>
                {/* Barra de progreso estilo cómic */}
                <div className="w-full bg-stone-200 border-2 border-black h-4 rounded-xl overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <div 
                    className="bg-emerald-400 h-full border-r-2 border-black transition-all duration-500" 
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}