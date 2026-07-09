import React from 'react'
import { myPet } from '../data'
import { useLanguage } from '../LanguageContext'

export default function MatchModal({ dog, onChat, onKeepSwiping }) {
  const { t } = useLanguage()
  if (!dog) return null

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-5 z-50 px-8"
      style={{ background: 'rgba(124,58,237,0.92)' }}
    >
      <div className="text-4xl">🐾</div>
      <h2 className="text-3xl font-bold text-white">{t('match.matchTitle')}</h2>
      <p className="text-white/80 text-base text-center">
        {t('match.matchSubtitle', { name: dog.name })}
      </p>

      {/* Avatars */}
      <div className="flex items-center gap-2">
        <div
          className="flex items-center justify-center rounded-full border-4 border-white text-5xl"
          style={{ width: 90, height: 90, background: '#EDE9FE' }}
        >
          {myDog.emoji}
        </div>
        <span className="text-3xl">❤️</span>
        <div
          className="flex items-center justify-center rounded-full border-4 border-white text-5xl"
          style={{ width: 90, height: 90, background: dog.bg || '#EDE9FE' }}
        >
          {dog.emoji}
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full mt-2">
        <button
          onClick={onChat}
          className="w-full py-3.5 rounded-full bg-white text-bm-purple font-semibold text-base border-0 cursor-pointer"
        >
          {t('match.sendMessage')}
        </button>
        <button
          onClick={onKeepSwiping}
          className="btn-outline-white"
        >
          {t('match.keepExploring')}
        </button>
      </div>
    </div>
  )
}
