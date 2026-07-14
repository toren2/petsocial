import { useEffect, useRef } from 'react'

/**
 * Engancha el botón/gesto de "atrás" del celular (evento popstate) para que,
 * mientras `active` sea true, presionar atrás llame a onBack() en vez de
 * salir de la app.
 *
 * Se apila solo: si hay varias pantallas/modales activos a la vez, el primer
 * "atrás" cierra lo último que se abrió; solo después el siguiente "atrás"
 * sigue subiendo.
 */
export function useBackButton(active, onBack) {
  const consumedRef = useRef(true)

  useEffect(() => {
    if (!active) return

    window.history.pushState({ snouttBack: true }, '')
    consumedRef.current = false

    function handlePopState() {
      consumedRef.current = true
      onBack()
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (!consumedRef.current) {
        consumedRef.current = true
        window.history.back()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
}
