// src/components/FinanzasView.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { formatearMoneda } from '../utils/moneda';
import { obtenerDeStorage } from '../utils/storage';
import { agregarAColaOffline } from '../utils/offlineSync';

export default function FinanzasView() {
  const [expenses, setExpenses] = useState([]);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'ticket' | 'manual'
  const [sortOrder, setSortOrder] = useState('date-desc');
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const fetchSupabaseExpenses = async () => {
    try {
      // 1. Verificar cola offline local
      const queue = obtenerDeStorage('family_offline_queue', []);
      setPendingCount(queue.length);

      // 2. Cargar registros desde Supabase
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      if (data) {
        const formatted = data.map((t) => {
          const conceptUpper = (t.concept || '').toUpperCase();
          const descUpper = (t.description || '').toUpperCase();

          const isTicketDetected = Boolean(
            t.is_ticket === true ||
            (t.items && Array.isArray(t.items) && t.items.length > 0) ||
            /TICKET|CHEDRAUI|WALMART|OXXO|COSTCO|SORIANA|SUPER|OCR|ESCANEO/i.test(conceptUpper) ||
            /TICKET|OCR|ESCANEO/i.test(descUpper)
          );

          return {
            id: t.id,
            concept: t.concept || 'SIN CONCEPTO',
            amount: Number(t.amount) || 0,
            category: t.category || 'OTROS',
            date: t.transaction_date || t.created_at,
            items: Array.isArray(t.items) ? t.items : [],
            dueDate: t.due_date || t.dueDate || null,
            description: t.description || '',
            isTicket: isTicketDetected
          };
        });

        setExpenses(formatted);
      } else {
        setExpenses([]);
      }
    } catch (error) {
      console.error('Error al cargar transacciones desde Supabase:', error.message);
    }
  };

  useEffect(() => {
    fetchSupabaseExpenses();

    // Estado de red
    const handleOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    // Sincronización Realtime de Supabase
    const channel = supabase
      .channel('public:finanzas-view-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          fetchSupabaseExpenses();
        }
      )
      .subscribe();

    const handleRefresh = () => {
      fetchSupabaseExpenses();
    };

    window.addEventListener('refresh-financial-data', handleRefresh);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('refresh-financial-data', handleRefresh);
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  const handleDelete = async (id) => {
    try {
      // Manejo offline para borrados
      if (!navigator.onLine) {
        await agregarAColaOffline('DELETE', 'transactions', { id });
        setExpenses((prev) => prev.filter((item) => item.id !== id));
        window.dispatchEvent(new CustomEvent('refresh-financial-data'));
        return;
      }

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setExpenses((prev) => prev.filter((item) => item.id !== id));
      window.dispatchEvent(new CustomEvent('refresh-financial-data'));
    } catch (error) {
      console.error('Error al eliminar la transacción:', error.message);
      
      // Fallback si la conexión falló a mitad de petición
      if (!navigator.onLine || error.message?.includes('Fetch')) {
        await agregarAColaOffline('DELETE', 'transactions', { id });
        setExpenses((prev) => prev.filter((item) => item.id !== id));
        window.dispatchEvent(new CustomEvent('refresh-financial-data'));
      } else {
        alert('Hubo un error al eliminar el registro en la base de datos.');
      }
    }
  };

  const processedExpenses = useMemo(() => {
    let result = [...expenses];

    if (filterType === 'ticket') {
      result = result.filter((item) => item.isTicket);
    } else if (filterType === 'manual') {
      result = result.filter((item) => !item.isTicket);
    }

    result.sort((a, b) => {
      const timeA = new Date(a.date || 0).getTime() || 0;
      const timeB = new Date(b.date || 0).getTime() || 0;

      if (sortOrder === 'date-desc') {
        return timeB - timeA;
      } else if (sortOrder === 'date-asc') {
        return timeA - timeB;
      } else if (sortOrder === 'amount-desc') {
        return b.amount - a.amount;
      }
      return 0;
    });

    return result;
  }, [expenses, filterType, sortOrder]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Sin fecha';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Sin fecha';
    return `${d.toLocaleDateString()} - ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="p-4 font-mono max-w-xl mx-auto text-black pb-36 space-y-6">
      <h2 className="text-xl font-black uppercase text-center">💰 Historial de Finanzas</h2>

      {/* Banner Indicador Offline / Operaciones Pendientes */}
      {(pendingCount > 0 || !isOnline) && (
        <div className="bg-amber-300 border-4 border-black p-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center text-xs font-black uppercase">
          <span>
            {pendingCount > 0 
              ? `⏳ ${pendingCount} operación(es) pendiente(s) por sincronizar` 
              : '📶 Modo Fuera de Línea'}
          </span>
          <span className="bg-rose-500 text-white border-2 border-black px-2 py-0.5 rounded-lg animate-pulse text-[10px]">
            {pendingCount > 0 ? 'PENDIENTE' : 'OFFLINE'}
          </span>
        </div>
      )}

      {/* Panel de Filtros y Ordenamiento */}
      <div className="bg-white border-4 border-black p-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-3">
        <div>
          <p className="text-[10px] font-black uppercase text-stone-500 mb-1.5">🔍 Filtrar por tipo:</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`py-1.5 px-2 text-[10px] font-black uppercase border-2 border-black rounded-xl cursor-pointer transition-all ${
                filterType === 'all'
                  ? 'bg-amber-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-0.5 translate-y-0.5'
                  : 'bg-stone-100 hover:bg-amber-100'
              }`}
            >
              🌐 Todos
            </button>
            <button
              type="button"
              onClick={() => setFilterType('ticket')}
              className={`py-1.5 px-2 text-[10px] font-black uppercase border-2 border-black rounded-xl cursor-pointer transition-all ${
                filterType === 'ticket'
                  ? 'bg-amber-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-0.5 translate-y-0.5'
                  : 'bg-stone-100 hover:bg-amber-100'
              }`}
            >
              🎟️ Tickets
            </button>
            <button
              type="button"
              onClick={() => setFilterType('manual')}
              className={`py-1.5 px-2 text-[10px] font-black uppercase border-2 border-black rounded-xl cursor-pointer transition-all ${
                filterType === 'manual'
                  ? 'bg-amber-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-0.5 translate-y-0.5'
                  : 'bg-stone-100 hover:bg-amber-100'
              }`}
            >
              ✍️ Manuales
            </button>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-black uppercase text-stone-500 mb-1.5">📊 Ordenar por:</p>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-full bg-[#Fef8e7] border-2 border-black p-2 rounded-xl text-xs font-black uppercase cursor-pointer outline-none"
          >
            <option value="date-desc">📅 Más Recientes primero (Nuevo a Antiguo)</option>
            <option value="date-asc">📅 Más Antiguos primero (Antiguo a Nuevo)</option>
            <option value="amount-desc">💵 Mayor Monto</option>
          </select>
        </div>
      </div>

      {/* Listado de Gastos */}
      {processedExpenses.length === 0 ? (
        <div className="bg-[#Fef8e7] border-4 border-black p-6 rounded-3xl text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-xs font-bold text-stone-700">
            No hay registros que coincidan con este filtro. ¡Prueba cambiando de categoría o registra un nuevo movimiento!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {processedExpenses.map((item) => (
            <div 
              key={item.id} 
              className="bg-white border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block bg-amber-300 border-2 border-black px-2 py-0.5 rounded-lg text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                      {item.category}
                    </span>
                    <span className={`inline-block border-2 border-black px-2 py-0.5 rounded-lg text-[9px] font-black uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${
                      item.isTicket ? 'bg-rose-300 text-rose-950' : 'bg-sky-300 text-sky-950'
                    }`}>
                      {item.isTicket ? '🎟️ Ticket IA' : '✍️ Manual'}
                    </span>
                  </div>

                  <h3 className="text-sm font-black uppercase">{item.concept}</h3>
                  <p className="text-[10px] text-stone-500 font-bold">
                    {formatDate(item.date)}
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-base font-black text-emerald-600">
                    {formatearMoneda(item.amount)}
                  </span>
                  <button 
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="w-7 h-7 bg-rose-400 border-2 border-black rounded-lg text-xs font-black flex items-center justify-center hover:bg-rose-300 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
                    title="Eliminar gasto"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {item.items && item.items.length > 0 && (
                <div className="bg-[#Fef8e7] border-2 border-black p-2.5 rounded-xl space-y-1">
                  <p className="text-[10px] font-black uppercase text-stone-600 flex items-center gap-1">
                    🛒 Artículos desglosados del ticket:
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {item.items.map((prod, idx) => {
                      const prodName = typeof prod === 'string' ? prod : (prod.name || prod.concept || 'Producto');
                      const prodPrice = typeof prod === 'object' ? Number(prod.price || prod.amount || 0) : 0;

                      return (
                        <div key={idx} className="flex justify-between items-center text-xs font-bold border-b border-amber-200 pb-1 last:border-b-0">
                          <span className="truncate pr-2 text-stone-800">• {prodName}</span>
                          {prodPrice > 0 && (
                            <span className="text-emerald-700 whitespace-nowrap">{formatearMoneda(prodPrice)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}