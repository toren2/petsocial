import React, { useState } from 'react'
import { X, MapPin } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'

const CATEGORY_OPTIONS = ['vet', 'groom', 'park', 'shop', 'hotel', 'restaurant', 'emergency24h']

export default function AddPlaceModal({ onClose }) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('vet')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [sent, setSent] = useState(false)

  const canSubmit = name.trim() && category && !saving

  async function submit() {
    if (!canSubmit) return
    setSaving(true)
    await supabase.from('place_suggestions').insert([{
      user_id: user.id,
      name: name.trim(),
      category,
      address: address.trim() || null,
      description: description.trim() || null,
      contact_phone: contactPhone.trim() || null,
    }])
    setSaving(false)
    setSent(true)
  }

  return (
    <div className="absolute inset-0 bg-black/50 z-50 flex flex-col justify-end">
      <div className="bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
            <MapPin size={18} color="#7C3AED" />
            {t('addPlace.title')}
          </h3>
          <button onClick={onClose} className="border-0 bg-transparent cursor-pointer text-gray-400">
            <X size={22} />
          </button>
        </div>

        {sent ? (
          <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
            <span className="text-4xl">✅</span>
            <p className="text-sm text-gray-600">{t('addPlace.thanks')}</p>
            <button onClick={onClose} className="mt-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white border-0 cursor-pointer" style={{ background: '#7C3AED' }}>
              {t('common.close')}
            </button>
          </div>
        ) : (
          <div className="px-5 py-4 flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('addPlace.nameLabel')}</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-ps-bg"
                placeholder={t('addPlace.namePlaceholder')}
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('addPlace.categoryLabel')}</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer"
                    style={{
                      borderColor: category === cat ? '#7C3AED' : '#E5E7EB',
                      background: category === cat ? '#F5F3FF' : 'white',
                      color: category === cat ? '#7C3AED' : '#374151',
                    }}
                  >
                    {t(`lugares.cat${cat.charAt(0).toUpperCase()}${cat.slice(1)}`)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('addPlace.addressLabel')}</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-ps-bg"
                placeholder={t('addPlace.addressPlaceholder')}
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('addPlace.phoneLabel')}</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-ps-bg"
                placeholder={t('addPlace.phonePlaceholder')}
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('addPlace.descriptionLabel')}</label>
              <textarea
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-ps-bg resize-none"
                placeholder={t('addPlace.descriptionPlaceholder')}
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
            <p className="text-[11px] text-gray-400">{t('addPlace.reviewNote')}</p>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="w-full py-3.5 rounded-full font-semibold text-white text-base border-0 cursor-pointer"
              style={{ background: canSubmit ? '#7C3AED' : '#C4B5FD' }}
            >
              {saving ? t('addPlace.sending') : t('addPlace.send')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
