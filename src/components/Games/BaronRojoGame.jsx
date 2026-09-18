import React, { useState, useEffect, useMemo } from 'react';
import { useBaronGameLogic } from '../../hooks/useBaronGameLogic';

// --- CONFIGURACIÓN DE AVATARES ---
const AVAILABLE_AVATARS = [
  { id: 'snoopy-rojo', name: 'Snoopy As', src: '/juego-snoopy-rojo-1.png' },
  { id: 'woodstock', name: 'Woodstock', src: '/juego-woodstock.png' },
  { id: 'linus', name: 'Linus', src: '/juego-linus.png' },
  { id: 'franklin', name: 'Franklin', src: '/juego-franklin.png' },
  { id: 'paty', name: 'Patty', src: '/juego-paty.png' },
  { id: 'pigpen', name: 'Pigpen', src: '/juego-pigpen.png' },
  { id: 'sally', name: 'Sally', src: '/juego-sally.png' },
  { id: 'schroader', name: 'Schroeder', src: '/juego-schroader.png' },
];

// --- SINTETIZADOR DE AUDIO 8-BIT (WEB AUDIO API) ---
class RetroSynth {
  constructor() {
    this.ctx = null;
  }
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
  playTone(freq, type, duration, vol, slideFreq = null) {
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (slideFreq) {
        osc.frequency.exponentialRampToValueAtTime(slideFreq, this.ctx.currentTime + duration);
      }
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.error(e);
    }
  }

  playShoot() { this.playTone(880, 'square', 0.15, 0.1, 110); }
  playExplosion() { this.playTone(100, 'sawtooth', 0.3, 0.2, 10); }
  playCoin() { 
    this.playTone(987.77, 'sine', 0.1, 0.1); 
    setTimeout(() => this.playTone(1318.51, 'sine', 0.3, 0.1), 100);
  }
  playSiren() {
    this.playTone(600, 'square', 0.4, 0.05, 800);
    setTimeout(() => this.playTone(800, 'square', 0.4, 0.05, 600), 400);
  }
}

let audioSynth = null; 

export default function BaronRojoGame({ activeUser, onBack }) {
  // 🧠 Cerebro financiero conectado estrictamente a Supabase
  const userId = activeUser?.id || activeUser?.uid;
  const { score: realIsfScore, loading, financialStats } = useBaronGameLogic(userId);

  // Estados del juego y animaciones basados en la BD
  const [flightState, setFlightState] = useState('ACE_PILOT');
  const [activeComicPopup, setActiveComicPopup] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVAILABLE_AVATARS[0]);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // El puntaje ISF proviene directamente del hook financiero real
  const isfScore = loading ? 85 : realIsfScore;

  const initAudio = () => {
    if (!audioSynth) audioSynth = new RetroSynth();
    audioSynth.init();
    setAudioEnabled(true);
  };

  // Calcular estado de vuelo y diálogos según el ISF real
  useEffect(() => {
    if (isfScore >= 80) {
      setFlightState('ACE_PILOT');
      setActiveComicPopup('¡TOMA ESTO, BARÓN! ¡MIS AHORROS SON DE ACERO!');
      if (audioEnabled && audioSynth) audioSynth.playCoin();
    } else if (isfScore >= 50) {
      setFlightState('STABLE_FLIGHT');
      setActiveComicPopup('VUELO TRANQUILO. ¡A MANTENER EL RUMBO!');
    } else if (isfScore >= 20) {
      setFlightState('DANGER_ZONE');
      setActiveComicPopup('¡TURBULENCIA FINANCIERA! ¡ME ESTÁN ALCANZANDO!');
      if (audioEnabled && audioSynth) audioSynth.playSiren();
    } else {
      setFlightState('MAYDAY');
      setActiveComicPopup('¡MAYDAY! ¡MAYDAY! ¡FUEGO ENEMIGO EN EL MOTOR!');
      if (audioEnabled && audioSynth) audioSynth.playExplosion();
    }
  }, [isfScore, audioEnabled]);

  // Efectos de sonido ambientales de combate según el estado
  useEffect(() => {
    if (!audioEnabled || !audioSynth) return;
    let interval;
    if (flightState === 'ACE_PILOT' || flightState === 'MAYDAY') {
      interval = setInterval(() => {
        audioSynth.playShoot();
        if (Math.random() > 0.6) setTimeout(() => audioSynth.playExplosion(), 200);
      }, 600);
    }
    return () => clearInterval(interval);
  }, [flightState, audioEnabled]);

  const speedLines = useMemo(() => Array.from({ length: 20 }).map(() => ({
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    width: `${Math.random() * 200 + 100}px`,
    animationDelay: `${Math.random() * 0.5}s`,
  })), []);

  return (
    <div className="bg-[#FBBF24] border-4 border-black rounded-3xl p-4 shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col gap-4 max-w-4xl mx-auto font-mono select-none">
      
      {/* BARRA SUPERIOR / HEADER */}
      <header className="flex justify-between items-center bg-white border-3 border-black p-3 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-3">
          <img src="/juego-woodsock-piloto.png" alt="Woodstock Piloto" className="w-16 h-16 object-contain animate-bounce" />
          <div className="text-left">
            <h1 className="text-xs sm:text-sm font-black uppercase text-black">SNOOPY: BARÓN ROJO ARCADE</h1>
            <p className="text-[10px] font-black text-amber-600">
              📊 FINANZAS REALES (Ingresos: ${financialStats.income} \vert{} Gastos:${financialStats.expenses})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="bg-black text-white border-2 border-black px-3 py-1.5 rounded-xl text-[11px] font-black shadow-[2px_2px_0px_rgba(255,255,255,1)] cursor-pointer hover:bg-stone-800 transition-all"
          >
            ↩️ Menú
          </button>
        </div>
      </header>

      {/* LIENZO PRINCIPAL DEL JUEGO / ANIMACIÓN */}
      <div 
        style={{ height: '480px' }} 
        onClick={initAudio}
        className={`relative w-full border-4 border-black rounded-2xl overflow-hidden shadow-[inset_6px_6px_0px_rgba(0,0,0,0.3)] transition-all duration-300
          ${flightState === 'MAYDAY' ? 'animate-screen-shake ring-4 ring-red-600' : ''}
          ${!audioEnabled ? 'cursor-pointer' : ''}
        `}
      >
        <style>{`
          .comic-halftone {
            background-image: radial-gradient(rgba(0,0,0,0.15) 15%, transparent 16%), radial-gradient(rgba(0,0,0,0.15) 15%, transparent 16%);
            background-size: 6px 6px;
            background-position: 0 0, 3px 3px;
            mix-blend-mode: multiply;
          }
          
          @keyframes scroll-bg { from { background-position: 0px 0; } to { background-position: -2000px 0; } }
          .layer-far { animation: scroll-bg 40s linear infinite; }
          .layer-mid { animation: scroll-bg 20s linear infinite; }
          .speed-warp { animation-duration: 3s !important; }
          .speed-slow { animation-duration: 60s !important; }

          @keyframes screen-shake {
            0%, 100% { transform: translate(0, 0); }
            25% { transform: translate(4px, 4px) rotate(1deg); }
            50% { transform: translate(-4px, -2px) rotate(-1deg); }
            75% { transform: translate(-2px, 4px) rotate(0deg); }
          }
          .animate-screen-shake { animation: screen-shake 0.2s infinite; }

          @keyframes hit-flash {
            0%, 100% { background-color: transparent; }
            50% { background-color: rgba(255, 0, 0, 0.4); }
          }
          .flash-danger { animation: hit-flash 0.5s infinite; }

          @keyframes shoot-speedline {
            0% { transform: translateX(100vw); }
            100% { transform: translateX(-100vw); }
          }
          .speedline { animation: shoot-speedline 0.4s linear infinite; }

          @keyframes fire-right {
            0% { transform: translateX(0); opacity: 1; }
            100% { transform: translateX(500px); opacity: 0; }
          }
          @keyframes fire-left {
            0% { transform: translateX(0); opacity: 1; }
            100% { transform: translateX(-500px); opacity: 0; }
          }
          .laser-beam {
            width: 30px; height: 6px; 
            background: #fbbf24; border: 2px solid black; border-radius: 4px;
            position: absolute; z-index: 25;
          }
          .animate-fire-right { animation: fire-right 0.3s linear infinite; }
          .animate-fire-left { animation: fire-left 0.3s linear infinite; }

          @keyframes pop-boom {
            0% { transform: scale(0) rotate(0deg); opacity: 1; }
            50% { transform: scale(1.5) rotate(15deg); opacity: 1; }
            100% { transform: scale(2) rotate(30deg); opacity: 0; }
          }
          .comic-boom {
            animation: pop-boom 0.6s ease-out infinite;
            background-image: url('data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 0 L60 30 L100 20 L70 50 L90 90 L50 70 L10 90 L30 50 L0 20 L40 30 Z" fill="%23ef4444" stroke="black" stroke-width="4"/></svg>');
            background-size: contain;
            background-repeat: no-repeat;
          }

          @keyframes float-plane {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          .floating { animation: float-plane 2s ease-in-out infinite; }
          
          @keyframes panic-pulse {
            0%, 100% { transform: scale(1) rotate(-3deg); }
            50% { transform: scale(1.1) rotate(3deg); color: red; }
          }
          .animate-panic { animation: panic-pulse 0.5s infinite; font-weight: 900; }
        `}</style>

        {/* Capas de Fondo Dinámicas según el ISF */}
        <div className={`absolute inset-0 transition-colors duration-1000 ${
          flightState === 'ACE_PILOT' ? 'bg-linear-to-br from-indigo-500 via-purple-500 to-sky-300' :
          flightState === 'STABLE_FLIGHT' ? 'bg-linear-to-b from-sky-400 to-sky-100' :
          flightState === 'DANGER_ZONE' ? 'bg-linear-to-b from-slate-600 to-orange-300' : 
          'bg-linear-to-b from-red-900 to-red-600'
        }`} />
        
        <div className="absolute inset-0 comic-halftone pointer-events-none z-0 opacity-60" />

        <div className={`absolute inset-0 layer-far ${flightState === 'ACE_PILOT' ? 'speed-warp' : flightState === 'MAYDAY' ? 'speed-slow' : ''}`}
             style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.7) 40px, transparent 41px), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.5) 30px, transparent 31px)', backgroundSize: '400px 300px' }} />

        {(flightState === 'MAYDAY' || flightState === 'DANGER_ZONE') && (
          <div className="absolute inset-0 z-10 pointer-events-none flash-danger" />
        )}

        {flightState === 'ACE_PILOT' && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            {speedLines.map((line, i) => (
              <div key={i} className="absolute h-1 bg-white/60 speedline" style={{ top: line.top, left: line.left, width: line.width, animationDelay: line.animationDelay }} />
            ))}
          </div>
        )}

        {!audioEnabled && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
            <div className="bg-yellow-400 border-4 border-black p-4 rounded-xl transform -skew-x-6 text-center cursor-pointer hover:scale-105 transition-transform shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-xl font-black uppercase text-black">¡Haz clic para iniciar!</h2>
              <p className="font-bold text-xs text-stone-800">Activa el Motor de Audio y Vuelo</p>
            </div>
          </div>
        )}

        {/* Combate / Láseres */}
        {flightState === 'ACE_PILOT' && (
          <>
            <div className="laser-beam animate-fire-right" style={{ left: '45%', top: '50%', animationDelay: '0s' }} />
            <div className="laser-beam animate-fire-right" style={{ left: '45%', top: '53%', animationDelay: '0.2s' }} />
            <div className="absolute w-20 h-20 comic-boom z-30" style={{ right: '5%', top: '40%', animationDelay: '0s' }} />
            <div className="absolute w-16 h-16 comic-boom z-30" style={{ right: '2%', top: '50%', animationDelay: '0.3s' }} />
          </>
        )}

        {flightState === 'MAYDAY' && (
          <>
            <div className="laser-beam animate-fire-right bg-red-500" style={{ left: '15%', top: '48%', animationDelay: '0s' }} />
            <div className="laser-beam animate-fire-right bg-red-500" style={{ left: '15%', top: '51%', animationDelay: '0.25s' }} />
            <div className="absolute w-24 h-24 comic-boom z-40" style={{ left: '30%', top: '45%', animationDelay: '0.1s' }} />
            <div className="absolute w-16 h-16 comic-boom z-40" style={{ left: '35%', top: '35%', animationDelay: '0.4s' }} />
          </>
        )}

        {/* HUD EN PANTALLA */}
        <div className="absolute top-4 left-4 right-4 z-50 flex items-start justify-between pointer-events-none">
          <div className="bg-white border-4 border-black px-3 py-1.5 transform -skew-x-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center">
            <span className="text-[10px] font-black text-gray-500">ISF (SALUD)</span>
            <span className={`text-3xl font-black leading-none ${flightState === 'MAYDAY' ? 'text-red-600 animate-pulse' : 'text-black'}`}>
              {loading ? '...' : `${isfScore}%`}
            </span>
          </div>

          <div className="bg-yellow-400 border-4 border-black px-3 py-1.5 transform skew-x-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
            <h3 className="font-black text-black text-xs sm:text-sm uppercase tracking-widest -skew-x-6">
              {flightState === 'ACE_PILOT' && '🔥 MODO DIOS'}
              {flightState === 'STABLE_FLIGHT' && '✈️ CRUCERO'}
              {flightState === 'DANGER_ZONE' && '⚠️ ALERTA'}
              {flightState === 'MAYDAY' && '💀 PELIGRO CRÍTICO'}
            </h3>
          </div>
        </div>

        {/* EL BARÓN ROJO */}
        <div 
          className="absolute z-25 transition-all duration-1000 floating flex flex-col items-center drop-shadow-[10px_10px_0px_rgba(0,0,0,0.5)]"
          style={{ 
            top: '38%',
            right: flightState !== 'MAYDAY' ? '5%' : 'auto',
            left: flightState === 'MAYDAY' ? '2%' : 'auto',
          }}
        >
          <div className="bg-black text-white font-black text-[9px] px-2 py-0.5 border-2 border-white uppercase mb-1 shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] rotate-3">
            {flightState === 'MAYDAY' ? '¡TE VOY A DERRIBAR!' : 'BARÓN ROJO'}
          </div>
          <img 
            src="/juego-baron-rojo.png" 
            alt="Barón Rojo" 
            className="w-24 h-24 sm:w-32 sm:h-32 object-contain transition-transform duration-700"
            style={{
              transform: flightState === 'MAYDAY' ? 'scaleX(1) rotate(-10deg)' : 'scaleX(-1) rotate(0deg)'
            }}
          />
        </div>

        {/* AVATAR DEL JUGADOR */}
        <div 
          className="absolute z-30 transition-all duration-700 floating drop-shadow-[12px_12px_0px_rgba(0,0,0,0.6)]"
          style={{ 
            top: flightState === 'ACE_PILOT' ? '42%' : flightState === 'MAYDAY' ? '32%' : '42%',
            left: flightState === 'ACE_PILOT' ? '35%' : flightState === 'MAYDAY' ? '35%' : '15%',
            transform: flightState === 'ACE_PILOT' ? 'rotate(15deg) scale(1.1)' : 
                       flightState === 'MAYDAY' ? 'rotate(-25deg)' : 
                       flightState === 'DANGER_ZONE' ? 'rotate(-10deg)' : 'rotate(0deg)'
          }}
        >
          {/* Globo de Diálogo Expresivo */}
          <div className="absolute -top-28 sm:-top-32 left-1/2 -translate-x-1/2 min-w-40 bg-white border-4 border-black p-2 rounded-2xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] z-40 text-center">
            <p className={`font-black text-[11px] sm:text-xs tracking-wide uppercase ${
              flightState === 'MAYDAY' ? 'animate-panic' : 'text-black'
            }`}>
              {activeComicPopup}
            </p>
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r-4 border-b-4 border-black rotate-45" />
          </div>

          {(flightState === 'DANGER_ZONE' || flightState === 'MAYDAY') && (
            <div className="absolute -left-8 top-1/2 pointer-events-none z-10">
              <div className="w-10 h-10 bg-gray-800 rounded-full border-2 border-black absolute opacity-80" style={{ animation: 'fire-left 1s linear infinite' }} />
              {flightState === 'MAYDAY' && (
                <div className="w-14 h-14 bg-orange-600 rounded-full border-2 border-black absolute -top-3 opacity-90" style={{ animation: 'fire-left 0.8s linear infinite', animationDelay: '0.2s' }} />
              )}
            </div>
          )}

          <img 
            src={selectedAvatar.src} 
            alt={selectedAvatar.name} 
            className="w-28 h-28 sm:w-36 sm:h-36 object-contain"
          />
        </div>

      </div>

      {/* CONTENEDOR INFERIOR: SELECTOR DE PILOTO */}
      <div className="flex items-center justify-between bg-white border-3 border-black p-3 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)]">
        
        {/* Selector de Avatares */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 px-1 w-full scrollbar-hide">
          <div className="bg-black text-white px-2 py-1 rounded-lg text-[10px] font-black uppercase shrink-0 transform -skew-x-6">
            <span className="skew-x-6 block">Piloto</span>
          </div>
          <div className="flex gap-1.5">
            {AVAILABLE_AVATARS.map((avatar) => {
              const isSelected = selectedAvatar.id === avatar.id;
              return (
                <button
                  key={avatar.id}
                  onClick={() => {
                    setSelectedAvatar(avatar);
                    if (audioEnabled && audioSynth) audioSynth.playTone(1200, 'sine', 0.1, 0.1);
                  }}
                  className={`relative group transition-all duration-200 outline-none shrink-0 
                    ${isSelected ? 'scale-110 z-10 mx-1' : 'scale-95 hover:scale-105 opacity-70 hover:opacity-100'}
                  `}
                >
                  <div className={`p-1 rounded-xl border-2 transition-colors ${
                    isSelected ? 'bg-yellow-400 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-gray-100 border-gray-300'
                  }`}>
                    <img src={avatar.src} alt={avatar.name} className="w-7 h-7 object-contain drop-shadow-xs" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}