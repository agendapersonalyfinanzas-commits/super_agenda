import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { aMayusculas } from '../utils/mayusculas.js';

export function useBaronGameLogic(activeUser) {
  const [score, setScore] = useState(50);
  const [loading, setLoading] = useState(true);
  const [financialStats, setFinancialStats] = useState({
    income: 0,
    expenses: 0,
    savingsRate: 0,
    budgetEfficiency: 0
  });

  useEffect(() => {
    async function calculateFinancialHealth() {
      try {
        setLoading(true);

        // 1. Obtener la sesión activa de Supabase
        const { data: { session } } = await supabase.auth.getSession();
        const userEmail = session?.user?.email;
        const userId = session?.user?.id;

        // Si no se recibe activeUser, priorizar 'LUIS RICARDO'
        const currentUser = activeUser ? aMayusculas(activeUser) : 'LUIS RICARDO';

        // 2. Consultar transacciones vinculadas por nombre, email o ID de usuario
        let query = supabase.from('transactions').select('*');

        if (userId || userEmail) {
          query = query.or(`user_name.ilike.%${currentUser}%,auth_user_email.eq.${userEmail},user_id.eq.${userId}`);
        } else {
          query = query.ilike('user_name', `%${currentUser}%`);
        }

        const { data: transactionsData, error: txError } = await query;

        if (txError) {
          console.error('❌ [BaronGame] Error al consultar transactions:', txError);
        }

        const allTransactions = transactionsData || [];

        let totalIncome = 0;
        let totalExpense = 0;

        allTransactions.forEach(tx => {
          const amount = Number(tx.amount || 0);
          const type = (tx.type || tx.transaction_type || '').toLowerCase();

          if (type === 'income' || type === 'ingreso') {
            totalIncome += amount;
          } else if (type === 'expense' || type === 'gasto' || type === 'egreso') {
            totalExpense += amount;
          }
        });

        console.log(`📊 [BaronGame (${currentUser})] Totales -> Ingresos:`, totalIncome, '| Gastos:', totalExpense);

        // 3. Cálculos de salud financiera e ISF
        const savings = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? Math.max(0, (savings / totalIncome) * 100) : 0;

        let budgetEfficiency = 100;
        if (totalIncome > 0) {
          const expenseRatio = totalExpense / totalIncome;
          if (expenseRatio > 0.9) budgetEfficiency = 20;       
          else if (expenseRatio > 0.75) budgetEfficiency = 60; 
          else if (expenseRatio > 0.5) budgetEfficiency = 85;  
          else budgetEfficiency = 100;                         
        } else if (totalExpense > 0) {
          budgetEfficiency = 10;
        }

        const finalISF = Math.round((savingsRate * 0.5) + (budgetEfficiency * 0.5));
        const clampedScore = Math.min(100, Math.max(0, finalISF));

        setScore(clampedScore);
        setFinancialStats({
          income: totalIncome,
          expenses: totalExpense,
          savingsRate: Math.round(savingsRate),
          budgetEfficiency
        });

      } catch (err) {
        console.error('💥 Error inesperado en el hook del juego:', err);
      } finally {
        setLoading(false);
      }
    }

    calculateFinancialHealth();
  }, [activeUser]);

  return { score, loading, financialStats };
}

export default useBaronGameLogic;