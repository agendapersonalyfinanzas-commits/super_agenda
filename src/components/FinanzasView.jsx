import React, { useState, useEffect } from 'react';

export default function FinanzasView() {
  const [expenses, setExpenses] = useState([]);

  // Cargar los gastos al montar el componente o cuando cambie el storage
  useEffect(() => {
    const loadExpenses = () => {
      try {
        const data = localStorage.getItem('user_expenses');
        if (data) {
          const parsed = JSON.parse(data);
          // Ordenar del más reciente al más antiguo
          parsed.sort((a, b) => new Date(b.date) - new Date(a.date));
          setExpenses(parsed);
        } else {
          setExpenses([]);
        }
      } catch (error) {
        console.error('Error al cargar los gastos:', error);
      }
    };

    loadExpenses();

    // Escuchar cambios en otras pestañas o eventos locales
    window.addEventListener('storage', loadExpenses);
    return () => window.removeEventListener('storage', loadExpenses);
  }, []);

  // Función para eliminar un gasto individual del historial
  const handleDelete = (id) => {
    const updated = expenses.filter(item => item.id !== id);
    setExpenses(updated);
    localStorage.setItem('user_expenses', JSON.stringify(updated));
  };

  return (
    <div className="p-4 font-mono max-w-xl mx-auto text-black pb-20">
      <h2 className="text-xl font-black uppercase mb-4 text-center">💰 Historial de Finanzas</h2>

      {expenses.length === 0 ? (
        <div className="bg-[#Fef8e7] border-4 border-black p-6 rounded-3xl text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-xs font-bold text-stone-700">
            No hay tickets o gastos registrados todavía. ¡Usa el botón de escanear para agregar tu primer gasto!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((item) => (
            <div 
              key={item.id} 
              className="bg-white border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center transition-all"
            >
              <div>
                <span className="inline-block bg-amber-300 border-2 border-black px-2 py-0.5 rounded-lg text-[10px] font-black uppercase mb-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                  {item.category}
                </span>
                <h3 className="text-sm font-black uppercase">{item.concept}</h3>
                <p className="text-[10px] text-stone-500 font-bold">
                  {new Date(item.date).toLocaleDateString()} - {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-base font-black text-emerald-600">
                  ${Number(item.amount).toFixed(2)}
                </span>
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="w-7 h-7 bg-rose-400 border-2 border-black rounded-lg text-xs font-black flex items-center justify-center hover:bg-rose-300 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
                  title="Eliminar gasto"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}