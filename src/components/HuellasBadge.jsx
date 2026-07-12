import React from 'react'
import { useLanguage } from '../LanguageContext'
import { getHuellasLevel, getLevelProgress } from '../huellas'

// Pill compacta: emoji de nivel + nombre de nivel + puntos.
// Úsalo en Perfil, PerfilPublico, o donde se quiera mostrar el estado de gamificación.
export default function HuellasBadge({ points = 0, showProgress = false, size = 'md' }) {
  const { t } = useLanguage()
  const level = getHuellasLevel(points)
  const progress = getLevelProgress(points)
  const isSmall = size === 'sm'

  return (
    <div className="inline-flex flex-col gap-1">
      <div
        className="inline-flex items-center gap-1.5 rounded-full font-semibold"
        style={{
          background: '#FEF3C7',
          color: '#D97706',
          padding: isSmall ? '2px 8px' : '4px 12px',
          fontSize: isSmall ? 10 : 12,
        }}
      >
        <span>{level.emoji}</span>
        <span>{t(`huellas.level_${level.key}`)}</span>
        <span style={{ opacity: 0.6 }}>· {points} 🐾</span>
      </div>
      {showProgress && level.max !== Infinity && (
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden" style={{ minWidth: 120 }}>
          <div className="h-1.5 rounded-full" style={{ width: `${progress * 100}%`, background: '#D97706' }} />
        </div>
      )}
    </div>
  )
}
