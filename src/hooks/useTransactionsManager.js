import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { aNumero } from '../utils/moneda.js';
import { aMayusculas } from '../utils/mayusculas.js';
import { saveTransaction, updateTransactionAmount, deleteTransaction as deleteTxService } from '../services/expenseMutations.js';

export function useTransactionsManager(activeUser, auditorMode, isMasterAuditor, customUsers = []) {
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [activePlayers, setActivePlayers] = useState([]);
  const [isSampleData, setIsSampleData] = useState(false);
  const [lastSavedTx, setLastSavedTx] = useState(null);

  const fetchTransactionsAndTotals = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return;
      }

      const userId = session.user.id;
      const userEmail = session.user.email;

      let transQuery = supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      // 🌟 LÓGICA DE AUDITORÍA MULTICAMPO: Busca por UUID, correo o nombre para obtener los $10,000 de Ivonne
      if (auditorMode && activeUser) {
        let targetId = null;
        let targetName = '';
        let targetEmail = '';

        if (typeof activeUser === 'object' && activeUser !== null) {
          targetId = activeUser.id || null;
          targetName = `${activeUser.nombre || ''} ${activeUser.apellido_paterno || ''}`.trim();
          targetEmail = activeUser.email || '';
        } else if (typeof activeUser === 'string') {
          const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(activeUser);
          if (isUUID) {
            targetId = activeUser;
          } else if (activeUser.includes('@')) {
            targetEmail = activeUser;
          } else {
            targetName = activeUser;
          }
        }

        const conditions = [];
        if (targetId) {
          conditions.push(`user_id.eq.${targetId}`);
          conditions.push(`player_id.eq.${targetId}`);
        }
        if (targetEmail) {
          conditions.push(`auth_user_email.eq.${targetEmail}`);
        }
        if (targetName) {
          conditions.push(`auth_user_email.ilike.%${targetName}%`);
        }

        if (conditions.length > 0) {
          transQuery = transQuery.or(conditions.join(','));
        }
      } else {
        // Modo normal: Consultar transacciones exclusivas del usuario autenticado
        if (userEmail) {
          transQuery = transQuery.eq('auth_user_email', userEmail);
        } else if (userId) {
          transQuery = transQuery.eq('user_id', userId);
        }
      }

      const { data: trans, error: transError } = await transQuery;

      if (transError) {
        console.error('❌ Error detallado de Supabase en transactions:', transError);
        throw transError;
      }

      if (trans) {
        setRecentTransactions(trans);

        const expensesSum = trans
          .filter(t => {
            const tType = (t.transaction_type || t.type || '').toLowerCase();
            return tType === 'expense' || tType === 'gasto' || tType === 'egreso';
          })
          .reduce((acc, curr) => acc + aNumero(curr.amount), 0);
          
        const incomeSum = trans
          .filter(t => {
            const tType = (t.transaction_type || t.type || '').toLowerCase();
            return tType === 'income' || tType === 'ingreso';
          })
          .reduce((acc, curr) => acc + aNumero(curr.amount), 0);

        setWeeklyTotal(expensesSum);
        setTotalIncome(incomeSum);
        setIsSampleData(false);

        // Balance unificado asignando dinámicamente el nombre del usuario auditado
        const netBalance = incomeSum - expensesSum;
        let currentUserName = 'LUIS RICARDO';

        if (auditorMode && activeUser) {
          if (typeof activeUser === 'object' && activeUser !== null) {
            currentUserName = aMayusculas(`${activeUser.nombre || ''} ${activeUser.apellido_paterno || ''}`.trim() || 'IVONNE VALDEZ');
          } else {
            currentUserName = aMayusculas(activeUser);
          }
        }

        setActivePlayers([
          {
            user_name: currentUserName,
            balance: netBalance
          }
        ]);
      }
    } catch (err) {
      console.error('Error al obtener transacciones:', err?.message || err);
    }
  }, [activeUser, auditorMode, isMasterAuditor]);

  useEffect(() => {
    fetchTransactionsAndTotals();
  }, [fetchTransactionsAndTotals]);

  const handleSaveTransaction = async (data, type) => {
    try {
      const amountVal = typeof data === 'object' ? aNumero(data.amount) : aNumero(data);
      const catVal = typeof data === 'object' ? aMayusculas(data.category) : 'GENERAL';
      const conceptVal = typeof data === 'object' ? aMayusculas(data.concept) : (type === 'expense' ? 'GASTO' : 'INGRESO');

      const inserted = await saveTransaction({
        transactionType: type,
        amount: amountVal,
        category: catVal,
        concept: conceptVal,
        userName: activeUser
      });

      await fetchTransactionsAndTotals();
      if (inserted) {
        setLastSavedTx(inserted);
        setTimeout(() => setLastSavedTx(null), 5000);
      }
    } catch (error) {
      alert(`Error al registrar ${type === 'expense' ? 'gasto' : 'ingreso'}: ` + error.message);
    }
  };

  const handleDeleteTransaction = async (id) => {
    try {
      await deleteTxService(id);
      await fetchTransactionsAndTotals();
      if (lastSavedTx?.id === id) setLastSavedTx(null);
    } catch (error) {
      alert('Error al eliminar transacción: ' + error.message);
    }
  };

  const handleUpdateTransactionAmount = async (id, updatedData) => {
    try {
      const payload = typeof updatedData === 'object' ? {
        amount: aNumero(updatedData.amount),
        concept: aMayusculas(updatedData.concept),
        transaction_type: updatedData.transaction_type
      } : { amount: aNumero(updatedData) };

      await updateTransactionAmount(id, payload);
      await fetchTransactionsAndTotals();
    } catch (error) {
      alert('Error al actualizar el movimiento: ' + error.message);
    }
  };

  return {
    recentTransactions,
    totalIncome,
    weeklyTotal,
    activePlayers,
    isSampleData,
    lastSavedTx,
    setLastSavedTx,
    fetchTransactionsAndTotals,
    handleSaveTransaction,
    handleDeleteTransaction,
    handleUpdateTransactionAmount
  };
}

export default useTransactionsManager;