import { supabase } from '../supabaseClient';
import { aNumero } from '../utils/moneda.js';
import { aMayusculas } from '../utils/mayusculas.js';
import { obtenerMensajeError } from '../utils/errores.js';

// 🟢 Helper para obtener la fecha local exacta del dispositivo (evita desfases por UTC)
const getLocalDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export async function saveTransaction({ transactionType, amount, category, concept, userName, date, transaction_date, is_retroactive }) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) {
    throw new Error("Sesión no encontrada. Por favor, inicia sesión nuevamente.");
  }

  const numAmount = aNumero(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error("POR FAVOR, REVISA LOS DATOS INGRESADOS: El monto debe ser mayor a 0.");
  }

  // Captura prioritaria de la fecha (si no viene, usa la fecha local exacta)
  let finalDate = date || transaction_date || getLocalDate();
  
  // 🟢 Blindaje contra UTC: si es una fecha tipo "YYYY-MM-DD", fijamos el mediodía para evitar desfase de 1 día
  if (finalDate && finalDate.length === 10 && !finalDate.includes('T')) {
    finalDate = `${finalDate}T12:00:00`;
  }

  const payload = {
    transaction_type: transactionType,
    amount: numAmount,
    category: aMayusculas(category || 'GENERAL'),
    concept: aMayusculas(concept || (transactionType === 'expense' ? 'GASTO' : 'INGRESO')),
    user_name: aMayusculas(userName || 'LUIS RICARDO'),
    auth_user_email: user.email, 
    user_id: user.id,
    transaction_date: finalDate, 
    is_retroactive: Boolean(is_retroactive)
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

export async function updateTransactionAmount(id, updatedData) {
  const isObject = typeof updatedData === 'object' && updatedData !== null;
  const numAmount = aNumero(isObject ? updatedData.amount : updatedData);

  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error("El monto debe ser un número mayor a 0.");
  }

  let rawDate = isObject ? (updatedData.date || updatedData.transaction_date) : null;
  
  // 🟢 Blindaje contra UTC en actualización
  if (rawDate && rawDate.length === 10 && !rawDate.includes('T')) {
    rawDate = `${rawDate}T12:00:00`;
  }

  const payloadToUpdate = isObject ? {
    amount: numAmount,
    concept: aMayusculas(updatedData.concept),
    transaction_type: updatedData.transaction_type,
    ...(updatedData.is_retroactive !== undefined ? { is_retroactive: Boolean(updatedData.is_retroactive) } : {}),
    ...(rawDate ? { transaction_date: rawDate } : {})
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