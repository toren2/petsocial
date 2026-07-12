import React, { useState } from 'react'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'

export default function Auth() {
  const { signIn, signUp, resetPasswordForEmail } = useAuth()
  const { t, language, setLanguage } = useLanguage()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit() {
    if (!email || !password) return
    if (mode === 'register' && password.length < 8) {
      setError(t('auth.passwordTooShort'))
      return
    }
    setLoading(true)
    setError('')
    const { error } = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password)
    if (error) setError(error.message)
    setLoading(false)
  }

  async function handleResetPassword() {
    if (!email) return
    setLoading(true)
    setError('')
    const { error } = await resetPasswordForEmail(email)
    if (error) setError(error.message)
    else setResetSent(true)
    setLoading(false)
  }

  function goToForgot() {
    setMode('forgot')
    setError('')
    setResetSent(false)
  }

  function backToLogin() {
    setMode('login')
    setError('')
    setResetSent(false)
  }

  return (
    <div
      className="relative flex flex-col items-center justify-center gap-6 px-8 flex-1"
      style={{ background: 'linear-gradient(160deg, #6D28D9 0%, #7C3AED 50%, #0F9B8E 100%)' }}
    >
      <button
        onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
        className="absolute top-4 right-4 border-0 cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
        style={{ background: 'rgba(255,255,255,0.15)' }}
      >
        {language === 'es' ? 'EN' : 'ES'}
      </button>

      <div className="text-center">
        <div style={{ height: 84, width: 210, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
          <img
            src="/snoutt-logo.png"
            alt="Snoutt"
            style={{ height: 230, width: 'auto', maxWidth: 'none', filter: 'brightness(0) invert(1)', flexShrink: 0 }}
          />
        </div>
        <p className="text-white/80 mt-1 text-sm">{t('auth.tagline')}</p>
      </div>

      <div className="w-full bg-white rounded-3xl p-6 flex flex-col gap-4">
        {mode === 'forgot' ? (
          <>
            <h2 className="text-lg font-bold text-gray-900">{t('auth.forgotPasswordTitle')}</h2>

            {resetSent ? (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
                {t('auth.resetLinkSent')}
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500">{t('auth.resetPasswordInstructions')}</p>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('auth.email')}</label>
                  <input
                    type="email"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none bg-ps-bg"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-600">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleResetPassword}
                  disabled={loading}
                  className="w-full py-3.5 rounded-full font-semibold text-white text-base border-0 cursor-pointer"
                  style={{ background: loading ? '#C4B5FD' : '#7C3AED' }}
                >
                  {loading ? t('auth.resetSending') : t('auth.sendResetLink')}
                </button>
              </>
            )}

            <button
              onClick={backToLogin}
              className="text-xs font-medium text-gray-400 border-0 bg-transparent cursor-pointer text-center"
            >
              {t('auth.backToLogin')}
            </button>
          </>
        ) : (
          <>
            <div className="flex rounded-xl overflow-hidden border border-gray-200">
              <button
                onClick={() => setMode('login')}
                className="flex-1 py-2.5 text-sm font-semibold border-0 cursor-pointer transition-all"
                style={{ background: mode === 'login' ? '#7C3AED' : 'white', color: mode === 'login' ? 'white' : '#6B7280' }}
              >
                {t('auth.signIn')}
              </button>
              <button
                onClick={() => setMode('register')}
                className="flex-1 py-2.5 text-sm font-semibold border-0 cursor-pointer transition-all"
                style={{ background: mode === 'register' ? '#7C3AED' : 'white', color: mode === 'register' ? 'white' : '#6B7280' }}
              >
                {t('auth.createAccount')}
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('auth.email')}</label>
                <input
                  type="email"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none bg-ps-bg"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-500 block">{t('auth.password')}</label>
                  {mode === 'login' && (
                    <button
                      onClick={goToForgot}
                      className="text-xs font-medium text-ps-purple border-0 bg-transparent cursor-pointer p-0"
                    >
                      {t('auth.forgotPassword')}
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none bg-ps-bg"
                  placeholder={t('auth.passwordPlaceholder')}
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
              {loading ? t('auth.loading') : mode === 'login' ? t('auth.enter') : t('auth.registerBtn')}
            </button>

            {mode === 'register' && (
              <p className="text-xs text-gray-400 text-center leading-relaxed">
                {language === 'es' ? (
                  <>
                    Al registrarte aceptas nuestros{' '}
                    <a href="/terminos.html" target="_blank" rel="noopener noreferrer" className="text-ps-purple font-medium">términos de uso</a>
                    {' '}y{' '}
                    <a href="/privacidad.html" target="_blank" rel="noopener noreferrer" className="text-ps-purple font-medium">política de privacidad</a>.
                  </>
                ) : (
                  <>
                    By signing up you agree to our{' '}
                    <a href="/terminos.html" target="_blank" rel="noopener noreferrer" className="text-ps-purple font-medium">terms of use</a>
                    {' '}and{' '}
                    <a href="/privacidad.html" target="_blank" rel="noopener noreferrer" className="text-ps-purple font-medium">privacy policy</a>.
                  </>
                )}
              </p>
            )}
          </>
        )}
      </div>

      <p className="text-white/60 text-xs">{t('auth.newHere')}</p>
    </div>
  )
}
