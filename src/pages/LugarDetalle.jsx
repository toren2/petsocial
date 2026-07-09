import React, { useState, useEffect } from 'react'
import { ArrowLeft, MapPin, Clock, Star, Stethoscope, Scissors, Trees, ShoppingBag, Building2, X, MessageCircle, Instagram, Phone } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'

const catIcons  = { vet: Stethoscope, groom: Scissors, park: Trees, shop: ShoppingBag, hotel: Building2 }
const catColors = {
  vet:   { bg: '#EDE9FE', color: '#7C3AED' },
  groom: { bg: '#FCE7F3', color: '#EC4899' },
  park:  { bg: '#DCFCE7', color: '#16A34A' },
  shop:  { bg: '#FEF3C7', color: '#D97706' },
  hotel: { bg: '#E0F7F4', color: '#0F9B8E' },
}

function Stars({ rating, size = 14, interactive = false, onRate }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star
          key={n}
          size={size}
          fill={n <= rating ? '#F59E0B' : 'none'}
          color={n <= rating ? '#F59E0B' : '#D1D5DB'}
          style={{ cursor: interactive ? 'pointer' : 'default' }}
          onClick={() => interactive && onRate && onRate(n)}
        />
      ))}
    </div>
  )
}

function ReviewModal({ place, onClose, onSubmit }) {
  const { t } = useLanguage()
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!rating || !text.trim()) return
    setSaving(true)
    await onSubmit({ rating, text })
    setSaving(false)
    onClose()
  }

  return (
    <div className="absolute inset-0 bg-black/50 z-50 flex flex-col justify-end">
      <div className="bg-white rounded-t-3xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">{t('lugarDetalle.leaveReview')}</h3>
          <button onClick={onClose} className="border-0 bg-transparent cursor-pointer text-gray-400">
            <X size={22} />
          </button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-2">{t('lugarDetalle.howWouldYouRate', { name: place.name })}</p>
            <Stars rating={rating} size={32} interactive onRate={setRating} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('lugarDetalle.yourExperience')}</label>
            <textarea
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-ps-bg resize-none"
              placeholder={t('lugarDetalle.experiencePlaceholder')}
              rows={4}
              value={text}
              onChange={e => setText(e.target.value)}
            />
          </div>
          <button
            onClick={submit}
            disabled={saving}
            className="w-full py-3.5 rounded-full font-semibold text-white text-base border-0 cursor-pointer"
            style={{ background: rating && text.trim() && !saving ? '#7C3AED' : '#C4B5FD' }}
          >
            {saving ? t('lugarDetalle.publishing') : t('lugarDetalle.publishReview')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LugarDetalle({ place, onBack }) {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const CatIcon = catIcons[place.category] || MapPin
  const { bg, color } = catColors[place.category] || { bg: '#EDE9FE', color: '#7C3AED' }
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [userProfile, setUserProfile] = useState(null)

  useEffect(() => {
    fetchReviews()
    fetchUserProfile()
  }, [])

  async function fetchReviews() {
    setLoading(true)
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('place_id', place.id)
      .order('created_at', { ascending: false })
    if (data) setReviews(data)
    setLoading(false)
  }

  async function fetchUserProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('pet_name, emoji')
      .eq('id', user.id)
      .single()
    if (data) setUserProfile(data)
  }

  async function submitReview({ rating, text }) {
    const { data, error } = await supabase
      .from('reviews')
      .insert([{
        place_id: place.id,
        user_id: user.id,
        user_name: userProfile?.pet_name || 'Anonimo',
        user_emoji: userProfile?.emoji || '🐕',
        rating,
        text,
      }])
      .select()
    if (!error && data) setReviews(prev => [data[0], ...prev])
  }

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : place.rating

  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(place.name)}+${encodeURIComponent(place.address)}`

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <button onClick={onBack} className="border-0 bg-transparent cursor-pointer text-ps-purple">
          <ArrowLeft size={22} />
        </button>
        <h2 className="font-bold text-gray-900 text-base flex-1 truncate">{place.name}</h2>
      </div>

      <div className="flex-1 overflow-y-auto bg-ps-bg">
        <div className="flex items-center justify-center" style={{ height: 160, background: bg }}>
          <CatIcon size={64} color={color} />
        </div>

        <div className="bg-white mx-4 mt-4 rounded-2xl p-4 border border-gray-100">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{place.name}</h3>
              <span className="text-xs font-medium" style={{ color }}>{place.type}</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1">
                <Star size={14} fill="#F59E0B" color="#F59E0B" />
                <span className="font-bold text-gray-900">{avgRating}</span>
              </div>
              <span className="text-xs text-gray-400">{t('lugarDetalle.reviewsParen', { count: reviews.length })}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <MapPin size={14} className="text-ps-purple flex-shrink-0" />
              <span>{place.address}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock size={14} className="text-ps-purple flex-shrink-0" />
           {place.hours === 'Ver horario en Google Maps' ? (
  <button
    onClick={() => window.open(mapsUrl, '_blank')}
    style={{ color: '#7C3AED', fontWeight: 500, fontSize: 14, border: 0, background: 'transparent', cursor: 'pointer', padding: 0 }}
  >
    {t('lugarDetalle.viewOnGoogleMaps')}
  </button>
) : (
  <span style={{ color: place.open ? '#16A34A' : '#DC2626' }}>{place.hours}</span>
)}
            </div>
          </div>
        </div>

        {(place.category === 'vet' || place.category === 'groom') && (place.whatsapp_number || place.instagram_handle || place.contact_phone) && (
          <div className="bg-white mx-4 mt-3 rounded-2xl p-4 border border-gray-100">
            <h4 className="font-semibold text-gray-900 mb-3">{t('lugarDetalle.bookAppointment')}</h4>
            <div className="flex flex-col gap-2">
              {place.whatsapp_number && (
                <a
                  href={`https://wa.me/${place.whatsapp_number}?text=${encodeURIComponent(t('lugarDetalle.whatsappMessage', { name: place.name }))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 py-3 rounded-full font-semibold text-white text-sm no-underline"
                  style={{ background: '#25D366' }}
                >
                  <MessageCircle size={16} /> {t('lugarDetalle.bookViaWhatsapp')}
                </a>
              )}
              {place.instagram_handle && (
                <a
                  href={`https://instagram.com/${place.instagram_handle.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 py-3 rounded-full font-semibold text-white text-sm no-underline"
                  style={{ background: '#E1306C' }}
                >
                  <Instagram size={16} /> {t('lugarDetalle.bookViaInstagram')}
                </a>
              )}
              {place.contact_phone && (
                <a
                  href={`tel:${place.contact_phone}`}
                  className="flex items-center justify-center gap-2 py-3 rounded-full font-semibold text-sm no-underline border border-gray-200"
                  style={{ color: '#374151' }}
                >
                  <Phone size={16} /> {t('lugarDetalle.bookViaPhone')}
                </a>
              )}
            </div>
          </div>
        )}

        <div className="bg-white mx-4 mt-3 rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">{t('lugarDetalle.reviewsTitle')}</h4>
            <button
              onClick={() => setShowModal(true)}
              className="text-xs font-semibold px-3.5 py-1.5 rounded-full border-0 cursor-pointer"
              style={{ background: '#EDE9FE', color: '#7C3AED' }}
            >
              {t('lugarDetalle.writeReview')}
            </button>
          </div>

          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">{avgRating}</div>
              <Stars rating={Math.round(avgRating)} size={14} />
              <div className="text-xs text-gray-400 mt-1">{t('lugarDetalle.reviewsCount', { count: reviews.length })}</div>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              {[5,4,3,2,1].map(star => {
                const count = reviews.filter(r => r.rating === star).length
                const pct = reviews.length ? (count / reviews.length) * 100 : 0
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-2">{star}</span>
                    <Star size={10} fill="#F59E0B" color="#F59E0B" />
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-yellow-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-3">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {loading ? (
            <div className="text-center text-sm text-gray-400 py-4">{t('lugarDetalle.loadingReviews')}</div>
          ) : reviews.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-4">
              {t('lugarDetalle.beFirstReview')}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {reviews.map(review => (
                <div key={review.id} className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-ps-purple-light flex items-center justify-center text-lg flex-shrink-0">
                    {review.user_emoji}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-gray-900">{review.user_name}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(review.created_at).toLocaleDateString(language, { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <Stars rating={review.rating} size={12} />
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">{review.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-4">
          <button
            onClick={() => setShowModal(true)}
            className="w-full py-3.5 rounded-full font-semibold text-white text-base border-0 cursor-pointer"
            style={{ background: '#7C3AED' }}
          >
            {t('lugarDetalle.leaveMyReview')}
          </button>
        </div>
      </div>

      {showModal && (
        <ReviewModal
          place={place}
          onClose={() => setShowModal(false)}
          onSubmit={submitReview}
        />
      )}
    </div>
  )
}
