import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { LucyAnalyticsIcon } from '../Icons';

// Importación de utilidades con extensión .js para Vite
import { formatearMoneda, aNumero } from '../../../utils/moneda.js';
import { aMayusculas } from '../../../utils/mayusculas.js';
import { obtenerMensajeError } from '../../../utils/errores.js';

export default function AnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('weekly');
  const [weeklyData, setWeeklyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [savingMessage, setSavingMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setErrorMessage('');
    
    try {
      const today = new Date();
      const currentWeekStart = new Date(today.setDate(today.getDate() - today.getDay()));
      currentWeekStart.setHours(0, 0, 0, 0);
      
      const previousWeekStart = new Date(currentWeekStart);
      previousWeekStart.setDate(previousWeekStart.getDate() - 7);

      // Consulta a la tabla unificada 'transactions'
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, category, transaction_date, transaction_type')
        .gte('transaction_date', previousWeekStart.toISOString());

      if (error) throw error;

      if (data) {
        // Filtrar únicamente los egresos/gastos para las métricas de gasto
        const expensesData = data.filter(item => item.transaction_type === 'expense');
        processCharts(expensesData, currentWeekStart);
      }
    } catch (err) {
      setErrorMessage(obtenerMensajeError(err));
    } finally {
      setLoading(false);
    }
  };

  const processCharts = (data, currentWeekStart) => {
    const days = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    const weeklyMap = {};
    
    days.forEach(day => {
      weeklyMap[day] = { name: day, actual: 0, pasada: 0 };
    });

    const categoriesMap = {};
    let totalActualFun = 0;
    let totalPasadaFun = 0;

    data.forEach(item => {
      const itemDate = new Date(item.transaction_date);
      const amount = aNumero(item.amount);
      const dayName = days[itemDate.getDay()];
      const categoryName = aMayusculas(item.category || 'VARIOS');

      if (itemDate >= currentWeekStart) {
        weeklyMap[dayName].actual += amount;
        categoriesMap[categoryName] = (categoriesMap[categoryName] || 0) + amount;

        if (categoryName === 'DIVERSIÓN' || categoryName === 'ENTRETENIMIENTO' || categoryName === 'OCIO') {
          totalActualFun += amount;
        }
      } else {
        weeklyMap[dayName].pasada += amount;
        if (categoryName === 'DIVERSIÓN' || categoryName === 'ENTRETENIMIENTO' || categoryName === 'OCIO') {
          totalPasadaFun += amount;
        }
      }
    });

    setWeeklyData(Object.values(weeklyMap));

    const sortedCategories = Object.keys(categoriesMap).map(cat => ({
      name: cat,
      value: categoriesMap[cat]
    })).sort((a, b) => b.value - a.value);

    setCategoryData(sortedCategories);

    if (totalActualFun < totalPasadaFun) {
      const diff = totalPasadaFun - totalActualFun;
      setSavingMessage(`¡BUEN TRABAJO! HAS GASTADO ${formatearMoneda(diff)} MENOS EN PASATIEMPOS QUE EL CICLO ANTERIOR.`);
    } else {
      setSavingMessage('EL VOLUMEN DE TRANSACCIONES SE MANTIENE ESTABLE DENTRO DE LOS PARÁMETROS REGULARES.');
    }
  };

  const maxWeeklyValue = Math.max(...weeklyData.map(d => Math.max(d.actual, d.pasada)), 1);
  const totalExpensesSum = categoryData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="min-h-screen bg-[#Fef8e7] p-4 md:p-8 font-mono text-black pb-24 select-none">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* CABECERA ESTILO CÓMIC */}
        <header className="flex items-center gap-4 border-4 border-black bg-white p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="w-14 h-14 bg-amber-400 border-2 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0">
            <LucyAnalyticsIcon />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-black">Analíticas de Gastos</h1>
            <p className="text-xs font-bold text-stone-600 uppercase tracking-tight">Reportes de balance y distribución de cuentas</p>
          </div>
        </header>

        {/* ALERTA DE ERROR */}
        {errorMessage && (
          <div className="border-4 border-black bg-rose-400 p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-xs font-black uppercase">
            ⚠️ ERROR AL CARGAR MÉTRICAS: {errorMessage}
          </div>
        )}

        {/* RECOMENDACIÓN LUCY CONTABLE */}
        {savingMessage && !errorMessage && (
          <div className="border-4 border-black bg-amber-300 p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3">
            <span className="text-xl">📊</span>
            <p className="text-xs font-black text-black uppercase tracking-tight leading-relaxed">{savingMessage}</p>
          </div>
        )}

        {/* SELECTOR DE PESTAÑAS */}
        <div className="flex gap-2 border-4 border-black bg-white p-2 rounded-2xl w-fit shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <button 
            type="button"
            onClick={() => setActiveTab('weekly')} 
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'weekly' 
                ? 'bg-amber-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Comparativa Semanal
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('categories')} 
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'categories' 
                ? 'bg-amber-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Distribución por Categorías
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        {loading ? (
          <div className="border-4 border-black bg-white h-72 rounded-3xl flex items-center justify-center font-black text-sm text-stone-500 animate-pulse shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] uppercase">
            Procesando Métricas...
          </div>
        ) : (
          <>
            {/* GRÁFICA COMPARATIVA SEMANAL */}
            {activeTab === 'weekly' && (
              <div className="border-4 border-black bg-white p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
                <h3 className="font-black text-xs uppercase tracking-wider text-stone-600">Ciclo Actual vs Ciclo Anterior</h3>
                
                <div className="h-64 flex items-end justify-between gap-3 pt-6 border-b-4 border-black px-2 bg-stone-50 rounded-2xl border-2">
                  {weeklyData.map(day => {
                    const actualHeight = (day.actual / maxWeeklyValue) * 100;
                    const pasadaHeight = (day.pasada / maxWeeklyValue) * 100;
                    const labelPasada = `ANTERIOR: ${formatearMoneda(day.pasada)}`;
                    const labelActual = `ACTUAL: ${formatearMoneda(day.actual)}`;

                    return (
                      <div key={day.name} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <div className="w-full flex justify-center items-end gap-1 h-full max-h-[85%]">
                          {/* Barra Semana Anterior */}
                          <div 
                            style={{ height: `${Math.max(4, pasadaHeight)}%` }} 
                            className="w-1/2 bg-sky-300 border-2 border-black rounded-t-lg transition-all"
                            title={labelPasada}
                          />
                          {/* Barra Semana Actual */}
                          <div 
                            style={{ height: `${Math.max(4, actualHeight)}%` }} 
                            className="w-1/2 bg-amber-400 border-2 border-black rounded-t-lg transition-all"
                            title={labelActual}
                          />
                        </div>
                        <span className="font-black text-[11px] text-black pt-2 mt-1 uppercase">{day.name}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-6 mt-4 justify-center text-xs font-black text-black uppercase">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-amber-400 border-2 border-black rounded-md" />
                    <span>Semana Actual</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-sky-300 border-2 border-black rounded-md" />
                    <span>Semana Anterior</span>
                  </div>
                </div>
              </div>
            )}

            {/* DISTRIBUCIÓN POR CATEGORÍAS */}
            {activeTab === 'categories' && (
              <div className="border-4 border-black bg-white p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6">
                <div className="flex justify-between items-center border-b-2 border-dashed border-stone-200 pb-3">
                  <h3 className="font-black text-xs uppercase tracking-wider text-stone-600">Distribución por Categorías</h3>
                  <span className="text-xs font-black bg-amber-400 border-2 border-black px-2 py-0.5 rounded-lg">
                    TOTAL: {formatearMoneda(totalExpensesSum)}
                  </span>
                </div>

                <div className="space-y-4">
                  {categoryData.map(cat => {
                    const percentage = totalExpensesSum > 0 ? (cat.value / totalExpensesSum) * 100 : 0;
                    
                    return (
                      <div key={cat.name} className="space-y-1">
                        <div className="flex justify-between text-xs font-black uppercase text-black">
                          <span>{cat.name}</span>
                          <span>{formatearMoneda(cat.value)} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full h-5 bg-stone-100 border-2 border-black rounded-xl overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          <div 
                            style={{ width: `${Math.max(3, percentage)}%` }} 
                            className="h-full bg-amber-400 border-r-2 border-black transition-all duration-500"
                          />
                        </div>
                      </div>
                    );
                  })}

                  {categoryData.length === 0 && (
                    <p className="text-center font-black text-stone-400 text-xs py-10 uppercase">
                      No hay registros de gastos guardados en la base de datos
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}