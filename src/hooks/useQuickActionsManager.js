import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { obtenerDeStorage, guardarEnStorage, KEYS } from '../utils/storage.js';

const DEFAULT_EXPENSES = [
  { id: 'exp-1', name: 'COMIDA', label: 'COMIDA', concept: 'COMIDA', category: 'ALIMENTACION', icon: '/snoopy-food.png', amount: 0 },
  { id: 'exp-2', name: 'GASOLINA', label: 'GASOLINA', concept: 'GASOLINA', category: 'TRANSPORTE', icon: '/snoopy-gasolina.png', amount: 0 },
  { id: 'exp-3', name: 'OXXO / CAFE', label: 'OXXO / CAFE', concept: 'OXXO', category: 'VARIOS', icon: '/charlie-market.png', amount: 0 },
  { id: 'exp-4', name: 'SUPER', label: 'SUPER', concept: 'SUPERMERCADO', category: 'ALIMENTACION', icon: '/charlie-market.png', amount: 0 }
];

const DEFAULT_INCOMES = [
  { id: 'inc-1', name: 'NOMINA', label: 'NOMINA', concept: 'NOMINA', category: 'SUELDO', icon: '/finanzas.png', amount: 0 },
  { id: 'inc-2', name: 'VENTAS', label: 'VENTAS', concept: 'VENTAS', category: 'NEGOCIO', icon: '/finanzas.png', amount: 0 }
];

export function useQuickActionsManager() {
  const [quickExpenses, setQuickExpenses] = useState(() => {
    const saved = obtenerDeStorage(KEYS?.QUICK_EXPENSES || 'quick_expenses', null);
    return (Array.isArray(saved) && saved.length > 0) ? saved : DEFAULT_EXPENSES;
  });

  const [quickIncomes, setQuickIncomes] = useState(() => {
    const saved = obtenerDeStorage(KEYS?.QUICK_INCOMES || 'quick_incomes', null);
    return (Array.isArray(saved) && saved.length > 0) ? saved : DEFAULT_INCOMES;
  });

  const [selectedAction, setSelectedAction] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);
  const [modalType, setModalType] = useState('expense');
  const [addCustomType, setAddCustomType] = useState('expense');

  // Sincronizar desde la tabla 'expenses' de Supabase
  const fetchUserQuickActions = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const userId = session.user.id;

      const { data: dbActions, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId);

      if (!error && dbActions && dbActions.length > 0) {
        const exp = dbActions
          .filter(a => a.type === 'expense' || a.transaction_type === 'expense')
          .map(a => ({
            ...a,
            label: a.label || a.name || a.concept,
            concept: a.concept || a.name || a.label,
            icon: a.icon || a.image || '/charlie-market.png'
          }));

        const inc = dbActions
          .filter(a => a.type === 'income' || a.transaction_type === 'income')
          .map(a => ({
            ...a,
            label: a.label || a.name || a.concept,
            concept: a.concept || a.name || a.label,
            icon: a.icon || a.image || '/finanzas.png'
          }));

        if (exp.length > 0) setQuickExpenses(exp);
        if (inc.length > 0) setQuickIncomes(inc);
      }
    } catch (err) {
      console.warn('Cargando botones desde almacenamiento local...');
    }
  }, []);

  useEffect(() => {
    fetchUserQuickActions();
  }, [fetchUserQuickActions]);

  // 🔥 REORDENAR Y GUARDAR EN STORAGE
  const handleReorderActions = (reorderedList, type = 'expense') => {
    if (type === 'expense') {
      setQuickExpenses(reorderedList);
      try { guardarEnStorage(KEYS?.QUICK_EXPENSES || 'quick_expenses', reorderedList); } catch (e) {}
    } else {
      setQuickIncomes(reorderedList);
      try { guardarEnStorage(KEYS?.QUICK_INCOMES || 'quick_incomes', reorderedList); } catch (e) {}
    }
  };

  // 🔥 GUARDAR / EDITAR SIN DUPLICAR (Corregido para enviar solo columnas válidas a Supabase)
  const handleAddAction = async (newActionData, typeArg = 'expense', isEditing = false) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      const raw = (typeof newActionData === 'object' && newActionData !== null) ? newActionData : {};
      const targetType = raw.type || typeArg || modalType || addCustomType;
      const cleanName = (raw.name || raw.label || raw.concept || 'NUEVO').toUpperCase();

      const actionPayload = {
        id: raw.id || `btn_${Date.now()}`,
        name: cleanName,
        label: cleanName,
        concept: (raw.concept || cleanName).toUpperCase(),
        category: (raw.category || 'VARIOS').toUpperCase(),
        amount: Number(raw.amount) || 0,
        icon: raw.icon || raw.image || '/charlie-market.png',
        type: targetType,
        user_id: user?.id || null
      };

      const updateOrAppend = (prev) => {
        const exists = prev.some(item => item.id === actionPayload.id);
        if (exists || isEditing) {
          return prev.map(item => item.id === actionPayload.id ? actionPayload : item);
        }
        return [...prev, actionPayload];
      };

      if (targetType === 'expense') {
        setQuickExpenses(prev => {
          const updated = updateOrAppend(prev);
          try { guardarEnStorage(KEYS?.QUICK_EXPENSES || 'quick_expenses', updated); } catch (e) {}
          return updated;
        });
      } else {
        setQuickIncomes(prev => {
          const updated = updateOrAppend(prev);
          try { guardarEnStorage(KEYS?.QUICK_INCOMES || 'quick_incomes', updated); } catch (e) {}
          return updated;
        });
      }

      // Si hay usuario, se envía únicamente el esquema válido a la tabla 'expenses'
      if (user) {
        await supabase.from('expenses').upsert([{
          id: actionPayload.id,
          category: actionPayload.category,
          amount: actionPayload.amount,
          type: actionPayload.type,
          user_id: user.id
        }], { onConflict: 'id' });
      }
    } catch (err) {
      console.error('Error al agregar/editar botón:', err);
    } finally {
      setIsAddCustomOpen(false);
      setIsModalOpen(false);
    }
  };

  // 🔥 ELIMINAR SEGURO POR ID O ÍNDICE
  const handleDeleteAction = async (id, type = 'expense', indexToDelete = null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && id) {
        await supabase.from('expenses').delete().eq('id', id);
      }

      const filterItems = (prev) => {
        if (indexToDelete !== null && indexToDelete !== undefined && indexToDelete >= 0) {
          return prev.filter((_, idx) => idx !== indexToDelete);
        }
        return prev.filter(item => item.id !== id);
      };

      if (type === 'expense') {
        setQuickExpenses(prev => {
          const updated = filterItems(prev);
          try { guardarEnStorage(KEYS?.QUICK_EXPENSES || 'quick_expenses', updated); } catch (e) {}
          return updated;
        });
      } else {
        setQuickIncomes(prev => {
          const updated = filterItems(prev);
          try { guardarEnStorage(KEYS?.QUICK_INCOMES || 'quick_incomes', updated); } catch (e) {}
          return updated;
        });
      }
    } catch (err) {
      console.error('Error al eliminar botón:', err);
    }
  };

  const handleUpdateActionCustomization = async (id, updates) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && id) {
        // Filtramos para enviar solo datos actualizables válidos
        const safeUpdates = {};
        if (updates.category) safeUpdates.category = updates.category;
        if (updates.amount !== undefined) safeUpdates.amount = updates.amount;
        if (Object.keys(safeUpdates).length > 0) {
          await supabase.from('expenses').update(safeUpdates).eq('id', id);
        }
      }
    } catch (err) {
      console.error('Error al actualizar personalización:', err);
    }

    setQuickExpenses(prev => {
      const updated = prev.map(item => item.id === id ? { ...item, ...updates } : item);
      try { guardarEnStorage(KEYS?.QUICK_EXPENSES || 'quick_expenses', updated); } catch (e) {}
      return updated;
    });

    setQuickIncomes(prev => {
      const updated = prev.map(item => item.id === id ? { ...item, ...updates } : item);
      try { guardarEnStorage(KEYS?.QUICK_INCOMES || 'quick_incomes', updated); } catch (e) {}
      return updated;
    });
  };

  return {
    quickExpenses,
    quickIncomes,
    quickButtons: quickExpenses,
    selectedAction,
    setSelectedAction,
    isModalOpen,
    setIsModalOpen,
    isAddCustomOpen,
    setIsAddCustomOpen,
    modalType,
    setModalType,
    addCustomType,
    setAddCustomType,
    handleAddAction,
    handleDeleteAction,
    handleReorderActions,
    handleUpdateActionCustomization,
    fetchUserQuickActions
  };
}

export default useQuickActionsManager;