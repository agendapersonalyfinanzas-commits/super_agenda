import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function DashboardHeader({ 
  user_name, 
  activeUser, 
  onOcrOpen,
  onExternalJsonInject = () => {}, // ⚡ Callback para inyectar el JSON externo al sistema de verificación
  isAuditor = false,
  usersList = [],
  selectedAuditedUser = null,
  setSelectedAuditedUser = () => {}
}) {
  const [time, setTime] = useState(new Date());

  // ⚡ Estados para el acordeón del Modo Experto / Asistente IA Externo
  const [expertOpen, setExpertOpen] = useState(false);
  const [externalJsonText, setExternalJsonText] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = time.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  }).toUpperCase();

  const formattedTime = time.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const getAuditedUserFullName = () => {
    if (!selectedAuditedUser) return null;
    const found = usersList.find(u => u.id === selectedAuditedUser);
    if (found) {
      return `${found.nombre || ''} ${found.apellido_paterno || ''} ${found.apellido_materno || ''}`.trim();
    }
    return selectedAuditedUser;
  };

  const auditedName = getAuditedUserFullName();
  const displayName = auditedName || user_name || activeUser || 'USUARIO';

  // ⚡ Prompt Maestro estandarizado para la extracción de tickets
  const promptMaestroText = "Analiza este ticket de compra mexicano. Extrae la información con precisión y devuelve EXCLUSIVAMENTE un objeto JSON con: amount, concept, date, category, description, y un arreglo de items (name, quantity, price, subtotal).";

  // ⚡ Manejador para procesar y disparar el modal de verificación con el JSON externo
  const handleProcessExternalJson = () => {
    try {
      const cleanInput = externalJsonText.trim();
      
      // Limpieza robusta en caso de que arrastre marcas de código Markdown (```json ... ```)
      const firstBrace = cleanInput.indexOf('{');
      const lastBrace = cleanInput.lastIndexOf('}');

      if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        throw new Error('No se encontró un objeto JSON válido en el texto ingresado.');
      }

      const jsonString = cleanInput.substring(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(jsonString);

      if (!parsed.items || !Array.isArray(parsed.items)) {
        throw new Error('El JSON debe contener un arreglo de "items" válido.');
      }

      // Ejecutamos la función que abre el modal de verificación con los datos listos
      onExternalJsonInject({
        concept: parsed.concept ? String(parsed.concept).toUpperCase() : 'CHEDRAUI',
        amount: Number(parsed.amount) || 0,
        date: parsed.date || new Date().toISOString().split('T')[0],
        category: parsed.category ? String(parsed.category).toUpperCase() : 'SUPERMERCADO',
        description: parsed.description || 'Importado vía Asistente IA',
        items: parsed.items
      });

      setExternalJsonText('');
      setExpertOpen(false);
    } catch (err) {
      alert(`❌ Error al interpretar el JSON: ${err.message}`);
    }
  };

  return (
    <div className="bg-[#FBBF24] border-4 border-black rounded-3xl p-3 sm:p-4 shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col gap-3 select-none w-full">
      
      {/* 🌟 BANNER SUPERIOR DE BIENVENIDA DINÁMICO */}
      <div className="w-full bg-white border-[3px] border-black rounded-2xl py-2 px-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] text-center">
        <h1 className="font-mono font-black text-xs sm:text-sm uppercase text-black tracking-wider truncate">
          ✨ ¡BIENVENIDO, {displayName}!
        </h1>
      </div>

      <style>{`
        @keyframes woodstockErraticFlight {
          0% { transform: translate(0px, 15px) scale(0.9) rotate(0deg); }
          25% { transform: translate(32vw, -25px) scale(1.3) rotate(4deg); }
          48% { transform: translate(68vw, 10px) scale(0.5) rotate(-4deg); }
          50% { transform: translate(72vw, 15px) scale(0.55) rotate(0deg); }
          75% { transform: translate(35vw, -20px) scale(1.2) rotate(-4deg); }
          95% { transform: translate(8vw, 15px) scale(1.0) rotate(4deg); }
          100% { transform: translate(0px, 15px) scale(0.9) rotate(0deg); }
        }
        .woodstock-erratic-animation { animation: woodstockErraticFlight 14s ease-in-out infinite; }

        @keyframes woodstockFlip {
          0%, 46% { transform: scaleX(1); }
          50% { transform: scaleX(0); }
          54%, 96% { transform: scaleX(-1); }
          100% { transform: scaleX(1); }
        }
        .woodstock-img-flip { animation: woodstockFlip 14s ease-in-out infinite; }

        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow { animation: spinSlow 25s linear infinite; }
      `}</style>

      {/* CONTENEDOR VISUAL PRINCIPAL */}
      <div className="w-full h-56 sm:h-64 relative rounded-2xl overflow-hidden border-2 border-black bg-[#38BDF8] flex items-center justify-center">
        <div className="absolute inset-0 z-0 animate-clouds-loop opacity-85 pointer-events-none"></div>

        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden flex items-center">
          <div className="woodstock-erratic-animation absolute left-2 flex items-center">
            <img 
              src="/juego-woodsock-piloto.png" 
              alt="Woodstock Piloto" 
              className="woodstock-img-flip w-20 h-20 object-contain transition-transform"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        </div>

        <div className="absolute top-[-18%] left-[1%] sm:top-[-15%] sm:left-[22%] z-20 pointer-events-none flex items-center justify-center">
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
            <div className="absolute inset-0 animate-spin-slow opacity-95">
              <svg viewBox="0 0 100 100" className="w-full h-full fill-yellow-300 drop-shadow-[0_0_14px_rgba(253,224,71,1)]">
                <path d="M50 0 L54 35 L50 50 L46 35 Z" transform="rotate(0 50 50)" />
                <path d="M50 0 L54 35 L50 50 L46 35 Z" transform="rotate(30 50 50)" />
                <path d="M50 0 L54 35 L50 50 L46 35 Z" transform="rotate(60 50 50)" />
                <path d="M50 0 L54 35 L50 50 L46 35 Z" transform="rotate(90 50 50)" />
                <path d="M50 0 L54 35 L50 50 L46 35 Z" transform="rotate(120 50 50)" />
                <path d="M50 0 L54 35 L50 50 L46 35 Z" transform="rotate(150 50 50)" />
                <path d="M50 0 L54 35 L50 50 L46 35 Z" transform="rotate(180 50 50)" />
                <path d="M50 0 L54 35 L50 50 L46 35 Z" transform="rotate(210 50 50)" />
                <path d="M50 0 L54 35 L50 50 L46 35 Z" transform="rotate(240 50 50)" />
                <path d="M50 0 L54 35 L50 50 L46 35 Z" transform="rotate(270 50 50)" />
                <path d="M50 0 L54 35 L50 50 L46 35 Z" transform="rotate(300 50 50)" />
                <path d="M50 0 L54 35 L50 50 L46 35 Z" transform="rotate(330 50 50)" />
              </svg>
            </div>
            <div className="absolute w-20 h-20 bg-white rounded-full blur-sm opacity-90 animate-pulse"></div>
          </div>
        </div>

        <img 
          src="/snoppy-ciudad-tranparente.png" 
          alt="Super Agenda Snoopy" 
          className="absolute inset-0 w-full h-full object-cover z-30 pointer-events-none"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </div>

      {/* CONTENEDOR INFERIOR */}
      <div className="flex flex-col gap-2.5 w-full">
        
        {/* ⚡ PANEL DE MODO DIOS / AUDITOR */}
        {isAuditor && (
          <div className="w-full bg-purple-200 border-[3px] border-black rounded-2xl p-2.5 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-black text-xs uppercase text-purple-950 tracking-wider">
              <span className="text-base animate-pulse">⚡</span>
              <span>Modo Dios (Auditoría)</span>
            </div>
            
            <select
              value={selectedAuditedUser || ''}
              onChange={(e) => setSelectedAuditedUser(e.target.value || null)}
              className="w-full sm:w-auto bg-white border-2 border-black rounded-xl px-3 py-1.5 font-bold text-xs uppercase cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-[2px_2px_0px_rgba(0,0,0,1)]"
            >
              <option value="">👤 Mi Vista Personal</option>
              {usersList.map((user) => {
                const fullName = `${user.nombre || ''} ${user.apellido_paterno || ''}`.trim() || user.email || 'Usuario';
                return (
                  <option key={user.id} value={user.id}>
                    🔍 Auditar: {fullName}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* 🌟 BANNER DE AVISO DE AUDITORÍA ACTIVA */}
        {isAuditor && auditedName && (
          <div className="bg-rose-400 border-[3px] border-black rounded-2xl py-2 px-3 text-center font-black text-xs uppercase shadow-[4px_4px_0px_rgba(0,0,0,1)] text-black animate-bounce">
            🔍 AUDITANDO PERFIL DE: {auditedName}
          </div>
        )}

        {/* BOTONES DE ESCANEO (LOCAL Y ASISTENTE IA EXTERNO) */}
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              type="button"
              onClick={onOcrOpen}
              className="bg-white border-[3px] border-black rounded-2xl py-2 px-4 font-black text-black shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center gap-2 text-xs sm:text-sm uppercase cursor-pointer"
            >
              <span className="text-base">📸</span>
              ESCANEAR TICKET
            </button>

            {/* ⚡ BOTÓN ASISTENTE IA EXTERNO (MODO EXPERTO) */}
            <button 
              type="button"
              onClick={() => setExpertOpen(!expertOpen)}
              className="bg-amber-300 hover:bg-amber-400 border-[3px] border-black rounded-2xl py-2 px-4 font-black text-black shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center gap-2 text-xs sm:text-sm uppercase cursor-pointer"
            >
              <span className="text-base">⚡</span>
              ASISTENTE IA EXTERNO {expertOpen ? '▲' : '▼'}
            </button>
          </div>

          {/* ACORDEÓN DESPLEGABLE: ASISTENTE IA CLAUDE CON PROMPT AUTOMÁTICO */}
          {expertOpen && (
            <div className="w-full bg-amber-100 border-[3px] border-black rounded-2xl p-3 sm:p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] flex flex-col gap-3 font-mono">
              
              {/* Cabecera interna del acordeón */}
              <div className="flex justify-between items-center border-b-2 border-black pb-2">
                <span className="text-xs font-black uppercase text-amber-950 flex items-center gap-1.5">
                  <span>🚀</span> Flujo Inteligente de Tickets (Claude)
                </span>
                <button
                  type="button"
                  onClick={() => setExpertOpen(false)}
                  className="text-xs font-black bg-white border-2 border-black px-2 py-0.5 rounded-lg shadow-[1px_1px_0px_rgba(0,0,0,1)] hover:bg-red-200 cursor-pointer"
                >
                  ✕ Cerrar
                </button>
              </div>

              {/* Guía Visual Rápida de 3 Pasos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-bold text-black">
                <div className="bg-white border-2 border-black p-2 rounded-xl shadow-[2px_2px_0px_rgba(0,0,0,1)] flex flex-col gap-1">
                  <span className="text-amber-600 font-black">PASO 1</span>
                  <span>📸 Toma la foto de tu ticket fuera de la app.</span>
                </div>
                <div className="bg-white border-2 border-black p-2 rounded-xl shadow-[2px_2px_0px_rgba(0,0,0,1)] flex flex-col gap-1">
                  <span className="text-amber-600 font-black">PASO 2</span>
                  <span>🧠 Abre Claude (el prompt se escribe solo).</span>
                </div>
                <div className="bg-white border-2 border-black p-2 rounded-xl shadow-[2px_2px_0px_rgba(0,0,0,1)] flex flex-col gap-1">
                  <span className="text-amber-600 font-black">PASO 3</span>
                  <span>📥 Pega el JSON resultante abajo y verifica.</span>
                </div>
              </div>

              {/* Botón de Apertura Rápida de Claude con Prompt Precargado */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const encodedPrompt = encodeURIComponent(promptMaestroText);
                    window.open(`https://claude.ai/new?q=${encodedPrompt}`, '_blank');
                  }}
                  className="w-full bg-amber-300 hover:bg-amber-400 border-2 border-black py-2.5 px-4 rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_rgba(0,0,0,1)] cursor-pointer text-black flex items-center justify-center gap-2"
                >
                  <span>🧠</span> 1. Abrir Claude (Prompt Automático)
                </button>
              </div>

              {/* Área de Inyección del JSON */}
              <div className="flex flex-col gap-1.5 pt-2 border-t-2 border-black">
                <span className="text-[11px] font-black uppercase text-amber-950">
                  2. Pega el JSON que te devolvió Claude:
                </span>
                <textarea
                  rows={3}
                  value={externalJsonText}
                  onChange={(e) => setExternalJsonText(e.target.value)}
                  placeholder='{"amount": 935.36, "concept": "CHEDRAUI", "items": [...] }'
                  className="w-full p-2.5 text-xs font-mono border-2 border-black rounded-xl bg-white text-black focus:outline-none shadow-inner"
                />
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleProcessExternalJson}
                    className="bg-amber-400 hover:bg-amber-500 border-2 border-black px-4 py-2 rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_rgba(0,0,0,1)] cursor-pointer text-black flex items-center gap-1.5"
                  >
                    <span>🚀</span> Cargar en Modal de Verificación
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* CONTENEDOR DE FECHA Y RELOJ */}
        <div className="w-full bg-transparent py-1 px-1 flex items-center justify-between">
          <div className="flex items-center gap-2 bg-white/35 px-3.5 py-1.5 rounded-full border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            <span className="text-base">📅</span>
            <span className="font-mono font-black text-xs sm:text-sm text-black tracking-wide">{formattedDate}</span>
          </div>

          <div className="font-mono font-black text-xs sm:text-sm text-black bg-white/35 px-3.5 py-1.5 rounded-full border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            {formattedTime}
          </div>
        </div>

      </div>

    </div>
  );
}