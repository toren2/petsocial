import React, { useState, useEffect } from 'react'
import { SlidersHorizontal, X, Heart, Star, Bookmark } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { notifyMatch } from '../notifications'

const tagColors = {
  'Muy activo':   'bg-green-100 text-green-800',
  'Activa':       'bg-green-100 text-green-800',
  'Hiperactivo':  'bg-red-100 text-red-800',
  'Tranquila':    'bg-blue-100 text-blue-800',
  'Sociable':     'bg-purple-100 text-purple-800',
  'Amigable':     'bg-purple-100 text-purple-800',
  'Juguetón':     'bg-yellow-100 text-yellow-800',
  'Cariñosa':     'bg-pink-100 text-pink-800',
  'Busca amigos': 'bg-teal-100 text-teal-800',
}

const DAILY_LIKE_LIMIT = 10
const SIZES = ['Pequeño', 'Mediano', 'Grande']

function PhotoCarousel({ photos, emoji, bg, online, location }) {
  const [index, setIndex] = useState(0)

  if (!photos.length) return (
    <div className="relative flex items-center justify-center overflow-hidden" style={{ height: 300, background: bg || '#EDE9FE', fontSize: 110 }}>
      <span>{emoji}</span>
      {online && <span className="absolute top-3 left-3 bg-green-500 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full">● Activo</span>}
      {location && <span className="absolute top-3 right-3 bg-black/40 text-white text-xs px-2.5 py-0.5 rounded-full">📍 {location}</span>}
    </div>
  )

  return (
    <div className="relative overflow-hidden" style={{ height: 300 }}>
      <img src={photos[index]} alt="pet" className="w-full h-full object-cover" />

      {photos.length > 1 && (
        <div className="absolute top-2 left-0 right-0 flex justify-center gap-1 z-10">
          {photos.map((_, i) => (
            <div key={i} className="h-1 rounded-full transition-all" style={{ width: i === index ? 20 : 8, background: i === index ? 'white' : 'rgba(255,255,255,0.5)' }} />
          ))}
        </div>
      )}

      {online && <span className="absolute top-3 left-3 bg-green-500 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full z-10">● Activo</span>}
      {location && <span className="absolute top-3 right-3 bg-black/40 text-white text-xs px-2.5 py-0.5 rounded-full z-10">📍 {location}</span>}

      {index > 0 && (
        <button onClick={e => { e.stopPropagation(); setIndex(i => i - 1) }} className="absolute left-0 top-0 bottom-0 w-1/3 border-0 bg-transparent cursor-pointer z-10" />
      )}
      {index < photos.length - 1 && (
        <button onClick={e => { e.stopPropagation(); setIndex(i => i + 1) }} className="absolute right-0 top-0 bottom-0 w-1/3 border-0 bg-transparent cursor-pointer z-10" />
      )}
    </div>
  )
}

function FilterPanel({ filters, onApply, onClose, availableBreeds, availableLocations }) {
  const [local, setLocal] = useState(filters)

  function update(k, v) { setLocal(f => ({ ...f, [k]: v })) }

  function clearAll() {
    const empty = { breed: '', size: '', minAge: '', maxAge: '', location: '' }
    setLocal(empty)
  }

  return (
    <div className="absolute inset-0 bg-black/50 z-50 flex flex-col justify-end">
      <div className="bg-white rounded-t-3xl flex flex-col max-h-[85%]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-gray-900 text-lg">Filtros</h3>
          <button onClick={onClose} className="border-0 bg-transparent cursor-pointer text-gray-400">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Raza</label>
            <select
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-ps-bg"
              value={local.breed}
              onChange={e => update('breed', e.target.value)}
            >
              <option value="">Cualquier raza</option>
              {availableBreeds.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tamaño</label>
            <div className="flex gap-2">
              {SIZES.map(s => (
                <button
                  key={s}
                  onClick={() => update('size', local.size === s ? '' : s)}
                  className="flex-1 py-2 rounded-xl text-xs font-medium border-0 cursor-pointer"
                  style={{ background: local.size === s ? '#7C3AED' : '#EDE9FE', color: local.size === s ? 'white' : '#7C3AED' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Edad mín.</label>
              <input
                type="number"
                min="0"
                max="30"
                placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-ps-bg"
                value={local.minAge}
                onChange={e => update('minAge', e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Edad máx.</label>
              <input
                type="number"
                min="0"
                max="30"
                placeholder="30"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-ps-bg"
                value={local.maxAge}
                onChange={e => update('maxAge', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Zona</label>
            <select
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-ps-bg"
              value={local.location}
              onChange={e => update('location', e.target.value)}
            >
              <option value="">Cualquier zona</option>
              {availableLocations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={clearAll}
            className="flex-1 py-3 rounded-full font-semibold border border-gray-200 bg-white cursor-pointer text-gray-600"
          >
            Limpiar
          </button>
          <button
            onClick={() => onApply(local)}
            className="flex-1 py-3 rounded-full font-semibold text-white border-0 cursor-pointer"
            style={{ background: '#7C3AED' }}
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Match({ onMatch }) {
  const { user } = useAuth()
  const [allCandidates, setAllCandidates] = useState([])
  const [candidates, setCandidates] = useState([])
  const [index, setIndex] = useState(0)
  const [swiping, setSwiping] = useState(null)
  const [loading, setLoading] = useState(true)
  const [likesUsed, setLikesUsed] = useState(0)
  const [saved, setSaved] = useState([])
  const [petPhotosMap, setPetPhotosMap] = useState({})
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ breed: '', size: '', minAge: '', maxAge: '', location: '' })

  useEffect(() => { fetchCandidates() }, [])

  useEffect(() => {
    applyFilters()
  }, [filters, allCandidates])

  async function fetchPetPhotos(profileIds) {
    if (!profileIds.length) return
    const { data } = await supabase
      .from('pet_photos')
      .select('*')
      .in('user_id', profileIds)
      .order('order_index', { ascending: true })
    if (data) {
      const map = {}
      data.forEach(p => {
        if (!map[p.user_id]) map[p.user_id] = []
        map[p.user_id].push(p.photo_url)
      })
      setPetPhotosMap(map)
    }
  }

  async function fetchCandidates() {
    setLoading(true)

    const { data: existingMatches } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    const matchedIds = existingMatches?.map(m =>
      m.user1_id === user.id ? m.user2_id : m.user1_id
    ) || []

    const { data: sentLikes } = await supabase
      .from('likes')
      .select('receiver_id')
      .eq('sender_id', user.id)
    const likedIds = sentLikes?.map(l => l.receiver_id) || []

    const { data: savedData } = await supabase
      .from('saved_pets')
      .select('saved_user_id')
      .eq('user_id', user.id)
    const savedIds = savedData?.map(s => s.saved_user_id) || []
    setSaved(savedIds)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', user.id)
      .gte('created_at', today.toISOString())
    setLikesUsed(count || 0)

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)

    if (profiles && profiles.length > 0) {
      const filtered = profiles
        .filter(p => !matchedIds.includes(p.id) && !likedIds.includes(p.id))
        .map(p => ({
          id: p.id,
          name: p.pet_name,
          breed: p.breed,
          species: p.species,
          age: p.age,
          size: p.size,
          sex: p.sex,
          energy: p.energy,
          location: p.location,
          emoji: p.emoji,
          avatar_url: p.avatar_url || null,
          tags: [p.energy, p.size, 'Busca amigos'].filter(Boolean),
          online: Math.random() > 0.5,
          bg: '#EDE9FE',
          realUser: true,
        }))
      setAllCandidates(filtered)
      await fetchPetPhotos(filtered.map(p => p.id))
    } else {
      setAllCandidates([])
    }
    setLoading(false)
  }

  function applyFilters() {
    let result = [...allCandidates]
    if (filters.breed) result = result.filter(p => p.breed === filters.breed)
    if (filters.size) result = result.filter(p => p.size === filters.size)
    if (filters.location) result = result.filter(p => p.location === filters.location)
    if (filters.minAge) result = result.filter(p => p.age >= parseInt(filters.minAge))
    if (filters.maxAge) result = result.filter(p => p.age <= parseInt(filters.maxAge))
    setCandidates(result)
    setIndex(0)
  }

  const pet = candidates[index]

  const availableBreeds = [...new Set(allCandidates.map(p => p.breed).filter(Boolean))].sort()
  const availableLocations = [...new Set(allCandidates.map(p => p.location).filter(Boolean))].sort()
  const activeFilterCount = Object.values(filters).filter(Boolean).length

  async function swipe(dir) {
    if (!pet) return

    if (dir === 'like' || dir === 'super') {
      if (likesUsed >= DAILY_LIKE_LIMIT) {
        alert(`Alcanzaste el límite de ${DAILY_LIKE_LIMIT} likes por hoy. Vuelve mañana o actualiza a Premium.`)
        return
      }
      setSwiping(dir)
      setTimeout(async () => {
        setSwiping(null)
        await supabase.from('likes').upsert([{ sender_id: user.id, receiver_id: pet.id }], { onConflict: 'sender_id,receiver_id', ignoreDuplicates: true })
        setLikesUsed(n => n + 1)
        const { data: mutualLike } = await supabase.from('likes').select('id').eq('sender_id', pet.id).eq('receiver_id', user.id).single()
        if (mutualLike) {
          const { error } = await supabase.from('matches').upsert([{ user1_id: user.id, user2_id: pet.id }], { onConflict: 'user1_id,user2_id', ignoreDuplicates: true })
          if (!error) {
            onMatch(pet)
            const { data: myProfile } = await supabase.from('profiles').select('pet_name').eq('id', user.id).single()
            await notifyMatch(user.id, pet.id, myProfile?.pet_name || 'Una mascota', pet.name)
          }
        }
        setIndex(i => i + 1)
      }, 300)

    } else if (dir === 'save') {
      await supabase.from('saved_pets').upsert([{ user_id: user.id, saved_user_id: pet.id }], { onConflict: 'user_id,saved_user_id', ignoreDuplicates: true })
      setSaved(prev => [...prev, pet.id])
      setIndex(i => i + 1)

    } else {
      setSwiping('nope')
      setTimeout(() => { setSwiping(null); setIndex(i => i + 1) }, 300)
    }
  }

  const cardStyle = swiping ? {
    transform: swiping === 'nope' ? 'translateX(-120%) rotate(-15deg)' : 'translateX(120%) rotate(15deg)',
    opacity: 0,
    transition: 'transform 0.3s, opacity 0.3s',
  } : {}

  if (loading) return (
    <div className="flex flex-col flex-1 items-center justify-center gap-3 text-gray-400">
      <span className="text-4xl">🐾</span>
      <p className="text-sm">Buscando mascotas...</p>
    </div>
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-900">Match</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
            ❤️ {DAILY_LIKE_LIMIT - likesUsed} restantes
          </span>
          <button onClick={() => setShowFilters(true)} className="border-0 bg-transparent cursor-pointer text-ps-purple relative">
            <SlidersHorizontal size={20} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-ps-pink rounded-full border border-white" />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 bg-ps-bg">
        {pet ? (
          <div className="rounded-2xl overflow-hidden bg-white border border-gray-200" style={cardStyle}>
            <PhotoCarousel
              photos={petPhotosMap[pet.id] || (pet.avatar_url ? [pet.avatar_url] : [])}
              emoji={pet.emoji}
              bg={pet.bg}
              online={pet.online}
              location={pet.location}
            />
            <div className="p-4">
              <div className="text-xl font-bold text-gray-900 mb-0.5">
                {pet.name} {pet.sex === 'Macho' ? '♂' : '♀'}
              </div>
              <div className="text-sm text-gray-500 mb-3">
                {pet.age} {pet.age === 1 ? 'año' : 'años'} · {pet.breed}
              </div>
              <div className="flex flex-wrap gap-2">
                {pet.tags.map(t => (
                  <span key={t} className={`tag ${tagColors[t] || 'bg-gray-100 text-gray-700'}`}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
            <span className="text-5xl">🐾</span>
            <p className="text-sm font-medium">
              {activeFilterCount > 0 ? 'No hay mascotas con estos filtros' : 'No hay más mascotas por ahora'}
            </p>
            {activeFilterCount > 0 ? (
              <button onClick={() => setFilters({ breed: '', size: '', minAge: '', maxAge: '', location: '' })} className="text-xs font-semibold px-4 py-2 rounded-full border-0 cursor-pointer mt-2" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                Limpiar filtros
              </button>
            ) : (
              <button onClick={fetchCandidates} className="text-xs font-semibold px-4 py-2 rounded-full border-0 cursor-pointer mt-2" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                Buscar de nuevo
              </button>
            )}
          </div>
        )}

        <div className="flex justify-center items-center gap-4 py-5">
          <button onClick={() => swipe('nope')} className="flex items-center justify-center rounded-full bg-red-50 text-red-500 border-0 cursor-pointer active:scale-95" style={{ width: 56, height: 56 }}>
            <X size={24} strokeWidth={2.5} />
          </button>
          <button onClick={() => swipe('save')} className="flex items-center justify-center rounded-full bg-blue-50 text-blue-400 border-0 cursor-pointer active:scale-95" style={{ width: 50, height: 50 }}>
            <Bookmark size={20} strokeWidth={2} />
          </button>
          <button onClick={() => swipe('like')} className="flex items-center justify-center rounded-full bg-pink-50 border-0 cursor-pointer active:scale-95" style={{ width: 70, height: 70 }} disabled={likesUsed >= DAILY_LIKE_LIMIT}>
            <Heart size={28} strokeWidth={2} fill="#EC4899" color={likesUsed >= DAILY_LIKE_LIMIT ? '#D1D5DB' : '#EC4899'} />
          </button>
          <button onClick={() => swipe('super')} className="flex items-center justify-center rounded-full bg-yellow-50 text-yellow-500 border-0 cursor-pointer active:scale-95" style={{ width: 50, height: 50 }} disabled={likesUsed >= DAILY_LIKE_LIMIT}>
            <Star size={22} strokeWidth={2} />
          </button>
        </div>

        {likesUsed >= DAILY_LIKE_LIMIT && (
          <div className="mx-2 p-4 rounded-2xl text-center" style={{ background: '#FEF3C7' }}>
            <p className="text-sm font-semibold text-yellow-800">Límite diario alcanzado</p>
            <p className="text-xs text-yellow-700 mt-1">Vuelve mañana o actualiza a Premium para likes ilimitados</p>
          </div>
        )}
      </div>

      {showFilters && (
        <FilterPanel
          filters={filters}
          availableBreeds={availableBreeds}
          availableLocations={availableLocations}
          onApply={f => { setFilters(f); setShowFilters(false) }}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  )
}