import { supabase } from './supabaseClient'

export const insertExpenseSecurely = async (amount, category, subcategory = null, ocrRawText = null) => {
  if (!amount || amount <= 0) {
    throw new Error('El monto debe ser un numero mayor a cero')
  }

  if (!category || category.trim() === '') {
    throw new Error('La categoria es obligatoria')
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Usuario no autenticado para realizar esta operacion')
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData || !userData.household_id) {
    throw new Error('El usuario no pertenece a ningun hogar configurado')
  }

  const payload = {
    user_id: user.id,
    household_id: userData.household_id,
    amount: parseFloat(amount),
    category: category.trim(),
    subcategory: subcategory ? subcategory.trim() : null,
    ocr_raw_text: ocrRawText ? ocrRawText.trim() : null,
    expense_date: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert([payload])
    .select()

  if (error) {
    throw new Error(error.message)
  }

  return data
}
