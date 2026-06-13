import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'

const L = window.L

const categoryEmojis = {
  vet:   '🏥',
  groom: '✂️',
  park:  '🌳',
  shop:  '🛍️',
  hotel: '🏨',
}

const categoryColors = {
  vet:   '#7C3AED',
  groom: '#EC4899',
  park:  '#16A34A',
  shop:  '#D97706',
  hotel: '#0F9B8E',
}

function createEmojiIcon(category) {
  const emoji = categoryEmojis[category] || '📍'
  const color = categoryColors[category] || '#7C3AED'
  return L.divIcon({
    html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">${emoji}</div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })
}

function createUserIcon() {
  return L.divIcon({
    html: `<div style="width:16px;height:16px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

function RecenterMap({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, 14)
  }, [center])
  return null
}

export default function MapaLugares({ places, userLocation, onPlaceSelect, onClose }) {
  const center = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [8.9936, -79.5197]

  return (
    <div className="absolute inset-0 z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <h2 className="text-lg font-bold text-gray-900">Mapa de lugares</h2>
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); onClose() }}
          className="text-sm font-medium border-0 cursor-pointer px-3 py-1.5 rounded-full"
          style={{ background: '#EDE9FE', color: '#7C3AED' }}
        >
          Cerrar
        </button>
      </div>

      <div className="flex gap-3 px-4 py-2 bg-white border-b border-gray-100 overflow-x-auto flex-shrink-0">
        {Object.entries(categoryEmojis).map(([cat, emoji]) => (
          <div key={cat} className="flex items-center gap-1 flex-shrink-0">
            <span className="text-sm">{emoji}</span>
            <span className="text-xs text-gray-500">
              {cat === 'vet' ? 'Vet' : cat === 'groom' ? 'Grooming' : cat === 'park' ? 'Parque' : cat === 'shop' ? 'Shop' : 'Hotel'}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-gray-500">Tú</span>
        </div>
      </div>

      <div className="flex-1">
        <MapContainer
          center={center}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <RecenterMap center={userLocation ? [userLocation.lat, userLocation.lng] : null} />

          {userLocation && (
            <>
              <Marker
                position={[userLocation.lat, userLocation.lng]}
                icon={createUserIcon()}
              />
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={500}
                pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.1, weight: 1 }}
              />
            </>
          )}

          {places.filter(p => p.lat && p.lng).map(place => (
            <Marker
              key={place.id}
              position={[place.lat, place.lng]}
              icon={createEmojiIcon(place.category)}
              eventHandlers={{ click: () => onPlaceSelect(place) }}
            >
              <Popup>
                <div style={{ minWidth: 150 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{place.name}</div>
                  <div style={{ fontSize: 11, color: categoryColors[place.category], marginTop: 2 }}>{place.type}</div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>⭐ {place.rating} · {place.distance} km</div>
                  <button
                    onClick={() => onPlaceSelect(place)}
                    style={{ marginTop: 8, background: '#7C3AED', color: 'white', border: 'none', borderRadius: 20, padding: '4px 12px', fontSize: 11, cursor: 'pointer', width: '100%' }}
                  >
                    Ver detalle
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}