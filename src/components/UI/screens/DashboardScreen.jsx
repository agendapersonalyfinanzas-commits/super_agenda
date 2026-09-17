import React, { useState, useEffect, useRef } from 'react';

// Cliente Supabase
import { supabase } from '../../../supabaseClient';

// Utilidades
import { formatearMoneda, aNumero } from '../../../utils/moneda.js';
import { aMayusculas } from '../../../utils/mayusculas.js';
import { obtenerMensajeError } from '../../../utils/errores.js';
import { guardarEnStorage, obtenerDeStorage, KEYS } from '../../../utils/storage.js';
import { exportTransactionsToPDF } from '../../../utils/pdfExportPlugin.js'; // <--- Plugin modular de PDF importado

// Módulos y componentes externos
import * as HeaderModule from '../../Expenses/DashboardHeader';
import * as AddCustomModalModule from '../../Expenses/AddCustomButtonModal';
import * as EditImageModalModule from '../../Expenses/EditImageModal';
import * as OCRScannerModule from '../../Expenses/OCRScanner';

// Componentes UI modularizados (con ruta corregida con ../)
import QuickActionGrid from '../QuickActionGrid.jsx';
import PlayerControlPanel from '../PlayerControlPanel.jsx';
import GlobalBalanceCard from '../GlobalBalanceCard.jsx';
import PlayerProgressSection from '../PlayerProgressSection.jsx';
import RecentTransactions from '../RecentTransactions.jsx';

// Rutas estáticas de imágenes / iconos desde la carpeta public
const charlieMarket = '/charlie-market.png';
const linusDulces = '/linus-dulces.png';
const lucyAnalytics = '/lucy-analytics.png';
const lucySecretaria = '/lucy-secretaria.png';
const sallyOficinista = '/sally-oficinista.png';
const schroederLimonada = '/schroeder-limonada.png';
const snoopyFood = '/snoopy-food.png';
const snoopyGasolina = '/snoopy-gasolina.png';
const snoopyMaestro = '/snoopy-maestro.png';
const snoopyRepair = '/snoopy-repair.png';
const snoppyAlquiler = '/snoppy-alquiler.png';
const superSnoopy = '/super-snoopy.png';
const woodstockTravel = '/woodstock-travel.png';

// RESOLUCIÓN SEGURA DE COMPONENTES
const resolveComponent = (module, fallbackName) => {
  if (!module) return () => <div className="p-2 text-xs font-bold text-red-600 bg-red-100 border border-red-400 rounded">Error al cargar {fallbackName}</div>;
  if (module.default) return module.default;
  if (module[fallbackName]) return module[fallbackName];
  if (typeof module === 'function') return module;
  const firstExport = Object.values(module).find(val => typeof val === 'function');
  return firstExport || (() => <div className="p-2 text-xs font-bold text-red-600 bg-red-100 border border-red-400 rounded">Componente {fallbackName} no válido</div>);
};

const DashboardHeader = resolveComponent(HeaderModule, 'DashboardHeader');
const AddCustomButtonModal = resolveComponent(AddCustomModalModule, 'AddCustomButtonModal');
const EditImageModal = resolveComponent(EditImageModalModule, 'EditImageModal');
const OCRScanner = resolveComponent(OCRScannerModule, 'OCRScanner');

const PRESET_ICONS = [
  charlieMarket,
  linusDulces,
  lucyAnalytics,
  lucySecretaria,
  sallyOficinista,
  schroederLimonada,
  snoopyFood,
  snoopyGasolina,
  snoopyMaestro,
  snoopyRepair,
  snoppyAlquiler,
  superSnoopy,
  woodstockTravel
];

const SAMPLE_USERS = ['SNOOPY (MUESTRA)', 'CHARLIE BROWN (MUESTRA)', 'LUCY (MUESTRA)'];

const INITIAL_EXPENSES = [
  { label: 'SUPER', default_amount: 0, category: 'DESPENSA', icon_url: charlieMarket, action_type: 'expense', sort_order: 1 },
  { label: 'REPARACIÓN', default_amount: 0, category: 'SERVICIOS', icon_url: snoopyRepair, action_type: 'expense', sort_order: 2 },
];

const INITIAL_INCOMES = [
  { label: 'SALARIO', default_amount: 0, category: 'TRABAJO', icon_url: sallyOficinista, action_type: 'income', sort_order: 1 },
];

export default function DashboardScreen() {
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddPlayerRow, setShowAddPlayerRow] = useState(false);
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);
  const [modalType, setModalType] = useState('expense');
  const [activeImageTarget, setActiveImageTarget] = useState(null);

  // ESTADO DE SELECCIÓN PARA INTERCAMBIO (SWAP)
  const [selectedExpenseId, setSelectedExpenseId] = useState(null);

  // ESTADOS PERSISTENTES DE USUARIOS / JUGADORES
  const [customUsers, setCustomUsers] = useState(() => 
    obtenerDeStorage(KEYS.CUSTOM_USERS, [])
  );
  const [activeUser, setActiveUser] = useState(() => 
    obtenerDeStorage(KEYS.ACTIVE_USER, 'SNOOPY')
  );
  const [newPlayerName, setNewPlayerName] = useState('');

  const [customName, setCustomName] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customCategory, setCustomCategory] = useState('VARIOS');
  const [selectedIcon, setSelectedIcon] = useState(null);

  const [totalIncome, setTotalIncome] = useState(0);
  const [weeklyTotal, setWeeklyTotal] = useState(0);

  const [quickButtons, setQuickButtons] = useState([]);
  const [quickIncomes, setQuickIncomes] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [lastSavedTx, setLastSavedTx] = useState(null);
  
  const [activePlayers, setActivePlayers] = useState([]);
  const [isSampleData, setIsSampleData] = useState(false);

  const quickButtonsRef = useRef(quickButtons);
  useEffect(() => {
    quickButtonsRef.current = quickButtons;
  }, [quickButtons]);

  const isSeedingRef = useRef(false);

  useEffect(() => {
    guardarEnStorage(KEYS.ACTIVE_USER, activeUser);
  }, [activeUser]);

  useEffect(() => {
    guardarEnStorage(KEYS.CUSTOM_USERS, customUsers);
  }, [customUsers]);

  const fetchActionsAndTotals = async () => {
    if (isSeedingRef.current) return;
    try {
      let { data: actions, error: actionsError } = await supabase
        .from('quick_actions')
        .select('*')
        .order('sort_order', { ascending: true });

      if (actionsError) throw actionsError;

      if (!actions || actions.length === 0) {
        isSeedingRef.current = true;
        const seedData = [...INITIAL_EXPENSES, ...INITIAL_INCOMES];
        await supabase.from('quick_actions').insert(seedData);

        const { data: freshActions } = await supabase
          .from('quick_actions')
          .select('*')
          .order('sort_order', { ascending: true });

        actions = freshActions || [];
        isSeedingRef.current = false;
      }

      // Limpieza de URLs con /public/ redundantes guardadas en Supabase
      const cleanedActions = (actions || []).map(a => ({
        ...a,
        icon_url: a.icon_url ? a.icon_url.replace(/^\/public/, '') : a.icon_url
      }));

      setQuickButtons(cleanedActions.filter((a) => a.action_type === 'expense'));
      setQuickIncomes(cleanedActions.filter((a) => a.action_type === 'income'));

      const { data: trans, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false });
      
      if (!transError && trans) {
        setRecentTransactions(trans);

        const expensesSum = trans
          .filter(t => t.transaction_type === 'expense')
          .reduce((acc, curr) => acc + aNumero(curr.amount), 0);
          
        const incomeSum = trans
          .filter(t => t.transaction_type === 'income')
          .reduce((acc, curr) => acc + aNumero(curr.amount), 0);

        setWeeklyTotal(expensesSum);
        setTotalIncome(incomeSum);

        const realUsersFromTrans = trans.map(t => t.user_name ? aMayusculas(t.user_name) : null).filter(Boolean);
        const allRealUsers = Array.from(new Set([...realUsersFromTrans, ...customUsers, activeUser]));
        const hasRealData = trans.length > 0 || customUsers.length > 0;
        setIsSampleData(!hasRealData);

        const balancesMap = {};
        if (hasRealData) {
          allRealUsers.forEach(u => { balancesMap[u] = 0; });
          trans.forEach(t => {
            const userKey = t.user_name ? aMayusculas(t.user_name) : activeUser;
            if (!(userKey in balancesMap)) balancesMap[userKey] = 0;
            const val = aNumero(t.amount);
            if (t.transaction_type === 'income') balancesMap[userKey] += val;
            else balancesMap[userKey] -= val;
          });
        } else {
          balancesMap[SAMPLE_USERS[0]] = 1850;
          balancesMap[SAMPLE_USERS[1]] = 500;
          balancesMap[SAMPLE_USERS[2]] = 1200;
        }

        const computedPlayers = Object.keys(balancesMap).map(username => ({
          username,
          balance: balancesMap[username]
        }));
        computedPlayers.sort((a, b) => b.balance - a.balance);
        setActivePlayers(computedPlayers);
      }
    } catch (err) {
      console.error('Error al conectar con Supabase:', obtenerMensajeError(err));
      isSeedingRef.current = false;
    }
  };

  useEffect(() => {
    fetchActionsAndTotals();
  }, [customUsers, activeUser]);

  // --- PERSISTENCIA DE ORDEN EN SUPABASE ---
  const saveNewOrder = async (newList) => {
    try {
      const updates = newList.map((action, i) =>
        supabase.from('quick_actions').update({ sort_order: i + 1 }).eq('id', action.id)
      );
      await Promise.all(updates);
    } catch (err) {
      console.error('Error al actualizar el orden:', err.message);
    }
  };

  // --- LÓGICA DE INTERCAMBIO (SWAP) POR SELECCIÓN DIRECTA ---
  const handleExpenseCardClick = (clickedId) => {
    if (isEditMode) return;

    if (!selectedExpenseId) {
      setSelectedExpenseId(clickedId);
    } else if (selectedExpenseId === clickedId) {
      setSelectedExpenseId(null);
    } else {
      const currentList = [...quickButtonsRef.current];
      const fromIndex = currentList.findIndex(item => item.id === selectedExpenseId);
      const toIndex = currentList.findIndex(item => item.id === clickedId);

      if (fromIndex !== -1 && toIndex !== -1) {
        const temp = currentList[fromIndex];
        currentList[fromIndex] = currentList[toIndex];
        currentList[toIndex] = temp;

        setQuickButtons(currentList);
        saveNewOrder(currentList);
      }
      setSelectedExpenseId(null);
    }
  };

  const handleAddNewPlayer = (e) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    const name = aMayusculas(newPlayerName.trim());
    if (!customUsers.includes(name)) {
      setCustomUsers((prev) => [...prev, name]);
    }
    setActiveUser(name);
    setNewPlayerName('');
    setShowAddPlayerRow(false);
  };

  const handleSaveExpense = async (data) => {
    if (selectedExpenseId) return;
    const amountVal = typeof data === 'object' ? aNumero(data.amount) : aNumero(data);
    const catVal = typeof data === 'object' ? aMayusculas(data.category) : 'GENERAL';
    const conceptVal = typeof data === 'object' ? aMayusculas(data.concept) : 'GASTO';

    const { data: inserted, error } = await supabase.from('transactions').insert([
      {
        transaction_type: 'expense',
        amount: amountVal,
        category: catVal,
        concept: conceptVal,
        user_name: activeUser,
        transaction_date: new Date().toISOString()
      }
    ]).select();

    if (!error) {
      fetchActionsAndTotals();
      if (inserted && inserted[0]) {
        setLastSavedTx(inserted[0]);
        setTimeout(() => setLastSavedTx(null), 5000);
      }
    } else {
      alert('Error al registrar gasto: ' + obtenerMensajeError(error));
    }
  };

  const handleSaveIncome = async (data) => {
    const amountVal = typeof data === 'object' ? aNumero(data.amount) : aNumero(data);
    const catVal = typeof data === 'object' ? aMayusculas(data.category) : 'GENERAL';
    const conceptVal = typeof data === 'object' ? aMayusculas(data.concept) : 'INGRESO';

    const { data: inserted, error } = await supabase.from('transactions').insert([
      {
        transaction_type: 'income',
        amount: amountVal,
        category: catVal,
        concept: conceptVal,
        user_name: activeUser,
        transaction_date: new Date().toISOString()
      }
    ]).select();

    if (!error) {
      fetchActionsAndTotals();
      if (inserted && inserted[0]) {
        setLastSavedTx(inserted[0]);
        setTimeout(() => setLastSavedTx(null), 5000);
      }
    } else {
      alert('Error al registrar ingreso: ' + obtenerMensajeError(error));
    }
  };

  const handleDeleteTransaction = async (id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
      fetchActionsAndTotals();
      if (lastSavedTx?.id === id) setLastSavedTx(null);
    } else {
      alert('Error al eliminar transacción: ' + obtenerMensajeError(error));
    }
  };

  const handleUpdateTransactionAmount = async (id, newAmount) => {
    const { error } = await supabase
      .from('transactions')
      .update({ amount: aNumero(newAmount) })
      .eq('id', id);

    if (!error) {
      fetchActionsAndTotals();
    } else {
      alert('Error al actualizar monto: ' + obtenerMensajeError(error));
    }
  };

  const handleDeleteButton = async (id) => {
    const { error } = await supabase.from('quick_actions').delete().eq('id', id);
    if (!error) fetchActionsAndTotals();
    else alert('Error al eliminar botón: ' + obtenerMensajeError(error));
  };

  const handleAddCustomButton = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const assignedIcon = selectedIcon || (modalType === 'expense' ? snoopyGasolina : superSnoopy);

    const newItem = {
      label: aMayusculas(customName) || (modalType === 'expense' ? 'GASTO' : 'INGRESO'),
      default_amount: aNumero(customAmount),
      category: aMayusculas(customCategory) || 'GENERAL',
      icon_url: assignedIcon,
      action_type: modalType,
      sort_order: 99
    };

    const { error } = await supabase.from('quick_actions').insert([newItem]);

    if (error) {
      alert('Error de Supabase al guardar botón: ' + obtenerMensajeError(error));
    } else {
      await fetchActionsAndTotals();
    }

    setCustomName('');
    setCustomAmount('');
    setSelectedIcon(null);
    setIsAddCustomOpen(false);
  };

  const activeBtnConfig = [...quickButtons, ...quickIncomes].find((b) => b.id === activeImageTarget);

  const handleUpdateImageAndLabel = async (newConfig) => {
    if (!activeImageTarget) return;

    const payload = {};
    if (newConfig.label) payload.label = aMayusculas(newConfig.label);
    if (newConfig.icon || newConfig.image) payload.icon_url = newConfig.icon || newConfig.image;

    if (Object.keys(payload).length > 0) {
      const { error } = await supabase
        .from('quick_actions')
        .update(payload)
        .eq('id', activeImageTarget);

      if (!error) {
        await fetchActionsAndTotals();
      } else {
        alert('Error al actualizar imagen/etiqueta: ' + obtenerMensajeError(error));
      }
    }

    setActiveImageTarget(null);
  };

  const availableUsersList = Array.from(new Set([activeUser, ...customUsers, ...activePlayers.map(p => p.username)]));

  return (
    <div className="min-h-screen bg-[#Fef8e7] p-4 md:p-8 font-mono text-black pb-24 select-none relative">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* CABECERA */}
        <DashboardHeader onOcrOpen={() => setIsOcrOpen(true)} />
        
        {/* PANEL DE CONTROL DE JUGADOR */}
        <PlayerControlPanel 
          activeUser={activeUser}
          setActiveUser={setActiveUser}
          availableUsersList={availableUsersList}
          isEditMode={isEditMode}
          setIsEditMode={setIsEditMode}
          setSelectedExpenseId={setSelectedExpenseId}
          showAddPlayerRow={showAddPlayerRow}
          setShowAddPlayerRow={setShowAddPlayerRow}
          newPlayerName={newPlayerName}
          setNewPlayerName={setNewPlayerName}
          onAddPlayer={handleAddNewPlayer}
        />

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* BALANCE NETO GLOBAL CON SOPORTE PDF */}
          <GlobalBalanceCard 
            totalIncome={totalIncome}
            weeklyTotal={weeklyTotal}
            bgImage={lucyAnalytics}
            transactions={recentTransactions}
          />

          <div className="md:col-span-2 space-y-6">
            
            {/* BOTONERA GASTOS CON SOPORTE PDF FILTRADO */}
            <QuickActionGrid 
              title="💸 Registrar Egresos"
              subtitle="Toca un botón para mover • O toca para registrar"
              actions={quickButtons}
              selectedId={selectedExpenseId}
              onSelect={handleExpenseCardClick}
              onSave={handleSaveExpense}
              isEditMode={isEditMode}
              onEditImage={setActiveImageTarget}
              onDelete={handleDeleteButton}
              onAddCustom={() => { setModalType('expense'); setIsAddCustomOpen(true); }}
              onCancelSelection={() => setSelectedExpenseId(null)}
              onExportPDF={() => exportTransactionsToPDF(recentTransactions.filter(t => t.transaction_type === 'expense'))}
              bgColor="bg-rose-500/15"
              titleColor="text-rose-950"
              subtitleColor="text-rose-800"
              isExpense={true}
            />

            {/* BOTONERA INGRESOS CON SOPORTE PDF FILTRADO */}
            <QuickActionGrid 
              title="💰 Registrar Ingresos"
              subtitle={`Guarda tus entradas de dinero como ${activeUser}`}
              actions={quickIncomes}
              onSave={handleSaveIncome}
              isEditMode={isEditMode}
              onEditImage={setActiveImageTarget}
              onDelete={handleDeleteButton}
              onAddCustom={() => { setModalType('income'); setIsAddCustomOpen(true); }}
              onExportPDF={() => exportTransactionsToPDF(recentTransactions.filter(t => t.transaction_type === 'income'))}
              bgColor="bg-emerald-500/15"
              titleColor="text-emerald-950"
              subtitleColor="text-emerald-800"
              isExpense={false}
            />

            {/* HISTORIAL RÁPIDO DIRECTO A SUPABASE (ÚLTIMOS MOVIMIENTOS) */}
            <RecentTransactions 
              transactions={recentTransactions}
              onDelete={handleDeleteTransaction}
              onUpdate={handleUpdateTransactionAmount}
            />

          </div>
        </section>

        {/* TABLERO GAMIFICADO */}
        <PlayerProgressSection 
          activePlayers={activePlayers}
          activeUser={activeUser}
          isSampleData={isSampleData}
        />
      </div>

      {/* TOAST FLOTANTE DE DESHACER (INMEDIATO 5 SEGUNDOS) */}
      {lastSavedTx && (
        <div className="fixed bottom-6 right-6 z-50 bg-black text-white border-4 border-amber-400 p-4 rounded-3xl shadow-[8px_8px_0px_0px_rgba(251,191,36,1)] flex items-center gap-4 animate-in slide-in-from-bottom-5 font-mono">
          <div>
            <p className="text-xs font-black uppercase text-amber-300">✨ Movimiento Registrado</p>
            <p className="text-[11px] text-stone-300">{lastSavedTx.concept}: {formatearMoneda(lastSavedTx.amount)}</p>
          </div>
          <button
            type="button"
            onClick={() => handleDeleteTransaction(lastSavedTx.id)}
            className="bg-amber-400 text-black border-2 border-black px-3 py-2 rounded-2xl font-black text-xs uppercase cursor-pointer hover:bg-amber-300 shadow active:translate-x-0.5 active:translate-y-0.5"
          >
            Deshacer / Borrar
          </button>
        </div>
      )}

      {/* MODALES */}
      {isAddCustomOpen && (
        <AddCustomButtonModal 
          onClose={() => setIsAddCustomOpen(false)} 
          onSubmit={handleAddCustomButton} 
          name={customName} 
          setName={setCustomName} 
          amount={customAmount} 
          setAmount={setCustomAmount} 
          cat={customCategory} 
          setCat={setCustomCategory} 
          presetIcons={PRESET_ICONS}
          onSelectIcon={setSelectedIcon}
        />
      )}

      {activeImageTarget && (
        <EditImageModal 
          onClose={() => setActiveImageTarget(null)} 
          currentLabel={activeBtnConfig ? activeBtnConfig.label : ''} 
          onSaveConfig={handleUpdateImageAndLabel} 
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