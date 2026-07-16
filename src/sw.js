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

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
