import React from 'react'
import { Home, Heart, MessageCircle, MapPin, Calendar, User, Newspaper } from 'lucide-react'
import { useLanguage } from '../LanguageContext'

export default function BottomNav({ active, onNavigate }) {
  const { t } = useLanguage()
  const tabs = [
    { id: 'hub',      label: t('bottomNav.home'),    Icon: Home          },
    { id: 'feed',     label: t('bottomNav.feed'),    Icon: Newspaper     },
    { id: 'match',    label: t('bottomNav.match'),   Icon: Heart         },
    { id: 'chat',     label: t('bottomNav.chat'),    Icon: MessageCircle },
    { id: 'lugares',  label: t('bottomNav.places'),  Icon: MapPin        },
    { id: 'perfil',   label: t('bottomNav.profile'), Icon: User          },
  ]
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