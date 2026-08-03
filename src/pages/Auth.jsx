import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'

export default function Auth() {
  const { signIn, signUp, resetPasswordForEmail, verifySignupOtp, resendSignupConfirmation } = useAuth()
  const { t, language, setLanguage } = useLanguage()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [birthdate, setBirthdate] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [confirmCode, setConfirmCode] = useState('')
  const [resendMsg, setResendMsg] = useState('')
  const [resending, setResending] = useState(false)

  const today = new Date()
  const maxBirthdate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate()).toISOString().slice(0, 10)
  const minBirthdate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate()).toISOString().slice(0, 10)

  function isValidBirthdate(dateStr) {
    if (!dateStr) return false
    const birth = new Date(`${dateStr}T00:00:00`)
    const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate())
    const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate())
    return birth <= maxDate && birth >= minDate
  }

  async function handleSubmit() {
    if (!email || !password) return
    if (mode === 'register' && password.length < 8) {
      setError(t('auth.passwordTooShort'))
      return
    }
    if (mode === 'register' && !isValidBirthdate(birthdate)) {
      setError(t('auth.invalidBirthdateError'))
      return
    }
    setLoading(true)
    setError('')
    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
    } else {
      const { data, error } = await signUp(email, password, birthdate)
      if (error) setError(error.message)
      // Si el proyecto exige confirmar el correo, signUp() devuelve un
      // usuario pero sin sesion todavia. Pasamos a la pantalla del codigo
      // de 6 digitos en vez de dejar a la persona sin feedback.
      else if (!data?.session) setMode('confirm')
    }
    setLoading(false)
  }

  async function handleVerifyCode() {
    if (confirmCode.length !== 6) return
    setLoading(true)
    setError('')
    const { error } = await verifySignupOtp(email, confirmCode)
    if (error) setError(t('auth.confirmCodeInvalid'))
    setLoading(false)
  }

  async function handleResendCode() {
    setResending(true)
    setResendMsg('')
    const { error } = await resendSignupConfirmation(email)
    if (error) setError(error.message)
    else setResendMsg(t('auth.resendCodeSent'))
    setResending(false)
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
    setConfirmCode('')
    setResendMsg('')
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
        {mode === 'confirm' ? (
          <>
            <h2 className="text-lg font-bold text-gray-900">{t('auth.confirmEmailTitle')}</h2>
            <p className="text-xs text-gray-500">{t('auth.confirmEmailBody', { email })}</p>

            <div>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                maxLength={6}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-bold outline-none bg-ps-bg"
                placeholder="······"
                value={confirmCode}
                onChange={e => setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleVerifyCode()}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-600">
                {error}
              </div>
            )}
            {resendMsg && !error && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-xs text-green-700">
                {resendMsg}
              </div>
            )}

            <button
              onClick={handleVerifyCode}
              disabled={loading || confirmCode.length !== 6}
              className="w-full py-3.5 rounded-full font-semibold text-white text-base border-0 cursor-pointer"
              style={{ background: (loading || confirmCode.length !== 6) ? '#C4B5FD' : '#7C3AED' }}
            >
              {loading ? t('auth.confirmCodeVerifying') : t('auth.confirmCodeBtn')}
            </button>

            <button
              onClick={handleResendCode}
              disabled={resending}
              className="text-xs font-medium text-ps-purple border-0 bg-transparent cursor-pointer text-center"
            >
              {resending ? t('auth.resendCodeSending') : t('auth.resendCode')}
            </button>

            <button
              onClick={backToLogin}
              className="text-xs font-medium text-gray-400 border-0 bg-transparent cursor-pointer text-center"
            >
              {t('auth.backToLogin')}
            </button>
          </>
        ) : mode === 'forgot' ? (
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
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full border border-gray-200 rounded-xl pl-4 pr-11 py-3 text-sm outline-none bg-ps-bg"
                    placeholder={t('auth.passwordPlaceholder')}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 border-0 bg-transparent cursor-pointer text-gray-400 flex items-center"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {mode === 'register' && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('auth.birthdate')}</label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none bg-ps-bg"
                    value={birthdate}
                    max={maxBirthdate}
                    min={minBirthdate}
                    onChange={e => setBirthdate(e.target.value)}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">{t('auth.birthdateHint')}</p>
                </div>
              )}
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