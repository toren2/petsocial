import React, { useState } from 'react'
import { useLanguage } from '../LanguageContext'

const SLIDES = [
  { emoji: '🐾', titleKey: 'slide1Title', descKey: 'slide1Desc' },
  { emoji: '💜', titleKey: 'slide2Title', descKey: 'slide2Desc' },
  { emoji: '📸', titleKey: 'slide3Title', descKey: 'slide3Desc' },
  { emoji: '📍', titleKey: 'slide4Title', descKey: 'slide4Desc' },
]

export default function OnboardingTour({ onFinish }) {
  const { t } = useLanguage()
  const [index, setIndex] = useState(0)
  const isLast = index === SLIDES.length - 1
  const slide = SLIDES[index]

  function next() {
    if (isLast) { onFinish(); return }
    setIndex(i => i + 1)
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-white">
      <div className="flex justify-end px-5 pt-5">
        <button
          onClick={onFinish}
          className="text-sm text-gray-400 border-0 bg-transparent cursor-pointer"
        >
          {t('onboarding.skip')}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5">
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center text-5xl"
          style={{ background: '#F3E8FF' }}
        >
          {slide.emoji}
        </div>
        <h2 className="text-xl font-bold text-gray-900">{t(`onboarding.${slide.titleKey}`)}</h2>
        <p className="text-sm text-gray-500 leading-relaxed max-w-xs">{t(`onboarding.${slide.descKey}`)}</p>
      </div>

      <div className="flex items-center justify-center gap-2 pb-6">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all"
            style={{
              width: i === index ? 20 : 6,
              height: 6,
              background: i === index ? '#7C3AED' : '#E5E7EB',
            }}
          />
        ))}
      </div>

      <div className="px-6 pb-8">
        <button
          onClick={next}
          className="w-full py-3.5 rounded-full font-semibold text-white text-base border-0 cursor-pointer"
          style={{ background: '#7C3AED' }}
        >
          {isLast ? t('onboarding.start') : t('onboarding.next')}
        </button>
      </div>
    </div>
  )
}
