import React, { useState, useEffect } from 'react';

// Módulo 3: Linus y la Gran Calabaza (Metas de Constancia de Ahorro)
export default function GreatPumpkinGame({ activeUser, onScoreSubmit }) {
  const [sessionActive, setSessionActive] = useState(false);
  const [constancyScore, setConstancyScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
  const [pumpkin, setPumpkin] = useState(null);
  const [message, setMessage] = useState("ESPERANDO EN EL HUERTO... ¡CONSIGUE CONSTANCIA!");

  const pumpkinTypes = [
    { type: 'Calabaza Común', points: 10, icon: '🎃' },
    { type: 'Gran Calabaza Mágica', points: 25, icon: '🌟' },
    { type: 'Ahorro Constante', points: 50, icon: '🏆' }
  ];

  const startGame = () => {
    setSessionActive(true);
    setConstancyScore(0);
    setTimeLeft(25);
    setMessage("¡Linus confía en ti! Atrapa las calabazas de la constancia.");
  };

  useEffect(() => {
    if (!sessionActive) return;

    if (timeLeft <= 0) {
      setSessionActive(false);
      setPumpkin(null);
      setMessage(`¡Vela cumplida! Puntaje de constancia: ${constancyScore} pts.`);
      if (onScoreSubmit) onScoreSubmit(constancyScore);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionActive, timeLeft, constancyScore]);

  useEffect(() => {
    if (!sessionActive) return;

    const spawner = setInterval(() => {
      const randomType = pumpkinTypes[Math.floor(Math.random() * pumpkinTypes.length)];
      const randomX = Math.floor(Math.random() * 75) + 10;
      const randomY = Math.floor(Math.random() * 60) + 20;

      setPumpkin({
        ...randomType,
        id: Date.now(),
        x: randomX,
        y: randomY
      });
    }, 1200);

    return () => clearInterval(spawner);
  }, [sessionActive]);

  const handleCatchPumpkin = (points) => {
    setConstancyScore((prev) => prev + points);
    setPumpkin(null);
    setMessage(`¡Constancia sumada! +${points} puntos para tus metas.`);
  };

  return (
    <div className="max-w-2xl mx-auto bg-[#Fef8e7] border-4 border-black p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] font-mono text-black">
      
      <div className="text-center border-b-4 border-black pb-4 mb-6">
        <div className="inline-block bg-amber-400 border-2 border-black px-4 py-1 rounded-full text-xs font-black uppercase mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          El Huerto de Calabazas • Linus van Pelt
        </div>
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wider">
          Metas y Constancia de Ahorro
        </h2>
        <p className="text-xs font-bold text-stone-700 mt-1">{message}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border-3 border-black p-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
          <p className="text-[10px] font-black uppercase text-stone-500">Puntos de Constancia</p>
          <p className="text-2xl font-black text-amber-600">{constancyScore} pts</p>
        </div>
        <div className="bg-white border-3 border-black p-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
          <p className="text-[10px] font-black uppercase text-stone-500">Tiempo en el Huerto</p>
          <p className="text-2xl font-black text-rose-600">{timeLeft}s</p>
        </div>
      </div>

      <div className="relative w-full h-80 bg-[#EFE9D2] border-4 border-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
        {!sessionActive ? (
          <div className="text-center p-6 z-10 bg-white/90 border-4 border-black rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-4xl mb-2">🎃</div>
            <p className="font-black text-sm uppercase mb-4">"EL QUE ESPERA LA GRAN CALABAZA DEBE SER CONSTANTE"</p>
            <button
              onClick={startGame}
              className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-black border-3 border-black rounded-xl font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer transition-all"
            >
              {timeLeft === 25 ? 'Esperar a la Gran Calabaza' : 'Intentar de Nuevo'}
            </button>
          </div>
        ) : (
          <>
            <div className="absolute top-3 bg-white border-2 border-black px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">
              PUMPKIN PATCH VIGILANCE
            </div>

            {pumpkin && (
              <button
                onClick={() => handleCatchPumpkin(pumpkin.points)}
                style={{ top: `${pumpkin.y}%`, left: `${pumpkin.x}%` }}
                className="absolute animate-bounce bg-white border-3 border-black px-3 py-2 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-amber-100 transition-transform active:scale-90 flex items-center gap-2"
              >
                <span className="text-xl">{pumpkin.icon}</span>
                <div className="text-left">
                  <p className="text-[9px] font-black uppercase">{pumpkin.type}</p>
                  <p className="text-[10px] font-bold text-amber-600">+{pumpkin.points} pts</p>
                </div>
              </button>
            )}
          </>
        )}
      </div>

      <div className="mt-4 text-center">
        <p className="text-[11px] font-bold text-stone-600 uppercase">
          Jugador: <span className="text-black font-black">{activeUser}</span> • Cultiva tus metas financieras con paciencia y constancia.
        </p>
      </div>

    </div>
  );
}