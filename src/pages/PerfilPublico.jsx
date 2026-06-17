import React, { useState, useEffect } from 'react'
import { ArrowLeft, MapPin, Grid3x3, Heart, MessageCircle } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'

export default function PerfilPublico({ userId, onBack, onChat }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMatch, setIsMatch] = useState(false)

  useEffect(() => {
    fetchProfile()
    fetchPosts()
    checkMatch()
  }, [userId])

  async function fetchProfile() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) setProfile(data)
    setLoading(false)
  }

  async function fetchPosts() {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setPosts(data)
  }

  async function checkMatch() {
    const { data } = await supabase
      .from('matches')
      .select('id')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${user.id})`)
      .single()
    if (data) setIsMatch(true)
  }

  if (loading) return (
    <div className="flex flex-col flex-1 items-center justify-center gap-3 text-gray-400">
      <span className="text-4xl">🐾</span>
      <p className="text-sm">Cargando perfil...</p>
    </div>
  )

  if (!profile) return (
    <div className="flex flex-col flex-1 items-center justify-center gap-3 text-gray-400">
      <span className="text-4xl">🐾</span>
      <p className="text-sm">Perfil no encontrado</p>
    </div>
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <button onClick={onBack} className="border-0 bg-transparent cursor-pointer text-ps-purple">
          <ArrowLeft size={22} />
        </button>
        <h2 className="font-bold text-gray-900 text-base flex-1">{profile.pet_name}</h2>
      </div>

      <div className="flex-1 overflow-y-auto bg-ps-bg">
        <div
          className="flex items-center gap-4 px-5 py-6 flex-shrink-0"
          style={{ background: 'linear-gradient(160deg, #6D28D9, #7C3AED)' }}
        >
          <div className="relative flex-shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.pet_name}
                className="w-20 h-20 rounded-full object-cover"
                style={{ border: '3px solid rgba(255,255,255,0.4)' }}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-5xl"
                style={{ background: 'rgba(255,255,255,0.2)', border: '3px solid rgba(255,255,255,0.4)' }}
              >
                {profile.emoji}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{profile.pet_name}</h2>
            <p className="text-white/75 text-sm mt-0.5">{profile.breed} · {profile.age} años · {profile.sex}</p>
            {profile.location && (
              <p className="text-white/60 text-xs mt-0.5 flex items-center gap-1">
                <MapPin size={11} /> {profile.location}
              </p>
            )}
          </div>
        </div>

        <div className="flex bg-white border-b border-gray-100 flex-shrink-0">
          {[
            [posts.length, 'Posts'],
            [profile.size || '-', 'Tamaño'],
            [profile.energy || '-', 'Energía'],
          ].map(([n, label]) => (
            <div key={label} className="flex-1 py-3.5 text-center border-r border-gray-100 last:border-r-0">
              <div className="text-base font-bold text-gray-900">{n}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          ))}
        </div>

        {isMatch && onChat && (
          <div className="px-4 pt-3">
            <button
              onClick={onChat}
              className="w-full py-3 rounded-full font-semibold text-white text-sm border-0 cursor-pointer flex items-center justify-center gap-2"
              style={{ background: '#7C3AED' }}
            >
              <MessageCircle size={16} /> Enviar mensaje
            </button>
          </div>
        )}

        <div className="bg-white mx-4 mt-3 rounded-2xl p-4 border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Información</h3>
          {[
            ['🐾', 'Raza',        profile.breed],
            ['🐕', 'Especie',     profile.species],
            ['📏', 'Tamaño',      profile.size],
            ['⚡', 'Energía',     profile.energy],
            ['👥', 'Se lleva con',profile.good_with],
            ['📍', 'Ubicación',   profile.location],
          ].filter(([, , v]) => v).map(([icon, label, value]) => (
            <div key={label} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 text-sm">
              <span className="text-gray-400 flex items-center gap-2">
                <span>{icon}</span>{label}
              </span>
              <span className="font-medium text-gray-800 text-right max-w-[55%]">{value}</span>
            </div>
          ))}
        </div>

        {profile.about && (
          <div className="bg-white mx-4 mt-3 rounded-2xl p-4 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Sobre {profile.pet_name}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{profile.about}</p>
          </div>
        )}

        {posts.length > 0 && (
          <div className="bg-white mx-4 mt-3 rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Posts</h3>
              <Grid3x3 size={18} className="text-gray-400" />
            </div>
            <div className="grid grid-cols-3 gap-1">
              {posts.map(p => (
                <div
                  key={p.id}
                  className="aspect-square rounded-lg overflow-hidden"
                  style={{ background: '#EDE9FE' }}
                >
                  {p.image_url ? (
                    <img src={p.image_url} alt="post" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">
                      {p.pet_emoji || '🐕'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="h-6" />
      </div>
    </div>
  )
}