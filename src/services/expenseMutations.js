import { supabase } from './supabaseClient'; // Ajusta la ruta a tu cliente si es diferente

// Registrar un gasto (ya lo debes tener)
export async function saveTransaction(transactionData) {
  const { data, error } = await supabase
    .from('transactions') // o tu tabla de movimientos
    .insert([transactionData])
    .select();

  if (error) throw error;
  return data[0];
}

// Actualizar un gasto existente
export async function updateTransaction(id, updatedData) {
  const { data, error } = await supabase
    .from('transactions')
    .update(updatedData)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0];
}

// Eliminar un gasto de la base de datos
export async function deleteTransaction(id) {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}