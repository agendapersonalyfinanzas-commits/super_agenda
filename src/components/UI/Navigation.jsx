import React from 'react';

// Rutas directas desde la carpeta public
const iconFinanzas = '/finanzas.png';
const iconAgenda = '/agenda.png';
const iconMetricas = '/metricas.png';

export default function Navigation({ activeTab, setActiveTab }) {
  const navItems = [
    { 
      id: 'finances', 
      label: 'Finanzas', 
      icon: iconFinanzas, 
      bgColor: 'bg-rose-400', 
      activeBg: 'bg-rose-500'
    },
    { 
      id: 'agenda', 
      label: 'Agenda', 
      icon: iconAgenda, 
      bgColor: 'bg-amber-300', 
      activeBg: 'bg-amber-400'
    },
    { 
      id: 'metrics', 
      label: 'Métricas', 
      icon: iconMetricas, 
      bgColor: 'bg-sky-300', 
      activeBg: 'bg-sky-400'
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#Fef8e7] border-t-4 border-black p-3 z-40 font-mono shadow-[0px_-6px_0px_0px_rgba(0,0,0,1)] select-none">
      <div className="max-w-md mx-auto grid grid-cols-3 gap-3">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`relative h-20 sm:h-24 border-4 border-black rounded-2xl overflow-hidden transition-all cursor-pointer flex flex-col justify-end p-1.5 ${
                isActive 
                  ? `shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-0.5 translate-y-0.5 ring-2 ring-black` 
                  : `shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`
              }`}
            >
              {/* Imagen cubriendo todo el fondo del botón */}
              <img 
                src={item.icon} 
                alt={item.label} 
                className="absolute inset-0 w-full h-full object-cover" 
              />

              {/* Degradado sutil */}
              <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

              {/* Etiqueta de texto inferior con su color retro característico */}
              <div className={`relative z-10 border-2 border-black rounded-xl py-1 px-1 text-center font-black uppercase text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                isActive ? item.activeBg : item.bgColor
              } text-black`}>
                {item.label}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}