import React, { useEffect, useRef } from 'react'

const categoryColors = {
  vet:        '#7C3AED',
  groom:      '#EC4899',
  park:       '#16A34A',
  shop:       '#D97706',
  hotel:      '#0F9B8E',
  restaurant: '#DC2626',
}

const categoryEmojis = {
  vet:        '🏥',
  groom:      '✂️',
  park:       '🌳',
  shop:       '🛍️',
  hotel:      '🏨',
  restaurant: '🍽️',
}

export default function MapaLugares({ places, userLocation, onPlaceSelect, onClose }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const userLocationRef = useRef(userLocation)

  useEffect(() => {
    userLocationRef.current = userLocation
  }, [userLocation])

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY

    function loadMap() {
      if (window.google && window.google.maps) {
        initMap()
        return
      }
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        const checkReady = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(checkReady)
            initMap()
          }
        }, 100)
        return () => clearInterval(checkReady)
      }
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = initMap
      document.head.appendChild(script)
    }

    loadMap()
  }, [])

  useEffect(() => {
    if (mapInstanceRef.current && userLocation) {
      mapInstanceRef.current.panTo({ lat: userLocation.lat, lng: userLocation.lng })
    }
  }, [userLocation])

  function initMap() {
    if (!mapRef.current) return

    const loc = userLocationRef.current
    const center = loc
      ? { lat: loc.lat, lng: loc.lng }
      : { lat: 8.9936, lng: -79.5197 }

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 14,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
      ]
    })

    mapInstanceRef.current = map

// Centrar con delay para asegurar que el mapa esté listo
if (loc) {
  setTimeout(() => {
    map.setCenter({ lat: loc.lat, lng: loc.lng })
    map.setZoom(17)
  }, 500)
}
    if (loc) {
      new window.google.maps.Marker({
        position: { lat: loc.lat, lng: loc.lng },
        map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#3B82F6',
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2,
        },
        title: 'Tu ubicación',
      })

      new window.google.maps.Circle({
        map,
        center: { lat: loc.lat, lng: loc.lng },
        radius: 500,
        fillColor: '#3B82F6',
        fillOpacity: 0.1,
        strokeColor: '#3B82F6',
        strokeWeight: 1,
      })
    }

    places.filter(p => p.lat && p.lng).forEach(place => {
      const color = categoryColors[place.category] || '#7C3AED'
      const emoji = categoryEmojis[place.category] || '📍'

      const marker = new window.google.maps.Marker({
        position: { lat: parseFloat(place.lat), lng: parseFloat(place.lng) },
        map,
        title: place.name,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="${color}" stroke="white" stroke-width="2"/>
              <text x="20" y="26" text-anchor="middle" font-size="18">${emoji}</text>
            </svg>
          `)}`,
          scaledSize: new window.google.maps.Size(40, 40),
          anchor: new window.google.maps.Point(20, 20),
        }
      })

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="min-width:160px;padding:4px">
            <div style="font-weight:600;font-size:13px">${place.name}</div>
            <div style="font-size:11px;color:${color};margin-top:2px">${place.type}</div>
            <div style="font-size:11px;color:#6B7280;margin-top:2px">⭐ ${place.rating} · ${place.reviews} reseñas</div>
            ${place.distance ? `<div style="font-size:11px;color:#6B7280">${place.distance} km</div>` : ''}
            <button onclick="window._petsocialSelectPlace('${place.id}')" style="margin-top:8px;background:${color};color:white;border:none;border-radius:20px;padding:4px 12px;font-size:11px;cursor:pointer;width:100%">Ver detalle</button>
          </div>
        `
      })

      marker.addListener('click', () => {
        infoWindow.open(map, marker)
      })
    })

    window._petsocialSelectPlace = (placeId) => {
      const place = places.find(p => String(p.id) === String(placeId))
      if (place) onPlaceSelect(place)
    }
  }

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
              {cat === 'vet' ? 'Vet' : cat === 'groom' ? 'Grooming' : cat === 'park' ? 'Parque' : cat === 'shop' ? 'Shop' : cat === 'hotel' ? 'Hotel' : 'Rest.'}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-gray-500">Tú</span>
        </div>
      </div>

      <div ref={mapRef} className="flex-1" />
    </div>
  )
}