import React from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker } from 'react-leaflet'
import L from 'leaflet'

const categoryEmoji = {
  vet: '🩺',
  groom: '✂️',
  park: '🌳',
  shop: '🛍️',
  hotel: '🏨',
  restaurant: '🍽️',
  emergency24h: '🚨',
}

const categoryColors = {
  vet:          '#7C3AED',
  groom:        '#EC4899',
  park:         '#16A34A',
  shop:         '#D97706',
  hotel:        '#0F9B8E',
  restaurant:   '#DC2626',
  emergency24h: '#E11D48',
}

const PANAMA_CENTER = { lat: 8.9936, lng: -79.5197 }

function pinIcon(category) {
  const color = categoryColors[category] || '#7C3AED'
  const emoji = categoryEmoji[category] || '📍'
  return L.divIcon({
    className: '',
    html: `<div style="width:34px;height:34px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">
      <span style="transform:rotate(45deg);font-size:15px;">${emoji}</span>
    </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  })
}

// Mapa hero con pines de colores por categoria (no interactivo, para el
// landing de Lugares). El tap para abrir el mapa completo lo maneja el
// contenedor padre.
export default function PinMap({ userLocation, places = [] }) {
  const center = userLocation || PANAMA_CENTER

  return (
    <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
      <MapContainer
        key={`${center.lat.toFixed(3)},${center.lng.toFixed(3)}`}
        center={[center.lat, center.lng]}
        zoom={userLocation ? 14 : 12}
        style={{ height: '100%', width: '100%', background: '#E5E7EB' }}
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {userLocation && (
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={8}
            pathOptions={{ color: 'white', weight: 2, fillColor: '#3B82F6', fillOpacity: 1 }}
          />
        )}

        {places
          .filter(p => p.lat && p.lng)
          .slice(0, 8)
          .map(place => (
            <Marker
              key={place.id}
              position={[parseFloat(place.lat), parseFloat(place.lng)]}
              icon={pinIcon(place.category)}
            />
          ))}
      </MapContainer>
    </div>
  )
}
