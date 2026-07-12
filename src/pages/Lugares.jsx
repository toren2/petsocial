import React, { useState, useEffect } from 'react'
import { Map, MapPin, Star, Stethoscope, Scissors, Trees, ShoppingBag, Building2, Search, Heart, UtensilsCrossed, Navigation, Crown } from 'lucide-react'
import { supabase } from '../supabase'
import { useLanguage } from '../LanguageContext'
import LugarDetalle from './LugarDetalle'
import MapaLugares from '../components/MapaLugares'
import MiniMapaLugares from '../components/MiniMapaLugares'

const NEARBY_RADIUS_KM = 10

const catIcons  = { vet: Stethoscope, groom: Scissors, park: Trees, shop: ShoppingBag, hotel: Building2, restaurant: UtensilsCrossed }
const catColors = {
  vet:        { bg: '#EDE9FE', color: '#7C3AED' },
  groom:      { bg: '#FCE7F3', color: '#EC4899' },
  park:       { bg: '#DCFCE7', color: '#16A34A' },
  shop:       { bg: '#FEF3C7', color: '#D97706' },
  hotel:      { bg: '#E0F7F4', color: '#0F9B8E' },
  restaurant: { bg: '#FEE2E2', color: '#DC2626' },
}

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) ** 2
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1)
}

export default function Lugares({ initialCategory = 'all' }) {
  const { t } = useLanguage()
  const categories = [
    { id: 'all',        label: t('lugares.catAll'),        Icon: MapPin,         bg: '#EDE9FE', color: '#7C3AED' },
    { id: 'vet',        label: t('lugares.catVet'),        Icon: Stethoscope,    bg: '#EDE9FE', color: '#7C3AED' },
    { id: 'groom',      label: t('lugares.catGroom'),      Icon: Scissors,       bg: '#FCE7F3', color: '#EC4899' },
    { id: 'park',       label: t('lugares.catPark'),       Icon: Trees,          bg: '#DCFCE7', color: '#16A34A' },
    { id: 'shop',       label: t('lugares.catShop'),       Icon: ShoppingBag,    bg: '#FEF3C7', color: '#D97706' },
    { id: 'hotel',      label: t('lugares.catHotel'),      Icon: Building2,      bg: '#E0F7F4', color: '#0F9B8E' },
    { id: 'restaurant', label: t('lugares.catRestaurant'), Icon: UtensilsCrossed, bg: '#FEE2E2', color: '#DC2626' },
  ]
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const [activeTab, setActiveTab] = useState('cerca')
  const [search, setSearch] = useState('')
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [showMap, setShowMap] = useState(false)
  const [placesWithPet, setPlacesWithPet] = useState(new Set())

  useEffect(() => { fetchPlaces(); fetchPlacesWithPet() }, [])

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log('No se pudo obtener ubicación')
      )
    }
  }, [])

  useEffect(() => {
    if (!userLocation) return
    setPlaces(prev => prev.map(p => {
      if (p.lat && p.lng) {
        return { ...p, distance: parseFloat(getDistance(userLocation.lat, userLocation.lng, parseFloat(p.lat), parseFloat(p.lng))) }
      }
      return p
    }))
  }, [userLocation])

  const nearbyForMinimap = userLocation
    ? places
        .filter(p => p.lat && p.lng && p.distance != null && p.distance <= NEARBY_RADIUS_KM)
        .sort((a, b) => (a.distance || 999) - (b.distance || 999))
        .slice(0, 8)
    : []

  async function fetchPlaces() {
    setLoading(true)
    const { data } = await supabase.from('places').select('*').order('rating', { ascending: false })
    if (data) setPlaces(data)
    setLoading(false)
  }

  async function fetchPlacesWithPet() {
    const { data } = await supabase.from('place_current_pet').select('place_id')
    if (data) setPlacesWithPet(new Set(data.map(d => d.place_id)))
  }

  function refreshLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log('No se pudo obtener ubicación')
      )
    }
  }

  function openMap() {
    if (userLocation) { setShowMap(true); return }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setShowMap(true) },
        () => setShowMap(true),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      )
    } else {
      setShowMap(true)
    }
  }

  if (selectedPlace) return <LugarDetalle place={selectedPlace} onBack={() => setSelectedPlace(null)} />

  let filtered = places.filter(p => {
    const matchCat    = activeCategory === 'all' || p.category === activeCategory
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.type.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  if (activeTab === 'cerca') {
    if (userLocation) {
      filtered = filtered
        .filter(p => p.distance != null && p.distance <= NEARBY_RADIUS_KM)
        .sort((a, b) => (a.distance || 999) - (b.distance || 999))
    } else {
      filtered = []
    }
  }

  // Top lugar destacado
  const featuredPlace = filtered[0]

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t('lugares.title')}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{t('lugares.subtitle')}</p>
        </div>
        <button onClick={openMap} className="border-0 bg-transparent cursor-pointer text-ps-purple" aria-label={t('lugares.viewMapAria')}>
          <Map size={22} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-100 flex-shrink-0">
        <button
          onClick={() => setActiveTab('cerca')}
          className="flex-1 py-2.5 text-sm font-medium border-0 bg-transparent cursor-pointer border-b-2 transition-colors"
          style={{ color: activeTab === 'cerca' ? '#7C3AED' : '#9CA3AF', borderBottomColor: activeTab === 'cerca' ? '#7C3AED' : 'transparent' }}
        >
          {t('lugares.tabNearby')}
        </button>
        <button
          onClick={() => setActiveTab('todos')}
          className="flex-1 py-2.5 text-sm font-medium border-0 bg-transparent cursor-pointer border-b-2 transition-colors"
          style={{ color: activeTab === 'todos' ? '#7C3AED' : '#9CA3AF', borderBottomColor: activeTab === 'todos' ? '#7C3AED' : 'transparent' }}
        >
          {t('lugares.tabDirectory')}
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('lugares.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-ps-bg border border-gray-200 rounded-xl py-2.5 pl-9 pr-4 text-sm outline-none"
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar categorías */}
        <div className="flex flex-col bg-white border-r border-gray-100 overflow-y-auto flex-shrink-0" style={{ width: 72 }}>
          {categories.map(({ id, label, Icon, bg, color }) => (
            <button
              key={id}
              onClick={() => setActiveCategory(id)}
              className="flex flex-col items-center gap-1 py-3 px-1 border-0 cursor-pointer flex-shrink-0 transition-colors"
              style={{ background: activeCategory === id ? '#F5F3FF' : 'white' }}
            >
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: activeCategory === id ? color : bg }}>
                <Icon size={20} color={activeCategory === id ? 'white' : color} />
              </div>
              <span className="text-[9px] text-center leading-tight font-medium" style={{ color: activeCategory === id ? color : '#9CA3AF' }}>
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto bg-ps-bg">

          {/* Banner mapa */}
          {activeTab === 'cerca' && !showMap && (
            <div
              onClick={openMap}
              className="mx-3 mt-3 rounded-2xl overflow-hidden cursor-pointer relative flex items-center justify-center"
              style={{ height: 120, background: 'linear-gradient(135deg, #6D28D9, #0F9B8E)', isolation: 'isolate' }}
            >
              <MiniMapaLugares userLocation={userLocation} places={nearbyForMinimap} />
              <div className="absolute inset-0" style={{ background: 'rgba(15,23,42,0.3)' }} />
              <div className="z-10 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                  <Navigation size={14} color="white" />
                  <span className="text-white text-xs font-semibold">{t('lugares.viewFullMap')}</span>
                </div>
                {userLocation && (
                  <span className="text-white/70 text-[10px]">{t('lugares.showingWithinKm', { km: NEARBY_RADIUS_KM })}</span>
                )}
              </div>
            </div>
          )}

          {/* Lugar destacado */}
          {featuredPlace && activeTab === 'cerca' && (
            <div className="px-3 pt-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t('lugares.topRatedNearby')}</p>
              <div
                onClick={() => setSelectedPlace(featuredPlace)}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 cursor-pointer active:opacity-80"
              >
                <div className="flex items-center gap-3 p-3">
                  <div className="relative w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: catColors[featuredPlace.category]?.bg || '#EDE9FE' }}>
                    {React.createElement(catIcons[featuredPlace.category] || MapPin, { size: 28, color: catColors[featuredPlace.category]?.color || '#7C3AED' })}
                    {placesWithPet.has(featuredPlace.id) && (
                      <div className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white" style={{ background: '#FEF3C7' }} title={t('lugares.placePetBadge')}>
                        <Crown size={11} color="#D97706" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-bold text-sm text-gray-900 leading-tight">{featuredPlace.name}</p>
                      {featuredPlace.distance != null && (
                        <span className="text-xs text-gray-400 flex-shrink-0">{featuredPlace.distance} km</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{featuredPlace.type}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={11} fill="#F59E0B" color="#F59E0B" />
                      <span className="text-xs text-yellow-500 font-medium">{featuredPlace.rating}</span>
                      <span className="text-xs text-gray-400">({featuredPlace.reviews})</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{featuredPlace.address}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info cerca */}
          {activeTab === 'cerca' && userLocation && (
            <div className="px-3 py-2 mt-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <MapPin size={12} className="text-ps-teal flex-shrink-0" />
                <span className="text-xs text-ps-teal font-medium">{t('lugares.withinKm', { km: NEARBY_RADIUS_KM })}</span>
              </div>
              <button onClick={refreshLocation} className="text-xs font-semibold border-0 cursor-pointer px-2 py-1 rounded-full" style={{ background: '#0F9B8E', color: 'white' }}>
                {t('lugares.update')}
              </button>
            </div>
          )}

          <div className="px-3 py-2 bg-white border-b border-gray-100 mt-2">
            <span className="font-semibold text-xs text-gray-900">
              {loading ? t('common.loading') : activeTab === 'todos'
                ? t(filtered.length === 1 ? 'lugares.placeCountDirectorySingular' : 'lugares.placeCountDirectoryPlural', { count: filtered.length })
                : t(filtered.length === 1 ? 'lugares.placeCountNearbySingular' : 'lugares.placeCountNearbyPlural', { count: filtered.length, km: NEARBY_RADIUS_KM })}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
              <span className="text-4xl">🐾</span>
              <p className="text-sm">{t('lugares.loadingPlaces')}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
              <span className="text-4xl">📍</span>
              <p className="text-sm">{activeTab === 'cerca' && !userLocation ? t('lugares.waitingLocation') : t('lugares.noPlacesHere')}</p>
            </div>
          ) : (
            filtered.map((place, i) => {
              if (i === 0 && activeTab === 'cerca') return null // ya se muestra como destacado
              const CatIcon = catIcons[place.category] || MapPin
              const { bg, color } = catColors[place.category] || { bg: '#EDE9FE', color: '#7C3AED' }
              return (
                <div key={place.id} onClick={() => setSelectedPlace(place)} className="flex gap-3 px-3 py-3 border-b border-gray-100 bg-white cursor-pointer active:bg-gray-50">
                  <div className="relative flex-shrink-0 rounded-2xl flex items-center justify-center" style={{ width: 80, height: 80, background: bg }}>
                    <CatIcon size={28} color={color} />
                    {placesWithPet.has(place.id) && (
                      <div className="absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white" style={{ background: '#FEF3C7' }} title={t('lugares.placePetBadge')}>
                        <Crown size={11} color="#D97706" />
                      </div>
                    )}
                    <button className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center border-0 cursor-pointer" style={{ background: 'rgba(255,255,255,0.9)' }} onClick={e => e.stopPropagation()}>
                      <Heart size={12} color="#9CA3AF" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-semibold text-sm text-gray-900 leading-tight">{place.name}</div>
                      {place.distance != null && (
                        <div className="text-xs text-gray-400 font-medium flex-shrink-0">{place.distance} km</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: bg, color }}>{place.type}</span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: '#DCFCE7', color: '#16A34A' }}>{t('lugares.dogFriendly')}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={10} fill="#F59E0B" color="#F59E0B" />
                      <span className="text-xs text-yellow-500 font-medium">{place.rating}</span>
                      <span className="text-xs text-gray-400">({place.reviews})</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate">{place.address}</div>
                    <div className="text-xs mt-0.5">
                      {place.hours === 'Ver horario en Google Maps' ? (
                        <button onClick={e => { e.stopPropagation(); window.open(`https://www.google.com/maps/search/${encodeURIComponent(place.name)}`, '_blank') }} style={{ color: '#7C3AED', fontWeight: 500, border: 0, background: 'transparent', cursor: 'pointer', padding: 0, fontSize: 11 }}>
                          {t('lugares.viewOnGoogleMaps')}
                        </button>
                      ) : (
                        <span style={{ color: place.open ? '#16A34A' : '#DC2626' }}>{place.hours}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {showMap && (
        <MapaLugares
          places={places.filter(p => p.lat && p.lng)}
          userLocation={userLocation}
          onPlaceSelect={place => { setShowMap(false); setSelectedPlace(place) }}
          onClose={() => setShowMap(false)}
        />
      )}
    </div>
  )
}