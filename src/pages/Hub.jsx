import React, { useState, useEffect } from 'react'
import { Heart, MapPin, Calendar, MessageCircle, Bell, Search, ChevronRight, Star } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'

export default function Hub({ onNavigate, unreadCount }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ matches: 0, events: 0, places: 0 })
  const [nearbyPlaces, setNearbyPlaces] = useState([])

  useEffect(() => {
    fetchProfile()
    fetchStats()
  }, [])

  async function fetchProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) setProfile(data)
  }

  async function fetchStats() {
    const [{ count: matches }, { count: events }, { count: places }] = await Promise.all([
      supabase.from('matches').select('*', { count: 'exact', head: true }).or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
      supabase.from('events').select('*', { count: 'exact', head: true }),
      supabase.from('places').select('*', { count: 'exact', head: true }),
    ])
    setStats({ matches: matches || 0, events: events || 0, places: places || 0 })
  }

  const quickActions = [
    { id: 'match',   label: 'Match',     emoji: '❤️',  desc: 'Encuentra amigos',     color: '#EC4899', bg: '#FCE7F3' },
    { id: 'lugares', label: 'Lugares',   emoji: '📍',  desc: 'Cerca de ti',           color: '#7C3AED', bg: '#EDE9FE' },
    { id: 'eventos', label: 'Eventos',   emoji: '🎉',  desc: 'Próximos eventos',      color: '#0F9B8E', bg: '#E0F7F4' },
    { id: 'chat',    label: 'Mensajes',  emoji: '💬',  desc: `${stats.matches} matches`, color: '#D97706', bg: '#FEF3C7' },
  ]

  const categories = [
    { id: 'vet',        label: 'Veterinarias', emoji: '🏥', color: '#7C3AED', bg: '#EDE9FE' },
    { id: 'park',       label: 'Parques',      emoji: '🌳', color: '#16A34A', bg: '#DCFCE7' },
    { id: 'groom',      label: 'Grooming',     emoji: '✂️', color: '#EC4899', bg: '#FCE7F3' },
    { id: 'shop',       label: 'Pet Shops',    emoji: '🛍️', color: '#D97706', bg: '#FEF3C7' },
    { id: 'restaurant', label: 'Restaurantes', emoji: '🍽️', color: '#DC2626', bg: '#FEE2E2' },
    { id: 'hotel',      label: 'Hoteles',      emoji: '🏨', color: '#0F9B8E', bg: '#E0F7F4' },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div
        className="px-5 pt-5 pb-6 flex-shrink-0"
        style={{ background: 'linear-gradient(160deg, #6D28D9, #7C3AED)' }}
      >
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
              <p className="text-white/70 text-xs">Bienvenido de vuelta</p>
              <p className="text-white font-bold text-base">{profile?.pet_name || 'Mi mascota'} 🐾</p>
            </div>
          </div>
          <div className="flex gap-2">
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

        {/* Search bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar lugares, eventos..."
            className="w-full bg-white rounded-2xl py-3 pl-9 pr-4 text-sm outline-none text-gray-700"
            onFocus={() => onNavigate('lugares')}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-ps-bg">
        {/* Quick actions */}
        <div className="px-4 pt-4 pb-2">
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(action => (
              <button
                key={action.id}
                onClick={() => onNavigate(action.id)}
                className="flex items-center gap-3 p-4 rounded-2xl border-0 cursor-pointer text-left"
                style={{ background: 'white', border: '1px solid #F3F4F6' }}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: action.bg }}>
                  {action.emoji}
                </div>
                <div>
                  <div className="font-bold text-sm text-gray-900">{action.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{action.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Stats banner */}
        <div className="mx-4 my-3 rounded-2xl p-4 flex items-center justify-around" style={{ background: 'linear-gradient(135deg, #6D28D9, #7C3AED)' }}>
          {[
            [stats.matches, 'Matches'],
            [stats.events,  'Eventos'],
            [stats.places,  'Lugares'],
          ].map(([n, label]) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold text-white">{n}</div>
              <div className="text-xs text-white/70">{label}</div>
            </div>
          ))}
        </div>

        {/* Categorías de lugares */}
        <div className="px-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 text-base">Explorar lugares</h3>
            <button
              onClick={() => onNavigate('lugares')}
              className="text-xs text-ps-purple font-medium border-0 bg-transparent cursor-pointer flex items-center gap-1"
            >
              Ver todos <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => onNavigate('lugares', cat.id)}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl border-0 cursor-pointer"
                style={{ background: 'white', border: '1px solid #F3F4F6' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: cat.bg }}>
                  {cat.emoji}
                </div>
                <span className="text-[10px] font-medium text-gray-600 text-center leading-tight">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Feed shortcut */}
        <div className="mx-4 mb-4">
          <button
            onClick={() => onNavigate('feed')}
            className="w-full flex items-center justify-between p-4 rounded-2xl border-0 cursor-pointer"
            style={{ background: 'white', border: '1px solid #F3F4F6' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: '#EDE9FE' }}>
                📸
              </div>
              <div className="text-left">
                <div className="font-bold text-sm text-gray-900">Feed de mascotas</div>
                <div className="text-xs text-gray-400">Ver posts de la comunidad</div>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  )
}