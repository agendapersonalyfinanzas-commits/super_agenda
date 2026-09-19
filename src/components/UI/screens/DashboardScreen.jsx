import React, { useState, useEffect } from 'react';

// Cliente Supabase
import { supabase } from '../../../supabaseClient';

// Utilidades
import { formatearMoneda } from '../../../utils/moneda.js';
import { exportTransactionsToPDF } from '../../../utils/pdfExportPlugin.js';

// --- CUSTOM HOOKS MODULARES
import { usePlayerManagement } from '../../../hooks/usePlayerManagement.js';
import { useTransactionsManager } from '../../../hooks/useTransactionsManager.js';
import { useQuickActionsManager } from '../../../hooks/useQuickActionsManager.js';

// Componentes externos con importación directa (Previene el error de Vite)
import DashboardHeader from '../../Expenses/DashboardHeader';
import AddCustomButtonModal from '../../Expenses/AddCustomButtonModal';
import EditImageModal from '../../Expenses/EditImageModal';
import OCRScanner from '../../Expenses/OCRScanner';

// Componentes UI modularizados
import QuickActionGrid from '../QuickActionGrid.jsx';
import PlayerControlPanel from '../PlayerControlPanel.jsx';
import GlobalBalanceCard from '../GlobalBalanceCard.jsx';
import PlayerProgressSection from '../PlayerProgressSection.jsx';
import RecentTransactions from '../RecentTransactions.jsx';

// Componentes de Navegación y Juegos
import Navigation from '../Navigation.jsx';
import GamesScreen from '../../Games/GamesScreen.jsx';

// Lista exacta de 16 iconos predeterminados
const PRESET_ICONS = [
  '/charlie-market.png',
  '/finanzas.png',
  '/franklin-internet.png',
  '/gastos-medicos.png',
  '/linus-cfe.png',
  '/linus-dulces.png',
  '/lucy-analytics.png',
  '/lucy-secretaria.png',
  '/paty-telcel.png',
  '/schroeder-limonada.png',
  '/snoopy-caev.png',
  '/snoopy-food.png',
  '/snoopy-gasolina.png',
  '/snoopy-maestro.png',
  '/snoopy-repair.png',
  '/snoppy-alquiler.png'
];

export default function DashboardScreen() {
  const [activeTab, setActiveTab] = useState('finances');
  const [currentUser, setCurrentUser] = useState(null);
  const [auditorMode, setAuditorMode] = useState(false);
  const [isOcrOpen, setIsOcrOpen] = useState(false);

  // Estados locales para el modal de edición de imagen/etiqueta
  const [activeImageTarget, setActiveImageTarget] = useState(null);

  // Estados locales para el formulario del modal de botón personalizado
  const [customName, setCustomName] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customCategory, setCustomCategory] = useState('VARIOS');
  const [selectedIcon, setSelectedIcon] = useState(PRESET_ICONS[0]);

  // --- 1. HOOK DE JUGADORES ---
  const playerManager = usePlayerManagement();

  // --- 2. HOOK DE TRANSACCIONES Y TOTALES ---
  const txManager = useTransactionsManager(
    playerManager.activeUser,
    auditorMode,
    currentUser?.email === 'maestroluisricardo17@gmail.com',
    playerManager.availableUsersList
  );

  // --- 3. HOOK DE BOTONERA RÁPIDA ---
  const quickActionsManager = useQuickActionsManager();

  // Obtener usuario autenticado de Supabase
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const isMasterAuditor = currentUser?.email === 'maestroluisricardo17@gmail.com';

  const handleSignOut = async () => {
    try { await supabase.auth.signOut({ scope: 'global' }); } catch (err) {}
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('sb-') || key.includes('supabase') || key.includes('auth') || key.includes('token'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {}
    try { sessionStorage.clear(); } catch (e) {}
    window.location.href = window.location.origin;
  };

  const activeBtnConfig = [...(quickActionsManager.quickExpenses || []), ...(quickActionsManager.quickIncomes || [])].find(
    (b) => b.id === activeImageTarget
  );

  // Manejador limpio que recibe los datos desde el modal y los envía al hook
  const handleCustomButtonSubmit = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    const payload = {
      name: customName.trim().toUpperCase() || 'NUEVO',
      amount: Number(customAmount) || 0,
      category: customCategory.trim().toUpperCase() || 'VARIOS',
      icon: selectedIcon || PRESET_ICONS[0],
      type: quickActionsManager.modalType || 'expense'
    };

    console.log("💾 Guardando botón personalizado:", payload);

    if (typeof quickActionsManager.handleAddAction === 'function') {
      quickActionsManager.handleAddAction(payload, payload.type);
    }

    // Limpiar campos
    setCustomName('');
    setCustomAmount('');
    setCustomCategory('VARIOS');
    setSelectedIcon(PRESET_ICONS[0]);
  };

  // Manejador para actualizar imagen y etiqueta de un botón existente en modo edición
  const handleSaveImageConfig = (newIcon, newLabel) => {
    if (typeof quickActionsManager.handleUpdateActionCustomization === 'function') {
      quickActionsManager.handleUpdateActionCustomization(activeImageTarget, { icon: newIcon, label: newLabel });
    }
    setActiveImageTarget(null);
  };

  return (
    <div className="min-h-screen bg-[#Fef8e7] p-4 md:p-8 font-mono text-black pb-28 select-none relative">
      
      {activeTab === 'games' ? (
        <GamesScreen activeUser={playerManager.activeUser} />
      ) : activeTab === 'agenda' ? (
        <div className="max-w-4xl mx-auto p-8 text-center font-black text-lg">📅 Pantalla de Agenda</div>
      ) : activeTab === 'metrics' ? (
        <div className="max-w-4xl mx-auto p-8 text-center font-black text-lg">📊 Pantalla de Métricas</div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* BARRA SUPERIOR (MODO DIOS / SALIR) */}
          <div className="flex justify-between items-center mb-2">
            {isMasterAuditor ? (
              <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors duration-300 ${auditorMode ? 'bg-red-500' : 'bg-stone-900'}`}>
                <span className={`text-[10px] font-black uppercase tracking-widest ${auditorMode ? 'text-white' : 'text-amber-400'}`}>
                  {auditorMode ? '🔴 DIOS' : '🕵️‍♂️ NORMAL'}
                </span>
                <button
                  type="button"
                  onClick={() => setAuditorMode(!auditorMode)}
                  className={`relative w-12 h-6 border-2 border-black rounded-full cursor-pointer transition-colors ${auditorMode ? 'bg-amber-300' : 'bg-stone-600'}`}
                >
                  <div className={`w-4 h-4 bg-white border-2 border-black rounded-full absolute top-0.5 transition-transform duration-300 ${auditorMode ? 'translate-x-5.5' : 'translate-x-1'}`} />
                </button>
              </div>
            ) : <div />}

            <button
              type="button"
              onClick={handleSignOut}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white border-4 border-black rounded-xl font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            >
              🚪 Cerrar Sesión
            </button>
          </div>

          {auditorMode && (
            <div className="bg-red-500 text-white border-4 border-black p-3 rounded-xl text-center font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse tracking-wide mb-4">
              ⚠️ Precaución
            </div>
          )}

          {/* CABECERA */}
          <DashboardHeader onOcrOpen={() => setIsOcrOpen(true)} />
          
          {/* PANEL DE CONTROL DE USUARIO ÚNICO */}
          <PlayerControlPanel 
            activeUser={playerManager.activeUser}
          />

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <GlobalBalanceCard 
              totalIncome={txManager.totalIncome}
              weeklyTotal={txManager.weeklyTotal}
              bgImage={PRESET_ICONS[6]}
              transactions={txManager.recentTransactions}
            />

            <div className="md:col-span-2 space-y-6">
              
              {/* EGRESOS */}
              <QuickActionGrid 
                title="💸 Registrar Egresos"
                subtitle="Toca un botón para mover • O toca para registrar"
                actions={quickActionsManager.quickExpenses}
                selectedId={quickActionsManager.selectedExpenseId}
                onSelect={(id) => quickActionsManager.handleExpenseCardClick ? quickActionsManager.handleExpenseCardClick(id, playerManager.isEditMode) : null}
                onActionClick={(data, type) => txManager.handleSaveTransaction(data, type)}
                onAddClick={(data, type) => quickActionsManager.handleAddAction(data, type)}
                isEditMode={playerManager.isEditMode}
                onEditImage={(id) => setActiveImageTarget(id)}
                onDelete={(id, type) => quickActionsManager.handleDeleteAction(id, type)}
                onAddCustom={() => { 
                  quickActionsManager.setModalType('expense'); 
                  quickActionsManager.setIsAddCustomOpen(true); 
                }}
                onExportPDF={() => exportTransactionsToPDF(txManager.recentTransactions.filter(t => t.transaction_type === 'expense'))}
                bgColor="bg-rose-500/15"
                titleColor="text-rose-950"
                subtitleColor="text-rose-800"
                isExpense={true}
                type="expense"
                presetIcons={PRESET_ICONS}
              />

              {/* INGRESOS */}
              <QuickActionGrid 
                title="💰 Registrar Ingresos"
                subtitle={`Guarda tus entradas de dinero como ${playerManager.activeUser}`}
                actions={quickActionsManager.quickIncomes}
                onActionClick={(data, type) => txManager.handleSaveTransaction(data, type)}
                onAddClick={(data, type) => quickActionsManager.handleAddAction(data, type)}
                isEditMode={playerManager.isEditMode}
                onEditImage={(id) => setActiveImageTarget(id)}
                onDelete={(id, type) => quickActionsManager.handleDeleteAction(id, type)}
                onAddCustom={() => { 
                  quickActionsManager.setModalType('income'); 
                  quickActionsManager.setIsAddCustomOpen(true); 
                }}
                onExportPDF={() => exportTransactionsToPDF(txManager.recentTransactions.filter(t => t.transaction_type === 'income'))}
                bgColor="bg-emerald-500/15"
                titleColor="text-emerald-950"
                subtitleColor="text-emerald-800"
                isExpense={false}
                type="income"
                presetIcons={PRESET_ICONS}
              />

              {/* HISTORIAL */}
              <RecentTransactions 
                transactions={txManager.recentTransactions}
                onDelete={txManager.handleDeleteTransaction}
                onUpdate={txManager.handleUpdateTransactionAmount}
              />

            </div>
          </section>

          {/* PROGRESO DE JUGADORES */}
          <PlayerProgressSection 
            activePlayers={txManager.activePlayers}
            activeUser={playerManager.activeUser}
            isSampleData={txManager.isSampleData}
          />
        </div>
      )}

      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* TOAST FLOTANTE */}
      {txManager.lastSavedTx && (
        <div className="fixed bottom-24 right-6 z-50 bg-black text-white border-4 border-amber-400 p-4 rounded-3xl shadow-[8px_8px_0px_0px_rgba(251,191,36,1)] flex items-center gap-4 animate-in slide-in-from-bottom-5 font-mono">
          <div>
            <p className="text-xs font-black uppercase text-amber-300">✨ Movimiento Registrado</p>
            <p className="text-[11px] text-stone-300">{txManager.lastSavedTx.concept}: {formatearMoneda(txManager.lastSavedTx.amount)}</p>
          </div>
          <button
            type="button"
            onClick={() => txManager.handleDeleteTransaction(txManager.lastSavedTx.id)}
            className="bg-amber-400 text-black border-2 border-black px-3 py-2 rounded-2xl font-black text-xs uppercase cursor-pointer hover:bg-amber-300 shadow active:translate-x-0.5 active:translate-y-0.5"
          >
            Deshacer / Borrar
          </button>
        </div>
      )}

      {/* MODALES */}
      {quickActionsManager.isAddCustomOpen && (
        <AddCustomButtonModal 
          onClose={() => quickActionsManager.setIsAddCustomOpen(false)} 
          onSubmit={handleCustomButtonSubmit}
          name={customName}
          setName={setCustomName}
          amount={customAmount}
          setAmount={setCustomAmount}
          cat={customCategory}
          setCat={setCustomCategory}
          presetIcons={PRESET_ICONS}
          onSelectIcon={(iconUrl) => setSelectedIcon(iconUrl)}
        />
      )}

      {activeImageTarget && (
        <EditImageModal 
          onClose={() => setActiveImageTarget(null)} 
          currentLabel={activeBtnConfig ? activeBtnConfig.label : ''} 
          onSaveConfig={handleSaveImageConfig} 
          presetIcons={PRESET_ICONS}
        />
      )}

      {isOcrOpen && (
        <OCRScanner 
          onScanSuccess={(res) => { setIsOcrOpen(false); alert('Detectado: ' + formatearMoneda(res.amount)); }} 
          onClose={() => setIsOcrOpen(false)} 
        />
      )}
    </div>
  );
}