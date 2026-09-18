import { useState, useEffect } from 'react';
import { supabase } from '../services/multiplayerService';

export function useBaronGameLogic(userId) {
  const [score, setScore] = useState(50); // Valor neutral por defecto
  const [loading, setLoading] = useState(true);
  const [financialStats, setFinancialStats] = useState({
    income: 0,
    expenses: 0,
    savingsRate: 0,
    budgetEfficiency: 0
  });

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function calculateFinancialHealth() {
      try {
        setLoading(true);
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        // 1. Consultar transacciones del mes actual en Supabase
        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', startOfMonth);

        if (error) {
          console.error('Error al consultar transacciones financieras:', error);
          setLoading(false);
          return;
        }

        let totalIncome = 0;
        let totalExpense = 0;

        if (transactions && transactions.length > 0) {
          transactions.forEach(tx => {
            if (tx.type === 'income') totalIncome += Number(tx.amount || 0);
            if (tx.type === 'expense') totalExpense += Number(tx.amount || 0);
          });
        }

        // 2. Calcular Tasa de Ahorro
        const savings = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? Math.max(0, (savings / totalIncome) * 100) : 0;

        // 3. Calcular Eficiencia de Gasto
        let budgetEfficiency = 100;
        if (totalIncome > 0) {
          const expenseRatio = totalExpense / totalIncome;
          if (expenseRatio > 0.9) budgetEfficiency = 20;       // Gastó casi todo -> ¡Zona Mayday!
          else if (expenseRatio > 0.75) budgetEfficiency = 60; // Gasto moderado
          else if (expenseRatio > 0.5) budgetEfficiency = 85;  // Buen margen
          else budgetEfficiency = 100;                         // Excelente
        } else if (totalExpense > 0) {
          budgetEfficiency = 10;
        }

        // 4. Fórmula del ISF (50% Tasa de Ahorro + 50% Eficiencia de Gasto)
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
        console.error('Error inesperado calculando el cerebro financiero:', err);
      } finally {
        setLoading(false);
      }
    }

    calculateFinancialHealth();
  }, [userId]);

  return { score, loading, financialStats };
}

// Exportación por defecto adicional por seguridad
export default useBaronGameLogic;