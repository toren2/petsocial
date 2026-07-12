import React, { useState, useEffect } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'
import { isPushSupported, getPushSubscriptionStatus, subscribeToPush, unsubscribeFromPush } from '../push'

export default function PushToggle() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [status, setStatus] = useState('checking')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isPushSupported()) { setStatus('unsupported'); return }
    getPushSubscriptionStatus().then(setStatus)
  }, [])

  if (status === 'unsupported' || status === 'checking') return null

  async function toggle() {
    if (busy) return
    setBusy(true)
    try {
      if (status === 'subscribed') {
        await unsubscribeFromPush()
        setStatus('unsubscribed')
      } else {
        await subscribeToPush(user.id)
        setStatus('subscribed')
      }
    } catch (e) {
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        setStatus('denied')
      }
    }
    setBusy(false)
  }

  const on = status === 'subscribed'
  const denied = status === 'denied'

  return (
    <button
      onClick={toggle}
      disabled={busy || denied}
      className="w-full flex items-center justify-between px-4 py-2.5 border-0 bg-transparent cursor-pointer text-left"
    >
      <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
        {on ? <Bell size={15} className="text-ps-purple" /> : <BellOff size={15} className="text-gray-400" />}
        {t('perfil.pushNotifications')}
      </span>
      {denied ? (
        <span className="text-[10px] text-gray-400">{t('perfil.pushDenied')}</span>
      ) : (
        <div className="w-10 h-6 rounded-full relative transition-colors" style={{ background: on ? '#16A34A' : '#D1D5DB' }}>
          <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform" style={{ left: on ? 18 : 2 }} />
        </div>
      )}
    </button>
  )
}
