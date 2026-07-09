import React, { useState, useEffect, useRef } from 'react'
import { BadgeCheck, Camera, Clock, XCircle } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'

export default function Verificacion({ onStatusChange }) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [latest, setLatest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [photoUrl, setPhotoUrl] = useState('')
  const [note, setNote] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => { fetchLatest() }, [])

  async function fetchLatest() {
    setLoading(true)
    const { data } = await supabase
      .from('verification_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setLatest(data || null)
    onStatusChange?.(data?.status === 'aprobado')
    setLoading(false)
  }

  async function uploadPhoto(file) {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/verify-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('pet-photos').upload(path, file)
    if (!error) {
      const { data } = supabase.storage.from('pet-photos').getPublicUrl(path)
      setPhotoUrl(data.publicUrl)
    }
    setUploading(false)
  }

  async function submitRequest() {
    if (!photoUrl) return
    setSaving(true)
    const { error } = await supabase.from('verification_requests').insert([{
      user_id: user.id,
      photo_url: photoUrl,
      note: note.trim() || null,
    }])
    if (!error) {
      setShowForm(false)
      setPhotoUrl('')
      setNote('')
      fetchLatest()
    }
    setSaving(false)
  }

  if (loading) return null

  const status = latest?.status

  return (
    <div className="px-4 pb-3">
      <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
        <BadgeCheck size={15} color="#3B82F6" /> {t('verificacion.title')}
      </h3>

      {status === 'aprobado' ? (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl border border-gray-100" style={{ background: '#EFF6FF' }}>
          <BadgeCheck size={18} color="#3B82F6" />
          <p className="text-sm font-semibold" style={{ color: '#1D4ED8' }}>{t('verificacion.verifiedAccount')}</p>
        </div>
      ) : status === 'pendiente' ? (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl border border-gray-100" style={{ background: '#FEF3C7' }}>
          <Clock size={16} color="#D97706" />
          <p className="text-sm font-medium" style={{ color: '#92400E' }}>{t('verificacion.pendingReview')}</p>
        </div>
      ) : (
        <>
          {status === 'rechazado' && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl border border-gray-100 mb-2" style={{ background: '#FEE2E2' }}>
              <XCircle size={16} color="#DC2626" />
              <p className="text-sm font-medium" style={{ color: '#991B1B' }}>{t('verificacion.rejectedNotice')}</p>
            </div>
          )}

          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-2.5 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-medium text-gray-500 cursor-pointer bg-transparent flex items-center justify-center gap-2"
            >
              <BadgeCheck size={16} /> {t('verificacion.requestVerification')}
            </button>
          ) : (
            <div className="bg-ps-bg rounded-2xl p-3 flex flex-col gap-2.5 border border-gray-100">
              <p className="text-xs text-gray-500">{t('verificacion.instructions')}</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 cursor-pointer overflow-hidden"
                  style={{ background: '#EFF6FF' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {photoUrl ? <img src={photoUrl} alt="foto" className="w-full h-full object-cover" /> : <Camera size={20} color="#3B82F6" />}
                </div>
                <button onClick={() => fileInputRef.current?.click()} className="text-xs font-semibold border-0 cursor-pointer px-3 py-1.5 rounded-full" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                  {uploading ? t('verificacion.uploading') : t('verificacion.uploadPhoto')}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
              </div>
              <textarea
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white resize-none"
                placeholder={t('verificacion.notePlaceholder')}
                rows={2}
                value={note}
                onChange={e => setNote(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-full text-sm font-semibold border-0 cursor-pointer" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                  {t('verificacion.cancel')}
                </button>
                <button
                  onClick={submitRequest}
                  disabled={saving || !photoUrl}
                  className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white border-0 cursor-pointer"
                  style={{ background: saving || !photoUrl ? '#93C5FD' : '#3B82F6' }}
                >
                  {saving ? t('verificacion.sending') : t('verificacion.send')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
