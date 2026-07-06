import React, { useState, useEffect } from 'react'
import { Bell, MapPin, Calendar, MessageCircle, Newspaper, Stethoscope, Scissors, Trees, ShoppingBag, Building2, UtensilsCrossed, Heart, ChevronRight, AlertTriangle } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import VerifiedBadge from '../components/VerifiedBadge'

const categories = [
  { id: 'vet',        label: 'Veterinarias', Icon: Stethoscope,     color: '#7C3AED', bg: '#EDE9FE' },
  { id: 'groom',      label: 'Grooming',     Icon: Scissors,        color: '#EC4899', bg: '#FCE7F3' },
  { id: 'park',       label: 'Parques',      Icon: Trees,           color: '#16A34A', bg: '#DCFCE7' },
  { id: 'shop',       label: 'Pet Shops',    Icon: ShoppingBag,     color: '#D97706', bg: '#FEF3C7' },
  { id: 'hotel',      label: 'Hoteles',      Icon: Building2,       color: '#0F9B8E', bg: '#E0F7F4' },
  { id: 'restaurant', label: 'Restaurantes', Icon: UtensilsCrossed, color: '#DC2626', bg: '#FEE2E2' },
]

const quickActions = [
  { id: 'feed',     label: 'Feed',     Icon: Newspaper,     color: '#7C3AED', bg: '#EDE9FE' },
  { id: 'match',    label: 'Match',    Icon: Heart,         color: '#EC4899', bg: '#FCE7F3' },
  { id: 'chat',     label: 'Chat',     Icon: MessageCircle, color: '#0F9B8E', bg: '#E0F7F4' },
  { id: 'eventos',  label: 'Eventos',  Icon: Calendar,      color: '#D97706', bg: '#FEF3C7' },
  { id: 'perdidos', label: 'Perdidos', Icon: AlertTriangle, color: '#DC2626', bg: '#FEE2E2' },
]

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return '¡Buenos días'
  if (hour < 18) return '¡Buenas tardes'
  return '¡Buenas noches'
}

const GENERAL_TIPS = [
  { emoji: '💧', color: '#3B82F6', bg: '#DBEAFE', title: 'Hidratación', body: 'Recuerda cambiar el agua de tu mascota hoy.' },
  { emoji: '🦷', color: '#0F9B8E', bg: '#E0F7F4', title: 'Higiene dental', body: 'Cepilla los dientes de tu mascota 2-3 veces por semana.' },
  { emoji: '🐾', color: '#D97706', bg: '#FEF3C7', title: 'Cuida sus patitas', body: 'Revisa las almohadillas después de cada paseo, sobre todo en pavimento caliente.' },
  { emoji: '✂️', color: '#EC4899', bg: '#FCE7F3', title: 'Uñas al día', body: 'Corta las uñas cada 3-4 semanas para evitar molestias al caminar.' },
  { emoji: '🪮', color: '#7C3AED', bg: '#EDE9FE', title: 'Cepillado', body: 'Cepilla su pelaje regularmente para evitar nudos y caída excesiva.' },
  { emoji: '🦟', color: '#16A34A', bg: '#DCFCE7', title: 'Antipulgas y garrapatas', body: 'Revisa que su tratamiento antiparasitario esté vigente.' },
  { emoji: '🏃', color: '#DC2626', bg: '#FEE2E2', title: 'Ejercicio diario', body: 'Al menos 30 minutos de actividad física al día ayudan a su salud física y mental.' },
  { emoji: '🍖', color: '#D97706', bg: '#FEF3C7', title: 'Porciones correctas', body: 'Evita darle sobras de comida humana, puede afectar su digestión.' },
  { emoji: '🩺', color: '#7C3AED', bg: '#EDE9FE', title: 'Chequeo veterinario', body: 'Una visita anual al veterinario ayuda a detectar problemas a tiempo.' },
  { emoji: '🎾', color: '#EC4899', bg: '#FCE7F3', title: 'Estimulación mental', body: 'Los juguetes interactivos previenen el aburrimiento y la ansiedad.' },
  { emoji: '🏷️', color: '#0F9B8E', bg: '#E0F7F4', title: 'Identificación', body: 'Verifica que su placa o chip tenga tus datos de contacto actualizados.' },
  { emoji: '🚗', color: '#DC2626', bg: '#FEE2E2', title: 'Nunca en el carro', body: 'No dejes a tu mascota sola dentro del carro, ni con las ventanas abiertas.' },
]

function getDailyTip(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((date - start) / 86400000)
  return GENERAL_TIPS[dayOfYear % GENERAL_TIPS.length]
}

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

function getLostPetTip(lostPets, userLocation) {
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
    title: 'Mascota perdida cerca',
    body: `${nearest.pet_name} se perdió a ${nearest.distance.toFixed(1)} km de ti. Toca "Perdidos" para ver los detalles.`,
  }
}

function getVaccineTip(vaccines) {
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
    return { emoji: '💉', color: '#DC2626', bg: '#FEE2E2', title: 'Vacuna vencida', body: `${next.name} venció hace ${days} día${days === 1 ? '' : 's'}. Agenda una cita pronto.` }
  } else if (diffDays === 0) {
    return { emoji: '💉', color: '#DC2626', bg: '#FEE2E2', title: 'Vacuna hoy', body: `${next.name} vence hoy.` }
  } else if (diffDays <= 14) {
    return { emoji: '💉', color: '#D97706', bg: '#FEF3C7', title: 'Vacuna próxima', body: `${next.name} vence en ${diffDays} día${diffDays === 1 ? '' : 's'}.` }
  }
  return null
}

function getWeatherTip(weather) {
  if (!weather) return null
  const temp = weather.main?.temp
  const condition = weather.weather?.[0]?.main

  if (condition === 'Rain' || condition === 'Thunderstorm' || condition === 'Drizzle') {
    return { emoji: '🌧️', color: '#3B82F6', bg: '#DBEAFE', title: 'Lluvia hoy', body: 'Mejor quedarse en casa o llevar impermeable para tu mascota.' }
  } else if (temp >= 32) {
    return { emoji: '🌡️', color: '#DC2626', bg: '#FEE2E2', title: `Mucho calor · ${Math.round(temp)}°C`, body: 'Evita paseos en horas pico. Lleva agua y cuida las patitas.' }
  } else if (temp >= 27) {
    return { emoji: '☀️', color: '#D97706', bg: '#FEF3C7', title: `Calor · ${Math.round(temp)}°C`, body: 'No olvides llevar agua y cuidar las patitas de tu mascota.' }
  } else if (temp < 20) {
    return { emoji: '🧥', color: '#7C3AED', bg: '#EDE9FE', title: `Fresco · ${Math.round(temp)}°C`, body: 'Buen clima para pasear, considera abrigo para razas pequeñas.' }
  } else {
    return { emoji: '🌤️', color: '#0F9B8E', bg: '#E0F7F4', title: `Buen clima · ${Math.round(temp)}°C`, body: 'Perfecto para un paseo con tu mascota hoy.' }
  }
}

export default function Hub({ onNavigate, unreadCount }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [nearbyMatches, setNearbyMatches] = useState([])
  const [nearbyPlaces, setNearbyPlaces] = useState([])
  const [userLocation, setUserLocation] = useState(null)
  const [weather, setWeather] = useState(null)
  const [vaccines, setVaccines] = useState([])
  const [lostPets, setLostPets] = useState([])

  useEffect(() => {
    fetchProfile()
    fetchNearbyMatches()
    fetchVaccines()
    fetchLostPets()
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

  async function fetchNearbyPlaces() {
    const { data } = await supabase
      .from('places')
      .select('*')
      .order('rating', { ascending: false })
      .limit(5)
    if (data) setNearbyPlaces(data)
  }

  const lostPetTip = getLostPetTip(lostPets, userLocation)
  const vaccineTip = getVaccineTip(vaccines)
  const weatherTip = getWeatherTip(weather)
  const dailyTip = getDailyTip()
  const tips = [lostPetTip, vaccineTip, weatherTip, dailyTip].filter(Boolean)

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
              <p className="text-white/70 text-xs">{getGreeting()}, {profile?.pet_name || 'amigo'}! 🐾</p>
              <p className="text-white font-bold text-base">¿Qué aventura hoy?</p>
            </div>
          </div>
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

        <div
          onClick={() => onNavigate('lugares')}
          className="flex items-center gap-3 rounded-2xl px-4 py-3 cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.15)' }}
        >
          <MapPin size={18} color="white" />
          <span className="text-white/80 text-sm">Buscar lugares pet-friendly...</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-ps-bg">

        <div className="px-4 pt-4 pb-2">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Para hoy 🌟</h3>
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
          <h3 className="text-sm font-bold text-gray-900 mb-3">Acciones rápidas</h3>
          <div className="grid grid-cols-5 gap-2">
            {quickActions.map(({ id, label, Icon, color, bg }) => (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border-0 cursor-pointer"
                style={{ background: bg }}
              >
                <Icon size={22} color={color} />
                <span className="text-[10px] font-semibold" style={{ color }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {nearbyMatches.length > 0 && (
          <div className="px-4 py-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">Match cerca de ti ❤️</h3>
              <button onClick={() => onNavigate('match')} className="flex items-center gap-1 text-xs font-medium border-0 bg-transparent cursor-pointer" style={{ color: '#7C3AED' }}>
                Ver todos <ChevronRight size={14} />
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
                    <p className="text-[10px] text-gray-400 truncate">{pet.age} años · {pet.breed}</p>
                    <button
                      onClick={() => onNavigate('match')}
                      className="mt-1.5 w-full flex items-center justify-center gap-1 py-1 rounded-full border-0 cursor-pointer text-[10px] font-semibold"
                      style={{ background: '#FCE7F3', color: '#EC4899' }}
                    >
                      <Heart size={10} /> Match
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
              <h3 className="text-sm font-bold text-gray-900">Lugares recomendados 📍</h3>
              <button onClick={() => onNavigate('lugares')} className="flex items-center gap-1 text-xs font-medium border-0 bg-transparent cursor-pointer" style={{ color: '#7C3AED' }}>
                Ver todos <ChevronRight size={14} />
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
          <h3 className="text-sm font-bold text-gray-900 mb-3">Explorar por categoría</h3>
          <div className="grid grid-cols-3 gap-2">
            {categories.map(({ id, label, Icon, color, bg }) => (
              <button
                key={id}
                onClick={() => onNavigate('lugares', id)}
                className="flex flex-col items-center gap-2 py-4 rounded-2xl border-0 cursor-pointer"
                style={{ background: bg }}
              >
                <Icon size={24} color={color} />
                <span className="text-[10px] font-semibold text-center leading-tight" style={{ color }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}