import React from 'react'
import { Home, Heart, MessageCircle, MapPin, User } from 'lucide-react'
import { useLanguage } from '../LanguageContext'
import { useAuth } from '../AuthContext'
import { isMinorUser } from '../age'

export default function BottomNav({ active, onNavigate }) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const minor = isMinorUser(user)
  const tabs = [
    { id: 'hub',      label: t('bottomNav.home'),    Icon: Home          },
    { id: 'match',    label: t('bottomNav.match'),   Icon: Heart         },
    { id: 'lugares',  label: t('bottomNav.places'),  Icon: MapPin        },
    { id: 'chat',     label: t('bottomNav.chat'),    Icon: MessageCircle },
    { id: 'perfil',   label: t('bottomNav.profile'), Icon: User          },
  ].filter(tab => tab.id !== 'match' || !minor)
  return (
    <nav className="flex bg-white border-t border-gray-200 pb-2 pt-1 flex-shrink-0">
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onNavigate(id)}
          className={`bottom-nav-item ${active === id ? 'active' : ''}`}
        >
          <Icon size={22} strokeWidth={active === id ? 2.75 : 2.1} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
