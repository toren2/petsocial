import React, { useState, useEffect } from 'react'
import { ArrowLeft, MapPin, Clock, Star, Stethoscope, Scissors, Trees, ShoppingBag, Building2, Utensils, X, MessageCircle, Instagram, Phone, Crown, PawPrint, Loader2, Bookmark, Flag, AlertTriangle } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'
import PlaceMiniMap from '../components/PlaceMiniMap'

const catIcons  = { vet: Stethoscope, groom: Scissors, park: Trees, shop: ShoppingBag, hotel: Building2, restaurant: Utensils, emergency24h: AlertTriangle }
const catColors = {
  vet:          { bg: '#EDE9FE', color: '#7C3AED' },
  groom:        { bg: '#FCE7F3', color: '#EC4899' },
  park:         { bg: '#DCFCE7', color: '#16A34A' },
  shop:         { bg: '#FEF3C7', color: '#D97706' },
  hotel:        { bg: '#E0F7F4', color: '#0F9B8E' },
  restaurant:   { bg: '#FFEDD5', color: '#F97316' },
  emergency24h: { bg: '#FFE4E6', color: '#E11D48' },
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

export default function LugarDetalle({ place, onBack, saved, onToggleSave, onReport }) {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const CatIcon = catIcons[place.category] || MapPin
  const { bg, color } = catColors[place.category] || { bg: '#EDE9FE', color: '#7C3AED' }
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [checkedInToday, setCheckedInToday] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkinMessage, setCheckinMessage] = useState(null)
  const [currentPet, setCurrentPet] = useState(null)

  useEffect(() => {
    fetchReviews()
    fetchUserProfile()
    fetchCheckinStatus()
    fetchCurrentPet()
  }, [])

  async function fetchCheckinStatus() {
    const { data } = await supabase
      .from('place_checkins')
      .select('checkin_date')
      .eq('user_id', user.id)
      .eq('place_id', place.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!data) return
    // Panama no tiene horario de verano: UTC-5 todo el año.
    const todayPanama = new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10)
    if (data.checkin_date === todayPanama) setCheckedInToday(true)
  }

  async function fetchCurrentPet() {
    const { data: pet } = await supabase
      .from('place_current_pet')
      .select('user_id, checkins_this_week')
      .eq('place_id', place.id)
      .maybeSingle()
    if (!pet) { setCurrentPet(null); return }
    const { data: prof } = await supabase
      .from('profiles')
      .select('pet_name, emoji, avatar_url')
      .eq('id', pet.user_id)
      .maybeSingle()
    setCurrentPet({ ...pet, profile: prof })
  }

  function handleCheckin() {
    if (checkingIn || checkedInToday) return
    if (!navigator.geolocation) {
      setCheckinMessage({ type: 'error', text: t('lugarDetalle.checkinNoGeo') })
      return
    }
    setCheckingIn(true)
    setCheckinMessage(null)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { data, error } = await supabase.rpc('checkin_place', {
          p_place_id: place.id,
          p_lat: pos.coords.latitude,
          p_lng: pos.coords.longitude,
        })
        if (error) {
          const text = error.message?.includes('cerca')
            ? t('lugarDetalle.checkinTooFar')
            : error.message?.includes('hoy')
              ? t('lugarDetalle.checkinAlreadyToday')
              : t('lugarDetalle.checkinError')
          setCheckinMessage({ type: 'error', text })
        } else if (data) {
          setCheckedInToday(true)
          setCheckinMessage({ type: 'success', text: t('lugarDetalle.checkinSuccess') })
          fetchCurrentPet()
        }
        setCheckingIn(false)
      },
      () => {
        setCheckinMessage({ type: 'error', text: t('lugarDetalle.checkinNoPermission') })
        setCheckingIn(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

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
        {onToggleSave && (
          <button onClick={onToggleSave} className="border-0 bg-transparent cursor-pointer flex-shrink-0">
            <Bookmark size={20} color={saved ? '#7C3AED' : '#9CA3AF'} fill={saved ? '#7C3AED' : 'none'} />
          </button>
        )}
        {onReport && (
          <button onClick={onReport} className="border-0 bg-transparent cursor-pointer flex-shrink-0">
            <Flag size={20} color="#9CA3AF" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-ps-bg">
        <div className="relative flex items-center justify-center overflow-hidden" style={{ height: 160, background: bg }}>
          {place.image_url ? (
            <img src={place.image_url} alt={place.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <CatIcon size={64} color={color} strokeWidth={2.1} />
          )}
          {place.image_url && (
            <div className="absolute bottom-3 left-3 w-10 h-10 rounded-full flex items-center justify-center border-2 border-white" style={{ background: color }}>
              <CatIcon size={18} color="white" strokeWidth={2.25} />
            </div>
          )}
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

          {place.lat && place.lng && (
            <div
              onClick={() => window.open(mapsUrl, '_blank')}
              className="relative overflow-hidden rounded-xl mt-3 cursor-pointer"
              style={{ height: 120 }}
            >
              <PlaceMiniMap lat={parseFloat(place.lat)} lng={parseFloat(place.lng)} category={place.category} />
              <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)' }} />
            </div>
          )}
        </div>

        {currentPet?.profile && (
          <div className="bg-white mx-4 mt-3 rounded-2xl p-3 border border-gray-100 flex items-center gap-3" style={{ borderColor: '#FDE68A' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: '#FEF3C7' }}>
              {currentPet.profile.avatar_url ? (
                <img src={currentPet.profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl">{currentPet.profile.emoji || '🐾'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#D97706' }}>
                <Crown size={13} /> {t('lugarDetalle.placePetTitle')}
              </div>
              <div className="text-sm font-bold text-gray-900 truncate">{currentPet.profile.pet_name}</div>
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">{t('lugarDetalle.checkinsThisWeek', { count: currentPet.checkins_this_week })}</span>
          </div>
        )}

        <div className="mx-4 mt-3">
          <button
            onClick={handleCheckin}
            disabled={checkingIn || checkedInToday}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm border-0 cursor-pointer"
            style={{
              background: checkedInToday ? '#DCFCE7' : checkingIn ? '#EDE9FE' : '#7C3AED',
              color: checkedInToday ? '#16A34A' : checkingIn ? '#7C3AED' : 'white',
            }}
          >
            {checkedInToday ? (
              <>✓ {t('lugarDetalle.checkinDoneToday')}</>
            ) : checkingIn ? (
              <><Loader2 size={16} className="animate-spin" /> {t('lugarDetalle.checkinLoading')}</>
            ) : (
              <><PawPrint size={16} /> {t('lugarDetalle.checkinButton')}</>
            )}
          </button>
          {checkinMessage && (
            <p className="text-xs text-center mt-2" style={{ color: checkinMessage.type === 'error' ? '#DC2626' : '#16A34A' }}>
              {checkinMessage.text}
            </p>
          )}
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
