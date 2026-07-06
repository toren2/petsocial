import React, { useState } from 'react'
import { useAuth } from '../AuthContext'

export default function Auth() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!email || !password) return
    setLoading(true)
    setError('')
    const { error } = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password)
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-6 px-8 flex-1"
      style={{ background: 'linear-gradient(160deg, #6D28D9 0%, #7C3AED 50%, #0F9B8E 100%)' }}
    >
      <div className="text-center">
        <div style={{ height: 84, width: 210, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
          <img
            src="/snoutt-logo.png"
            alt="Snoutt"
            style={{ height: 230, width: 'auto', maxWidth: 'none', filter: 'brightness(0) invert(1)', flexShrink: 0 }}
          />
        </div>
        <p className="text-white/80 mt-1 text-sm">La red social de mascotas</p>
      </div>

      <div className="w-full bg-white rounded-3xl p-6 flex flex-col gap-4">
        <div className="flex rounded-xl overflow-hidden border border-gray-200">
          <button
            onClick={() => setMode('login')}
            className="flex-1 py-2.5 text-sm font-semibold border-0 cursor-pointer transition-all"
            style={{ background: mode === 'login' ? '#7C3AED' : 'white', color: mode === 'login' ? 'white' : '#6B7280' }}
          >
            Iniciar sesión
          </button>
          <button
            onClick={() => setMode('register')}
            className="flex-1 py-2.5 text-sm font-semibold border-0 cursor-pointer transition-all"
            style={{ background: mode === 'register' ? '#7C3AED' : 'white', color: mode === 'register' ? 'white' : '#6B7280' }}
          >
            Crear cuenta
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Email</label>
            <input
              type="email"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none bg-ps-bg"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Contraseña</label>
            <input
              type="password"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none bg-ps-bg"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3.5 rounded-full font-semibold text-white text-base border-0 cursor-pointer"
          style={{ background: loading ? '#C4B5FD' : '#7C3AED' }}
        >
          {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Registrarme'}
        </button>

        {mode === 'register' && (
          <p className="text-xs text-gray-400 text-center leading-relaxed">
            Al registrarte aceptas nuestros términos de uso y política de privacidad.
          </p>
        )}
      </div>

      <p className="text-white/60 text-xs">¿Eres nuevo? Únete a la manada 🐶</p>
    </div>
  )
}