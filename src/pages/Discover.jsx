import React, { useState } from 'react'
import { SlidersHorizontal, MapPin, X, Heart, Star } from 'lucide-react'
import { discoverDogs } from '../data'

const tagColor = {
  'Muy activo': 'bg-green-100 text-green-800',
  'Activa': 'bg-green-100 text-green-800',
  'Hiperactivo': 'bg-red-100 text-red-800',
  'Tranquila': 'bg-blue-100 text-blue-800',
  Sociable: 'bg-purple-100 text-purple-800',
  Amigable: 'bg-purple-100 text-purple-800',
  Juguetón: 'bg-yellow-100 text-yellow-800',
  Cariñosa: 'bg-pink-100 text-pink-800',
}

export default function Discover({ onMatch }) {
  const [index, setIndex] = useState(0)
  const [swiping, setSwiping] = useState(null)

  const dog = discoverDogs[index]

  function swipe(dir) {
    setSwiping(dir)
    setTimeout(() => {
      setSwiping(null)
      if (dir === 'like' || dir === 'super') {
        onMatch(dog)
      } else {
        setIndex(i => Math.min(i + 1, discoverDogs.length - 1))
      }
    }, 300)
  }

  const cardStyle = swiping
    ? {
        transform: swiping === 'nope'
          ? 'translateX(-120%) rotate(-15deg)'
          : 'translateX(120%) rotate(15deg)',
        opacity: 0,
        transition: 'transform 0.3s, opacity 0.3s',
      }
    : {}

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-100 flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-900">Descubre</h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-bm-purple-light text-bm-purple text-xs font-medium px-3 py-1.5 rounded-full">
            <MapPin size={13} />
            Cerca de ti (5 km)
          </div>
          <button className="p-1 border-0 bg-transparent cursor-pointer text-bm-purple">
            <SlidersHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* Card area */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {dog ? (
          <div
            className="rounded-2xl overflow-hidden bg-white border border-gray-200"
            style={cardStyle}
          >
            {/* Dog photo */}
            <div
              className="relative flex items-center justify-center"
              style={{ height: 280, background: dog.bg, fontSize: 120 }}
            >
              {dog.emoji}
              {dog.online && (
                <span className="absolute top-3 left-3 bg-green-500 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  ● Activo
                </span>
              )}
              <span className="absolute top-3 right-3 bg-black/40 text-white text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <MapPin size={10} /> {dog.distance} km
              </span>
            </div>

            {/* Info */}
            <div className="p-4">
              <div className="text-xl font-bold text-gray-900 mb-0.5">
                {dog.name} {dog.sex === 'Macho' ? '♂' : '♀'}
              </div>
              <div className="text-sm text-gray-500 mb-3">
                {dog.age} {dog.age === 1 ? 'año' : 'años'} · {dog.breed}
              </div>
              <div className="flex flex-wrap gap-2">
                {dog.tags.map(tag => (
                  <span key={tag} className={`tag ${tagColor[tag] || 'bg-gray-100 text-gray-700'}`}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
            <span className="text-5xl">🐾</span>
            <p className="text-sm">No hay más perros cerca por ahora</p>
          </div>
        )}

        {/* Swipe buttons */}
        <div className="flex justify-center items-center gap-5 py-5">
          <button
            onClick={() => swipe('nope')}
            className="swipe-btn bg-red-50 text-red-500"
            style={{ width: 60, height: 60 }}
            aria-label="No me interesa"
          >
            <X size={26} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => swipe('like')}
            className="swipe-btn bg-pink-50"
            style={{ width: 70, height: 70 }}
            aria-label="Me gusta"
          >
            <Heart size={28} strokeWidth={2} fill="#EC4899" color="#EC4899" />
          </button>
          <button
            onClick={() => swipe('super')}
            className="swipe-btn bg-yellow-50 text-yellow-500"
            style={{ width: 60, height: 60 }}
            aria-label="Super like"
          >
            <Star size={24} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}
