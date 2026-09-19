import { supabase } from '../supabaseClient';
import { aNumero } from '../utils/moneda.js';
import { aMayusculas } from '../utils/mayusculas.js';
import { obtenerMensajeError } from '../utils/errores.js';

export async function saveTransaction({ transactionType, amount, category, concept, userName }) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) {
    throw new Error("Sesión no encontrada. Por favor, inicia sesión nuevamente.");
  }

  const numAmount = aNumero(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error("POR FAVOR, REVISA LOS DATOS INGRESADOS: El monto debe ser mayor a 0.");
  }

  const payload = {
    transaction_type: transactionType,
    amount: numAmount,
    category: aMayusculas(category || 'GENERAL'),
    concept: aMayusculas(concept || (transactionType === 'expense' ? 'GASTO' : 'INGRESO')),
    user_name: aMayusculas(userName || 'LUIS RICARDO'),
    auth_user_email: user.email,
    user_id: user.id,
    transaction_date: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('transactions')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error insertando transacción:', error);
    throw new Error(obtenerMensajeError(error) || error.message || 'Error al guardar en la base de datos.');
  }

  return data;
}

// 🔥 FUSIONADO: Ahora actualiza todo (monto, concepto, tipo) y mantiene la estructura segura
export async function updateTransactionAmount(id, updatedData) {
  // Soporte dual: detecta si recibe el objeto del nuevo modal o solo el número antiguo
  const isObject = typeof updatedData === 'object' && updatedData !== null;
  const numAmount = aNumero(isObject ? updatedData.amount : updatedData);

  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error("El monto debe ser un número mayor a 0.");
  }

  // Si es un objeto, actualiza todos los campos. Si no, solo el monto.
  const payloadToUpdate = isObject ? {
    amount: numAmount,
    concept: aMayusculas(updatedData.concept),
    transaction_type: updatedData.transaction_type
  } : {
    amount: numAmount
  };

  const { data, error } = await supabase
    .from('transactions')
    .update(payloadToUpdate)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteTransaction(id) {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return true;
}