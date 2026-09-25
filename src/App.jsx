import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './App.css'; // 👈 Importación de estilos globales y animaciones

// --- IMPORTACIÓN OFFLINE SYNC ---
import { procesarColaOffline } from './utils/offlineSync';

// Importación de pantallas y navegación
import DashboardScreen from './components/UI/screens/DashboardScreen.jsx';
import CalendarScreen from './components/UI/screens/CalendarScreen.jsx';
import AnalyticsScreen from './components/UI/screens/AnalyticsScreen.jsx';
import GameScreen from './components/Games/GamesScreen.jsx';
import Navigation from './components/UI/Navigation.jsx';

// Imagen estática desde la carpeta public
const superSnoopy = '/super-snoopy.png';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user_name, setuser_name] = useState(''); 
  const [activeTab, setActiveTab] = useState('finances'); // 'finances' | 'agenda' | 'metrics' | 'games'
  const [selectedGame, setSelectedGame] = useState(null); 

  // Estados para el formulario de Autenticación
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Estados para Nombre y Apellidos en el Registro
  const [firstName, setFirstName] = useState('');
  const [paternalSurname, setPaternalSurname] = useState('');
  const [maternalSurname, setMaternalSurname] = useState('');

  const [authError, setAuthError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isRegistering, setIsRegistering] = useState(false);

  // 🌟 SISTEMA DE SINCRONIZACIÓN OFFLINE
  useEffect(() => {
    procesarColaOffline();

    const handleOnline = () => {
      console.log('🌐 Conexión restablecida. Ejecutando sincronización en segundo plano...');
      procesarColaOffline();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setuser_name('');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('nombre, apellido_paterno, apellido_materno')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      const fullName = `${data.nombre || ''} ${data.apellido_paterno || ''} ${data.apellido_materno || ''}`.trim();
      setuser_name(fullName);
    } else if (error) {
      console.error('Error al cargar perfil:', error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthError(null);
    setSuccessMessage(null);

    if (isRegistering) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre: firstName,
            apellido_paterno: paternalSurname,
            apellido_materno: maternalSurname,
          },
        },
      });

      if (error) {
        setAuthError(error.message);
      } else {
        setSuccessMessage('¡Cuenta creada con éxito! Ya puedes iniciar sesión.');
        setIsRegistering(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthError('Correo o contraseña incorrectos.');
      }
    }

    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#Fef8e7] flex items-center justify-center font-mono text-black">
        <div className="text-center space-y-2">
          <div className="text-4xl animate-bounce">🐶</div>
          <p className="text-sm font-black uppercase tracking-wider">Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#Fef8e7] flex items-center justify-center p-4 font-mono text-black selection:bg-amber-300">
        <div className="max-w-md w-full bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          <div className="bg-[#Fef8e7] border-b-4 border-black w-full overflow-hidden flex">
            <img src={superSnoopy} alt="Super Snoopy" className="w-full h-64 object-fill block" />
          </div>

          <div className="p-8 space-y-6">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-black uppercase tracking-tight">
                {isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}
              </h1>
              <p className="text-xs text-stone-600 font-bold">
                {isRegistering ? 'Regístrate para guardar tus datos en Supabase' : 'Ingresa tus credenciales para continuar'}
              </p>
            </div>

            {authError && (
              <div className="bg-rose-100 border-2 border-rose-500 text-rose-800 p-3 rounded-xl text-xs font-black text-center">
                {authError}
              </div>
            )}

            {successMessage && (
              <div className="bg-emerald-100 border-2 border-emerald-500 text-emerald-800 p-3 rounded-xl text-xs font-black text-center">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegistering && (
                <>
                  <div>
                    <label className="block text-xs font-black uppercase mb-1">Nombre(s)</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value.toUpperCase())}
                      placeholder="EJ. LUIS RICARDO"
                      className="w-full bg-[#Fef8e7] border-3 border-black p-3 rounded-xl text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase mb-1">Apellido Paterno</label>
                    <input
                      type="text"
                      required
                      value={paternalSurname}
                      onChange={(e) => setPaternalSurname(e.target.value.toUpperCase())}
                      placeholder="EJ. VILLALOBOS"
                      className="w-full bg-[#Fef8e7] border-3 border-black p-3 rounded-xl text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase mb-1">Apellido Materno (Opcional)</label>
                    <input
                      type="text"
                      value={maternalSurname}
                      onChange={(e) => setMaternalSurname(e.target.value.toUpperCase())}
                      placeholder="EJ. FORTUN"
                      className="w-full bg-[#Fef8e7] border-3 border-black p-3 rounded-xl text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-black uppercase mb-1">Correo electrónico</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full bg-[#Fef8e7] border-3 border-black p-3 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">Contraseña</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#Fef8e7] border-3 border-black p-3 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-amber-400 hover:bg-amber-300 text-black border-4 border-black py-3 rounded-xl font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Procesando...' : isRegistering ? '✨ Registrarse' : '🚀 Entrar al Sistema'}
              </button>
            </form>

            <div className="text-center pt-2 border-t-2 border-stone-200">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setAuthError(null);
                  setSuccessMessage(null);
                }}
                className="text-xs font-black uppercase text-stone-700 hover:text-black underline cursor-pointer"
              >
                {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate aquí'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#Fef8e7] font-mono selection:bg-amber-300 relative pb-28">
      
      {/* RENDERIZADO DE LAS PANTALLAS (DashboardScreen ya maneja su propio header dinámico e inteligente) */}
      <main className="p-4">
        {activeTab === 'finances' && <DashboardScreen />}
        {activeTab === 'agenda' && <CalendarScreen />}
        {activeTab === 'metrics' && <AnalyticsScreen />}
        {activeTab === 'games' && (
          <GameScreen 
            activeUser={user_name || session?.user?.email || 'Snoopy'}
            selectedGame={selectedGame}
            setSelectedGame={setSelectedGame}
            onBack={() => {
              setSelectedGame(null);
              setActiveTab('finances');
            }}
          />
        )}
      </main>

      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      
    </div>
  );
}