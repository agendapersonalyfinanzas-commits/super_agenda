import React, { useState, useEffect, useRef } from 'react';

// Cliente Supabase
import { supabase } from '../../../supabaseClient';

// Utilidades
import { formatearMoneda, aNumero } from '../../../utils/moneda.js';
import { aMayusculas } from '../../../utils/mayusculas.js';
import { obtenerMensajeError } from '../../../utils/errores.js';
import { guardarEnStorage, obtenerDeStorage, KEYS } from '../../../utils/storage.js';

// Módulos y componentes
import * as HeaderModule from '../../Expenses/DashboardHeader';
import * as AddCustomModalModule from '../../Expenses/AddCustomButtonModal';
import * as EditImageModalModule from '../../Expenses/EditImageModal';
import * as OCRScannerModule from '../../Expenses/OCRScanner';
import * as QuickExpenseButtonModule from '../QuickExpenseButton';

// Imágenes de personajes / iconos
import charlieMarket from '../../../assets/charlie-market.png';
import linusDulces from '../../../assets/linus-dulces.png';
import lucyAnalytics from '../../../assets/lucy-analytics.png';
import lucySecretaria from '../../../assets/lucy-secretaria.png';
import sallyOficinista from '../../../assets/sally-oficinista.png';
import schroederLimonada from '../../../assets/schroeder-limonada.png';
import snoopyFood from '../../../assets/snoopy-food.png';
import snoopyGasolina from '../../../assets/snoopy-gasolina.png';
import snoopyMaestro from '../../../assets/snoopy-maestro.png';
import snoopyRepair from '../../../assets/snoopy-repair.png';
import snoppyAlquiler from '../../../assets/snoppy-alquiler.png';
import superSnoopy from '../../../assets/super-snoopy.png';
import woodstockTravel from '../../../assets/woodstock-travel.png';

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
const QuickExpenseButton = resolveComponent(QuickExpenseButtonModule, 'QuickExpenseButton');

const PRESET_MAP = {
  'lucy-analytics': lucyAnalytics,
};

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

// NOMBRES DE MUESTRA (SE USA SI AÚN NO HAY USUARIOS REALES REGISTRADOS)
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
  
  // Lista dinámica de jugadores reales / muestra
  const [activePlayers, setActivePlayers] = useState([]);
  const [isSampleData, setIsSampleData] = useState(false);

  const isSeedingRef = useRef(false);

  // PERSISTENCIA AUTOMÁTICA DE SESIÓN EN LOCALSTORAGE
  useEffect(() => {
    guardarEnStorage(KEYS.ACTIVE_USER, activeUser);
  }, [activeUser]);

  useEffect(() => {
    guardarEnStorage(KEYS.CUSTOM_USERS, customUsers);
  }, [customUsers]);

  // CARGAR Y CALCULAR JUGADORES Y TOTALES REALES DESDE SUPABASE
  const fetchActionsAndTotals = async () => {
    if (isSeedingRef.current) return;
    try {
      // 1. Cargar Botones Rápidos
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

      setQuickButtons(actions.filter((a) => a.action_type === 'expense'));
      setQuickIncomes(actions.filter((a) => a.action_type === 'income'));

      // 2. Cargar Transacciones
      const { data: trans, error: transError } = await supabase.from('transactions').select('*');
      
      if (!transError && trans) {
        // Totales globales
        const expensesSum = trans
          .filter(t => t.transaction_type === 'expense')
          .reduce((acc, curr) => acc + aNumero(curr.amount), 0);
          
        const incomeSum = trans
          .filter(t => t.transaction_type === 'income')
          .reduce((acc, curr) => acc + aNumero(curr.amount), 0);

        setWeeklyTotal(expensesSum);
        setTotalIncome(incomeSum);

        // Extraer usuarios participantes reales desde las transacciones y lista local
        const realUsersFromTrans = trans.map(t => t.user_name ? aMayusculas(t.user_name) : null).filter(Boolean);
        const allRealUsers = Array.from(new Set([...realUsersFromTrans, ...customUsers, activeUser]));

        // Determinar si hay usuarios reales participantes o mostrar muestra
        const hasRealData = trans.length > 0 || customUsers.length > 0;
        setIsSampleData(!hasRealData);

        const balancesMap = {};

        if (hasRealData) {
          // Usar usuarios reales
          allRealUsers.forEach(u => { balancesMap[u] = 0; });

          trans.forEach(t => {
            const userKey = t.user_name ? aMayusculas(t.user_name) : activeUser;
            if (!(userKey in balancesMap)) {
              balancesMap[userKey] = 0;
            }
            const val = aNumero(t.amount);
            if (t.transaction_type === 'income') {
              balancesMap[userKey] += val;
            } else {
              balancesMap[userKey] -= val;
            }
          });
        } else {
          // Datos de muestra (Valores iniciales de Peanuts)
          balancesMap[SAMPLE_USERS[0]] = 1850;
          balancesMap[SAMPLE_USERS[1]] = 500;
          balancesMap[SAMPLE_USERS[2]] = 1200;
        }

        const computedPlayers = Object.keys(balancesMap).map(username => ({
          username,
          balance: balancesMap[username]
        }));

        // Ordenar por balance de mayor a menor
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
    const amountVal = typeof data === 'object' ? aNumero(data.amount) : aNumero(data);
    const catVal = typeof data === 'object' ? aMayusculas(data.category) : 'GENERAL';
    const conceptVal = typeof data === 'object' ? aMayusculas(data.concept) : 'GASTO';

    const { error } = await supabase.from('transactions').insert([
      {
        transaction_type: 'expense',
        amount: amountVal,
        category: catVal,
        concept: conceptVal,
        user_name: activeUser,
        transaction_date: new Date().toISOString()
      }
    ]);

    if (!error) fetchActionsAndTotals();
    else alert('Error al registrar gasto: ' + obtenerMensajeError(error));
  };

  const handleSaveIncome = async (data) => {
    const amountVal = typeof data === 'object' ? aNumero(data.amount) : aNumero(data);
    const catVal = typeof data === 'object' ? aMayusculas(data.category) : 'GENERAL';
    const conceptVal = typeof data === 'object' ? aMayusculas(data.concept) : 'INGRESO';

    const { error } = await supabase.from('transactions').insert([
      {
        transaction_type: 'income',
        amount: amountVal,
        category: catVal,
        concept: conceptVal,
        user_name: activeUser,
        transaction_date: new Date().toISOString()
      }
    ]);

    if (!error) fetchActionsAndTotals();
    else alert('Error al registrar ingreso: ' + obtenerMensajeError(error));
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

  const maxBalance = Math.max(...activePlayers.map((b) => Math.abs(b.balance)), 1);
  const availableUsersList = Array.from(new Set([activeUser, ...customUsers, ...activePlayers.map(p => p.username)]));

  return (
    <div className="min-h-screen bg-[#Fef8e7] p-4 md:p-8 font-mono text-black pb-24 select-none">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* CABECERA */}
        <DashboardHeader onOcrOpen={() => setIsOcrOpen(true)} />
        
        {/* PANEL DE CONTROL DE JUGADOR */}
        <div className="border-4 border-black bg-white p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-stone-600">👤 Jugador Activo:</span>
                <select 
                  value={activeUser} 
                  onChange={(e) => setActiveUser(e.target.value)} 
                  className="px-3 py-1.5 border-2 border-black rounded-xl text-xs font-black bg-amber-400 focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                >
                  {availableUsersList.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <button 
                type="button"
                onClick={() => setIsEditMode(!isEditMode)}
                className={`px-4 py-1.5 border-4 border-black rounded-xl font-black text-xs uppercase tracking-wide shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer ${
                  isEditMode ? 'bg-rose-400 text-black shadow-none translate-x-0.5 translate-y-0.5' : 'bg-amber-400 text-black hover:bg-amber-300'
                }`}
              >
                {isEditMode ? '⚙️ LISTO (GUARDAR)' : '🛠️ EDITAR BOTONES'}
              </button>
            </div>
            
            <button 
              type="button" 
              onClick={() => setShowAddPlayerRow(!showAddPlayerRow)} 
              className="px-3 py-1.5 bg-stone-100 border-2 border-black rounded-xl text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-stone-200 cursor-pointer"
            >
              {showAddPlayerRow ? 'Cancelar' : '➕ Registrar Jugador'}
            </button>
          </div>

          {showAddPlayerRow && (
            <form onSubmit={handleAddNewPlayer} className="flex gap-2 pt-2 border-t-2 border-dashed border-stone-200 items-center">
              <input 
                type="text" 
                value={newPlayerName} 
                onChange={(e) => setNewPlayerName(e.target.value)} 
                placeholder="ESCRIBE TU NOMBRE DE JUGADOR..." 
                maxLength={15} 
                className="flex-1 px-3 py-2 border-2 border-black rounded-xl text-xs font-bold focus:outline-none uppercase" 
              />
              <button type="submit" className="px-4 py-2 bg-emerald-400 border-2 border-black rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer">
                Guardar
              </button>
            </form>
          )}
        </div>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Balance Neto Global */}
          <div className="relative border-4 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden p-6 min-h-48 flex flex-col justify-between bg-white">
            <img src={PRESET_MAP['lucy-analytics']} alt="Lucy" className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none" />
            <div className="relative z-10 space-y-1">
              <h2 className="text-xs font-black uppercase text-stone-600">Balance Neto Global</h2>
              <div className="text-[9px] font-bold text-stone-500 uppercase tracking-tight">
                Ingresos: {formatearMoneda(totalIncome)} | Gastos: {formatearMoneda(weeklyTotal)}
              </div>
            </div>
            <div className={`relative z-10 mt-auto border-4 border-black px-4 py-2 rounded-xl w-fit shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black text-2xl ${
              totalIncome - weeklyTotal >= 0 ? 'bg-emerald-400' : 'bg-red-400'
            }`}>
              {formatearMoneda(totalIncome - weeklyTotal)}
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            
            {/* BOTONERA GASTOS */}
            <div className="border-4 border-black bg-rose-500/15 p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
              <div>
                <h2 className="text-sm font-black uppercase text-rose-950">💸 Registrar Egresos</h2>
                <p className="text-[10px] font-bold text-rose-800 uppercase tracking-tight">Guarda tus gastos como {activeUser}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 justify-items-center touch-none">
                {quickButtons.map((btn) => (
                  <div key={btn.id} className="relative">
                    <div onClick={isEditMode ? () => setActiveImageTarget(btn.id) : undefined} className={isEditMode ? 'cursor-pointer relative z-10' : ''}>
                      <QuickExpenseButton 
                        icon={btn.icon_url} 
                        label={btn.label} 
                        defaultAmount={btn.default_amount} 
                        category={btn.category} 
                        onSave={isEditMode ? () => setActiveImageTarget(btn.id) : handleSaveExpense} 
                      />
                    </div>
                    {isEditMode && (
                      <div className="absolute -top-2 -right-2 flex gap-1 z-30 pointer-events-auto">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setActiveImageTarget(btn.id); }} className="bg-amber-400 border-2 border-black font-black text-[11px] rounded-full w-6 h-6 flex items-center justify-center cursor-pointer">📷</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteButton(btn.id); }} className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-[11px] font-black border-2 border-black">✕</button>
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex flex-col items-center gap-2">
                  <button type="button" onClick={() => { setModalType('expense'); setIsAddCustomOpen(true); }} className="w-28 h-28 flex items-center justify-center bg-white border-4 border-black rounded-full text-black text-3xl font-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:scale-105 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer">+</button>
                  <span className="text-[11px] font-black uppercase bg-white border-2 border-black px-2 py-0.5 rounded-lg text-rose-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Añadir</span>
                </div>
              </div>
            </div>

            {/* BOTONERA INGRESOS */}
            <div className="border-4 border-black bg-emerald-500/15 p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
              <div>
                <h2 className="text-sm font-black uppercase text-emerald-950">💰 Registrar Ingresos</h2>
                <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-tight">Guarda tus entradas de dinero como {activeUser}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 justify-items-center touch-none">
                {quickIncomes.map((inc) => (
                  <div key={inc.id} className="relative">
                    <div onClick={isEditMode ? () => setActiveImageTarget(inc.id) : undefined} className={isEditMode ? 'cursor-pointer relative z-10' : ''}>
                      <QuickExpenseButton 
                        icon={inc.icon_url} 
                        label={inc.label} 
                        defaultAmount={inc.default_amount} 
                        category={inc.category} 
                        onSave={isEditMode ? () => setActiveImageTarget(inc.id) : handleSaveIncome} 
                      />
                    </div>
                    {isEditMode && (
                      <div className="absolute -top-2 -right-2 flex gap-1 z-30 pointer-events-auto">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setActiveImageTarget(inc.id); }} className="bg-amber-400 border-2 border-black font-black text-[11px] rounded-full w-6 h-6 flex items-center justify-center cursor-pointer">📷</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteButton(inc.id); }} className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-[11px] font-black border-2 border-black">✕</button>
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex flex-col items-center gap-2">
                  <button type="button" onClick={() => { setModalType('income'); setIsAddCustomOpen(true); }} className="w-28 h-28 flex items-center justify-center bg-white border-4 border-black rounded-full text-black text-3xl font-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:scale-105 transition-all cursor-pointer">+</button>
                  <span className="text-[11px] font-black uppercase bg-white border-2 border-black px-2 py-0.5 rounded-lg text-emerald-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Añadir</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* TABLERO GAMIFICADO - DINÁMICO SEGÚN USUARIOS REALES O MUESTRA */}
        <section className="border-4 border-black bg-amber-400 p-6 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-black uppercase">🏆 Avance de Disciplina Financiera</h2>
            {isSampleData && (
              <span className="text-[10px] font-black bg-white border-2 border-black px-2 py-0.5 rounded-full uppercase">
                Modo Muestra
              </span>
            )}
          </div>
          <div className="space-y-3 bg-white border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            {activePlayers.length === 0 ? (
              <p className="text-xs font-bold text-center text-stone-500 uppercase">Cargando avance de los jugadores...</p>
            ) : (
              activePlayers.map((user, idx) => (
                <div key={user.username} className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-black uppercase">
                    <span>
                      {idx === 0 ? '👑' : '⭐'} {idx + 1}. {user.username} {user.username === activeUser && '(TÚ)'}
                    </span>
                    <span className={user.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {formatearMoneda(user.balance)} {user.balance >= 0 ? 'DISPONIBLE' : 'DEUDA'}
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 border-2 border-black rounded-lg h-4 overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] relative">
                    <div 
                      style={{ 
                        width: `${Math.max(5, Math.min(100, Math.abs(user.balance) > 0 ? (Math.abs(user.balance) / maxBalance) * 100 : 5))}%` 
                      }} 
                      className={`h-full border-r-2 border-black transition-all duration-500 ${
                        user.balance >= 0 
                          ? user.username === activeUser ? 'bg-amber-400' : 'bg-sky-400'
                          : 'bg-rose-400'
                      }`} 
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

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