import React from 'react';

// Ruta corregida a dos niveles: src/components/UI/ -> src/utils/
import { aMayusculas } from '../../utils/mayusculas.js';

export default function Navigation({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'dashboard', label: 'FINANZAS', icon: '💵' },
    { id: 'calendar', label: 'AGENDA', icon: '📅' },
    { id: 'analytics', label: 'MÉTRICAS', icon: '📊' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#Fef8e7] border-t-4 border-black px-4 py-3 select-none shadow-[0px_-4px_0px_0px_rgba(0,0,0,1)] font-mono">
      <div className="max-w-md mx-auto flex justify-between items-center gap-2">
        {navItems.map((item) => {
          const isSelected = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 py-2 px-2 sm:px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-amber-400 text-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1'
                  : 'bg-white text-stone-700 border-2 border-black hover:bg-stone-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="tracking-wider text-[11px] sm:text-xs">
                {aMayusculas ? aMayusculas(item.label) : item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}