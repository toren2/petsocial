import React, { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { useLanguage } from './LanguageContext'
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
import AdminSeed from './pages/AdminSeed'


export default function App() {
  const { user, loading, signOut, isPasswordRecovery } = useAuth()
  const { t } = useLanguage()
  const [screen, setScreen] = useState('splash')
  const [matchedPet, setMatchedPet] = useState(null)
  const [showSplash, setShowSplash] = useState(true)
  const [initialCategory, setInitialCategory] = useState('all')
  const [pendingChatUserId, setPendingChatUserId] = useState(null)
  const [pendingEventId, setPendingEventId] = useState(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

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

  const seedMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('seed') === '1'
  if (seedMode && user) {
    return (
      <div className="phone-shell">
        <AdminSeed />
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
  }

  return (
    <div className="phone-shell">
      <div className="flex justify-between items-center px-5 py-2 bg-white text-xs font-medium text-gray-700 flex-shrink-0">
  <span>{new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
  <div className="flex gap-3 items-center text-gray-500">
    <button
      onClick={signOut}
      className="text-xs text-ps-purple border-0 bg-transparent cursor-pointer font-medium"
    >
      {t('app.logout')}
    </button>
  </div>
</div>

      <div className="flex flex-col flex-1 overflow-hidden relative">
        {screen === 'hub'     && <Hub onNavigate={(s, cat) => { if (cat) setInitialCategory(cat); setScreen(s) }} unreadCount={unreadCount} onOpenNotifications={openNotifications} />}
        {screen === 'feed'    && <Feed onOpenChat={openChatWith} unreadCount={unreadCount} onOpenNotifications={openNotifications} />}
        {screen === 'match'   && <Match onMatch={handleMatch} />}
        {screen === 'chat'    && <Chat initialUserId={pendingChatUserId} onConsumeInitialUser={() => setPendingChatUserId(null)} />}
        {screen === 'eventos' && <Eventos initialEventId={pendingEventId} onConsumeInitialEvent={() => setPendingEventId(null)} />}
        {screen === 'perdidos' && <Perdidos onNavigate={(s) => setScreen(s)} />}
        {screen === 'lugares' && <Lugares initialCategory={initialCategory} />}
        {screen === 'perfil'  && <Perfil onSignOut={signOut} onNavigate={setScreen} />}
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
      </div>

      <BottomNav active={screen} onNavigate={setScreen} />
    </div>
  )
}
