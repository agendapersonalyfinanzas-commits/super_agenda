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
import AnalyticsScreen from './AnalyticsScreen.jsx'; // 👈 Corregido a ruta local correcta

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
  
  // 🌟 Recuperar estado inicial desde localStorage para evitar pérdida al cambiar de pestaña
  const [auditorMode, setAuditorMode] = useState(() => obtenerDeStorage('family_auditor_mode', false));
  const [selectedAuditedUser, setSelectedAuditedUser] = useState(() => obtenerDeStorage('family_audited_user', null));
  
  const [usersList, setUsersList] = useState(() => obtenerDeStorage(PROFILES_CACHE_KEY, [])); 
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [retroactiveDate, setRetroactiveDate] = useState(() => new Date().toISOString().split('T')[0]);

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

  // 🌟 Sincronizar cambios de Modo Dios y Usuario Auditado en LocalStorage
  useEffect(() => {
    guardarEnStorage('family_auditor_mode', auditorMode);
  }, [auditorMode]);

  useEffect(() => {
    guardarEnStorage('family_audited_user', selectedAuditedUser);
  }, [selectedAuditedUser]);

  // 🌟 OBTENER EL USUARIO OBJETIVO EXACTO
  const targetUserForTx = useMemo(() => {
    if (!auditorMode) {
      return null;
    }
    if (!selectedAuditedUser) {
      return null;
    }

    const foundUser = usersList.find(
      (u) => u.id === selectedAuditedUser || 
            (u.nombre && selectedAuditedUser && u.nombre.trim().toUpperCase() === String(selectedAuditedUser).trim().toUpperCase())
    );

    if (foundUser) {
      return foundUser;
    }

    return selectedAuditedUser;
  }, [auditorMode, selectedAuditedUser, usersList]);

  const playerManager = usePlayerManagement(targetUserForTx, auditorMode);

  // UUID limpio para metas de ahorro y agenda
  const targetUserIdForMetas = useMemo(() => {
    if (!auditorMode) {
      return currentUser?.id || '';
    }
    if (!selectedAuditedUser) {
      return '';
    }
    if (typeof selectedAuditedUser === 'object' && selectedAuditedUser !== null) {
      return selectedAuditedUser.id || '';
    }
    const foundUser = usersList.find(
      (u) => u.id === selectedAuditedUser || 
            (u.nombre && selectedAuditedUser && u.nombre.trim().toUpperCase() === String(selectedAuditedUser).trim().toUpperCase())
    );
    return foundUser ? foundUser.id : selectedAuditedUser;
  }, [auditorMode, selectedAuditedUser, currentUser, usersList]);

  // Nombre para mostrar en los títulos, gráficas y agenda
  const resolvedDisplayName = useMemo(() => {
    if (auditorMode) {
      if (!selectedAuditedUser) {
        return 'SELECCIONA USUARIO';
      }
      const found = usersList.find(
        (u) => u.id === selectedAuditedUser || 
              (u.nombre && selectedAuditedUser && u.nombre.trim().toUpperCase() === String(selectedAuditedUser).trim().toUpperCase())
      );
      if (found) {
        return `${found.nombre || ''} ${found.apellido_paterno || ''}`.trim();
      }
      if (typeof selectedAuditedUser === 'string') {
        return selectedAuditedUser;
      }
    }
    return playerManager.activeUser || currentUser?.email?.split('@')[0] || 'USUARIO';
  }, [auditorMode, selectedAuditedUser, usersList, playerManager.activeUser, currentUser]);

  // Objeto o identificador que se pasa a los hooks principales
  const effectiveUserForHooks = useMemo(() => {
    if (!auditorMode) {
      return playerManager.activeUser || currentUser?.email;
    }
    return targetUserForTx;
  }, [auditorMode, targetUserForTx, playerManager.activeUser, currentUser]);

  // --- HOOKS PRINCIPALES ---
  const txManager = useTransactionsManager(
    effectiveUserForHooks,
    auditorMode,
    currentUser?.email === 'maestroluisricardo17@gmail.com',
    usersList
  );

  const quickActionsManager = useQuickActionsManager(effectiveUserForHooks, auditorMode);

  // Carga inicial de perfiles y sesión
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
    guardarEnStorage('family_auditor_mode', nextMode); // 👈 Persistencia inmediata
    if (!nextMode) {
      setSelectedAuditedUser(null);
      guardarEnStorage('family_audited_user', null); // 👈 Limpiar storage al desactivar
    }
  };

  const handleSignOut = async () => {
    try { await supabase.auth.signOut({ scope: 'global' }); } catch (e) {}
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = window.location.origin;
  };

  const handleCustomButtonSubmit = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const payload = {
      name: customName.trim().toUpperCase() || 'NUEVO',
      amount: Number(customAmount) || 0,
      category: customCategory.trim().toUpperCase() || 'VARIOS',
      icon: selectedIcon || PRESET_ICONS[0],
      type: quickActionsManager.modalType || 'expense'
    };
    if (typeof quickActionsManager.handleAddAction === 'function') {
      quickActionsManager.handleAddAction(payload, payload.type);
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
          
          {/* BARRA SUPERIOR */}
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
            isAuditor={auditorMode}
            usersList={usersList}
            selectedAuditedUser={selectedAuditedUser}
            setSelectedAuditedUser={(user) => {
              setSelectedAuditedUser(user);
              guardarEnStorage('family_audited_user', user); // 👈 Persistencia al cambiar usuario seleccionado
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
          onScanSuccess={async (res) => {
            setIsOcrOpen(false);
            try {
              const expensePayload = {
                concept: res.concept || 'COMPRA CON TICKET',
                amount: res.amount || 0,
                category: res.category || 'MERCADO',
                date: retroactiveDate,
                is_retroactive: Boolean(retroactiveDate)
              };
              await txManager.handleSaveTransaction(expensePayload, 'expense');
              alert(`¡Ticket guardado!\nComercio: ${expensePayload.concept}\nMonto: ${formatearMoneda(expensePayload.amount)}`);
            } catch (err) {
              alert('Error al registrar gasto del ticket.');
            }
          }} 
          onClose={() => setIsOcrOpen(false)} 
        />
      )}
    </div>
  );
}