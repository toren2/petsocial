import React, { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'

export default function MatchModal({ pet, onChat, onKeepSwiping }) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [myPet, setMyPet] = useState(null)

  useEffect(() => {
    if (!user || !pet) return
    supabase
      .from('profiles')
      .select('pet_name, emoji, avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setMyPet(data))
  }, [user, pet])

  if (!pet) return null

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-5 z-50 px-8"
      style={{ background: 'rgba(124,58,237,0.92)' }}
    >
      <div className="text-4xl">🐾</div>
      <h2 className="text-3xl font-bold text-white">{t('match.matchTitle')}</h2>
      <p className="text-white/80 text-base text-center">
        {t('match.matchSubtitle', { name: pet.name })}
      </p>

      {/* Avatars */}
      <div className="flex items-center gap-2">
        <div
          className="flex items-center justify-center rounded-full border-4 border-white text-5xl overflow-hidden"
          style={{ width: 90, height: 90, background: '#EDE9FE' }}
        >
          {myPet?.avatar_url ? (
            <img src={myPet.avatar_url} alt={myPet.pet_name || ''} className="w-full h-full object-cover" />
          ) : (
            myPet?.emoji || '🐕'
          )}
        </div>
        <span className="text-3xl">❤️</span>
        <div
          className="flex items-center justify-center rounded-full border-4 border-white text-5xl overflow-hidden"
          style={{ width: 90, height: 90, background: pet.bg || '#EDE9FE' }}
        >
          {pet.avatar_url ? (
            <img src={pet.avatar_url} alt={pet.name || ''} className="w-full h-full object-cover" />
          ) : (
            pet.emoji || '🐕'
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-2xl px-4 py-3 max-w-sm" style={{ background: 'rgba(255,255,255,0.15)' }}>
        <ShieldCheck size={16} className="text-white flex-shrink-0 mt-0.5" />
        <p className="text-xs text-white/90 leading-relaxed text-left">{t('match.safetyTip')}</p>
      </div>

      <div className="flex flex-col gap-3 w-full mt-2">
        <button
          onClick={onChat}
          className="w-full py-3.5 rounded-full bg-white text-ps-purple font-semibold text-base border-0 cursor-pointer"
        >
          {t('match.sendMessage')}
        </button>
        <button
          onClick={onKeepSwiping}
          className="w-full py-3.5 rounded-full font-semibold text-white text-base border border-white/50 bg-transparent cursor-pointer"
        >
          {t('match.keepExploring')}
        </button>
      </div>
    </div>
  )
}
