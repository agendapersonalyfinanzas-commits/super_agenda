import React, { useState, useEffect } from 'react';

// Minijuego: El Puesto de Psiquiatría de Lucy (Control de Gastos Hormiga)
export default function LucyPsychiatryGame({ activeUser, onScoreSubmit }) {
  const [sessionActive, setSessionActive] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [currentAnt, setCurrentAnt] = useState(null); // Posición y tipo de gasto hormiga
  const [message, setMessage] = useState("¡LA PSIQUIATRIA ESTÁ ABIERTA! 5 CENTAVOS LA CONSULTA.");

  const antTypes = [
    { name: 'Café Exginito', cost: 45, icon: '☕' },
    { name: 'Antojo Rápido', cost: 60, icon: '🍔' },
    { name: 'Gasto Invisible', cost: 30, icon: '💸' },
    { name: 'Compra Impulsiva', cost: 120, icon: '🛍️' }
  ];

  // Iniciar juego
  const startGame = () => {
    setSessionActive(true);
    setScore(0);
    setTimeLeft(30);
    setMessage("¡Elimina los Gastos Hormiga antes de que arruinen tu cartera!");
  };

  // Temporizador de la sesión
  useEffect(() => {
    if (!sessionActive) return;

    if (timeLeft <= 0) {
      setSessionActive(false);
      setCurrentAnt(null);
      setMessage(`¡Sesión terminada! Ahorraste $${score} en total.`);
      if (onScoreSubmit) onScoreSubmit(score);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionActive, timeLeft, score]);

  // Generador aleatorio de gastos hormiga en pantalla
  useEffect(() => {
    if (!sessionActive) return;

    const spawner = setInterval(() => {
      const randomAnt = antTypes[Math.floor(Math.random() * antTypes.length)];
      // Posiciones aleatorias relativas dentro del recuadro de juego (porcentajes)
      const randomX = Math.floor(Math.random() * 75) + 10;
      const randomY = Math.floor(Math.random() * 60) + 20;

      setCurrentAnt({
        ...randomAnt,
        id: Date.now(),
        x: randomX,
        y: randomY
      });
    }, 1100);

    return () => clearInterval(spawner);
  }, [sessionActive]);

  // Al hacer clic sobre el gasto hormiga para "psicoanalizarlo y eliminarlo"
  const handleCatchAnt = (cost) => {
    setScore((prev) => prev + cost);
    setCurrentAnt(null);
    setMessage(`¡Consejo aplicado! -${cost} eliminado de gastos hormiga.`);
  };

  return (
    <div className="max-w-2xl mx-auto bg-[#Fef8e7] border-4 border-black p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] font-mono text-black">
      
      {/* Cabecera estilo cómic */}
      <div className="text-center border-b-4 border-black pb-4 mb-6">
        <div className="inline-block bg-amber-300 border-2 border-black px-4 py-1 rounded-full text-xs font-black uppercase mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          Puesto Psiquiátrico • Lucy van Pelt
        </div>
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wider">
          Control de Gastos Hormiga
        </h2>
        <p className="text-xs font-bold text-stone-700 mt-1">
          {message}
        </p>
      </div>

      {/* Panel de Estadísticas en Tiempo Real */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border-3 border-black p-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
          <p className="text-[10px] font-black uppercase text-stone-500">Dinero Salvado</p>
          <p className="text-2xl font-black text-emerald-600">${score}</p>
        </div>
        <div className="bg-white border-3 border-black p-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
          <p className="text-[10px] font-black uppercase text-stone-500">Tiempo de Consulta</p>
          <p className="text-2xl font-black text-rose-600">{timeLeft}s</p>
        </div>
      </div>

      {/* Área Interactiva Estilo Puesto de limonada/psiquiatría */}
      <div className="relative w-full h-80 bg-[#EFE9D2] border-4 border-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
        
        {!sessionActive ? (
          <div className="text-center p-6 z-10 bg-white/90 border-4 border-black rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-4xl mb-2">👩‍⚕️</div>
            <p className="font-black text-sm uppercase mb-4">"EL CONSEJO FINANCIERO CUESTA 5 CENTAVOS"</p>
            <button
              onClick={startGame}
              className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-black border-3 border-black rounded-xl font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
            >
              {timeLeft === 30 ? 'Iniciar Consulta' : 'Jugar Otra Vez'}
            </button>
          </div>
        ) : (
          <>
            {/* Letrero clásico del puesto */}
            <div className="absolute top-3 bg-white border-2 border-black px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">
              PSYCHIATRIC HELP 5¢ (The Doctor is In)
            </div>

            {/* Gasto Hormiga Apareciendo */}
            {currentAnt && (
              <button
                onClick={() => handleCatchAnt(currentAnt.cost)}
                style={{ top: `${currentAnt.y}%`, left: `${currentAnt.x}%` }}
                className="absolute animate-bounce bg-white border-3 border-black px-3 py-2 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-rose-100 transition-transform active:scale-90 flex items-center gap-2"
              >
                <span className="text-xl">{currentAnt.icon}</span>
                <div className="text-left">
                  <p className="text-[9px] font-black uppercase">{currentAnt.name}</p>
                  <p className="text-[10px] font-bold text-rose-600">-${currentAnt.cost}</p>
                </div>
              </button>
            )}
          </>
        )}
      </div>

      {/* Pie de instrucciones */}
      <div className="mt-4 text-center">
        <p className="text-[11px] font-bold text-stone-600 uppercase">
          Jugador Actual: <span className="text-black font-black">{activeUser}</span> • Toca los gastos hormiga antes de que drenen tu saldo.
        </p>
      </div>

    </div>
  );
}