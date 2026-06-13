import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix iconos de leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const categoryColors = {
  vet:   '#7C3AED',
  groom: '#EC4899',
  park:  '#16A34A',
  shop:  '#D97706',
  hotel: '#0F9B8E',
}

const categoryEmojis = {
  vet:   '🏥',
  groom: '✂️',
  park:  '🌳',
  shop:  '🛍️',
  hotel: '🏨',
}

function createColorIcon(category) {
  const color = categoryColors[category] || '#7C3AED'
  const emoji = categoryEmojis[category] || '📍'
  return L.divIcon({
    html: `<div style="
      background: ${color};
      width: 36px;
      height: 36px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <span style="transform: rotate(45deg); font-size: 16px; display: block; margin-top: 2px;">${emoji}</span>
    </div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  })
}

function createUserIcon() {
  return L.divIcon({
    html: `<div style="
      background: #3B82F6;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
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
    : [8.9936, -79.5197] // Ciudad de Panamá por defecto

  return (
    <div className="absolute inset-0 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <h2 className="text-lg font-bold text-gray-900">Mapa de lugares</h2>
        <button
          onClick={onClose}
          className="text-sm font-medium border-0 bg-transparent cursor-pointer px-3 py-1.5 rounded-full"
          style={{ background: '#EDE9FE', color: '#7C3AED' }}
        >
          Cerrar
        </button>
      </div>

      {/* Leyenda */}
      <div className="flex gap-3 px-4 py-2 bg-white border-b border-gray-100 overflow-x-auto flex-shrink-0">
        {Object.entries(categoryEmojis).map(([cat, emoji]) => (
          <div key={cat} className="flex items-center gap-1 flex-shrink-0">
            <span className="text-sm">{emoji}</span>
            <span className="text-xs text-gray-500 capitalize">
              {cat === 'vet' ? 'Vet' : cat === 'groom' ? 'Grooming' : cat === 'park' ? 'Parque' : cat === 'shop' ? 'Shop' : 'Hotel'}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white" style={{ boxShadow: '0 0 4px rgba(0,0,0,0.3)' }} />
          <span className="text-xs text-gray-500">Tú</span>
        </div>
      </div>

      {/* Mapa */}
      <div className="flex-1">
        <MapContainer
          center={center}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <RecenterMap center={userLocation ? [userLocation.lat, userLocation.lng] : null} />

          {/* Ubicación del usuario */}
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

          {/* Lugares */}
          {places.filter(p => p.lat && p.lng).map(place => (
            <Marker
              key={place.id}
              position={[place.lat, place.lng]}
              icon={createColorIcon(place.category)}
              eventHandlers={{
                click: () => onPlaceSelect(place),
              }}
            >
              <Popup>
                <div style={{ minWidth: 160 }}>
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