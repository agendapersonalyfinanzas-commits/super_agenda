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

      // Fuente de verdad absoluta: Consultar transacciones exclusivas del user_id autenticado
      let transQuery = supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false });
      
      if (userId) {
        transQuery = transQuery.eq('user_id', userId);
      } else if (userEmail) {
        transQuery = transQuery.eq('auth_user_email', userEmail);
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

        // Balance unificado para el usuario real autenticado
        const netBalance = incomeSum - expensesSum;
        const currentUserName = activeUser ? aMayusculas(activeUser) : 'LUIS RICARDO';

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
  }, [activeUser]);

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

  // 🔥 MODIFICADO: Ahora recibe el objeto completo y se lo pasa a los servicios de mutación
  const handleUpdateTransactionAmount = async (id, updatedData) => {
    try {
      // Validamos si viene del nuevo modal (objeto) o de algún otro lado (número)
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