import React, { useState } from 'react';

// Importación de las pantallas reales de tu aplicación
import DashboardScreen from './components/UI/screens/DashboardScreen.jsx';
import CalendarScreen from './components/UI/screens/CalendarScreen.jsx';
import AnalyticsScreen from './components/UI/screens/AnalyticsScreen.jsx';
import Navigation from './components/UI/Navigation.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('finances'); // 'finances' | 'agenda' | 'metrics'

  return (
    <div className="min-h-screen bg-[#Fef8e7] font-mono selection:bg-amber-300 relative pb-28">
      
      {/* RENDERIZADO DE LAS PANTALLAS REALES SEGÚN EL BOTÓN DEL FOOTER */}
      <main>
        {activeTab === 'finances' && <DashboardScreen />}
        {activeTab === 'agenda' && <CalendarScreen />}
        {activeTab === 'metrics' && <AnalyticsScreen />}
      </main>

      {/* BARRA DE NAVEGACIÓN INFERIOR (FOOTER RETRO CON TUS IMÁGENES) */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      
    </div>
  );
}