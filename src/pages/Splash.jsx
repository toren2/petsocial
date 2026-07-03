import React from 'react'
import { Heart, MapPin, Users, Tag } from 'lucide-react'

export default function Splash({ onEnter }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-6 px-8 flex-1"
      style={{ background: 'linear-gradient(160deg, #6D28D9 0%, #7C3AED 50%, #0F9B8E 100%)' }}
    >
      <div className="text-center">
        <img src="/snoutt-logo.png" alt="Snoutt" className="h-20 mb-2" style={{ filter: 'brightness(0) invert(1)' }} />
        <p className="text-white/80 mt-1 text-sm">La red social de mascotas</p>
      </div>

     <div
  className="flex items-center justify-center rounded-full overflow-hidden"
  style={{ width: 150, height: 150, background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)' }}
>
  <img src="/snoutt-icon.png" alt="Snoutt icon" style={{ width: 100, height: 100, objectFit: 'contain' }} />
</div>

      <div className="flex flex-col gap-3 w-full">
        <button
          onClick={onEnter}
          className="w-full py-3.5 rounded-full font-semibold text-base border-0 cursor-pointer"
          style={{ background: 'white', color: '#7C3AED' }}
        >
          Crear cuenta
        </button>
        <button onClick={onEnter} className="btn-outline-white">
          Iniciar sesión
        </button>
      </div>

      <div className="flex gap-6 mt-2">
        {[
          [Heart, 'Match'],
          [MapPin, 'Lugares'],
          [Users, 'Comunidad'],
          [Tag, 'Descuentos'],
        ].map(([Icon, label]) => (
          <div key={label} className="flex flex-col items-center gap-1 text-white/75 text-[10px]">
            <Icon size={20} strokeWidth={1.8} className="text-white/90" />
            <span>{label}</span>
          </div>
        ))}
      </div>

      <p className="text-white/60 text-xs">¿Eres nuevo? Únete a la manada 🐶</p>
    </div>
  )
}