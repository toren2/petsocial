import React from 'react'
import { Loader2 } from 'lucide-react'

// Se renderiza como primer hijo del div scrolleable de cada pantalla: al
// jalar hacia abajo el contenido se empuja y aparece este spinner, que gira
// segun cuanto falta para soltar y disparar el refresh.
export default function PullToRefreshIndicator({ pullDistance, refreshing, threshold = 70 }) {
  if (!pullDistance && !refreshing) return null
  const progress = Math.min(pullDistance / threshold, 1)
  return (
    <div
      className="flex items-center justify-center overflow-hidden flex-shrink-0"
      style={{
        height: refreshing ? 40 : pullDistance,
        transition: refreshing ? 'height 0.15s ease-out' : 'none',
      }}
    >
      <Loader2
        size={22}
        color="#7C3AED"
        className={refreshing ? 'animate-spin' : ''}
        style={{
          transform: refreshing ? 'none' : `rotate(${progress * 360}deg)`,
          opacity: refreshing ? 1 : progress,
        }}
      />
    </div>
  )
}
