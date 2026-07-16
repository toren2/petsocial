import React, { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from './supabase'
import Auth from './pages/Auth'
import ResetPassword from './pages/ResetPassword'
import Splash from './pages/Splash'
import Feed from './pages/Feed'
import Match from './pages/Match'
import Lugares from './pages/Lugares'
import Perfil from './pages/Perfil'
import Eventos from './pages/Eventos'
import Perdidos from './pages/Perdidos'
import Chat from './pages/Chat'
import BottomNav from './components/BottomNav'
import MatchModal from './components/MatchModal'
import Notifications from './components/Notifications'
import Hub from './pages/Hub'
import AdminModeracion from './pages/AdminModeracion'
import { useBackButton } from './useBackButton'
import ShareTargetPicker from './components/ShareTargetPicker'


export default function App() {
  const { user, loading, signOut, isPasswordRecovery } = useAuth()
  const [screen, setScreen] = useState('splash')
  const [matchedPet, setMatchedPet] = useState(null)
  const [showSplash, setShowSplash] = useState(true)
  const [initialCategory, setInitialCategory] = useState('all')
  const [pendingPlaceId, setPendingPlaceId] = useState(null)
  const [pendingChatUserId, setPendingChatUserId] = useState(null)
  const [pendingEventId, setPendingEventId] = useState(null)
  const [pendingPostId, setPendingPostId] = useState(null)
  const [pendingPostAction, setPendingPostAction] = useState(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [shareTargetFile, setShareTargetFile] = useState(null)
  const [shareTargetText, setShareTargetText] = useState('')
  const [pendingShare, setPendingShare] = useState(null)
  const [pendingOpenVacunas, setPendingOpenVacunas] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchUnreadCount()
    const subscription = supabase
      .channel('app-notifications-count')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => setUnreadCount(c => c + 1))
      .subscribe()
    return () => supabase.removeChannel(subscription)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // El boton/gesto de "atras" del celular navega dentro de la app en vez de salir:
  // primero cierra el modal que este abierto, si no hay ninguno vuelve al Hub.
  useBackButton(!!user && !loading && screen !== 'hub' && screen !== 'splash', () => setScreen('hub'))
  useBackButton(!!matchedPet, () => setMatchedPet(null))
  useBackButton(showNotifications, () => setShowNotifications(false))

  // Cuando se toca una notificacion push del sistema (fuera de la app), el
  // service worker manda los datos por postMessage (si ya habia una ventana
  // abierta) o los codifica en la URL con la que abre una ventana nueva (si
  // la app estaba completamente cerrada). Ambos casos terminan navegando
  // exactamente a lo mismo que tocar la notificacion dentro de la app.
  // handleNotificationNavigate esta declarada mas abajo con `function`, asi
  // que esta disponible aqui por hoisting sin importar el orden en el codigo.
  function navigateFromPushData(data) {
    if (!data || !data.type) return
    handleNotificationNavigate({ type: data.type, data })
  }

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    function onMessage(event) {
      if (event.data && event.data.source === 'snoutt-notification-click') {
        navigateFromPushData(event.data.data)
      }
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!user) return
    const params = new URLSearchParams(window.location.search)
    const ntype = params.get('ntype')
    if (!ntype) return
    navigateFromPushData({
      type: ntype,
      matchUserId: params.get('matchUserId') || undefined,
      senderId: params.get('senderId') || undefined,
      eventId: params.get('eventId') || undefined,
      postId: params.get('postId') || undefined,
    })
    window.history.replaceState({}, '', window.location.pathname)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Cuando el usuario comparte una foto/video desde fuera de la app (menu
  // nativo de "Compartir" del telefono) el service worker intercepta el
  // POST del Web Share Target, guarda el archivo en el Cache API y
  // redirige aqui con ?share-target=1. Lo recogemos y mostramos el
  // selector de "Feed o Historia".
  useEffect(() => {
    if (!user) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('share-target') !== '1') return
    window.history.replaceState({}, '', window.location.pathname)
    ;(async () => {
      try {
        const cache = await caches.open('share-target-v1')
        const fileRes = await cache.match('/shared-file')
        const metaRes = await cache.match('/shared-file-meta')
        if (fileRes && metaRes) {
          const blob = await fileRes.blob()
          const meta = await metaRes.json()
          const file = new File([blob], meta.name || 'compartido', { type: meta.type || blob.type })
          setShareTargetFile(file)
          setShareTargetText(meta.text || '')
          await cache.delete('/shared-file')
          await cache.delete('/shared-file-meta')
        }
      } catch (e) {
        console.log('share target error', e)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function fetchUnreadCount() {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)
    setUnreadCount(count || 0)
  }

  if (loading) return (
    <div className="phone-shell items-center justify-center flex">
      <div className="text-4xl">🐾</div>
    </div>
  )

  if (isPasswordRecovery) {
    return (
      <div className="phone-shell">
        <ResetPassword />
      </div>
    )
  }

  if (showSplash && !user) {
    return (
      <div className="phone-shell">
        <Splash onEnter={() => setShowSplash(false)} />
      </div>
    )
  }

  if (user && screen === 'splash') {
    setScreen('hub')
  }

  if (!user) {
    return (
      <div className="phone-shell">
        <Auth />
      </div>
    )
  }

  function handleMatch(pet) { setMatchedPet(pet) }
  function handleMatchChat() { setMatchedPet(null); setScreen('chat') }
  function handleKeepSwiping() { setMatchedPet(null) }
  function openChatWith(uid) { setPendingChatUserId(uid); setScreen('chat') }
  function openEvent(eid) { setPendingEventId(eid); setScreen('eventos') }
  function openNotifications() { setShowNotifications(true); setUnreadCount(0) }
  function handleNotificationNavigate(n) {
    setShowNotifications(false)
    if (n.type === 'match' && n.data?.matchUserId) { openChatWith(n.data.matchUserId); return }
    if (n.type === 'message' && n.data?.senderId) { openChatWith(n.data.senderId); return }
    if (n.type === 'event_invite' && n.data?.eventId) { openEvent(n.data.eventId); return }
    if (n.type === 'streak_reminder') { setScreen('lugares'); return }
    if (n.type === 'vaccine_reminder') { setPendingOpenVacunas(true); setScreen('perfil'); return }
    if (n.type === 'event_nearby' && n.data?.eventId) { openEvent(n.data.eventId); return }
    if (n.type === 'like' && n.data?.postId) { setPendingPostId(n.data.postId); setPendingPostAction('view'); setScreen('feed'); return }
    if (n.type === 'comment' && n.data?.postId) { setPendingPostId(n.data.postId); setPendingPostAction('comments'); setScreen('feed'); return }
  }

  return (
    <div className="phone-shell">
      <div className="flex flex-col flex-1 overflow-hidden relative">
        {screen === 'hub'     && <Hub onNavigate={(s, cat, placeId, postId) => { if (cat) setInitialCategory(cat); if (placeId) setPendingPlaceId(placeId); if (postId) { setPendingPostId(postId); setPendingPostAction('view') }; setScreen(s) }} unreadCount={unreadCount} onOpenNotifications={openNotifications} />}
        {screen === 'feed'    && <Feed onOpenChat={openChatWith} unreadCount={unreadCount} onOpenNotifications={openNotifications} initialPostId={pendingPostId} initialPostAction={pendingPostAction} onConsumeInitialPost={() => { setPendingPostId(null); setPendingPostAction(null) }} pendingShare={pendingShare} onConsumePendingShare={() => setPendingShare(null)} />}
        {screen === 'match'   && <Match onMatch={handleMatch} />}
        {screen === 'chat'    && <Chat initialUserId={pendingChatUserId} onConsumeInitialUser={() => setPendingChatUserId(null)} />}
        {screen === 'eventos' && <Eventos initialEventId={pendingEventId} onConsumeInitialEvent={() => setPendingEventId(null)} />}
        {screen === 'perdidos' && <Perdidos onNavigate={(s) => setScreen(s)} />}
        {screen === 'lugares' && <Lugares initialCategory={initialCategory} initialPlaceId={pendingPlaceId} onConsumeInitialPlace={() => setPendingPlaceId(null)} onNavigate={setScreen} />}
        {screen === 'perfil'  && <Perfil onSignOut={signOut} onNavigate={setScreen} initialOpenVacunas={pendingOpenVacunas} onConsumeInitialOpenVacunas={() => setPendingOpenVacunas(false)} />}
        {screen === 'admin'   && <AdminModeracion onBack={() => setScreen('perfil')} />}


        {matchedPet && (
          <MatchModal
            pet={matchedPet}
            onChat={handleMatchChat}
            onKeepSwiping={handleKeepSwiping}
          />
        )}

        {showNotifications && (
          <Notifications
            onClose={() => setShowNotifications(false)}
            onNavigate={handleNotificationNavigate}
          />
        )}

        {shareTargetFile && (
          <ShareTargetPicker
            file={shareTargetFile}
            onPickFeed={() => {
              setPendingShare({ file: shareTargetFile, text: shareTargetText, target: 'feed' })
              setScreen('feed')
              setShareTargetFile(null)
            }}
            onPickStory={() => {
              setPendingShare({ file: shareTargetFile, text: shareTargetText, target: 'story' })
              setScreen('feed')
              setShareTargetFile(null)
            }}
            onClose={() => setShareTargetFile(null)}
          />
        )}
      </div>

      <BottomNav active={screen} onNavigate={setScreen} />
    </div>
  )
}
