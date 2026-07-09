import React from 'react'
import { Heart, MapPin, Users, Tag } from 'lucide-react'
import { useLanguage } from '../LanguageContext'

export default function Splash({ onEnter }) {
  const { t } = useLanguage()
  return (
    <div
      className="flex flex-col items-center justify-center gap-6 px-8 flex-1"
      style={{ background: 'linear-gradient(160deg, #6D28D9 0%, #7C3AED 50%, #0F9B8E 100%)' }}
    >
<div className="overflow-hidden flex items-center justify-center" style={{ height: '120px', width: '100%' }}>
  <img 
    src="/snoutt-logo.png" 
    alt="Snoutt" 
    style={{ 
      width: '100%',
      height: 'auto',
      filter: 'brightness(0) invert(1)',
      transform: 'scale(2.5)',
      transformOrigin: '45% center',
    }} 
  />
</div>
<p className="text-white/80 text-sm mt-2">{t('splash.tagline')}</p>

      <div className="flex flex-col gap-3 w-full">
        <button
          onClick={onEnter}
          className="w-full py-3.5 rounded-full font-semibold text-base border-0 cursor-pointer"
          style={{ background: 'white', color: '#7C3AED' }}
        >
          {t('splash.createAccount')}
        </button>
        <button onClick={onEnter} className="btn-outline-white">
          {t('splash.signIn')}
        </button>
      </div>

      <div className="flex gap-6 mt-2">
        {[
          [Heart, t('splash.featureMatch')],
          [MapPin, t('splash.featurePlaces')],
          [Users, t('splash.featureCommunity')],
          [Tag, t('splash.featureDeals')],
        ].map(([Icon, label]) => (
          <div key={label} className="flex flex-col items-center gap-1 text-white/75 text-[10px]">
            <Icon size={20} strokeWidth={1.8} className="text-white/90" />
            <span>{label}</span>
          </div>
        ))}
      </div>

      <p className="text-white/60 text-xs">{t('splash.newHere')}</p>
    </div>
  )
}