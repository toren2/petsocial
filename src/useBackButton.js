import { useEffect, useRef } from 'react'

/**
 * Engancha el botón/gesto de "atrás" del celular (evento popstate) para que,
 * mientras `active` sea true, presionar atrás llame a onBack() en vez de
 * salir de la app.
 *
 * Se apila solo: si hay varias pantallas/modales activos a la vez, el primer
 * "atrás" cierra lo último que se abrió; solo después el siguiente "atrás"
 * sigue subiendo.
 *
 * Cuando un componente se desmonta sin que su entrada de historial haya sido
 * consumida por un popstate real (p. ej. porque el usuario navegó a otra
 * pantalla tocando el bottom nav en vez de usar el botón atrás), este hook
 * limpia esa entrada fantasma llamando a history.back(). Ese history.back()
 * genera su propio popstate sintético; suppressPopstateCount evita que ese
 * popstate sintético sea interpretado como un "atrás" real por otros hooks
 * useBackButton que sigan activos (p. ej. el de nivel App), lo que causaba
 * que navegar desde una ficha de lugar al bottom nav te mandara al Hub.
 */
let suppressPopstateCount = 0

export function useBackButton(active, onBack) {
  const consumedRef = useRef(true)

  useEffect(() => {
    if (!active) return

    window.history.pushState({ snouttBack: true }, '')
    consumedRef.current = false

    function handlePopState() {
      consumedRef.current = true
      if (suppressPopstateCount > 0) {
        suppressPopstateCount -= 1
        return
      }
      onBack()
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (!consumedRef.current) {
        consumedRef.current = true
        suppressPopstateCount += 1
        window.history.back()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
}
