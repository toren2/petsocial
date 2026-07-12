import React, { useState, useEffect } from 'react'
import { Bell, MapPin, Calendar, MessageCircle, Newspaper, Stethoscope, Scissors, Trees, ShoppingBag, Building2, UtensilsCrossed, Heart, ChevronRight, AlertTriangle } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'
import VerifiedBadge from '../components/VerifiedBadge'

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const LOST_PET_ALERT_RADIUS_KM = 5

const GENERAL_TIP_KEYS = [
  'tipHydration', 'tipDental', 'tipPaws', 'tipNails', 'tipBrush', 'tipFleas',
  'tipExercise', 'tipFood', 'tipVetCheckup', 'tipPlay', 'tipId', 'tipCar',
]
const GENERAL_TIP_STYLE = {
  tipHydration:  { emoji: '💧', color: '#3B82F6', bg: '#DBEAFE' },
  tipDental:     { emoji: '🦷', color: '#0F9B8E', bg: '#E0F7F4' },
  tipPaws:       { emoji: '🐾', color: '#D97706', bg: '#FEF3C7' },
  tipNails:      { emoji: '✂️', color: '#EC4899', bg: '#FCE7F3' },
  tipBrush:      { emoji: '🪮', color: '#7C3AED', bg: '#EDE9FE' },
  tipFleas:      { emoji: '🦟', color: '#16A34A', bg: '#DCFCE7' },
  tipExercise:   { emoji: '🏃', color: '#DC2626', bg: '#FEE2E2' },
  tipFood:       { emoji: '🍖', color: '#D97706', bg: '#FEF3C7' },
  tipVetCheckup: { emoji: '🩺', color: '#7C3AED', bg: '#EDE9FE' },
  tipPlay:       { emoji: '🎾', color: '#EC4899', bg: '#FCE7F3' },
  tipId:         { emoji: '🏷️', color: '#0F9B8E', bg: '#E0F7F4' },
  tipCar:        { emoji: '🚗', color: '#DC2626', bg: '#FEE2E2' },
}

function getDailyTip(t, date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((date - start) / 86400000)
  const key = GENERAL_TIP_KEYS[dayOfYear % GENERAL_TIP_KEYS.length]
  const style = GENERAL_TIP_STYLE[key]
  return { ...style, title: t(`hub.${key}Title`), body: t(`hub.${key}Body`) }
}

function getLostPetTip(t, lostPets, userLocation) {
  if (!lostPets || lostPets.length === 0) return null

  let nearest = null
  if (userLocation) {
    for (const p of lostPets) {
      if (p.last_seen_lat == null || p.last_seen_lng == null) continue
      const dist = getDistance(userLocation.lat, userLocation.lng, p.last_seen_lat, p.last_seen_lng)
      if (dist <= LOST_PET_ALERT_RADIUS_KM && (!nearest || dist < nearest.distance)) {
        nearest = { ...p, distance: dist }
      }
    }
  }

  if (!nearest) return null
  return {
    emoji: '🚨',
    color: '#DC2626',
    bg: '#FEE2E2',
    title: t('hub.tipLostPetTitle'),
    body: t('hub.tipLostPetBody', { name: nearest.pet_name, distance: nearest.distance.toFixed(1) }),
  }
}

function getVaccineTip(t, vaccines) {
  if (!vaccines || vaccines.length === 0) return null
  const withDates = vaccines.filter(v => v.next_due_date)
  if (withDates.length === 0) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sorted = [...withDates].sort((a, b) => new Date(a.next_due_date) - new Date(b.next_due_date))
  const next = sorted[0]
  const dueDate = new Date(`${next.next_due_date}T00:00:00`)
  const diffDays = Math.round((dueDate - today) / 86400000)

  if (diffDays < 0) {
    const days = Math.abs(diffDays)
    return { emoji: '💉', color: '#DC2626', bg: '#FEE2E2', title: t('hub.tipVaccineOverdueTitle'), body: t('hub.tipVaccineOverdueBody', { name: next.name, days, plural: days === 1 ? '' : 's' }) }
  } else if (diffDays === 0) {
    return { emoji: '💉', color: '#DC2626', bg: '#FEE2E2', title: t('hub.tipVaccineTodayTitle'), body: t('hub.tipVaccineTodayBody', { name: next.name }) }
  } else if (diffDays <= 14) {
    return { emoji: '💉', color: '#D97706', bg: '#FEF3C7', title: t('hub.tipVaccineSoonTitle'), body: t('hub.tipVaccineSoonBody', { name: next.name, days: diffDays, plural: diffDays === 1 ? '' : 's' }) }
  }
  return null
}

function getEventTip(t, myEvents) {
  if (!myEvents || myEvents.length === 0) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sorted = [...myEvents].sort((a, b) => new Date(a.date) - new Date(b.date))
  const next = sorted[0]
  const eventDate = new Date(`${next.date}T00:00:00`)
  const diffDays = Math.round((eventDate - today) / 86400000)

  if (diffDays < 0) return null
  if (diffDays === 0) {
    return { emoji: '📅', color: '#7C3AED', bg: '#EDE9FE', title: t('hub.tipEventTodayTitle'), body: t('hub.tipEventTodayBody', { title: next.title }) }
  } else if (diffDays <= 3) {
    return { emoji: '📅', color: '#7C3AED', bg: '#EDE9FE', title: t('hub.tipEventSoonTitle'), body: t('hub.tipEventSoonBody', { title: next.title, days: diffDays, plural: diffDays === 1 ? '' : 's' }) }
  }
  return null
}

function getWeatherTip(t, weather) {
  if (!weather) return null
  const temp = weather.main?.temp
  const condition = weather.weather?.[0]?.main
  const roundedTemp = Math.round(temp)

  if (condition === 'Rain' || condition === 'Thunderstorm' || condition === 'Drizzle') {
    return { emoji: '🌧️', color: '#3B82F6', bg: '#DBEAFE', title: t('hub.tipRainTitle'), body: t('hub.tipRainBody') }
  } else if (temp >= 32) {
    return { emoji: '🌡️', color: '#DC2626', bg: '#FEE2E2', title: t('hub.tipHotTitle', { temp: roundedTemp }), body: t('hub.tipHotBody') }
  } else if (temp >= 27) {
    return { emoji: '☀️', color: '#D97706', bg: '#FEF3C7', title: t('hub.tipWarmTitle', { temp: roundedTemp }), body: t('hub.tipWarmBody') }
  } else if (temp < 20) {
    return { emoji: '🧥', color: '#7C3AED', bg: '#EDE9FE', title: t('hub.tipCoolTitle', { temp: roundedTemp }), body: t('hub.tipCoolBody') }
  } else {
    return { emoji: '🌤️', color: '#0F9B8E', bg: '#E0F7F4', title: t('hub.tipNiceTitle', { temp: roundedTemp }), body: t('hub.tipNiceBody') }
  }
}

export default function Hub({ onNavigate, unreadCount }) {
  const { user } = useAuth()
  const { t, language, setLanguage } = useLanguage()
  const [profile, setProfile] = useState(null)
  const [nearbyMatches, setNearbyMatches] = useState([])
  const [nearbyPlaces, setNearbyPlaces] = useState([])
  const [userLocation, setUserLocation] = useState(null)
  const [weather, setWeather] = useState(null)
  const [vaccines, setVaccines] = useState([])
  const [lostPets, setLostPets] = useState([])
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [myEvents, setMyEvents] = useState([])

  const categories = [
    { id: 'vet',        label: t('hub.catVet'),        Icon: Stethoscope,     color: '#7C3AED', bg: '#EDE9FE' },
    { id: 'groom',      label: t('hub.catGroom'),      Icon: Scissors,        color: '#EC4899', bg: '#FCE7F3' },
    { id: 'park',       label: t('hub.catPark'),       Icon: Trees,           color: '#16A34A', bg: '#DCFCE7' },
    { id: 'shop',       label: t('hub.catShop'),       Icon: ShoppingBag,     color: '#D97706', bg: '#FEF3C7' },
    { id: 'hotel',      label: t('hub.catHotel'),      Icon: Building2,       color: '#0F9B8E', bg: '#E0F7F4' },
    { id: 'restaurant', label: t('hub.catRestaurant'), Icon: UtensilsCrossed, color: '#DC2626', bg: '#FEE2E2' },
  ]

  const quickActions = [
    { id: 'feed',     label: t('hub.qaFeed'),     Icon: Newspaper,     color: '#7C3AED', bg: '#EDE9FE' },
    { id: 'match',    label: t('hub.qaMatch'),    Icon: Heart,         color: '#EC4899', bg: '#FCE7F3' },
    { id: 'chat',     label: t('hub.qaChat'),     Icon: MessageCircle, color: '#0F9B8E', bg: '#E0F7F4' },
    { id: 'eventos',  label: t('hub.qaEventos'),  Icon: Calendar,      color: '#D97706', bg: '#FEF3C7' },
    { id: 'perdidos', label: t('hub.qaPerdidos'), Icon: AlertTriangle, color: '#DC2626', bg: '#FEE2E2' },
  ]

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return t('hub.greetingMorning')
    if (hour < 18) return t('hub.greetingAfternoon')
    return t('hub.greetingEvening')
  }

  useEffect(() => {
    fetchProfile()
    fetchNearbyMatches()
    fetchVaccines()
    fetchLostPets()
    fetchUpcomingEvents()
    fetchMyEvents()
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async pos => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setUserLocation(loc)
          try {
            const apiKey = import.meta.env.VITE_OPENWEATHER_KEY
            const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${loc.lat}&lon=${loc.lng}&units=metric&appid=${apiKey}`)
            const data = await res.json()
            setWeather(data)
          } catch (err) {
            console.log('Weather error:', err)
          }
        },
        () => {}
      )
    }
  }, [])

  useEffect(() => {
    if (userLocation) fetchNearbyPlaces()
  }, [userLocation])

  async function fetchProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) setProfile(data)
  }

  async function fetchNearbyMatches() {
    const { data: existingMatches } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    const matchedIds = existingMatches?.map(m => m.user1_id === user.id ? m.user2_id : m.user1_id) || []

    const { data: blocks } = await supabase
      .from('blocked_users')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`)
    const blockedIds = blocks?.map(b => b.blocker_id === user.id ? b.blocked_id : b.blocker_id) || []

    const { data } = await supabase
      .from('profiles')
      .select('id, pet_name, breed, age, emoji, avatar_url, location')
      .neq('id', user.id)
      .not('id', 'in', `(${[user.id, ...matchedIds, ...blockedIds].join(',')})`)
      .limit(6)

    if (data && data.length > 0) {
      const ids = data.map(p => p.id)
      const { data: verifiedRows } = await supabase
        .from('verification_requests')
        .select('user_id')
        .in('user_id', ids)
        .eq('status', 'aprobado')
      const verifiedIds = new Set(verifiedRows?.map(v => v.user_id) || [])
      setNearbyMatches(data.map(p => ({ ...p, verified: verifiedIds.has(p.id) })))
    } else {
      setNearbyMatches([])
    }
  }

  async function fetchVaccines() {
    const { data } = await supabase.from('vaccines').select('*').eq('user_id', user.id)
    if (data) setVaccines(data)
  }

  async function fetchLostPets() {
    const { data } = await supabase
      .from('lost_pets')
      .select('id, pet_name, last_seen_lat, last_seen_lng, created_at')
      .eq('status', 'perdido')
    if (data) setLostPets(data)
  }

  async function fetchUpcomingEvents() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('events')
      .select('*, profiles(pet_name, emoji, avatar_url)')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(5)
    if (data) setUpcomingEvents(data)
  }

  async function fetchMyEvents() {
    const { data } = await supabase
      .from('event_attendees')
      .select('events(*)')
      .eq('user_id', user.id)
    if (data) setMyEvents(data.map(a => a.events).filter(Boolean))
  }

  async function fetchNearbyPlaces() {
    const { data } = await supabase
      .from('places')
      .select('*')
      .order('rating', { ascending: false })
      .limit(5)
    if (data) setNearbyPlaces(data)
  }

  const lostPetTip = getLostPetTip(t, lostPets, userLocation)
  const eventTip = getEventTip(t, myEvents)
  const vaccineTip = getVaccineTip(t, vaccines)
  const weatherTip = getWeatherTip(t, weather)
  const dailyTip = getDailyTip(t)
  const tips = [lostPetTip, eventTip, vaccineTip, weatherTip, dailyTip].filter(Boolean)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div
        className="px-5 pt-5 pb-6 flex-shrink-0"
        style={{ background: 'linear-gradient(160deg, #6D28D9, #7C3AED)' }}
      >
        <div style={{ overflow: 'hidden', height: '50px', display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <img
            src="/snoutt-logo.png"
            alt="Snoutt"
            style={{ height: '90px', width: 'auto', filter: 'brightness(0) invert(1)', transformOrigin: '45% center' }}
          />
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full overflow-hidden bg-white/20 flex items-center justify-center flex-shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">{profile?.emoji || '🐕'}</span>
              )}
            </div>
            <div>
              <p className="text-white/70 text-xs">{t('hub.greeting', { greeting: getGreeting(), name: profile?.pet_name || t('hub.friend') })}</p>
              <p className="text-white font-bold text-base">{t('hub.whatAdventure')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
              className="border-0 cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              {language === 'es' ? 'EN' : 'ES'}
            </button>
            <button
              onClick={() => onNavigate('feed')}
              className="relative w-9 h-9 rounded-full flex items-center justify-center border-0 cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              <Bell size={18} color="white" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-ps-pink rounded-full border border-white flex items-center justify-center text-white text-[9px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div
          onClick={() => onNavigate('lugares')}
          className="flex items-center gap-3 rounded-2xl px-4 py-3 cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.15)' }}
        >
          <MapPin size={18} color="white" />
          <span className="text-white/80 text-sm">{t('hub.searchPlaces')}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-ps-bg">

        <div className="px-4 pt-4 pb-2">
          <h3 className="text-sm font-bold text-gray-900 mb-3">{t('hub.forToday')}</h3>
          <div className="flex flex-col gap-2">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: tip.bg }}>
                <span className="text-2xl flex-shrink-0">{tip.emoji}</span>
                <div>
                  <p className="text-xs font-bold" style={{ color: tip.color }}>{tip.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{tip.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 py-2">
          <h3 className="text-sm font-bold text-gray-900 mb-3">{t('hub.quickActions')}</h3>
          <div className="grid grid-cols-5 gap-2">
            {quickActions.map(({ id, label, Icon, color, bg }) => (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border-0 cursor-pointer"
                style={{ background: bg }}
              >
                <Icon size={23} color={color} strokeWidth={2.25} />
                <span className="text-[10px] font-semibold" style={{ color }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {upcomingEvents.length > 0 && (
          <div className="px-4 py-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">{t('hub.eventsUpcoming')}</h3>
              <button onClick={() => onNavigate('eventos')} className="flex items-center gap-1 text-xs font-medium border-0 bg-transparent cursor-pointer" style={{ color: '#7C3AED' }}>
                {t('common.seeAll')} <ChevronRight size={14} />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {upcomingEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => onNavigate('eventos')}
                  className="flex-shrink-0 bg-white rounded-2xl overflow-hidden border border-gray-100 cursor-pointer active:opacity-80"
                  style={{ width: 160 }}
                >
                  <div className="relative flex items-center justify-center text-4xl overflow-hidden" style={{ height: 90, background: event.bg || '#EDE9FE' }}>
                    {event.image_url ? (
                      <img src={event.image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      event.emoji || '📅'
                    )}
                    {event.profiles && (
                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full pl-0.5 pr-2 py-0.5 max-w-[90%]">
                        <div className="w-4 h-4 rounded-full overflow-hidden bg-white/30 flex items-center justify-center flex-shrink-0">
                          {event.profiles.avatar_url ? (
                            <img src={event.profiles.avatar_url} alt={event.profiles.pet_name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[8px]">{event.profiles.emoji || '🐕'}</span>
                          )}
                        </div>
                        <span className="text-[9px] font-semibold text-white truncate">{event.profiles.pet_name}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-bold text-gray-900 truncate mb-1">{event.title}</p>
                    <p className="text-[10px] text-gray-400 truncate">{event.date} · {event.time}</p>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{event.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {nearbyMatches.length > 0 && (
          <div className="px-4 py-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">{t('hub.matchNearby')}</h3>
              <button onClick={() => onNavigate('match')} className="flex items-center gap-1 text-xs font-medium border-0 bg-transparent cursor-pointer" style={{ color: '#7C3AED' }}>
                {t('common.seeAll')} <ChevronRight size={14} />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {nearbyMatches.map(pet => (
                <div key={pet.id} className="flex-shrink-0 bg-white rounded-2xl overflow-hidden border border-gray-100" style={{ width: 110 }}>
                  <div className="flex items-center justify-center" style={{ height: 90, background: '#EDE9FE', fontSize: 48 }}>
                    {pet.avatar_url ? (
                      <img src={pet.avatar_url} alt={pet.pet_name} className="w-full h-full object-cover" />
                    ) : (
                      pet.emoji || '🐕'
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-bold text-gray-900 truncate flex items-center gap-0.5">
                      {pet.pet_name} <VerifiedBadge verified={pet.verified} size={11} />
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">{pet.age} {t('common.years')} · {pet.breed}</p>
                    <button
                      onClick={() => onNavigate('match')}
                      className="mt-1.5 w-full flex items-center justify-center gap-1 py-1 rounded-full border-0 cursor-pointer text-[10px] font-semibold"
                      style={{ background: '#FCE7F3', color: '#EC4899' }}
                    >
                      <Heart size={10} /> {t('match.title')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {nearbyPlaces.length > 0 && (
          <div className="px-4 py-2 pb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">{t('hub.placesRecommended')}</h3>
              <button onClick={() => onNavigate('lugares')} className="flex items-center gap-1 text-xs font-medium border-0 bg-transparent cursor-pointer" style={{ color: '#7C3AED' }}>
                {t('common.seeAll')} <ChevronRight size={14} />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {nearbyPlaces.map(place => (
                <div key={place.id} onClick={() => onNavigate('lugares')} className="flex items-center gap-3 bg-white rounded-2xl px-3 py-3 border border-gray-100 cursor-pointer active:bg-gray-50">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#EDE9FE' }}>
                    <MapPin size={18} color="#7C3AED" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{place.name}</p>
                    <p className="text-xs text-gray-400 truncate">{place.type}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-xs text-yellow-500">⭐</span>
                    <span className="text-xs font-medium text-gray-700">{place.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 py-2 pb-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3">{t('hub.exploreByCategory')}</h3>
          <div className="grid grid-cols-3 gap-2">
            {categories.map(({ id, label, Icon, color, bg }) => (
              <button
                key={id}
                onClick={() => onNavigate('lugares', id)}
                className="flex flex-col items-center gap-2 py-4 rounded-2xl border-0 cursor-pointer"
                style={{ background: bg }}
              >
                <Icon size={25} color={color} strokeWidth={2.25} />
                <span className="text-[10px] font-semibold text-center leading-tight" style={{ color }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
