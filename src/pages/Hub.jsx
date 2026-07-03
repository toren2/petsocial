import React, { useState, useEffect } from 'react'
import { Bell, Heart, MapPin, Calendar, MessageCircle, Newspaper, Stethoscope, Scissors, Trees, ShoppingBag, Building2, UtensilsCrossed } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'

const categories = [
  { id: 'vet',        label: 'Veterinarias', Icon: Stethoscope,     color: '#7C3AED', bg: '#EDE9FE' },
  { id: 'groom',      label: 'Grooming',     Icon: Scissors,        color: '#EC4899', bg: '#FCE7F3' },
  { id: 'park',       label: 'Parques',      Icon: Trees,           color: '#16A34A', bg: '#DCFCE7' },
  { id: 'shop',       label: 'Pet Shops',    Icon: ShoppingBag,     color: '#D97706', bg: '#FEF3C7' },
  { id: 'hotel',      label: 'Hoteles',      Icon: Building2,       color: '#0F9B8E', bg: '#E0F7F4' },
  { id: 'restaurant', label: 'Restaurantes', Icon: UtensilsCrossed, color: '#DC2626', bg: '#FEE2E2' },
]

const quickActions = [
  { id: 'feed',     label: 'Feed',     Icon: Newspaper,      color: '#7C3AED', bg: '#EDE9FE' },
  { id: 'match',    label: 'Match',    Icon: Heart,          color: '#EC4899', bg: '#FCE7F3' },
  { id: 'chat',     label: 'Chat',     Icon: MessageCircle,  color: '#0F9B8E', bg: '#E0F7F4' },
  { id: 'eventos',  label: 'Eventos',  Icon: Calendar,       color: '#D97706', bg: '#FEF3C7' },
]

export default function Hub({ onNavigate, unreadCount }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    supabase.from('profiles').select('pet_name, emoji, avatar_url').eq('id', user.id).single()
      .then(({ data }) => { if (data) setProfile(data) })
  }, [])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div
        className="px-5 pt-5 pb-6 flex-shrink-0"
        style={{ background: 'linear-gradient(160deg, #6D28D9, #7C3AED)' }}
      >
        {/* Logo Snoutt */}
        <div style={{ overflow: 'hidden', height: '50px', display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <img
            src="/snoutt-logo.png"
            alt="Snoutt"
            style={{
              height: '90px',
              width: 'auto',
              filter: 'brightness(0) invert(1)',
              transformOrigin: 'left center',
            }}
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
          <h3 className="text-sm font-bold text-gray-900 mb-3">Acciones rápidas</h3>
          <div className="grid grid-cols-4 gap-2">
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

        <div className="px-4 py-2">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Lugares por categoría</h3>
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