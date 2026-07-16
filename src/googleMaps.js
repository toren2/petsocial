// Utilidades compartidas para cargar el SDK de Google Maps (una sola vez
// por sesion) y geocodificar texto libre ("San Francisco, Panama") a
// coordenadas. Se usa como respaldo cuando el usuario no selecciono una
// sugerencia del autocompletado, y tambien para "sanar" en segundo plano
// perfiles/eventos viejos que solo tienen texto guardado (sin lat/lng)
// la proxima vez que el dueño los abre.

let loadPromise = null

// Interruptor de seguridad: si un intento de geocodificar falla con un
// error real (no solo "sin resultados"), dejamos de insistir por el resto
// de la sesion. Antes reintentabamos en cada montaje de Perfil/Eventos sin
// limite, lo que en la practica termino bombardeando la API repetidamente
// cuando algo esta mal configurado del lado de Google Cloud (key sin la
// Geocoding API habilitada, cuota agotada, etc.) -- eso probablemente fue
// lo que rompio tambien el mapa de lugares.
let geocodeDisabled = false
const attemptedThisSession = new Set()

export function loadGoogleMaps() {
  if (window.google && window.google.maps) return Promise.resolve(window.google.maps)
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY

    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      const checkReady = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkReady)
          resolve(window.google.maps)
        }
      }, 100)
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.google.maps)
    script.onerror = reject
    document.head.appendChild(script)
  })

  return loadPromise
}

export async function geocodeAddress(address) {
  if (!address || !address.trim()) return null
  if (geocodeDisabled) return null

  const dedupeKey = address.trim().toLowerCase()
  if (attemptedThisSession.has(dedupeKey)) return null
  attemptedThisSession.add(dedupeKey)

  try {
    const maps = await loadGoogleMaps()
    const geocoder = new maps.Geocoder()
    return await new Promise(resolve => {
      geocoder.geocode({ address, region: 'pa' }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const loc = results[0].geometry.location
          resolve({ lat: loc.lat(), lng: loc.lng() })
        } else {
          // ZERO_RESULTS es una respuesta valida (la direccion no existe),
          // no un fallo del servicio -- solo apagamos el interruptor para
          // errores reales (key/cuota/permiso).
          if (status !== 'ZERO_RESULTS') geocodeDisabled = true
          resolve(null)
        }
      })
    })
  } catch (e) {
    geocodeDisabled = true
    return null
  }
}
