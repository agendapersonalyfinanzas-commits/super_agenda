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

      const sessionUserId = session.user.id;
      const userEmail = session.user.email;

      // Consulta abierta a transactions (el RLS global del maestro permite leer todo)
      let transQuery = supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (!auditorMode || !isMasterAuditor) {
        if (userEmail) {
          transQuery = transQuery.eq('auth_user_email', userEmail);
        } else if (sessionUserId) {
          transQuery = transQuery.eq('user_id', sessionUserId);
        }
      }

      const { data: trans, error: transError } = await transQuery;

      if (transError) {
        console.error('❌ Error detallado de Supabase en transactions:', transError);
        throw transError;
      }

      if (trans) {
        let finalTrans = trans;

        if (auditorMode && isMasterAuditor) {
          if (!activeUser) {
            finalTrans = []; // Cero datos si no se ha seleccionado a nadie en modo dios
          } else {
            let targetUuid = null;

            // 1. Extraer el UUID directamente si activeUser es un objeto o string con formato UUID
            if (typeof activeUser === 'object' && activeUser !== null) {
              targetUuid = activeUser.id || null;
            } else if (typeof activeUser === 'string') {
              const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(activeUser);
              if (isUUID) {
                targetUuid = activeUser;
              }
            }

            // 2. Si activeUser era un nombre (ej. "IVONNE" o "MARY JOSE"), mapearlo con los UUIDs oficiales que me diste
            if (!targetUuid && typeof activeUser === 'string') {
              const nameUpper = activeUser.toUpperCase().trim();
              if (nameUpper.includes('IVONNE')) {
                targetUuid = '88ea108e-a3bb-489d-a82f-d0d5f0fdb6bf';
              } else if (nameUpper.includes('MARY') || nameUpper.includes('MARIA')) {
                targetUuid = '74138fee-3bce-4ec1-b88a-6742a42a3315';
              } else if (nameUpper.includes('LUIS')) {
                targetUuid = '20864ee9-9e20-4e64-a634-d0b6a12dff6b';
              }
            }

            // 3. Buscar en customUsers por si acaso llegó un objeto parcial
            if (!targetUuid && customUsers && customUsers.length > 0 && typeof activeUser === 'string') {
              const found = customUsers.find(u => 
                u.nombre?.toUpperCase().includes(activeUser.toUpperCase().trim()) ||
                u.id === activeUser
              );
              if (found) targetUuid = found.id;
            }

            // 4. Filtrado estricto por el UUID oficial del usuario seleccionado
            if (targetUuid) {
              finalTrans = trans.filter(t => {
                return t.user_id === targetUuid || t.player_id === targetUuid;
              });
            } else {
              finalTrans = [];
            }
          }
        }

        setRecentTransactions(finalTrans);

        const expensesSum = finalTrans
          .filter(t => {
            const tType = (t.transaction_type || t.type || '').toLowerCase();
            return tType === 'expense' || tType === 'gasto' || tType === 'egreso';
          })
          .reduce((acc, curr) => acc + aNumero(curr.amount), 0);
          
        const incomeSum = finalTrans
          .filter(t => {
            const tType = (t.transaction_type || t.type || '').toLowerCase();
            return tType === 'income' || tType === 'ingreso';
          })
          .reduce((acc, curr) => acc + aNumero(curr.amount), 0);

        setWeeklyTotal(expensesSum);
        setTotalIncome(incomeSum);
        setIsSampleData(false);

        const netBalance = incomeSum - expensesSum;
        let currentUserName = 'SELECCIONA USUARIO';

        if (auditorMode && activeUser) {
          if (typeof activeUser === 'object' && activeUser !== null) {
            currentUserName = aMayusculas(`${activeUser.nombre || ''} ${activeUser.apellido_paterno || ''}`.trim());
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
  }, [activeUser, auditorMode, isMasterAuditor, customUsers]);

  useEffect(() => {
    fetchTransactionsAndTotals();
  }, [fetchTransactionsAndTotals]);

  const handleSaveTransaction = async (data, type) => {
    try {
      const amountVal = typeof data === 'object' ? aNumero(data.amount) : aNumero(data);
      const catVal = typeof data === 'object' ? aMayusculas(data.category) : 'GENERAL';
      const conceptVal = typeof data === 'object' ? aMayusculas(data.concept) : (type === 'expense' ? 'GASTO' : 'INGRESO');
      
      const dateVal = (typeof data === 'object' && (data.date || data.transaction_date)) 
        ? (data.date || data.transaction_date) 
        : new Date().toISOString().split('T')[0];

      const isRetroactiveVal = typeof data === 'object' ? Boolean(data.is_retroactive) : false;

      const inserted = await saveTransaction({
        transactionType: type,
        amount: amountVal,
        category: catVal,
        concept: conceptVal,
        userName: activeUser,
        date: dateVal,
        transaction_date: dateVal,
        is_retroactive: isRetroactiveVal
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
        transaction_type: updatedData.transaction_type,
        transaction_date: updatedData.date || updatedData.transaction_date,
        is_retroactive: Boolean(updatedData.is_retroactive)
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