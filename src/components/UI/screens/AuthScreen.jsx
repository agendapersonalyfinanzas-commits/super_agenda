import React, { useState } from 'react'
import { supabase } from '../../../supabaseClient'
import superSnoopyImg from '../../../super-snoopy.png'

export default function AuthScreen({ onAuthSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRegister, setIsRegister] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [infoMsg, setInfoMsg] = useState('')

  const handleAuthSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return

    setLoading(true)
    setErrorMsg('')
    setInfoMsg('')

    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data?.user && data.user.identities?.length === 0) {
          setErrorMsg('Este correo ya se encuentra registrado. Intenta iniciar sesión.')
        } else {
          setInfoMsg('¡Cuenta creada con éxito! Verifica tu correo para confirmar tu registro.')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (data?.user) {
          onAuthSuccess(data.user)
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Ocurrió un error inesperado al procesar la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#Fef8e7] flex items-center justify-center p-4 font-mono text-black selection:bg-amber-200">
      <div className="w-full max-w-md bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 space-y-6">
        
        <div className="text-center space-y-3">
          <div className="w-20 h-20 rounded-full border-4 border-black bg-stone-50 overflow-hidden mx-auto shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
            <img src={superSnoopyImg} alt="Snoopy Héroe" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-wide">Acceso Seguro</h2>
            <p className="text-xs font-bold text-stone-500 uppercase mt-0.5">Guarda tu agenda al estilo Peanuts</p>
          </div>
        </div>

        {errorMsg && (
          <div className="border-4 border-red-500 bg-red-50 text-red-700 p-3 rounded-xl font-black text-xs uppercase tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            ⚠️ {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div className="border-4 border-emerald-500 bg-emerald-50 text-emerald-800 p-3 rounded-xl font-black text-xs uppercase tracking-wide shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            ℹ️ {infoMsg}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase text-stone-600 block">Correo Electrónico</label>
            <input
              type="email"
              required
              disabled={loading}
              placeholder="charlie.brown@peanuts.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-4 border-black rounded-xl text-sm font-bold focus:outline-none focus:bg-stone-50 text-black placeholder-stone-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black uppercase text-stone-600 block">Contraseña</label>
            <input
              type="password"
              required
              disabled={loading}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-4 border-black rounded-xl text-sm font-bold focus:outline-none focus:bg-stone-50 text-black placeholder-stone-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-orange-500/80 hover:bg-orange-500 border-4 border-black rounded-xl font-black text-xs uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 text-black"
          >
            {loading ? 'Procesando...' : isRegister ? 'Registrar Mi Cuenta' : 'Ingresar a la Agenda'}
          </button>
        </form>

        <div className="text-center pt-2 border-t-2 border-dashed border-stone-200">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setIsRegister(!isRegister)
              setErrorMsg('')
              setInfoMsg('')
            }}
            className="text-xs font-black uppercase tracking-wide text-stone-600 hover:text-black transition-colors underline"
          >
            {isRegister ? '¿Ya tienes una cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate aquí'}
          </button>
        </div>

      </div>
    </div>
  )
}
