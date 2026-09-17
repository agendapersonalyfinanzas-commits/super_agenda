import React, { useState, useEffect } from 'react'
import QuickExpenseButton from './QuickExpenseButton'
import { supabase } from '../../supabaseClient'

export default function QuickActionSection({ playerId }) {
  const [quickActions, setQuickActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [draggedIndex, setDraggedIndex] = useState(null)

  // 1. Cargar botones desde la base de datos
  const fetchQuickActions = async () => {
    try {
      setLoading(true)
      let query = supabase.from('quick_actions').select('*').order('sort_order', { ascending: true })
      
      // Si hay un jugador seleccionado, filtramos por él
      if (playerId) {
        query = query.eq('player_id', playerId)
      }

      const { data, error } = await query
      if (error) throw error

      setQuickActions(data || [])
    } catch (err) {
      console.error('Error al cargar botones rápidos:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuickActions()
  }, [playerId])

  // 2. Lógica para reordenar (Drag & Drop) y guardar en Supabase
  const handleDragStart = (e, index) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) return

    // Reordenar en estado local
    const updatedActions = [...quickActions]
    const [movedItem] = updatedActions.splice(draggedIndex, 1)
    updatedActions.splice(dropIndex, 0, movedItem)

    setQuickActions(updatedActions)
    setDraggedIndex(null)

    // Guardar el nuevo sort_order en Supabase
    try {
      for (let i = 0; i < updatedActions.length; i++) {
        await supabase
          .from('quick_actions')
          .update({ sort_order: i + 1 })
          .eq('id', updatedActions[i].id)
      }
    } catch (err) {
      console.error('Error al actualizar el orden en Supabase:', err.message)
    }
  }

  // 3. Registrar la transacción en la base de datos al presionar un botón
  const handleSaveTransaction = async (actionData) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .insert([
          {
            player_id: playerId || null,
            transaction_type: actionData.type || 'expense',
            amount: actionData.amount,
            category: actionData.category,
            concept: actionData.concept,
            transaction_date: new Date().toISOString()
          }
        ])

      if (error) throw error
      alert(`¡Gasto de $${actionData.amount} registrado con éxito en la Base de Datos!`)
    } catch (err) {
      console.error('Error al guardar transacción:', err.message)
      alert('Ocurrió un error al guardar en la base de datos.')
    }
  }

  if (loading) {
    return <div className="text-center font-black p-4">Cargando botones desde Supabase...</div>
  }

  return (
    <div className="p-4 bg-red-100 border-4 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="font-black text-lg uppercase text-black">Registrar Egresos</h2>
          <p className="text-[10px] font-bold text-stone-600 uppercase">
            Sincronizado con Supabase
          </p>
        </div>
      </div>

      {quickActions.length === 0 ? (
        <div className="text-center py-6 font-bold text-stone-500">
          No hay botones registrados en la Base de Datos.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 justify-items-center">
          {quickActions.map((action, index) => (
            <div
              key={action.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className={`relative cursor-grab active:cursor-grabbing transition-all select-none ${
                draggedIndex === index ? 'opacity-30 scale-95' : 'opacity-100'
              }`}
            >
              <span className="absolute -top-1 -right-1 text-[10px] text-stone-500 font-black pointer-events-none z-10">
                ⋮⋮
              </span>
              <QuickExpenseButton
                icon={action.icon_url}
                label={action.label}
                defaultAmount={action.default_amount}
                category={action.category}
                onSave={(data) => handleSaveTransaction({ ...data, type: action.action_type })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}