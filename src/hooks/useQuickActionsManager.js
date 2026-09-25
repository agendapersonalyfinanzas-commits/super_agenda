import { useState, useEffect, useCallback } from 'react';
import { obtenerDeStorage, guardarEnStorage } from '../utils/storage.js';

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

export function useQuickActionsManager(targetUserIdArg, isAuditingActive) {
  const expensesStorageKey = (isAuditingActive && targetUserIdArg) ? `quick_expenses_${targetUserIdArg}` : 'quick_expenses';
  const incomesStorageKey = (isAuditingActive && targetUserIdArg) ? `quick_incomes_${targetUserIdArg}` : 'quick_incomes';

  const [quickExpenses, setQuickExpenses] = useState(() => {
    const saved = obtenerDeStorage(expensesStorageKey, null);
    return (Array.isArray(saved) && saved.length > 0) ? saved : DEFAULT_EXPENSES;
  });

  const [quickIncomes, setQuickIncomes] = useState(() => {
    const saved = obtenerDeStorage(incomesStorageKey, null);
    return (Array.isArray(saved) && saved.length > 0) ? saved : DEFAULT_EXPENSES;
  });

  const [selectedAction, setSelectedAction] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);
  const [modalType, setModalType] = useState('expense');
  const [addCustomType, setAddCustomType] = useState('expense');

  const fetchUserQuickActions = useCallback(() => {
    try {
      const savedExp = obtenerDeStorage(expensesStorageKey, null);
      const savedInc = obtenerDeStorage(incomesStorageKey, null);

      setQuickExpenses((Array.isArray(savedExp) && savedExp.length > 0) ? savedExp : DEFAULT_EXPENSES);
      setQuickIncomes((Array.isArray(savedInc) && savedInc.length > 0) ? savedInc : DEFAULT_INCOMES);
    } catch (err) {
      console.warn('Error al cargar botones:', err);
    }
  }, [expensesStorageKey, incomesStorageKey]);

  // 🌟 Arreglo de dependencias fijo y limpio
  useEffect(() => {
    fetchUserQuickActions();
  }, [fetchUserQuickActions]);

  const handleReorderActions = (reorderedList, type = 'expense') => {
    if (type === 'expense') {
      setQuickExpenses(reorderedList);
      try { guardarEnStorage(expensesStorageKey, reorderedList); } catch (e) {}
    } else {
      setQuickIncomes(reorderedList);
      try { guardarEnStorage(incomesStorageKey, reorderedList); } catch (e) {}
    }
  };

  const handleAddAction = async (newActionData, typeArg = 'expense', isEditing = false) => {
    try {
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
        user_id: targetUserIdArg || 'admin'
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
          try { guardarEnStorage(expensesStorageKey, updated); } catch (e) {}
          return updated;
        });
      } else {
        setQuickIncomes(prev => {
          const updated = updateOrAppend(prev);
          try { guardarEnStorage(incomesStorageKey, updated); } catch (e) {}
          return updated;
        });
      }
    } catch (err) {
      console.error('Error al agregar botón:', err);
    } finally {
      setIsAddCustomOpen(false);
      setIsModalOpen(false);
    }
  };

  const handleDeleteAction = async (id, type = 'expense', indexToDelete = null) => {
    try {
      const filterItems = (prev) => {
        if (indexToDelete !== null && indexToDelete !== undefined && indexToDelete >= 0) {
          return prev.filter((_, idx) => idx !== indexToDelete);
        }
        return prev.filter(item => item.id !== id);
      };

      if (type === 'expense') {
        setQuickExpenses(prev => {
          const updated = filterItems(prev);
          try { guardarEnStorage(expensesStorageKey, updated); } catch (e) {}
          return updated;
        });
      } else {
        setQuickIncomes(prev => {
          const updated = filterItems(prev);
          try { guardarEnStorage(incomesStorageKey, updated); } catch (e) {}
          return updated;
        });
      }
    } catch (err) {
      console.error('Error al eliminar botón:', err);
    }
  };

  const handleUpdateActionCustomization = async (id, updates) => {
    setQuickExpenses(prev => {
      const updated = prev.map(item => item.id === id ? { ...item, ...updates } : item);
      try { guardarEnStorage(expensesStorageKey, updated); } catch (e) {}
      return updated;
    });

    setQuickIncomes(prev => {
      const updated = prev.map(item => item.id === id ? { ...item, ...updates } : item);
      try { guardarEnStorage(incomesStorageKey, updated); } catch (e) {}
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