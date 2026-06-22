import React, { useState } from 'react'
import { useAuth } from './AuthContext'
import Auth from './pages/Auth'
import Splash from './pages/Splash'
import Feed from './pages/Feed'
import Match from './pages/Match'
import Lugares from './pages/Lugares'
import Perfil from './pages/Perfil'
import Eventos from './pages/Eventos'
import Chat from './pages/Chat'
import BottomNav from './components/BottomNav'
import MatchModal from './components/MatchModal'
import Hub from './pages/Hub'

export default function App() {
  const { user, loading, signOut } = useAuth()
  const [screen, setScreen] = useState('splash')
  const [matchedPet, setMatchedPet] = useState(null)
  const [showSplash, setShowSplash] = useState(true)

  if (loading) return (
    <div className="phone-shell items-center justify-center flex">
      <div className="text-4xl">🐾</div>
    </div>
  )

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

  return (
    <div className="phone-shell">
      <div className="flex justify-between items-center px-5 py-2 bg-white text-xs font-medium text-gray-700 flex-shrink-0">
  <span>{new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
  <div className="flex gap-3 items-center text-gray-500">
    <button
      onClick={signOut}
      className="text-xs text-ps-purple border-0 bg-transparent cursor-pointer font-medium"
    >
      Salir
    </button>
  </div>
</div>

      <div className="flex flex-col flex-1 overflow-hidden relative">
        {screen === 'hub'     && <Hub onNavigate={setScreen} unreadCount={0} />}
        {screen === 'feed'    && <Feed />}
        {screen === 'match'   && <Match onMatch={handleMatch} />}
        {screen === 'chat'    && <Chat />}
        {screen === 'eventos' && <Eventos />}
        {screen === 'lugares' && <Lugares />}
        {screen === 'perfil'  && <Perfil onSignOut={signOut} />}

        {matchedPet && (
          <MatchModal
            pet={matchedPet}
            onChat={handleMatchChat}
            onKeepSwiping={handleKeepSwiping}
          />
        )}
      </div>

      <BottomNav active={screen} onNavigate={setScreen} />
    </div>
  )
}