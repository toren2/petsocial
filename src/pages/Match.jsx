import React, { useState, useEffect } from 'react'
import { SlidersHorizontal, X, Heart, Star } from 'lucide-react'
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

export default function Match({ onMatch }) {
  const { user } = useAuth()
  const [candidates, setCandidates] = useState([])
  const [index, setIndex] = useState(0)
  const [swiping, setSwiping] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchCandidates() }, [])

  async function fetchCandidates() {
    setLoading(true)

    const { data: existingMatches } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

    const matchedIds = existingMatches?.map(m =>
      m.user1_id === user.id ? m.user2_id : m.user1_id
    ) || []

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)

    if (profiles && profiles.length > 0) {
      const filtered = profiles
        .filter(p => !matchedIds.includes(p.id))
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
      setCandidates(filtered)
    }
    setLoading(false)
  }

  const pet = candidates[index]

  async function swipe(dir) {
    setSwiping(dir)
    setTimeout(async () => {
      setSwiping(null)
      if ((dir === 'like' || dir === 'super') && pet?.realUser) {
        const { error } = await supabase
          .from('matches')
          .upsert([{ user1_id: user.id, user2_id: pet.id }], { onConflict: 'user1_id,user2_id', ignoreDuplicates: true })
        if (!error) {
          onMatch(pet)
          const { data: myProfile } = await supabase.from('profiles').select('pet_name').eq('id', user.id).single()
          await notifyMatch(user.id, pet.id, myProfile?.pet_name || 'Una mascota', pet.name)
        }
      }
      setIndex(i => i + 1)
    }, 300)
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
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-900">Match</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
            🌎 Global
          </span>
          <button className="border-0 bg-transparent cursor-pointer text-ps-purple" aria-label="Filtros">
            <SlidersHorizontal size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 bg-ps-bg">
        {pet ? (
          <div className="rounded-2xl overflow-hidden bg-white border border-gray-200" style={cardStyle}>
            <div className="relative flex items-center justify-center overflow-hidden" style={{ height: 300, background: pet.bg || '#EDE9FE', fontSize: 110 }}>
              {pet.avatar_url ? (
                <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
              ) : (
                <span>{pet.emoji}</span>
              )}
              {pet.online && (
                <span className="absolute top-3 left-3 bg-green-500 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  ● Activo
                </span>
              )}
              {pet.location && (
                <span className="absolute top-3 right-3 bg-black/40 text-white text-xs px-2.5 py-0.5 rounded-full">
                  📍 {pet.location}
                </span>
              )}
            </div>
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
            <p className="text-sm font-medium">No hay más mascotas por ahora</p>
            <button
              onClick={fetchCandidates}
              className="text-xs font-semibold px-4 py-2 rounded-full border-0 cursor-pointer mt-2"
              style={{ background: '#EDE9FE', color: '#7C3AED' }}
            >
              Buscar de nuevo
            </button>
          </div>
        )}

        <div className="flex justify-center items-center gap-5 py-5">
          <button onClick={() => swipe('nope')} className="flex items-center justify-center rounded-full bg-red-50 text-red-500 border-0 cursor-pointer active:scale-95" style={{ width: 60, height: 60 }}>
            <X size={26} strokeWidth={2.5} />
          </button>
          <button onClick={() => swipe('like')} className="flex items-center justify-center rounded-full bg-pink-50 border-0 cursor-pointer active:scale-95" style={{ width: 70, height: 70 }}>
            <Heart size={28} strokeWidth={2} fill="#EC4899" color="#EC4899" />
          </button>
          <button onClick={() => swipe('super')} className="flex items-center justify-center rounded-full bg-yellow-50 text-yellow-500 border-0 cursor-pointer active:scale-95" style={{ width: 60, height: 60 }}>
            <Star size={24} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}