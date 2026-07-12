import React, { useState } from 'react'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'

export default function ResetPassword() {
  const { updatePassword, clearPasswordRecovery } = useAuth()
  const { t } = useLanguage()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    if (!password || !confirmPassword) return
    if (password.length < 8) {
      setError(t('resetPassword.tooShortError'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('resetPassword.mismatchError'))
      return
    }
    setSaving(true)
    setError('')
    const { error } = await updatePassword(password)
    if (error) setError(error.message)
    else setDone(true)
    setSaving(false)
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
        <p className="text-white/80 mt-1 text-sm">{t('resetPassword.subtitle')}</p>
      </div>

      <div className="w-full bg-white rounded-3xl p-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-gray-900">{t('resetPassword.title')}</h2>

        {done ? (
          <>
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
              {t('resetPassword.successMessage')}
            </div>
            <button
              onClick={clearPasswordRecovery}
              className="w-full py-3.5 rounded-full font-semibold text-white text-base border-0 cursor-pointer"
              style={{ background: '#7C3AED' }}
            >
              {t('resetPassword.continue')}
            </button>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('resetPassword.newPassword')}</label>
                <input
                  type="password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none bg-ps-bg"
                  placeholder={t('resetPassword.newPasswordPlaceholder')}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('resetPassword.confirmPassword')}</label>
                <input
                  type="password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none bg-ps-bg"
                  placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
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
              disabled={saving}
              className="w-full py-3.5 rounded-full font-semibold text-white text-base border-0 cursor-pointer"
              style={{ background: saving ? '#C4B5FD' : '#7C3AED' }}
            >
              {saving ? t('resetPassword.saving') : t('resetPassword.save')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
