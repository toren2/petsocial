import React from 'react'
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet'

const categoryColors = {
  vet:        '#7C3AED',
  groom:      '#EC4899',
  park:       '#16A34A',
  shop:       '#D97706',
  hotel:      '#0F9B8E',
  restaurant: '#DC2626',
}

const PANAMA_CENTER = { lat: 8.9936, lng: -79.5197 }

// Minimapa no interactivo (preview) para el banner de Lugares.
// El tap para abrir el mapa completo lo maneja el contenedor padre;
// aquí deshabilitamos toda interacción del mapa y bloqueamos eventos de puntero.
export default function MiniMapaLugares({ userLocation, places = [] }) {
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
            radius={7}
            pathOptions={{ color: 'white', weight: 2, fillColor: '#3B82F6', fillOpacity: 1 }}
          />
        )}

        {places
          .filter(p => p.lat && p.lng)
          .map(place => (
            <CircleMarker
              key={place.id}
              center={[parseFloat(place.lat), parseFloat(place.lng)]}
              radius={6}
              pathOptions={{
                color: 'white',
                weight: 1.5,
                fillColor: categoryColors[place.category] || '#7C3AED',
                fillOpacity: 0.95,
              }}
            />
          ))}
      </MapContainer>
    </div>
  )
}
