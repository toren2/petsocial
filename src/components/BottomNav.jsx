import React from 'react'
import { Home, Heart, MessageCircle, MapPin, Calendar, User } from 'lucide-react'

const tabs = [
  { id: 'feed',     label: 'Feed',     Icon: Home          },
  { id: 'match',    label: 'Match',    Icon: Heart         },
  { id: 'chat',     label: 'Chat',     Icon: MessageCircle },
  { id: 'eventos',  label: 'Eventos',  Icon: Calendar      },
  { id: 'lugares',  label: 'Lugares',  Icon: MapPin        },
  { id: 'perfil',   label: 'Perfil',   Icon: User          },
]

export default function BottomNav({ active, onNavigate }) {
  return (
    <nav className="flex bg-white border-t border-gray-200 pb-2 pt-1 flex-shrink-0">
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onNavigate(id)}
          className={`bottom-nav-item ${active === id ? 'active' : ''}`}
        >
          <Icon size={20} strokeWidth={active === id ? 2.5 : 1.8} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}