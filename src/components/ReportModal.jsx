import React, { useState } from 'react'
import { X, Flag } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'

const PLACE_REASONS = ['reportPlace.reasonClosed', 'reportPlace.reasonWrongInfo', 'reportPlace.reasonInappropriate', 'reportPlace.reasonOther']

export default function ReportModal({ type = 'lugar', place = null, onClose }) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [placeName, setPlaceName] = useState('')
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [saving, setSaving] = useState(false)
  const [sent, setSent] = useState(false)

  const isPlace = type === 'lugar'
  const canSubmit = isPlace
    ? (place || placeName.trim()) && reason && !saving
    : details.trim() && !saving

  async function submit() {
    if (!canSubmit) return
    setSaving(true)
    await supabase.from('app_reports').insert([{
      user_id: user.id,
      type,
      place_id: place?.id || null,
      reason: isPlace ? reason : t('reportProblem.title'),
      details: isPlace ? (place ? details : `${placeName}${details ? ' — ' + details : ''}`) : details,
    }])
    setSaving(false)
    setSent(true)
  }

  return (
    <div className="absolute inset-0 bg-black/50 z-50 flex flex-col justify-end">
      <div className="bg-white rounded-t-3xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <Flag size={18} color="#DC2626" />
            {isPlace ? t('reportPlace.title') : t('reportProblem.title')}
          </h3>
          <button onClick={onClose} className="border-0 bg-transparent cursor-pointer text-gray-400">
            <X size={22} />
          </button>
        </div>

        {sent ? (
          <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
            <span className="text-4xl">✅</span>
            <p className="text-sm text-gray-600">{t('reportPlace.thanks')}</p>
            <button onClick={onClose} className="mt-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white border-0 cursor-pointer" style={{ background: '#7C3AED' }}>
              {t('common.close')}
            </button>
          </div>
        ) : (
          <div className="px-5 py-4 flex flex-col gap-4">
            {isPlace && !place && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('reportPlace.placeNameLabel')}</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-ps-bg"
                  placeholder={t('reportPlace.placeNamePlaceholder')}
                  value={placeName}
                  onChange={e => setPlaceName(e.target.value)}
                />
              </div>
            )}
            {isPlace && place && (
              <div className="bg-ps-bg rounded-xl px-4 py-3 text-sm font-semibold text-gray-900">{place.name}</div>
            )}
            {isPlace && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('reportPlace.reasonLabel')}</label>
                <div className="flex flex-col gap-2">
                  {PLACE_REASONS.map(key => (
                    <button
                      key={key}
                      onClick={() => setReason(t(key))}
                      className="text-left px-4 py-2.5 rounded-xl text-sm border cursor-pointer"
                      style={{
                        borderColor: reason === t(key) ? '#7C3AED' : '#E5E7EB',
                        background: reason === t(key) ? '#F5F3FF' : 'white',
                        color: reason === t(key) ? '#7C3AED' : '#374151',
                      }}
                    >
                      {t(key)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                {isPlace ? t('reportPlace.detailsLabel') : t('reportProblem.detailsLabel')}
              </label>
              <textarea
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-ps-bg resize-none"
                placeholder={isPlace ? t('reportPlace.detailsPlaceholder') : t('reportProblem.detailsPlaceholder')}
                rows={4}
                value={details}
                onChange={e => setDetails(e.target.value)}
              />
            </div>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="w-full py-3.5 rounded-full font-semibold text-white text-base border-0 cursor-pointer"
              style={{ background: canSubmit ? '#7C3AED' : '#C4B5FD' }}
            >
              {saving ? t('reportPlace.sending') : t('reportPlace.send')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
