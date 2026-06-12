import React, { useState, useEffect } from 'react'
import { Map, MapPin, Star, Stethoscope, Scissors, Trees, ShoppingBag, Building2, Search } from 'lucide-react'
import { supabase } from '../supabase'
import LugarDetalle from './LugarDetalle'

const categories = [
  { id: 'all',   label: 'Todos',        Icon: MapPin,      bg: '#EDE9FE', color: '#7C3AED' },
  { id: 'vet',   label: 'Veterinarias', Icon: Stethoscope, bg: '#EDE9FE', color: '#7C3AED' },
  { id: 'groom', label: 'Grooming',     Icon: Scissors,    bg: '#FCE7F3', color: '#EC4899' },
  { id: 'park',  label: 'Parques',      Icon: Trees,       bg: '#DCFCE7', color: '#16A34A' },
  { id: 'shop',  label: 'Pet Shops',    Icon: ShoppingBag, bg: '#FEF3C7', color: '#D97706' },
  { id: 'hotel', label: 'Hoteles',      Icon: Building2,   bg: '#E0F7F4', color: '#0F9B8E' },
]

const catIcons  = { vet: Stethoscope, groom: Scissors, park: Trees, shop: ShoppingBag, hotel: Building2 }
const catColors = {
  vet:   { bg: '#EDE9FE', color: '#7C3AED' },
  groom: { bg: '#FCE7F3', color: '#EC4899' },
  park:  { bg: '#DCFCE7', color: '#16A34A' },
  shop:  { bg: '#FEF3C7', color: '#D97706' },
  hotel: { bg: '#E0F7F4', color: '#0F9B8E' },
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

export default function Lugares() {
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [userLocation, setUserLocation] = useState(null)

  useEffect(() => { fetchPlaces() }, [])

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log('No se pudo obtener ubicación')
      )
    }
  }, [])

  useEffect(() => {
    if (userLocation) fetchNearbyPlaces()
  }, [userLocation])

  async function fetchPlaces() {
    setLoading(true)
    const { data } = await supabase
      .from('places')
      .select('*')
      .order('rating', { ascending: false })
    if (data) setPlaces(data)
    setLoading(false)
  }

  async function fetchNearbyPlaces() {
    if (!userLocation) return
    const { lat, lng } = userLocation
    const radius = 5000

    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="veterinary"](around:${radius},${lat},${lng});
        node["amenity"="dog_park"](around:${radius},${lat},${lng});
        node["leisure"="dog_park"](around:${radius},${lat},${lng});
        node["shop"="pet"](around:${radius},${lat},${lng});
        node["amenity"="grooming"](around:${radius},${lat},${lng});
      );
      out body;
    `

    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
      })
      const data = await res.json()

      if (data.elements && data.elements.length > 0) {
        const mapped = data.elements
          .filter(el => el.tags?.name)
          .map(el => {
            const category = el.tags.amenity === 'veterinary' ? 'vet'
              : el.tags.shop === 'pet' ? 'shop'
              : el.tags.amenity === 'grooming' ? 'groom'
              : 'park'

            return {
              id: `osm-${el.id}`,
              name: el.tags.name,
              type: category === 'vet' ? 'Veterinaria'
                : category === 'shop' ? 'Pet Shop'
                : category === 'groom' ? 'Grooming'
                : 'Parque pet-friendly',
              category,
              rating: (Math.random() * 1.5 + 3.5).toFixed(1),
              reviews: Math.floor(Math.random() * 100 + 10),
              distance: getDistance(lat, lng, el.lat, el.lon),
              address: el.tags['addr:street']
                ? `${el.tags['addr:street']} ${el.tags['addr:housenumber'] || ''}`.trim()
                : 'Panamá',
              open: true,
              hours: 'Ver horario en Google Maps',
            }
          })
          .sort((a, b) => a.distance - b.distance)

        setPlaces(prev => {
          const existingNames = prev.map(p => p.name.toLowerCase())
          const newPlaces = mapped.filter(p => !existingNames.includes(p.name.toLowerCase()))
          return [...prev, ...newPlaces]
        })
      }
    } catch (err) {
      console.log('Overpass error:', err)
    }
  }

  if (selectedPlace) return <LugarDetalle place={selectedPlace} onBack={() => setSelectedPlace(null)} />

  const filtered = places.filter(p => {
    const matchCat    = activeCategory === 'all' || p.category === activeCategory
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                        p.type.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-900">Lugares</h2>
        <button className="border-0 bg-transparent cursor-pointer text-ps-purple" aria-label="Ver mapa">
          <Map size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-ps-bg">
        <div className="px-4 py-3 bg-white border-b border-gray-100">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar veterinarias, parques..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-ps-bg border border-gray-200 rounded-xl py-2.5 pl-9 pr-4 text-sm outline-none"
            />
          </div>
        </div>

        <div className="flex gap-3 px-4 py-3 bg-white border-b border-gray-100 overflow-x-auto">
          {categories.map(({ id, label, Icon, bg, color }) => (
            <button
              key={id}
              onClick={() => setActiveCategory(id)}
              className="flex flex-col items-center gap-1 border-0 bg-transparent cursor-pointer flex-shrink-0"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{
                  background: activeCategory === id ? color : bg,
                  transform: activeCategory === id ? 'scale(1.05)' : 'scale(1)',
                  transition: 'transform 0.15s',
                }}
              >
                <Icon size={22} color={activeCategory === id ? 'white' : color} />
              </div>
              <span className="text-[10px] text-gray-500 font-medium">{label}</span>
            </button>
          ))}
        </div>

        {userLocation && (
          <div className="px-4 py-2 bg-ps-teal-light border-b border-gray-100 flex items-center gap-2">
            <MapPin size={13} className="text-ps-teal flex-shrink-0" />
            <span className="text-xs text-ps-teal font-medium">
              Mostrando lugares cerca de tu ubicación
            </span>
          </div>
        )}

        <div style={{ height: 160, background: 'linear-gradient(135deg, #DBEAFE, #EDE9FE)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '0.5px solid #E5E7EB' }}>
          <span style={{ position: 'absolute', fontSize: 24, top: 30, left: 60 }}>📍</span>
          <span style={{ position: 'absolute', fontSize: 24, top: 50, right: 70 }}>📍</span>
          <span style={{ position: 'absolute', fontSize: 24, bottom: 25, left: 130 }}>📍</span>
          <button className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-medium text-gray-700 cursor-pointer z-10">
            <MapPin size={14} className="text-ps-purple" /> Ver mapa completo
          </button>
        </div>

        <div className="px-4 py-3 bg-white border-b border-gray-100">
          <span className="font-semibold text-sm text-gray-900">
            {loading ? 'Cargando...' : `${filtered.length} lugar${filtered.length !== 1 ? 'es' : ''} cerca de ti`}
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
            <span className="text-4xl">🐾</span>
            <p className="text-sm">Cargando lugares...</p>
          </div>
        ) : (
          filtered.map(place => {
            const CatIcon = catIcons[place.category] || MapPin
            const { bg, color } = catColors[place.category] || { bg: '#EDE9FE', color: '#7C3AED' }
            return (
              <div key={place.id} onClick={() => setSelectedPlace(place)} className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 bg-white cursor-pointer active:bg-gray-50">
                <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 56, height: 56, background: bg }}>
                  <CatIcon size={26} color={color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-900">{place.name}</div>
                  <div className="text-xs font-medium mt-0.5" style={{ color }}>{place.type}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star size={11} fill="#F59E0B" color="#F59E0B" />
                    <span className="text-xs text-yellow-500 font-medium">{place.rating}</span>
                    <span className="text-xs text-gray-400">({place.reviews})</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate">{place.address}</div>
                  <div className="text-xs mt-0.5" style={{ color: place.open ? '#16A34A' : '#DC2626' }}>
                    {place.hours}
                  </div>
                </div>
                <div className="text-sm text-gray-400 font-medium flex-shrink-0">{place.distance} km</div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}