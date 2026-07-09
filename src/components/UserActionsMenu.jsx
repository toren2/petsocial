import React, { useState } from 'react'
import { MoreVertical, ShieldOff, Flag, X } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'

const REPORT_REASONS = [
  'Spam o publicidad',
  'Comportamiento inapropiado',
  'Perfil falso',
  'Contenido ofensivo',
  'Otro',
]

export default function UserActionsMenu({ targetUserId, targetPetName, matchId, onBlocked, iconColor = '#374151', bg = '#F3F4F6' }) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [showMenu, setShowMenu] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reason, setReason] = useState(REPORT_REASONS[0])
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function blockUser() {
    if (!window.confirm(t('userActions.blockConfirm', { name: targetPetName || t('userActions.thisUser') }))) return
    setSubmitting(true)
    await supabase.from('blocked_users').upsert(
      [{ blocker_id: user.id, blocked_id: targetUserId }],
      { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true }
    )
    if (matchId) {
      await supabase.from('messages').delete().or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${user.id})`
      )
      await supabase.from('matches').delete().eq('id', matchId)
    }
    setSubmitting(false)
    setShowMenu(false)
    onBlocked?.()
  }

  async function submitReport() {
    setSubmitting(true)
    const { error } = await supabase.from('reports').insert([{
      reporter_id: user.id,
      reported_id: targetUserId,
      reason,
      details: details.trim() || null,
    }])
    setSubmitting(false)
    if (!error) {
      setShowReport(false)
      setShowMenu(false)
      setDetails('')
      alert(t('userActions.reportThanks'))
    }
  }

  return (
    <>
      <button
        onClick={() => setShowMenu(true)}
        className="border-0 cursor-pointer flex items-center justify-center flex-shrink-0"
        style={{ color: iconColor, background: bg, width: 34, height: 34, borderRadius: 999 }}
        aria-label={t('userActions.moreOptions')}
      >
        <MoreVertical size={19} />
      </button>

      {showMenu && !showReport && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowMenu(false)}>
          <div className="bg-white rounded-t-3xl w-full p-4 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowReport(true)}
              className="w-full py-3 rounded-xl text-sm font-semibold border-0 cursor-pointer flex items-center gap-2 px-3"
              style={{ background: '#FEF3C7', color: '#D97706' }}
            >
              <Flag size={16} /> {t('userActions.reportUser', { name: targetPetName || t('userActions.thisUser') })}
            </button>
            <button
              onClick={blockUser}
              disabled={submitting}
              className="w-full py-3 rounded-xl text-sm font-semibold border-0 cursor-pointer flex items-center gap-2 px-3"
              style={{ background: '#FEE2E2', color: '#DC2626' }}
            >
              <ShieldOff size={16} /> {t('userActions.blockUser', { name: targetPetName || t('userActions.thisUser') })}
            </button>
            <button
              onClick={() => setShowMenu(false)}
              className="w-full py-3 rounded-xl text-sm font-semibold border-0 cursor-pointer mt-1"
              style={{ background: '#F3F4F6', color: '#6B7280' }}
            >
              {t('userActions.cancel')}
            </button>
          </div>
        </div>
      )}

      {showReport && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-3xl w-full p-4 flex flex-col gap-3 max-h-[80%] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-base">{t('userActions.reportUser', { name: targetPetName || t('userActions.thisUser') })}</h3>
              <button onClick={() => setShowReport(false)} className="border-0 bg-transparent cursor-pointer text-gray-400">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              {REPORT_REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className="w-full text-left py-2.5 px-3 rounded-xl text-sm font-medium border-0 cursor-pointer"
                  style={{ background: reason === r ? '#EDE9FE' : '#F9FAFB', color: reason === r ? '#7C3AED' : '#374151' }}
                >
                  {r}
                </button>
              ))}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('userActions.detailsOptional')}</label>
              <textarea
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-ps-bg resize-none"
                placeholder={t('userActions.detailsPlaceholder')}
                rows={3}
                value={details}
                onChange={e => setDetails(e.target.value)}
              />
            </div>

            <button
              onClick={submitReport}
              disabled={submitting}
              className="w-full py-3 rounded-full font-semibold text-white text-sm border-0 cursor-pointer"
              style={{ background: submitting ? '#FCD34D' : '#D97706' }}
            >
              {submitting ? t('userActions.sending') : t('userActions.sendReport')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
