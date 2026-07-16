import { useEffect, useRef, useState, useCallback } from 'react'

// Pull-to-refresh propio, por pantalla, sin depender del gesto nativo del
// navegador/PWA (ese siempre hace un reload completo de la pagina, y como
// esta app es una SPA sin rutas reales por pantalla, un reload completo
// pierde todo el estado y manda de vuelta al Hub -- justo lo que no
// queremos). Este hook se engancha al div que scrollea de cada pantalla:
// cuando el usuario esta en el tope (scrollTop === 0) y jala hacia abajo,
// bloquea el scroll nativo (preventDefault) y en su lugar llama a la
// funcion de recarga que le pase esa pantalla.
//
// Se usa con un callback ref (containerRef) en vez de un useRef comun
// porque en pantallas como Lugares el div que scrollea cambia (vista
// "home" vs "browse" son dos <div> distintos, montados/desmontados segun
// el estado) -- con un ref comun el listener se quedaria pegado al primer
// nodo y dejaria de funcionar al cambiar de vista. El callback ref se
// reinvoca automaticamente cada vez que React (des)monta el nodo, sea cual
// sea el <div> que lo use, mientras se pase la misma funcion.
const PULL_THRESHOLD = 70
const MAX_PULL = 100
const RESISTANCE = 0.5

export function usePullToRefresh(onRefresh) {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const scrollRef = useRef(null)
  const cleanupRef = useRef(null)
  const startYRef = useRef(null)
  const pullingRef = useRef(false)
  const distanceRef = useRef(0)
  const refreshingRef = useRef(false)
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  const containerRef = useCallback((el) => {
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
    scrollRef.current = el
    if (!el) return

    function reset() {
      pullingRef.current = false
      distanceRef.current = 0
      setPullDistance(0)
    }

    function onTouchStart(e) {
      if (refreshingRef.current) return
      if (el.scrollTop > 0) { startYRef.current = null; return }
      startYRef.current = e.touches[0].clientY
      pullingRef.current = false
    }

    function onTouchMove(e) {
      if (startYRef.current == null || refreshingRef.current) return
      const diff = e.touches[0].clientY - startYRef.current
      if (el.scrollTop > 0) {
        startYRef.current = null
        if (pullingRef.current) reset()
        return
      }
      if (diff <= 0) {
        if (pullingRef.current) reset()
        return
      }
      pullingRef.current = true
      e.preventDefault()
      const dist = Math.min(diff * RESISTANCE, MAX_PULL)
      distanceRef.current = dist
      setPullDistance(dist)
    }

    async function onTouchEnd() {
      if (!pullingRef.current) { startYRef.current = null; return }
      pullingRef.current = false
      startYRef.current = null
      if (distanceRef.current >= PULL_THRESHOLD) {
        refreshingRef.current = true
        setRefreshing(true)
        setPullDistance(PULL_THRESHOLD)
        try {
          await onRefreshRef.current?.()
        } finally {
          refreshingRef.current = false
          setRefreshing(false)
          distanceRef.current = 0
          setPullDistance(0)
        }
      } else {
        distanceRef.current = 0
        setPullDistance(0)
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })

    cleanupRef.current = () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (cleanupRef.current) cleanupRef.current()
    }
  }, [])

  return { containerRef, scrollRef, pullDistance, refreshing, threshold: PULL_THRESHOLD }
}
