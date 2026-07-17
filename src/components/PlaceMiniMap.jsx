import React from 'react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
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
  restaurant:   '#F97316',
  emergency24h: '#E11D48',
}

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

// Minimapa no interactivo de un solo lugar, para el detalle (LugarDetalle.jsx).
// Antes esa pantalla solo mostraba la direccion en texto + un link a Google
// Maps; esto le da una referencia visual real de donde queda sin salir de
// la app. El tap para abrir Google Maps lo maneja el contenedor padre.
export default function PlaceMiniMap({ lat, lng, category }) {
  const position = [lat, lng]
  return (
    <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
      <MapContainer
        key={`${lat.toFixed(5)},${lng.toFixed(5)}`}
        center={position}
        zoom={16}
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
        <Marker position={position} icon={pinIcon(category)} />
      </MapContainer>
    </div>
  )
}
