import { precacheAndRoute } from 'workbox-precaching'

precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { title: 'Snoutt', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'Snoutt'
  const options = {
    body: data.body || '',
    icon: '/web-app-manifest-192x192.png',
    badge: '/web-app-manifest-192x192.png',
    data: data.data || {},
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}

  // Codificamos el tipo y los ids relevantes en la URL para el caso en que
  // no haya ninguna ventana abierta (app cerrada del todo); si ya hay una
  // ventana, le mandamos los datos directo por postMessage.
  const params = new URLSearchParams()
  if (data.type) params.set('ntype', data.type)
  if (data.matchUserId) params.set('matchUserId', data.matchUserId)
  if (data.senderId) params.set('senderId', data.senderId)
  if (data.eventId) params.set('eventId', data.eventId)
  if (data.postId) params.set('postId', data.postId)
  const query = params.toString()
  const targetUrl = self.registration.scope + (query ? '?' + query : '')

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ source: 'snoutt-notification-click', data })
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl)
    })
  )
})

// Web Share Target: permite que la PWA instalada aparezca en el menu nativo
// de "Compartir" del telefono (junto a WhatsApp, Instagram, etc.) al tocar
// compartir sobre una foto o video de la galeria. El navegador hace un POST
// con multipart/form-data a esta ruta -- como es una SPA estatica sin
// backend propio, lo interceptamos aqui, guardamos el archivo en el Cache
// API (no se puede pasar un File por la URL) y redirigimos a la app, que
// lo recoge de ahi al cargar (ver App.jsx).
const SHARE_CACHE = 'share-target-v1'

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith(handleShareTarget(event))
  }
})

async function handleShareTarget(event) {
  try {
    const formData = await event.request.formData()
    const file = formData.get('media')
    const text = formData.get('text') || ''
    const cache = await caches.open(SHARE_CACHE)
    if (file && typeof file === 'object' && file.size > 0) {
      await cache.put('/shared-file', new Response(file, { headers: { 'Content-Type': file.type || 'application/octet-stream' } }))
      await cache.put('/shared-file-meta', new Response(JSON.stringify({ name: file.name || 'compartido', type: file.type || '', text })))
    }
  } catch (e) {
    // Si algo falla igual redirigimos a la app en vez de dejar una pantalla de error del navegador.
  }
  return Response.redirect('/?share-target=1', 303)
}

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
