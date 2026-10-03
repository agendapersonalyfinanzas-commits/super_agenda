// src/components/Expenses/DashboardScreen.jsx

import React, { useState, useEffect, useMemo } from 'react';

// Cliente Supabase
import { supabase } from '../../../supabaseClient';

// Utilidades
import { formatearMoneda } from '../../../utils/moneda.js';
import { exportTransactionsToPDF } from '../../../utils/pdfExportPlugin.js';
import { guardarEnStorage, obtenerDeStorage } from '../../../utils/storage.js';
import { procesarColaOffline } from '../../../utils/offlineSync.js';

// --- CUSTOM HOOKS MODULARES
import { usePlayerManagement } from '../../../hooks/usePlayerManagement.js';
import { useTransactionsManager } from '../../../hooks/useTransactionsManager.js';
import { useQuickActionsManager } from '../../../hooks/useQuickActionsManager.js';

// Servicios de IA y Radar de Precios
import { analyzeAndUpdatePrices } from '../../../services/priceRadarService';

// Componentes externos
import DashboardHeader from '../../Expenses/DashboardHeader';
import AddCustomButtonModal from '../../Expenses/AddCustomButtonModal';
import EditImageModal from '../../Expenses/EditImageModal';
import OCRScanner from '../../Expenses/OCRScanner';
import MetasAhorroSeccion from '../../Expenses/MetasAhorroSeccion';

// Componentes UI modularizados
import QuickActionGrid from '../QuickActionGrid.jsx';
import PlayerControlPanel from '../PlayerControlPanel.jsx';
import GlobalBalanceCard from '../GlobalBalanceCard.jsx';
import PlayerProgressSection from '../PlayerProgressSection.jsx';
import RecentTransactions from '../RecentTransactions.jsx';

// Componentes de Navegación y Juegos
import Navigation from '../Navigation.jsx';
import GamesScreen from '../../Games/GamesScreen.jsx';
import AnalyticsScreen from './AnalyticsScreen.jsx';

const PRESET_ICONS = [
  '/charlie-market.png', '/finanzas.png', '/franklin-internet.png', '/gastos-medicos.png',
  '/joe-cool-woodstock.png', '/joe-linus.png', '/joe-marcie.png', '/joe-pepermint.png',
  '/joe-pigpen.png', '/joe-schoader.png', '/joe-snoopy.png', '/joe-woodstock.png',
  '/juego-baron-rojo.png', '/juego-franklin.png', '/juego-linus.png', '/juego-paty.png',
  '/juego-pigpen.png', '/juego-sally.png', '/juego-schroader.png', '/juego-snoopy-rojo-1.png',
  '/juego-woodstock-piloto.png', '/juego-woodstock.png', '/juegol-linus.png', '/linus-cfe.png',
  '/snoopy-mucama.png', '/linus-dulces.png', '/lucy-analytics.png', '/lucy-colegiatura.png',
  '/lucy-secretaria.png', '/marcia-cita-medica.png', '/metricas.png', '/paty-telcel.png',
  '/schroeder-limonada.png', '/snoopy-caev.png', '/snoopy-food.png', '/snoopy-gasolina.png',
  '/snoopy-maestro.png', '/snoopy-repair.png', '/snoppy-alquiler.png'
];

const USER_CACHE_KEY = 'family_current_user_profile';
const PROFILES_CACHE_KEY = 'family_profiles_cache';

export default function DashboardScreen() {
  const [activeTab, setActiveTab] = useState('finances');
  const [currentUser, setCurrentUser] = useState(() => obtenerDeStorage(USER_CACHE_KEY, null));
  
  const [auditorMode, setAuditorMode] = useState(() => obtenerDeStorage('family_auditor_mode', false));
  const [selectedAuditedUser, setSelectedAuditedUser] = useState(() => obtenerDeStorage('family_audited_user', null));
  
  const [usersList, setUsersList] = useState(() => obtenerDeStorage(PROFILES_CACHE_KEY, [])); 
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [retroactiveDate, setRetroactiveDate] = useState(() => new Date().toISOString().split('T')[0]);

  // --- ESTADOS PARA EL MODAL DE VERIFICACIÓN EDITABLE (IA EXTERNA) ---
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [pendingExpenseData, setPendingExpenseData] = useState(null);

  const [activeImageTarget, setActiveImageTarget] = useState(null);
  const [customName, setCustomName] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customCategory, setCustomCategory] = useState('VARIOS');
  const [selectedIcon, setSelectedIcon] = useState(PRESET_ICONS[0]);

  useEffect(() => {
    const handleOnline = () => { setIsOffline(false); procesarColaOffline(); };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    guardarEnStorage('family_auditor_mode', auditorMode);
  }, [auditorMode]);

  useEffect(() => {
    guardarEnStorage('family_audited_user', selectedAuditedUser);
  }, [selectedAuditedUser]);

  const targetUserForTx = useMemo(() => {
    if (!auditorMode) return null;
    if (!selectedAuditedUser) return null;

    const foundUser = usersList.find(
      (u) => u.id === selectedAuditedUser || 
            (u.nombre && selectedAuditedUser && u.nombre.trim().toUpperCase() === String(selectedAuditedUser).trim().toUpperCase())
    );

    return foundUser || selectedAuditedUser;
  }, [auditorMode, selectedAuditedUser, usersList]);

  const playerManager = usePlayerManagement(targetUserForTx, auditorMode);

  const targetUserIdForMetas = useMemo(() => {
    if (!auditorMode) return currentUser?.id || '';
    if (!selectedAuditedUser) return '';
    if (typeof selectedAuditedUser === 'object' && selectedAuditedUser !== null) {
      return selectedAuditedUser.id || '';
    }
    const foundUser = usersList.find(
      (u) => u.id === selectedAuditedUser || 
            (u.nombre && selectedAuditedUser && u.nombre.trim().toUpperCase() === String(selectedAuditedUser).trim().toUpperCase())
    );
    return foundUser ? foundUser.id : selectedAuditedUser;
  }, [auditorMode, selectedAuditedUser, currentUser, usersList]);

  const resolvedDisplayName = useMemo(() => {
    if (auditorMode) {
      if (!selectedAuditedUser) return 'SELECCIONA USUARIO';
      const found = usersList.find(
        (u) => u.id === selectedAuditedUser || 
              (u.nombre && selectedAuditedUser && u.nombre.trim().toUpperCase() === String(selectedAuditedUser).trim().toUpperCase())
      );
      if (found) return `${found.nombre || ''} ${found.apellido_paterno || ''}`.trim();
      if (typeof selectedAuditedUser === 'string') return selectedAuditedUser;
    }
    return playerManager.activeUser || currentUser?.email?.split('@')[0] || 'USUARIO';
  }, [auditorMode, selectedAuditedUser, usersList, playerManager.activeUser, currentUser]);

  const effectiveUserForHooks = useMemo(() => {
    if (!auditorMode) return playerManager.activeUser || currentUser?.email;
    return targetUserForTx;
  }, [auditorMode, targetUserForTx, playerManager.activeUser, currentUser]);

  const txManager = useTransactionsManager(
    effectiveUserForHooks,
    auditorMode,
    currentUser?.email === 'maestroluisricardo17@gmail.com',
    usersList
  );

  const quickActionsManager = useQuickActionsManager(effectiveUserForHooks, auditorMode);

  useEffect(() => {
    const handleGlobalRefresh = () => {
      if (typeof txManager.fetchTransactions === 'function') {
        txManager.fetchTransactions();
      }
    };

    window.addEventListener('storage', handleGlobalRefresh);
    window.addEventListener('refresh-financial-data', handleGlobalRefresh);

    return () => {
      window.removeEventListener('storage', handleGlobalRefresh);
      window.removeEventListener('refresh-financial-data', handleGlobalRefresh);
    };
  }, [txManager]);

  useEffect(() => {
    const fetchUserAndProfiles = async () => {
      if (!navigator.onLine) {
        const cachedUser = obtenerDeStorage(USER_CACHE_KEY, null);
        const cachedProfiles = obtenerDeStorage(PROFILES_CACHE_KEY, []);
        if (cachedUser) setCurrentUser(cachedUser);
        if (cachedProfiles.length > 0) setUsersList(cachedProfiles);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          guardarEnStorage(USER_CACHE_KEY, user);

          if (user.email?.toLowerCase() === 'maestroluisricardo17@gmail.com') {
            const { data: profiles, error } = await supabase
              .from('profiles')
              .select('id, nombre, apellido_paterno, apellido_materno');

            if (!error && profiles) {
              setUsersList(profiles);
              guardarEnStorage(PROFILES_CACHE_KEY, profiles);
            }
          }
        }
      } catch (err) {
        console.error('Error al cargar perfiles:', err);
      }
    };
    fetchUserAndProfiles();
  }, [isOffline]);

  const isMasterAuditor = currentUser?.email?.toLowerCase() === 'maestroluisricardo17@gmail.com';

  const handleToggleAuditorMode = () => {
    const nextMode = !auditorMode;
    setAuditorMode(nextMode);
    guardarEnStorage('family_auditor_mode', nextMode);
    if (!nextMode) {
      setSelectedAuditedUser(null);
      guardarEnStorage('family_audited_user', null);
    }
  };

  const handleSignOut = async () => {
    try { await supabase.auth.signOut({ scope: 'global' }); } catch (e) {}
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = window.location.origin;
  };

  // 🧠 FUNCIÓN CENTRAL DE APRENDIZAJE AUTOMÁTICO (NUTRIR CEREBRO INTERNO)
  const recordLearningData = async (userId, storeName, items, ticketDate) => {
    if (!userId || !items || !Array.isArray(items) || items.length === 0) return;
    try {
      const cleanStore = String(storeName || 'COMERCIO').toUpperCase();
      const dateStr = ticketDate || new Date().toISOString().split('T')[0];

      // 1. Registrar cada ítem en 'price_history'
      const pricePayload = items.map(item => {
        const qty = Number(item.quantity) || 1;
        const prc = Number(item.price) || (item.subtotal ? item.subtotal / qty : 0);
        return {
          user_id: userId,
          store_name: cleanStore,
          product_name: String(item.name || 'PRODUCTO').toUpperCase(),
          price: Number(prc.toFixed(2)),
          quantity: qty,
          recorded_date: dateStr
        };
      });

      await supabase.from('price_history').insert(pricePayload);

      // 2. Registrar o actualizar plantilla en 'store_templates'
      await supabase.from('store_templates').upsert({
        user_id: userId,
        store_name: cleanStore,
        last_used_date: dateStr,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, store_name' });

    } catch (learnErr) {
      console.warn('⚠️ Nota de autoaprendizaje (no afecta el flujo principal):', learnErr.message);
    }
  };

  const handleCustomButtonSubmit = async (e, detectedItems = []) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    
    const conceptName = customName.trim().toUpperCase() || 'NUEVO';
    const payload = {
      name: conceptName,
      amount: Number(customAmount) || 0,
      category: customCategory.trim().toUpperCase() || 'VARIOS',
      icon: selectedIcon || PRESET_ICONS[0],
      type: quickActionsManager.modalType || 'expense'
    };

    if (typeof quickActionsManager.handleAddAction === 'function') {
      quickActionsManager.handleAddAction(payload, payload.type);
    }

    if (detectedItems && detectedItems.length > 0) {
      try {
        await analyzeAndUpdatePrices(detectedItems, conceptName);
        await recordLearningData(currentUser?.id, conceptName, detectedItems, retroactiveDate);
      } catch (err) {
        console.error('Error al actualizar el radar de precios:', err);
      }
    }

    setCustomName('');
    setCustomAmount('');
    setCustomCategory('VARIOS');
    setSelectedIcon(PRESET_ICONS[0]);
  };

  const handleSaveImageConfig = (newIcon, newLabel) => {
    if (typeof quickActionsManager.handleUpdateActionCustomization === 'function') {
      quickActionsManager.handleUpdateActionCustomization(activeImageTarget, { icon: newIcon, label: newLabel });
    }
    setActiveImageTarget(null);
  };

  const handleProcessTransactionWithRetroactive = (data, type) => {
    const processedData = typeof data === 'object' ? {
      ...data,
      is_retroactive: Boolean(data.is_retroactive)
    } : data;
    txManager.handleSaveTransaction(processedData, type);
  };

  // 🚀 INTERCEPTOR DEL JSON DEL ASISTENTE IA EXTERNO (ABRE LA LISTA EDITABLE)
  const handleExternalJsonInject = (parsedData) => {
    setPendingExpenseData(parsedData);
    setIsVerificationOpen(true);
  };

  // 💾 GUARDAR EL GASTO VERIFICADO Y EDITADO DESDE EL MODAL + APRENDIZAJE AUTOMÁTICO
  const handleSaveVerifiedExternalExpense = async (finalData) => {
    try {
      const transactionData = {
        concept: finalData.concept || 'TICKET',
        amount: Number(finalData.amount) || 0,
        category: finalData.category || 'SUPERMERCADO',
        transaction_type: 'expense',
        transaction_date: finalData.date || new Date().toISOString().split('T')[0],
        description: finalData.description || '',
        is_ticket: true,
        items: finalData.items || [],
        user_id: currentUser?.id || null
      };

      await txManager.handleSaveTransaction(transactionData, 'expense');

      if (finalData.items && finalData.items.length > 0) {
        try {
          await analyzeAndUpdatePrices(finalData.items, transactionData.concept);
          // 🧠 Alimentamos el sistema de autoaprendizaje local
          await recordLearningData(currentUser?.id, transactionData.concept, finalData.items, transactionData.transaction_date);
        } catch (priceErr) {
          console.error('Error al actualizar radar de precios / aprendizaje:', priceErr);
        }
      }

      setIsVerificationOpen(false);
      setPendingExpenseData(null);
      alert(`¡Gasto guardado con éxito!\nConcepto: ${transactionData.concept}\nTotal: ${formatearMoneda(transactionData.amount)}`);
    } catch (err) {
      console.error('Error al guardar gasto verificado:', err);
      alert(`Error al guardar: ${err.message || 'Error desconocido'}`);
    }
  };

  // 🚀 MANEJADOR PROFESIONAL DE TICKETS OCR CENTRALIZADO + APRENDIZAJE AUTOMÁTICO
  const handleScanSuccessOCR = async (payload) => {
    setIsOcrOpen(false);
    try {
      const transactionData = {
        concept: payload.concept || 'TICKET',
        amount: Number(payload.amount) || 0,
        category: payload.category || 'VARIOS',
        transaction_type: payload.transaction_type || payload.type || 'expense',
        transaction_date: payload.date || payload.transaction_date || new Date().toISOString().split('T')[0],
        is_ticket: true,
        items: payload.items || [],
        user_id: currentUser?.id || null
      };

      await txManager.handleSaveTransaction(transactionData, transactionData.transaction_type);

      if (payload.items && payload.items.length > 0) {
        try {
          await analyzeAndUpdatePrices(payload.items, transactionData.concept);
          // 🧠 Alimentamos el sistema de autoaprendizaje local
          await recordLearningData(currentUser?.id, transactionData.concept, payload.items, transactionData.transaction_date);
        } catch (priceErr) {
          console.error('Error al actualizar el radar de precios con los ítems del ticket:', priceErr);
        }
      }

      alert(`¡Ticket guardado correctamente!\nComercio: ${transactionData.concept}\nMonto: ${formatearMoneda(transactionData.amount)}`);
    } catch (err) {
      console.error('Error profesional al procesar y guardar el ticket:', err);
      alert(`Error al registrar el ticket: ${err.message || 'Error desconocido'}`);
    }
  };

  return (
    <div className={`min-h-screen bg-[#Fef8e7] p-4 md:p-8 font-mono text-black pb-28 select-none relative ${isOffline ? 'pt-10' : ''}`}>
      
      {isOffline && (
        <div className="w-full bg-yellow-400 text-black text-center font-bold text-xs py-2 border-b-4 border-black fixed top-0 left-0 z-50">
          ⚠️ ESTÁS EN MODO OFFLINE - Los datos se guardarán localmente y se sincronizarán al conectar.
        </div>
      )}

      {activeTab === 'games' ? (
        <GamesScreen activeUser={resolvedDisplayName} />
      ) : activeTab === 'agenda' ? (
        <div className="max-w-4xl mx-auto p-8 text-center font-black text-lg">
          📅 Agenda de {resolvedDisplayName}
        </div>
      ) : activeTab === 'metrics' ? (
        <AnalyticsScreen 
          activeUser={selectedAuditedUser}
          auditorMode={auditorMode}
          isMasterAuditor={isMasterAuditor}
          usersList={usersList}
        />
      ) : (
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="flex justify-between items-center mb-2">
            {isMasterAuditor ? (
              <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors duration-300 ${auditorMode ? 'bg-red-500' : 'bg-stone-900'}`}>
                <span className={`text-[10px] font-black uppercase tracking-widest ${auditorMode ? 'text-white' : 'text-amber-400'}`}>
                  {auditorMode ? '🔴 DIOS' : '🕵️‍♂️ NORMAL'}
                </span>
                <button
                  type="button"
                  onClick={handleToggleAuditorMode}
                  className={`relative w-12 h-6 border-2 border-black rounded-full cursor-pointer transition-colors ${auditorMode ? 'bg-amber-300' : 'bg-stone-600'}`}
                >
                  <div className={`w-4 h-4 bg-white border-2 border-black rounded-full absolute top-0.5 transition-transform duration-300 ${auditorMode ? 'translate-x-5.5' : 'translate-x-1'}`} />
                </button>
              </div>
            ) : <div />}

            <button
              type="button"
              onClick={handleSignOut}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white border-4 border-black rounded-xl font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
            >
              🚪 Cerrar Sesión
            </button>
          </div>

          {auditorMode && (
            <div className="bg-red-500 text-white border-4 border-black p-3 rounded-xl text-center font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse tracking-wide mb-4">
              ⚠️ Modo Dios (Auditoría) Activo - Auditando a: {resolvedDisplayName}
            </div>
          )}

          <DashboardHeader 
            user_name={resolvedDisplayName} 
            activeUser={resolvedDisplayName} 
            onOcrOpen={() => setIsOcrOpen(true)}
            onExternalJsonInject={handleExternalJsonInject}
            isAuditor={auditorMode}
            usersList={usersList}
            selectedAuditedUser={selectedAuditedUser}
            setSelectedAuditedUser={(user) => {
              setSelectedAuditedUser(user);
              guardarEnStorage('family_audited_user', user);
            }}
          />
          
          <PlayerControlPanel activeUser={resolvedDisplayName} />

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlobalBalanceCard 
              totalIncome={txManager.totalIncome}
              weeklyTotal={txManager.weeklyTotal}
              bgImage="/lucy-analytics.png"
              transactions={txManager.recentTransactions}
            />

            <div className="md:col-span-2 space-y-6">
              <QuickActionGrid 
                title="💸 Registrar Egresos"
                subtitle={`Viendo botones de ${resolvedDisplayName}`}
                actions={quickActionsManager.quickExpenses}
                selectedId={quickActionsManager.selectedExpenseId}
                onSelect={(id) => quickActionsManager.handleExpenseCardClick?.(id, playerManager.isEditMode)}
                onActionClick={handleProcessTransactionWithRetroactive}
                onAddClick={(data, type) => quickActionsManager.handleAddAction(data, type)}
                isEditMode={playerManager.isEditMode}
                onEditImage={(id) => setActiveImageTarget(id)}
                onDelete={(id, type) => quickActionsManager.handleDeleteAction(id, type)}
                onAddCustom={() => { quickActionsManager.setModalType('expense'); quickActionsManager.setIsAddCustomOpen(true); }}
                onExportPDF={() => exportTransactionsToPDF(txManager.recentTransactions.filter(t => t.transaction_type === 'expense'))}
                bgColor="bg-rose-500/15"
                titleColor="text-rose-950"
                subtitleColor="text-rose-800"
                isExpense={true}
                type="expense"
                presetIcons={PRESET_ICONS}
                retroactiveDate={retroactiveDate}
                setRetroactiveDate={setRetroactiveDate}
                onReorderActions={(newItems, type) => quickActionsManager.handleReorderActions?.(newItems, type)}
              />

              <QuickActionGrid 
                title="💰 Registrar Ingresos"
                subtitle={`Viendo botones de ${resolvedDisplayName}`}
                actions={quickActionsManager.quickIncomes}
                onActionClick={handleProcessTransactionWithRetroactive}
                onAddClick={(data, type) => quickActionsManager.handleAddAction(data, type)}
                isEditMode={playerManager.isEditMode}
                onEditImage={(id) => setActiveImageTarget(id)}
                onDelete={(id, type) => quickActionsManager.handleDeleteAction(id, type)}
                onAddCustom={() => { quickActionsManager.setModalType('income'); quickActionsManager.setIsAddCustomOpen(true); }}
                onExportPDF={() => exportTransactionsToPDF(txManager.recentTransactions.filter(t => t.transaction_type === 'income'))}
                bgColor="bg-emerald-500/15"
                titleColor="text-emerald-950"
                subtitleColor="text-emerald-800"
                isExpense={false}
                type="income"
                presetIcons={PRESET_ICONS}
                retroactiveDate={retroactiveDate}
                setRetroactiveDate={setRetroactiveDate}
                onReorderActions={(newItems, type) => quickActionsManager.handleReorderActions?.(newItems, type)}
              />

              <MetasAhorroSeccion activeUser={targetUserIdForMetas} />

              <RecentTransactions 
                transactions={txManager.recentTransactions}
                onDelete={txManager.handleDeleteTransaction}
                onUpdate={txManager.handleUpdateTransactionAmount}
              />
            </div>
          </section>

          <PlayerProgressSection 
            activePlayers={txManager.activePlayers}
            activeUser={resolvedDisplayName}
            isSampleData={txManager.isSampleData}
          />
        </div>
      )}

      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* --- MODAL DE VERIFICACIÓN EDITABLE PARA EL JSON DE IA --- */}
      {isVerificationOpen && pendingExpenseData && (
        <VerificationModalEditable 
          initialData={pendingExpenseData}
          onClose={() => setIsVerificationOpen(false)}
          onSave={handleSaveVerifiedExternalExpense}
        />
      )}

      {txManager.lastSavedTx && (
        <div className="fixed bottom-24 right-6 z-50 bg-black text-white border-4 border-amber-400 p-4 rounded-3xl shadow-[8px_8px_0px_0px_rgba(251,191,36,1)] flex items-center gap-4 font-mono">
          <div>
            <p className="text-xs font-black uppercase text-amber-300">✨ Movimiento Registrado</p>
            <p className="text-[11px] text-stone-300">{txManager.lastSavedTx.concept}: {formatearMoneda(txManager.lastSavedTx.amount)}</p>
          </div>
          <button
            type="button"
            onClick={() => txManager.handleDeleteTransaction(txManager.lastSavedTx.id)}
            className="bg-amber-400 text-black border-2 border-black px-3 py-2 rounded-2xl font-black text-xs uppercase cursor-pointer"
          >
            Deshacer
          </button>
        </div>
      )}

      {quickActionsManager.isAddCustomOpen && (
        <AddCustomButtonModal 
          onClose={() => quickActionsManager.setIsAddCustomOpen(false)} 
          onSubmit={handleCustomButtonSubmit}
          name={customName} setName={setCustomName}
          amount={customAmount} setAmount={setCustomAmount}
          cat={customCategory} setCat={setCustomCategory}
          date={retroactiveDate} setDate={setRetroactiveDate}
          presetIcons={PRESET_ICONS}
          onSelectIcon={(iconUrl) => setSelectedIcon(iconUrl)}
        />
      )}

      {activeImageTarget && (
        <EditImageModal 
          onClose={() => setActiveImageTarget(null)} 
          currentLabel={usersList.find(b => b.id === activeImageTarget)?.label || ''} 
          onSaveConfig={handleSaveImageConfig} 
          presetIcons={PRESET_ICONS}
        />
      )}

      {isOcrOpen && (
        <OCRScanner 
          onScanSuccess={handleScanSuccessOCR} 
          onClose={() => setIsOcrOpen(false)} 
        />
      )}
    </div>
  );
}

// --- SUBCOMPONENTE DE MODAL EDITABLE (LISTA DE PRODUCTOS Y PRECIOS) ---
function VerificationModalEditable({ initialData, onClose, onSave }) {
  const [concept, setConcept] = useState(initialData.concept || '');
  const [amount, setAmount] = useState(initialData.amount || 0);
  const [date, setDate] = useState(initialData.date || new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(initialData.category || 'SUPERMERCADO');
  const [description, setDescription] = useState(initialData.description || '');
  const [items, setItems] = useState(initialData.items || []);

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    
    if (field === 'price' || field === 'quantity') {
      const q = Number(updated[index].quantity) || 0;
      const p = Number(updated[index].price) || 0;
      updated[index].subtotal = q * p;
    }
    
    setItems(updated);
    
    // Recalcular total general automáticamente
    const newTotal = updated.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
    setAmount(newTotal);
  };

  const handleAddItem = () => {
    setItems([...items, { name: 'NUEVO ARTÍCULO', quantity: 1, price: 0, subtotal: 0 }]);
  };

  const handleDeleteItem = (index) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    const newTotal = updated.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
    setAmount(newTotal);
  };

  const handleConfirmSave = () => {
    onSave({
      concept,
      amount: Number(amount),
      date,
      category,
      description,
      items
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border-4 border-black rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col gap-4 max-h-[90vh] overflow-y-auto font-mono">
        
        <div className="flex justify-between items-center border-b-2 border-black pb-3">
          <h3 className="font-black text-sm uppercase text-black flex items-center gap-2">
            <span>✨</span> Verificar y Editar Ticket de Chedraui
          </h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="bg-rose-400 hover:bg-rose-500 border-2 border-black px-2.5 py-1 rounded-xl font-black text-xs cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,1)]"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-black uppercase text-gray-700">Concepto:</label>
            <input 
              type="text" 
              value={concept} 
              onChange={(e) => setConcept(e.target.value.toUpperCase())} 
              className="w-full border-2 border-black rounded-xl p-2 text-xs font-bold bg-white uppercase"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-gray-700">Total ($):</label>
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              className="w-full border-2 border-black rounded-xl p-2 text-xs font-bold bg-amber-50"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-gray-700">Fecha:</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="w-full border-2 border-black rounded-xl p-2 text-xs font-bold bg-white"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-gray-700">Categoría:</label>
            <input 
              type="text" 
              value={category} 
              onChange={(e) => setCategory(e.target.value.toUpperCase())} 
              className="w-full border-2 border-black rounded-xl p-2 text-xs font-bold bg-white uppercase"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-gray-700">Descripción / Detalles:</label>
          <textarea 
            rows={2}
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            className="w-full border-2 border-black rounded-xl p-2 text-xs font-mono bg-white"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="font-black text-xs uppercase text-black">Artículos del Ticket ({items.length}):</span>
            <button 
              type="button" 
              onClick={handleAddItem}
              className="bg-emerald-300 hover:bg-emerald-400 border-2 border-black px-2.5 py-1 rounded-xl font-black text-[10px] uppercase cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,1)]"
            >
              + Agregar Artículo
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row gap-2 items-center bg-gray-50 border-2 border-black p-2.5 rounded-xl">
                <input 
                  type="text" 
                  value={item.name} 
                  onChange={(e) => handleItemChange(idx, 'name', e.target.value.toUpperCase())}
                  className="flex-1 border-2 border-black rounded-lg p-1.5 text-xs font-bold w-full bg-white uppercase"
                  placeholder="Nombre"
                />
                <div className="flex gap-2 w-full sm:w-auto items-center">
                  <div className="w-16">
                    <label className="text-[9px] block text-gray-500 font-bold">Cant.</label>
                    <input 
                      type="number" 
                      value={item.quantity} 
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full border-2 border-black rounded-lg p-1.5 text-xs font-bold text-center bg-white"
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-[9px] block text-gray-500 font-bold">Precio</label>
                    <input 
                      type="number" 
                      value={item.price} 
                      onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                      className="w-full border-2 border-black rounded-lg p-1.5 text-xs font-bold text-center bg-white"
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-[9px] block text-gray-500 font-bold">Subtotal</label>
                    <input 
                      type="number" 
                      value={item.subtotal} 
                      disabled
                      className="w-full border-2 border-black rounded-lg p-1.5 text-xs font-bold bg-gray-200 text-center"
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => handleDeleteItem(idx)}
                    className="bg-rose-400 hover:bg-rose-500 border-2 border-black px-2.5 py-1.5 rounded-lg text-xs font-black self-end sm:self-auto cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t-2 border-black">
          <button 
            type="button" 
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 border-2 border-black px-4 py-2 rounded-xl font-black text-xs uppercase cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={handleConfirmSave}
            className="bg-emerald-400 hover:bg-emerald-500 border-2 border-black px-4 py-2 rounded-xl font-black text-xs uppercase cursor-pointer shadow-[2px_2px_0px_rgba(0,0,0,1)] text-black"
          >
            💾 Guardar en Finanzas
          </button>
        </div>

      </div>
    </div>
  );
}