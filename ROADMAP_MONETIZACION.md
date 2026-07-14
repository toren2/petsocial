# Hoja de ruta de monetización — Snoutt

Última actualización: 14 de julio de 2026

Principio general: Premium siempre se construye **sumando** funciones nuevas, nunca quitando algo que ya era gratis. Nada de lo que hoy es gratis se vuelve de pago más adelante.

## Fase 1 — Lanzamiento: siempre gratis

- Crear perfil de mascota y subir fotos
- Feed completo (publicar, dar like, comentar, seguir)
- Match con el límite diario de likes actual (10/día)
- Chat (con match o mensajería abierta entre adultos)
- Lugares y su mapa
- Crear y unirse a Eventos
- Notificaciones
- Badge de vacunas al día y sistema de Huellas (gamificación)

## Fase 1 — Lanzamiento: Premium

- Likes ilimitados por día (ya insinuado en la app actual: "Vuelve mañana o actualiza a Premium")
- Ver quién te dio like antes de hacer match
- Deshacer el último swipe
- Filtros de búsqueda avanzados en Match (radio de distancia, más criterios)
- Boost temporal de perfil (aparecer primero en el stack de otros)
- Badge visual de Premium en el perfil

## Fase 2 — Alianzas con negocios (post-launch)

- Cupones/descuentos de negocios pet-friendly como beneficio Premium
- Plan "Pro" para que los negocios de Lugares paguen por: destacar su lugar, ver estadísticas de visitas/reservas, gestionar su propia ficha

## En evaluación (sin decidir todavía)

- Modelo de anuncios para usuarios gratuitos, removibles con Premium (freemium + ads, tipo Spotify). Podría sumarse como otro beneficio de Premium ("sin anuncios") en vez de ser su propio sistema aparte.

## Decisión: Premium listo desde el lanzamiento

- Premium debe estar disponible desde el día de lanzamiento (no diferido a una fase posterior), para usuarios que lo quieran comprar de salida.
- Snoutt se lanza en PWA + apps nativas (App Store y Play Store) desde el inicio.
- Arquitectura elegida: RevenueCat como capa unificada de suscripciones sobre App Store, Google Play y Stripe (web), para no construir manejo de recibos/webhooks por separado en cada plataforma.
- Para publicar en las tiendas se necesita empaquetar la PWA con Capacitor (Ionic) y tener cuentas de Apple Developer (US$99/año) y Google Play Developer (US$25 único).
- Mientras se tramitan esas cuentas, se puede avanzar en paralelo con: diseño del paywall, modelo de entitlements en Supabase, y feature gates en la app (probado en sandbox).
