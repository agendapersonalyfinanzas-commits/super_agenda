import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../supabaseClient';

// Importación de utilidades con extensión .js para Vite
import { formatearMoneda, aNumero } from '../../../utils/moneda.js';
import { aMayusculas } from '../../../utils/mayusculas.js';
import { obtenerMensajeError } from '../../../utils/errores.js';
import { obtenerDeStorage, guardarEnStorage } from '../../../utils/storage.js';

// 🛠️ FUNCIÓN SEGURA PARA PARSEAR FECHAS LOCALES (EVITA DESFASE UTC EN REGISTROS RETROACTIVOS)
const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  const clean = String(dateStr).split('T')[0];
  const [y, m, d] = clean.split('-');
  if (!y || !m || !d) return new Date(dateStr);
  return new Date(Number(y), Number(m) - 1, Number(d));
};

export default function AnalyticsScreen({ activeUser, auditorMode, isMasterAuditor, usersList = [] }) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('weekly'); // 'weekly' | 'categories'
  const [transactions, setTransactions] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isChartExpanded, setIsChartExpanded] = useState(false);
  
  const [internalUsersList, setInternalUsersList] = useState(usersList);

  // Estados para el modal de Vista Previa PDF con Zoom
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(1); // 1 = 100%

  // 🌟 ESTADO PARA EL NOMBRE REAL DESDE LA BASE DE DATOS (FUENTE DE VERDAD)
  const [auditedUserNameDb, setAuditedUserNameDb] = useState('');

  // 🛡️ Sincronización robusta con Storage y Props para Modo Dios (persistencia al cambiar de pestaña)
  const effectiveAuditorMode = auditorMode !== undefined ? auditorMode : obtenerDeStorage('family_auditor_mode', false);
  const effectiveIsMasterAuditor = isMasterAuditor !== undefined ? isMasterAuditor : true;
  const effectiveActiveUser = (activeUser !== undefined && activeUser !== null) ? activeUser : obtenerDeStorage('family_audited_user', null);

  // Sincronizar al storage cada vez que cambien para que no se pierdan al navegar
  useEffect(() => {
    if (auditorMode !== undefined) {
      guardarEnStorage('family_auditor_mode', auditorMode);
    }
    if (activeUser !== undefined && activeUser !== null) {
      guardarEnStorage('family_audited_user', activeUser);
    }
  }, [auditorMode, activeUser]);

  useEffect(() => {
    if (!usersList || usersList.length === 0) {
      supabase.from('users').select('*').then(({ data }) => {
        if (data) setInternalUsersList(data);
      });
    } else {
      setInternalUsersList(usersList);
    }
  }, [usersList]);

  // 🌟 RESOLVER EL UUID O IDENTIFICADOR DEL USUARIO AUDITADO DESDE LA BASE DE DATOS
  const targetUserId = useMemo(() => {
    if (effectiveAuditorMode && effectiveIsMasterAuditor) {
      if (!effectiveActiveUser) return null;
      if (typeof effectiveActiveUser === 'object' && effectiveActiveUser !== null) {
        return effectiveActiveUser.id || effectiveActiveUser.user_id || null;
      }
      if (typeof effectiveActiveUser === 'string') {
        const str = effectiveActiveUser.trim().toUpperCase();
        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(effectiveActiveUser);
        if (isUUID) return effectiveActiveUser;

        const found = internalUsersList.find(u => (u.nombre || '').trim().toUpperCase().includes(str) || u.id === effectiveActiveUser);
        if (found) return found.id;

        return effectiveActiveUser;
      }
    }
    return null;
  }, [effectiveAuditorMode, effectiveIsMasterAuditor, effectiveActiveUser, internalUsersList]);

  // 🌟 CONSULTA DIRECTA A SUPABASE (FUENTE DE VERDAD) PARA EXTRAER EL NOMBRE REAL DEL AUDITADO
  useEffect(() => {
    const fetchAuditedUserProfile = async () => {
      if (effectiveAuditorMode && targetUserId) {
        const found = internalUsersList.find(u => u.id === targetUserId || u.nombre === targetUserId);
        if (found) {
          const fullName = `${found.nombre || ''} ${found.apellido_paterno || ''}`.trim();
          setAuditedUserNameDb(fullName || found.email || 'USUARIO');
          return;
        }

        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(targetUserId);
        if (isUUID) {
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('nombre, apellido_paterno')
              .eq('id', targetUserId)
              .maybeSingle();

            if (profileData && (profileData.nombre || profileData.apellido_paterno)) {
              setAuditedUserNameDb(`${profileData.nombre || ''} ${profileData.apellido_paterno || ''}`.trim());
              return;
            }

            const { data: userData } = await supabase
              .from('users')
              .select('nombre, apellido_paterno, email')
              .eq('id', targetUserId)
              .maybeSingle();

            if (userData) {
              const fullName = `${userData.nombre || ''} ${userData.apellido_paterno || ''}`.trim();
              setAuditedUserNameDb(fullName || userData.email || targetUserId);
            } else {
              setAuditedUserNameDb(targetUserId);
            }
          } catch (err) {
            console.error("Error al consultar nombre real en BD:", err);
            setAuditedUserNameDb(targetUserId);
          }
        } else {
          setAuditedUserNameDb(targetUserId);
        }
      } else {
        setAuditedUserNameDb('');
      }
    };

    fetchAuditedUserProfile();
  }, [effectiveAuditorMode, targetUserId, internalUsersList]);

  // 🌟 NOMBRE LEGIBLE FINAL DESDE LA FUENTE DE VERDAD
  const auditedDisplayName = useMemo(() => {
    if (effectiveAuditorMode) {
      if (auditedUserNameDb) return auditedUserNameDb;
      if (typeof effectiveActiveUser === 'object' && effectiveActiveUser !== null) {
        return `${effectiveActiveUser.nombre || ''} ${effectiveActiveUser.apellido_paterno || ''}`.trim() || effectiveActiveUser.email || 'USUARIO';
      }
      return 'CARGANDO DESDE BD...';
    }
    return 'GENERAL';
  }, [effectiveAuditorMode, effectiveActiveUser, auditedUserNameDb]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [targetUserId, effectiveAuditorMode]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setErrorMessage('');
    
    try {
      const today = new Date();
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - today.getDay());
      currentWeekStart.setHours(0, 0, 0, 0);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('transactions')
        .select('amount, category, transaction_date, transaction_type, concept, user_id, player_id, auth_user_email')
        .gte('transaction_date', thirtyDaysAgo.toISOString());

      if (error) throw error;

      if (data) {
        let filteredData = data;
        
        if (effectiveAuditorMode && effectiveIsMasterAuditor) {
          if (!targetUserId) {
            setTransactions([]);
            setWeeklyData([]);
            setCategoryData([]);
            setLoading(false);
            return;
          }
          const auditedUserObj = internalUsersList.find(u => u.id === targetUserId);
          const auditedEmail = auditedUserObj?.email || '';
          
          filteredData = data.filter(t => 
            t.user_id === targetUserId || 
            t.player_id === targetUserId || 
            (auditedEmail && t.auth_user_email?.toLowerCase() === auditedEmail.toLowerCase())
          );
        } else {
          const { data: { session } } = await supabase.auth.getSession();
          const sessionEmail = session?.user?.email;
          const sessionUserId = session?.user?.id;
          
          if (sessionEmail || sessionUserId) {
            filteredData = data.filter(t =>
              (sessionEmail && t.auth_user_email?.toLowerCase() === sessionEmail.toLowerCase()) ||
              (sessionUserId && (t.user_id === sessionUserId || t.player_id === sessionUserId))
            );
          }
        }

        setTransactions(filteredData);
        processWeeklyAndCategories(filteredData, currentWeekStart);
      }
    } catch (err) {
      setErrorMessage(obtenerMensajeError(err));
    } finally {
      setLoading(false);
    }
  };

  const processWeeklyAndCategories = (data, currentWeekStart) => {
    const days = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    const weeklyMap = {};
    
    days.forEach(day => {
      weeklyMap[day] = { name: day, income: 0, expense: 0 };
    });

    const categoriesMap = {};

    data.forEach(item => {
      // 🛠️ USO DE PARSE LOCAL SEGURO PARA EVITAR DESFASE EN FECHAS RETROACTIVAS
      const itemDate = parseLocalDate(item.transaction_date);
      const amount = aNumero(item.amount);
      const isSavings = item.category === 'AHORRO' || item.concept?.includes('Abono a meta');
      const categoryName = aMayusculas(item.category || 'VARIOS');

      if (itemDate >= currentWeekStart && !isSavings) {
        const dayName = days[itemDate.getDay()];
        if (weeklyMap[dayName]) {
          if (item.transaction_type === 'income') {
            weeklyMap[dayName].income += amount;
          } else if (item.transaction_type === 'expense') {
            weeklyMap[dayName].expense += amount;
          }
        }
      }

      if (item.transaction_type === 'expense' && !isSavings) {
        categoriesMap[categoryName] = (categoriesMap[categoryName] || 0) + amount;
      }
    });

    setWeeklyData(Object.values(weeklyMap));

    const sortedCategories = Object.keys(categoriesMap).map(cat => ({
      name: cat,
      value: categoriesMap[cat]
    })).sort((a, b) => b.value - a.value);

    setCategoryData(sortedCategories);
  };

  const getWeekOrientationInfo = () => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const options = { day: 'numeric', month: 'short' };
    const startStr = start.toLocaleDateString('es-ES', options);
    const endStr = end.toLocaleDateString('es-ES', options);
    const monthYear = today.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();

    return {
      monthYear,
      range: `Semana del ${startStr} al ${endStr}`
    };
  };

  const weekInfo = getWeekOrientationInfo();

  const validTransactions = transactions.filter(
    t => !(t.category === 'AHORRO' || t.concept?.includes('Abono a meta'))
  );

  const totalIncome = validTransactions
    .filter(t => t.transaction_type === 'income')
    .reduce((acc, t) => acc + aNumero(t.amount), 0);

  const totalExpenses = validTransactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((acc, t) => acc + aNumero(t.amount), 0);

  const netBalance = totalIncome - totalExpenses;

  const weeklyIncomeSum = weeklyData.reduce((acc, d) => acc + d.income, 0);
  const weeklyExpenseSum = weeklyData.reduce((acc, d) => acc + d.expense, 0);
  const weeklyNetBalance = weeklyIncomeSum - weeklyExpenseSum;

  const maxWeeklyValue = weeklyData.length > 0 
    ? Math.max(...weeklyData.map(d => Math.max(d.income, d.expense)), 1) 
    : 1;

  const totalExpensesSum = categoryData.reduce((acc, curr) => acc + curr.value, 0);

  const handlePrintOrPDF = () => {
    window.print();
  };

  const handlePdfZoomIn = () => setPdfZoom(prev => Math.min(prev + 0.15, 1.6));
  const handlePdfZoomOut = () => setPdfZoom(prev => Math.max(prev - 0.15, 0.5));
  const handlePdfResetZoom = () => setPdfZoom(1);

  return (
    <div className="min-h-screen bg-[#Fef8e7] p-3 sm:p-6 md:p-8 font-mono text-black pb-24 select-none">
      
      {/* ESTILOS CSS OPTIMIZADOS PARA IMPRESIÓN */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body, html {
            background-color: #Fef8e7 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            height: 100% !important;
            overflow: hidden !important;
          }
          nav, footer, .fixed, button, [class*="fixed"] {
            display: none !important;
          }
          .max-w-4xl {
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            transform: scale(0.66) !important;
            transform-origin: top center;
          }
        }
      `}} />

      <div className="max-w-4xl mx-auto space-y-6">
        
        {effectiveAuditorMode && (
          <div className="w-full bg-red-500 text-white text-center font-black text-xs py-2 border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wide">
            🔍 Modo Dios (Métricas y Gráficas) Activo - Auditando a: {auditedDisplayName}
          </div>
        )}

        {/* CABECERA ESTILO CÓMIC CON BOTÓN PDF */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-4 border-black bg-white p-4 sm:p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] print:shadow-none print:border-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-amber-400 border-2 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-xl sm:text-2xl shrink-0">
              📊
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-black">Métricas Financieras</h1>
              <p className="text-[11px] sm:text-xs font-bold text-stone-600 uppercase tracking-tight">Balance general, ingresos vs egresos y distribución</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="print:hidden bg-amber-400 border-3 border-black px-4 py-2.5 rounded-2xl text-xs font-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-300 transition-all cursor-pointer flex items-center gap-2 active:translate-x-0.5 active:translate-y-0.5"
          >
            <span>🔍 📥 PDF</span>
          </button>
        </header>

        {/* ALERTA DE ERROR */}
        {errorMessage && (
          <div className="border-4 border-black bg-rose-400 p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-xs font-black uppercase">
            ⚠️ ERROR AL CARGAR MÉTRICAS: {errorMessage}
          </div>
        )}

        {/* 1. RESUMEN EJECUTIVO GENERAL */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border-4 border-black bg-emerald-100 p-4 sm:p-5 rounded-3xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-1">
            <p className="text-[10px] font-black uppercase text-emerald-800">🟢 Ingresos Totales</p>
            <p className="text-lg sm:text-xl font-black text-emerald-950">{formatearMoneda(totalIncome)}</p>
          </div>
          <div className="border-4 border-black bg-rose-100 p-4 sm:p-5 rounded-3xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-1">
            <p className="text-[10px] font-black uppercase text-rose-800">🔴 Egresos Totales</p>
            <p className="text-lg sm:text-xl font-black text-rose-950">{formatearMoneda(totalExpenses)}</p>
          </div>
          <div className={`border-4 border-black p-4 sm:p-5 rounded-3xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-1 ${netBalance >= 0 ? 'bg-amber-200' : 'bg-orange-200'}`}>
            <p className="text-[10px] font-black uppercase text-stone-800">⚖️ Flujo Neto (Disponible)</p>
            <p className={`text-lg sm:text-xl font-black ${netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatearMoneda(netBalance)}
            </p>
          </div>
        </div>

        {/* SELECTOR DE PESTAÑAS */}
        <div className="print:hidden flex flex-wrap gap-2 border-4 border-black bg-white p-2 rounded-2xl w-full sm:w-fit shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <button 
            type="button"
            onClick={() => setActiveTab('weekly')} 
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'weekly' 
                ? 'bg-amber-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            📈 Ingresos vs Egresos
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('categories')} 
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'categories' 
                ? 'bg-amber-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            🏷️ Por Categoría
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        {loading ? (
          <div className="border-4 border-black bg-white h-72 rounded-3xl flex items-center justify-center font-black text-sm text-stone-500 animate-pulse shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] uppercase">
            Cargando Métricas...
          </div>
        ) : (
          <>
            {/* 2. GRÁFICA DE BARRAS Y TARJETAS DIARIAS */}
            {activeTab === 'weekly' && (
              <div className="border-4 border-black bg-white p-4 sm:p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6 overflow-hidden">
                
                {/* CABECERA CON MES, SEMANA Y BOTÓN DE MAXIMIZAR */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-stone-200 pb-3 gap-3">
                  <div>
                    <h3 className="font-black text-xs uppercase tracking-wider text-black">📅 Comportamiento Semanal</h3>
                    <p className="text-[10px] font-black text-amber-600 uppercase mt-0.5">
                      {weekInfo.monthYear} • {weekInfo.range}
                    </p>
                  </div>
                  
                  <div className="print:hidden flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsChartExpanded(true)}
                      className="bg-amber-400 border-2 border-black px-3 py-1.5 rounded-xl text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-300 transition-all cursor-pointer flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5"
                    >
                      <span>🔍 Maximizar Gráfica</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <span className="text-[9px] font-black uppercase bg-stone-100 border-2 border-black px-2 py-1 rounded-xl">
                    Verde: Ingresos | Rojo: Egresos | Azul: Sin Movimientos
                  </span>
                </div>
                
                {/* CONTENEDOR CON SCROLL HORIZONTAL CONTROLADO */}
                <div className="w-full overflow-x-auto pb-2">
                  <div className="h-72 min-w-112.5 w-full flex items-end justify-between gap-3 pt-4 border-b-4 border-black px-2 bg-stone-50 rounded-2xl border-2">
                    {weeklyData.map(day => {
                      const incomeHeight = (day.income / maxWeeklyValue) * 100;
                      const expenseHeight = (day.expense / maxWeeklyValue) * 100;
                      const netDaySum = day.income - day.expense;
                      const totalMovement = day.income + day.expense;

                      return (
                        <div key={day.name} className="flex-1 min-w-12.5 flex flex-col items-center justify-end h-full">
                          
                          {/* MONTOS SOBRE LAS BARRAS */}
                          <div className="flex flex-col items-center text-[7px] sm:text-[8px] font-black uppercase mb-1 space-y-0.5">
                            {day.income > 0 && (
                              <span className="text-black bg-emerald-300/90 px-1 rounded border border-black/40 whitespace-nowrap">
                                +{formatearMoneda(day.income)}
                              </span>
                            )}
                            {day.expense > 0 && (
                              <span className="text-rose-600 bg-rose-100 px-1 rounded border border-black/40 whitespace-nowrap">
                                -{formatearMoneda(day.expense)}
                              </span>
                            )}
                          </div>

                          {/* BARRAS CON ALTURA PROPORCIONAL Y FLEXIBILIDAD VERTICAL */}
                          <div className="w-full flex justify-center items-end gap-1 flex-1 py-1">
                            {totalMovement === 0 ? (
                              <div 
                                style={{ height: '24px' }} 
                                className="w-full bg-[#38bdf8] border-2 border-black rounded-t-lg transition-all duration-500"
                              />
                            ) : (
                              <>
                                <div 
                                  style={{ height: `${Math.max(8, incomeHeight)}%` }} 
                                  className="w-1/2 bg-emerald-400 border-2 border-black rounded-t-lg transition-all duration-500"
                                />
                                <div 
                                  style={{ height: `${Math.max(8, expenseHeight)}%` }} 
                                  className="w-1/2 bg-rose-500 border-2 border-black rounded-t-lg transition-all duration-500"
                                />
                              </>
                            )}
                          </div>

                          {/* ETIQUETA DE DÍA Y SUMA NETA DEBAJO */}
                          <div className="flex flex-col items-center pt-2 mt-1 border-t-2 border-black w-full text-center">
                            <span className="font-black text-[10px] text-black uppercase">{day.name}</span>
                            <span className={`text-[8px] sm:text-[9px] font-black uppercase whitespace-nowrap ${netDaySum >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                              {netDaySum >= 0 ? formatearMoneda(netDaySum) : `-${formatearMoneda(Math.abs(netDaySum))}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 sm:gap-6 justify-center text-[11px] sm:text-xs font-black text-black uppercase">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 bg-emerald-400 border-2 border-black rounded-md" />
                    <span>Ingresos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 bg-rose-500 border-2 border-black rounded-md" />
                    <span>Egresos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#38bdf8] border-2 border-black rounded-md" />
                    <span>Sin Movimientos</span>
                  </div>
                </div>

                {/* --- TARJETAS DIARIAS CON CÍRCULO COMPLETO Y TARJETA FINAL --- */}
                <div className="border-t-4 border-dashed border-stone-200 pt-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase text-stone-800">📌 Desglose Diario e Indicador Circular (Ingresos vs Egresos)</h4>
                    <span className="text-[9px] font-black uppercase bg-amber-200 border-2 border-black px-2 py-0.5 rounded-lg">
                      {weekInfo.monthYear}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {weeklyData.map(day => {
                      const netDay = day.income - day.expense;
                      const totalMovement = day.income + day.expense;
                      const radius = 18;
                      const circumference = 2 * Math.PI * radius;
                      const incomeRatio = totalMovement > 0 ? day.income / totalMovement : 0;
                      const incomeStroke = incomeRatio * circumference;

                      return (
                        <div key={day.name} className="border-3 border-black bg-stone-50 p-3.5 rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="bg-amber-400 text-black border border-black px-2 py-0.5 rounded-md text-[10px] font-black">
                                {day.name}
                              </span>
                            </div>
                            <div className="text-[10px] font-black space-y-0.5">
                              <p className="text-emerald-700">🟢 +{formatearMoneda(day.income)}</p>
                              <p className="text-rose-600">🔴 -{formatearMoneda(day.expense)}</p>
                              <p className="text-black pt-1 border-t border-stone-300">
                                Neto: <span className={netDay >= 0 ? 'text-emerald-700' : 'text-rose-600'}>{formatearMoneda(netDay)}</span>
                              </p>
                            </div>
                          </div>

                          {/* CÍRCULO COMPLETO SÓLIDO */}
                          <div className="flex flex-col items-center shrink-0">
                            <div className="w-15 h-15 rounded-full border-2 border-black overflow-hidden flex items-center justify-center bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] relative">
                              <svg className="w-15 h-15 transform -rotate-90" viewBox="0 0 36 36">
                                <circle 
                                  cx="18" 
                                  cy="18" 
                                  r={radius} 
                                  fill={totalMovement > 0 ? "#f43f5e" : "#38bdf8"} 
                                />
                                {totalMovement > 0 && (
                                  <circle 
                                    cx="18" 
                                    cy="18" 
                                    r={radius} 
                                    fill="transparent" 
                                    stroke="#34d399" 
                                    strokeWidth="36" 
                                    strokeDasharray={`${incomeStroke} ${circumference}`} 
                                  />
                                )}
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-black">
                                {totalMovement > 0 ? `${Math.round(incomeRatio * 100)}%` : '0%'}
                              </div>
                            </div>
                            <span className="text-[8px] font-black text-stone-600 uppercase mt-1">Ingreso %</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* --- TARJETA FINAL CON CÍRCULO COMPLETO SÓLIDO --- */}
                    {(() => {
                      const totalWeeklyMovement = weeklyIncomeSum + weeklyExpenseSum;
                      const weeklyRadius = 18;
                      const weeklyCircumference = 2 * Math.PI * weeklyRadius;
                      const weeklyIncomeRatio = totalWeeklyMovement > 0 ? weeklyIncomeSum / totalWeeklyMovement : 0;
                      const weeklyIncomeStroke = weeklyIncomeRatio * weeklyCircumference;

                      return (
                        <div className="border-3 border-black bg-amber-300 p-3.5 rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-2">
                          <div className="space-y-1">
                            <span className="bg-black text-amber-300 border border-black px-2 py-0.5 rounded-md text-[9px] font-black uppercase inline-block">
                              🏆 {weekInfo.range}
                            </span>
                            <div className="text-[10px] font-black space-y-0.5 pt-1">
                              <p className="text-emerald-900">🟢 Ingresos: {formatearMoneda(weeklyIncomeSum)}</p>
                              <p className="text-rose-900">🔴 Egresos: {formatearMoneda(weeklyExpenseSum)}</p>
                              <p className="text-black pt-1 border-t border-black/30">
                                Neto: <span className={weeklyNetBalance >= 0 ? 'text-emerald-900' : 'text-rose-900'}>{formatearMoneda(weeklyNetBalance)}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-center shrink-0">
                            <div className="w-15 h-15 rounded-full border-2 border-black overflow-hidden flex items-center justify-center bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] relative">
                              <svg className="w-15 h-15 transform -rotate-90" viewBox="0 0 36 36">
                                <circle 
                                  cx="18" 
                                  cy="18" 
                                  r={weeklyRadius} 
                                  fill={totalWeeklyMovement > 0 ? "#f43f5e" : "#38bdf8"} 
                                />
                                {totalWeeklyMovement > 0 && (
                                  <circle 
                                    cx="18" 
                                    cy="18" 
                                    r={weeklyRadius} 
                                    fill="transparent" 
                                    stroke="#34d399" 
                                    strokeWidth="36" 
                                    strokeDasharray={`${weeklyIncomeStroke} ${weeklyCircumference}`} 
                                  />
                                )}
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-black">
                                {totalWeeklyMovement > 0 ? `${Math.round(weeklyIncomeRatio * 100)}%` : '0%'}
                              </div>
                            </div>
                            <span className="text-[8px] font-black text-stone-800 uppercase mt-1">Ingreso %</span>
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                </div>

              </div>
            )}

            {/* 3. DISTRIBUCIÓN POR CATEGORÍA */}
            {activeTab === 'categories' && (
              <div className="border-4 border-black bg-white p-4 sm:p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-dashed border-stone-200 pb-3 gap-2">
                  <h3 className="font-black text-xs uppercase tracking-wider text-black">🏷️ ¿En qué se va el dinero? (Egresos)</h3>
                  <span className="text-xs font-black bg-amber-400 border-2 border-black px-2 py-0.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
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
                      No hay registros de egresos guardados en la base de datos
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {/* MODAL DE GRÁFICA MAXIMIZADA A PANTALLA COMPLETA */}
      {isChartExpanded && (
        <div className="fixed inset-0 z-50 bg-[#Fef8e7]/95 backdrop-blur-sm p-3 sm:p-6 flex flex-col justify-center items-center overflow-auto animate-fade-in">
          <div className="w-full max-w-5xl bg-white border-4 border-black p-4 sm:p-8 rounded-3xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] space-y-6 my-auto">
            
            <div className="flex justify-between items-center border-b-4 border-black pb-4">
              <div>
                <h3 className="font-black text-sm sm:text-lg uppercase tracking-wider text-black">📈 Gráfica Semanal (Vista Ampliada)</h3>
                <p className="text-xs font-black text-amber-600 uppercase mt-0.5">
                  {weekInfo.monthYear} • {weekInfo.range}
                </p>
              </div>
              
              <button
                type="button"
                onClick={() => setIsChartExpanded(false)}
                className="bg-rose-500 text-white border-3 border-black px-4 py-2 rounded-2xl text-xs font-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-rose-400 transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
              >
                ✕ Cerrar
              </button>
            </div>

            <div className="w-full overflow-x-auto pb-4">
              <div className="h-96 min-w-150 w-full flex items-end justify-between gap-4 pt-6 border-b-4 border-black px-4 bg-stone-50 rounded-3xl border-3 shadow-inner">
                {weeklyData.map(day => {
                  const incomeHeight = (day.income / maxWeeklyValue) * 100;
                  const expenseHeight = (day.expense / maxWeeklyValue) * 100;
                  const netDaySum = day.income - day.expense;
                  const totalMovement = day.income + day.expense;

                  return (
                    <div key={day.name} className="flex-1 min-w-16 flex flex-col items-center justify-end h-full">
                      
                      <div className="flex flex-col items-center text-[10px] sm:text-xs font-black uppercase mb-2 space-y-1">
                        {day.income > 0 && (
                          <span className="text-black bg-emerald-300 px-1.5 py-0.5 rounded-md border-2 border-black whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            +{formatearMoneda(day.income)}
                          </span>
                        )}
                        {day.expense > 0 && (
                          <span className="text-white bg-rose-600 px-1.5 py-0.5 rounded-md border-2 border-black whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            -{formatearMoneda(day.expense)}
                          </span>
                        )}
                      </div>

                      <div className="w-full flex justify-center items-end gap-2 flex-1 py-1">
                        {totalMovement === 0 ? (
                          <div 
                            style={{ height: '32px' }} 
                            className="w-full bg-[#38bdf8] border-3 border-black rounded-t-xl transition-all duration-500"
                          />
                        ) : (
                          <>
                            <div 
                              style={{ height: `${Math.max(10, incomeHeight)}%` }} 
                              className="w-1/2 bg-emerald-400 border-3 border-black rounded-t-xl transition-all duration-500 shadow-md"
                            />
                            <div 
                              style={{ height: `${Math.max(10, expenseHeight)}%` }} 
                              className="w-1/2 bg-rose-500 border-3 border-black rounded-t-xl transition-all duration-500 shadow-md"
                            />
                          </>
                        )}
                      </div>

                      <div className="flex flex-col items-center pt-3 mt-2 border-t-3 border-black w-full text-center">
                        <span className="font-black text-xs sm:text-sm text-black uppercase">{day.name}</span>
                        <span className={`text-[10px] sm:text-xs font-black uppercase whitespace-nowrap ${netDaySum >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {netDaySum >= 0 ? formatearMoneda(netDaySum) : `-${formatearMoneda(Math.abs(netDaySum))}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-6 justify-center text-xs sm:text-sm font-black text-black uppercase pt-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-400 border-2 border-black rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
                <span>Ingresos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-rose-500 border-2 border-black rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
                <span>Egresos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-[#38bdf8] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
                <span>Sin Movimientos</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE VISTA PREVIA PDF CON ZOOM QUE MUESTRA TODA LA PÁGINA COMPLETA */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-2 sm:p-6 flex flex-col justify-center items-center overflow-auto animate-fade-in">
          <div className="w-full max-w-5xl bg-[#Fef8e7] border-4 border-black rounded-3xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[92vh] overflow-hidden my-auto">
            
            {/* BARRA SUPERIOR DE ZOOM */}
            <div className="bg-amber-400 border-b-4 border-black p-3 sm:p-4 flex flex-wrap justify-between items-center gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-base">🔍</span>
                <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-black">
                  VISTA PREVIA ZOOM [{Math.round(pdfZoom * 100)}%] {effectiveAuditorMode ? `- AUDITANDO A: ${auditedDisplayName}` : ''}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white border-2 border-black rounded-xl p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <button
                    type="button"
                    onClick={handlePdfZoomOut}
                    className="w-8 h-8 font-black hover:bg-stone-100 rounded-lg cursor-pointer flex items-center justify-center active:translate-x-0.5 active:translate-y-0.5"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={handlePdfResetZoom}
                    className="px-2.5 text-xs font-black hover:bg-stone-100 cursor-pointer"
                  >
                    {Math.round(pdfZoom * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={handlePdfZoomIn}
                    className="w-8 h-8 font-black hover:bg-stone-100 rounded-lg cursor-pointer flex items-center justify-center active:translate-x-0.5 active:translate-y-0.5"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handlePrintOrPDF}
                  className="bg-emerald-400 border-2 border-black px-3 py-1.5 rounded-xl text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-300 transition-all cursor-pointer flex items-center gap-1 active:translate-x-0.5 active:translate-y-0.5"
                >
                  <span>🖨️ IMPRIMIR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPdfModalOpen(false)}
                  className="bg-rose-500 text-white border-2 border-black w-9 h-9 rounded-xl font-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-rose-400 cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* CONTENEDOR DE LA HOJA DE PAPEL QUE CONTIENE TODA LA PÁGINA (RESUMEN, BARRAS, CÍRCULOS Y CATEGORÍAS) */}
            <div className="flex-1 overflow-auto p-4 sm:p-8 bg-stone-200/80 flex justify-center">
              <div 
                style={{ transform: `scale(${pdfZoom})`, transformOrigin: 'top center' }} 
                className="bg-[#Fef8e7] border-4 border-black p-4 sm:p-8 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-4xl space-y-6 transition-transform duration-200"
              >
                
                {effectiveAuditorMode && (
                  <div className="w-full bg-red-500 text-white text-center font-black text-xs py-1.5 border-2 border-black rounded-xl uppercase tracking-wide">
                    🔍 Auditoría de Métricas: {auditedDisplayName}
                  </div>
                )}

                {/* 1. RESUMEN EJECUTIVO GENERAL */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="border-4 border-black bg-emerald-100 p-4 rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-1">
                    <p className="text-[10px] font-black uppercase text-emerald-800">🟢 Ingresos Totales</p>
                    <p className="text-base font-black text-emerald-950">{formatearMoneda(totalIncome)}</p>
                  </div>
                  <div className="border-4 border-black bg-rose-100 p-4 rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-1">
                    <p className="text-[10px] font-black uppercase text-rose-800">🔴 Egresos Totales</p>
                    <p className="text-base font-black text-rose-950">{formatearMoneda(totalExpenses)}</p>
                  </div>
                  <div className={`border-4 border-black p-4 rounded-3xl shadow-[4px_4px_0px_rgba(0,0,0,1)] space-y-1 ${netBalance >= 0 ? 'bg-amber-200' : 'bg-orange-200'}`}>
                    <p className="text-[10px] font-black uppercase text-stone-800">⚖️ Flujo Neto (Disponible)</p>
                    <p className={`text-base font-black ${netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatearMoneda(netBalance)}
                    </p>
                  </div>
                </div>

                {/* 2. GRÁFICA DE BARRAS SEMANAL */}
                <div className="border-4 border-black bg-white p-4 sm:p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
                  <div className="flex justify-between items-center border-b-2 border-stone-200 pb-3">
                    <div>
                      <h3 className="font-black text-xs uppercase tracking-wider text-black">📅 Comportamiento Semanal</h3>
                      <p className="text-[10px] font-black text-amber-600 uppercase mt-0.5">
                        {weekInfo.monthYear} • {weekInfo.range}
                      </p>
                    </div>
                  </div>

                  <div className="w-full overflow-x-auto pb-2">
                    <div className="h-64 min-w-100 w-full flex items-end justify-between gap-3 pt-4 border-b-4 border-black px-2 bg-stone-50 rounded-2xl border-2">
                      {weeklyData.map(day => {
                        const incomeHeight = (day.income / maxWeeklyValue) * 100;
                        const expenseHeight = (day.expense / maxWeeklyValue) * 100;
                        const netDaySum = day.income - day.expense;
                        const totalMovement = day.income + day.expense;

                        return (
                          <div key={day.name} className="flex-1 min-w-10 flex flex-col items-center justify-end h-full">
                            <div className="flex flex-col items-center text-[7px] font-black uppercase mb-1 space-y-0.5">
                              {day.income > 0 && (
                                <span className="text-black bg-emerald-300 px-1 rounded border border-black/40 whitespace-nowrap">
                                  +{formatearMoneda(day.income)}
                                </span>
                              )}
                              {day.expense > 0 && (
                                <span className="text-rose-600 bg-rose-100 px-1 rounded border border-black/40 whitespace-nowrap">
                                  -{formatearMoneda(day.expense)}
                                </span>
                              )}
                            </div>

                            <div className="w-full flex justify-center items-end gap-1 flex-1 py-1">
                              {totalMovement === 0 ? (
                                <div style={{ height: '20px' }} className="w-full bg-[#38bdf8] border-2 border-black rounded-t-md" />
                              ) : (
                                <>
                                  <div style={{ height: `${Math.max(8, incomeHeight)}%` }} className="w-1/2 bg-emerald-400 border-2 border-black rounded-t-md" />
                                  <div style={{ height: `${Math.max(8, expenseHeight)}%` }} className="w-1/2 bg-rose-500 border-2 border-black rounded-t-md" />
                                </>
                              )}
                            </div>

                            <div className="flex flex-col items-center pt-2 mt-1 border-t-2 border-black w-full text-center">
                              <span className="font-black text-[9px] text-black uppercase">{day.name}</span>
                              <span className={`text-[7px] font-black uppercase whitespace-nowrap ${netDaySum >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                {netDaySum >= 0 ? formatearMoneda(netDaySum) : `-${formatearMoneda(Math.abs(netDaySum))}`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 3. DESGLOSE DIARIO E INDICADOR CIRCULAR */}
                <div className="border-4 border-black bg-white p-4 sm:p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
                  <div className="flex justify-between items-center border-b-2 border-stone-200 pb-3">
                    <h4 className="text-xs font-black uppercase text-stone-800">📌 Desglose Diario e Indicador Circular</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {weeklyData.map(day => {
                      const netDay = day.income - day.expense;
                      const totalMovement = day.income + day.expense;
                      const radius = 18;
                      const circumference = 2 * Math.PI * radius;
                      const incomeRatio = totalMovement > 0 ? day.income / totalMovement : 0;
                      const incomeStroke = incomeRatio * circumference;

                      return (
                        <div key={day.name} className="border-3 border-black bg-stone-50 p-3 rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-2">
                          <div className="space-y-1">
                            <span className="bg-amber-400 text-black border border-black px-2 py-0.5 rounded-md text-[10px] font-black inline-block">
                              {day.name}
                            </span>
                            <div className="text-[10px] font-black space-y-0.5">
                              <p className="text-emerald-700">🟢 +{formatearMoneda(day.income)}</p>
                              <p className="text-rose-600">🔴 -{formatearMoneda(day.expense)}</p>
                              <p className="text-black pt-1 border-t border-stone-300">
                                Neto: <span className={netDay >= 0 ? 'text-emerald-700' : 'text-rose-600'}>{formatearMoneda(netDay)}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-center shrink-0">
                            <div className="w-14 h-14 rounded-full border-2 border-black overflow-hidden flex items-center justify-center bg-white relative">
                              <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 36 36">
                                <circle 
                                  cx="18" 
                                  cy="18" 
                                  r={radius} 
                                  fill={totalMovement > 0 ? "#f43f5e" : "#38bdf8"} 
                                />
                                {totalMovement > 0 && (
                                  <circle 
                                    cx="18" 
                                    cy="18" 
                                    r={radius} 
                                    fill="transparent" 
                                    stroke="#34d399" 
                                    strokeWidth="36" 
                                    strokeDasharray={`${incomeStroke} ${circumference}`} 
                                  />
                                )}
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-black">
                                {totalMovement > 0 ? `${Math.round(incomeRatio * 100)}%` : '0%'}
                              </div>
                            </div>
                            <span className="text-[7px] font-black text-stone-600 uppercase mt-1">Ingreso %</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* TARJETA FINAL EN EL MODAL PDF */}
                    {(() => {
                      const totalWeeklyMovement = weeklyIncomeSum + weeklyExpenseSum;
                      const weeklyRadius = 18;
                      const weeklyCircumference = 2 * Math.PI * weeklyRadius;
                      const weeklyIncomeRatio = totalWeeklyMovement > 0 ? weeklyIncomeSum / totalWeeklyMovement : 0;
                      const weeklyIncomeStroke = weeklyIncomeRatio * weeklyCircumference;

                      return (
                        <div className="border-3 border-black bg-amber-300 p-3 rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-2">
                          <div className="space-y-1">
                            <span className="bg-black text-amber-300 border border-black px-2 py-0.5 rounded-md text-[9px] font-black uppercase inline-block">
                              🏆 {weekInfo.range}
                            </span>
                            <div className="text-[10px] font-black space-y-0.5 pt-1">
                              <p className="text-emerald-900">🟢 Ingresos: {formatearMoneda(weeklyIncomeSum)}</p>
                              <p className="text-rose-900">🔴 Egresos: {formatearMoneda(weeklyExpenseSum)}</p>
                              <p className="text-black pt-1 border-t border-black/30">
                                Neto: <span className={weeklyNetBalance >= 0 ? 'text-emerald-900' : 'text-rose-900'}>{formatearMoneda(weeklyNetBalance)}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-center shrink-0">
                            <div className="w-14 h-14 rounded-full border-2 border-black overflow-hidden flex items-center justify-center bg-white relative">
                              <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 36 36">
                                <circle 
                                  cx="18" 
                                  cy="18" 
                                  r={weeklyRadius} 
                                  fill={totalWeeklyMovement > 0 ? "#f43f5e" : "#38bdf8"} 
                                />
                                {totalWeeklyMovement > 0 && (
                                  <circle 
                                    cx="18" 
                                    cy="18" 
                                    r={weeklyRadius} 
                                    fill="transparent" 
                                    stroke="#34d399" 
                                    strokeWidth="36" 
                                    strokeDasharray={`${weeklyIncomeStroke} ${weeklyCircumference}`} 
                                  />
                                )}
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-black">
                                {totalWeeklyMovement > 0 ? `${Math.round(weeklyIncomeRatio * 100)}%` : '0%'}
                              </div>
                            </div>
                            <span className="text-[7px] font-black text-stone-800 uppercase mt-1">Ingreso %</span>
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                </div>

                {/* 4. DISTRIBUCIÓN POR CATEGORÍA EN EL MODAL PDF */}
                <div className="border-4 border-black bg-white p-4 sm:p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
                  <div className="flex justify-between items-center border-b-2 border-stone-200 pb-3">
                    <h4 className="text-xs font-black uppercase text-stone-800">🏷️ Distribución por Categoría</h4>
                    <span className="text-xs font-black bg-amber-400 border-2 border-black px-2 py-0.5 rounded-lg">
                      TOTAL: {formatearMoneda(totalExpensesSum)}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {categoryData.map(cat => {
                      const percentage = totalExpensesSum > 0 ? (cat.value / totalExpensesSum) * 100 : 0;
                      return (
                        <div key={cat.name} className="space-y-1">
                          <div className="flex justify-between text-xs font-black uppercase text-black">
                            <span>{cat.name}</span>
                            <span>{formatearMoneda(cat.value)} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full h-4 bg-stone-100 border-2 border-black rounded-xl overflow-hidden">
                            <div style={{ width: `${Math.max(3, percentage)}%` }} className="h-full bg-amber-400 border-r-2 border-black" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}