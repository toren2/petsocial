import React, { useState, useEffect } from 'react'
import { Search, Bell, Plus, X } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'
import CreatePostModal from '../components/CreatePostModal'
import StoriesBar from '../components/StoriesBar'
import PerfilPublico from './PerfilPublico'
import Post from '../components/PostCard'
import { usePullToRefresh } from '../usePullToRefresh'
import PullToRefreshIndicator from '../components/PullToRefreshIndicator'

function SearchPanel({ onClose, onViewProfile }) {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timeout = setTimeout(() => searchUsers(), 400)
    return () => clearTimeout(timeout)
  }, [query])

  async function searchUsers() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, pet_name, emoji, avatar_url, breed, location')
      .ilike('pet_name', `%${query}%`)
      .neq('id', user.id)
      .limit(20)
    setResults(data || [])
    setLoading(false)
  }

  return (
    <div className="absolute inset-0 z-40 bg-white flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            autoFocus
            type="text"
            placeholder={t('feed.searchPlaceholder')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-ps-bg border border-gray-200 rounded-full py-2.5 pl-9 pr-4 text-sm outline-none"
          />
        </div>
        <button onClick={onClose} className="border-0 bg-transparent cursor-pointer text-gray-500">
          <X size={22} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <span className="text-sm">{t('feed.searching')}</span>
          </div>
        ) : query.trim() === '' ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <span className="text-4xl">🔍</span>
            <p className="text-sm">{t('feed.searchByName')}</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <span className="text-4xl">🐾</span>
            <p className="text-sm">{t('feed.noPetsFound')}</p>
          </div>
        ) : (
          results.map(p => (
            <div
              key={p.id}
              onClick={() => { onViewProfile(p.id); onClose() }}
              className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 cursor-pointer active:bg-gray-50"
            >
              <div className="w-12 h-12 rounded-full bg-ps-purple-light flex items-center justify-center text-2xl overflow-hidden flex-shrink-0">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt={p.pet_name} className="w-full h-full object-cover" />
                ) : (
                  p.emoji || '🐕'
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-900">{p.pet_name}</div>
                <div className="text-xs text-gray-400 truncate mt-0.5">
                  {p.breed} {p.location ? `· ${p.location}` : ''}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function Feed({ onOpenChat, unreadCount, onOpenNotifications, initialPostId = null, initialPostAction = null, onConsumeInitialPost, pendingShare = null, onConsumePendingShare }) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [posts, setPosts] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [viewingProfile, setViewingProfile] = useState(null)
  const [feedTab, setFeedTab] = useState('all')
  const [followingIds, setFollowingIds] = useState([])
  const [sharedPostFile, setSharedPostFile] = useState(null)
  const [sharedStoryFile, setSharedStoryFile] = useState(null)
  const [sharedCaption, setSharedCaption] = useState('')

  useEffect(() => {
    fetchPosts()
    fetchProfile()
    fetchFollowing()
  }, [])

  // Un archivo compartido desde fuera de la app (galeria del telefono via
  // Web Share Target) llega aqui con el destino que eligio el usuario en
  // App.jsx: "feed" abre directo el modal de nuevo post, "story" se lo
  // pasamos a StoriesBar para que abra su propio modal.
  useEffect(() => {
    if (!pendingShare) return
    setSharedCaption(pendingShare.text || '')
    if (pendingShare.target === 'feed') {
      setSharedPostFile(pendingShare.file)
      setShowCreate(true)
    } else if (pendingShare.target === 'story') {
      setSharedStoryFile(pendingShare.file)
    }
    onConsumePendingShare && onConsumePendingShare()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingShare])

  useEffect(() => {
    if (!initialPostId || posts.length === 0) return
    const match = posts.find(p => p.id === initialPostId)
    if (!match) { onConsumeInitialPost && onConsumeInitialPost(); return }
    const el = document.getElementById(`post-${initialPostId}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    onConsumeInitialPost && onConsumeInitialPost()
  }, [initialPostId, posts])

  async function fetchProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) setProfile(data)
  }

  async function fetchFollowing() {
    const { data } = await supabase.from('follows').select('following_id').eq('follower_id', user.id)
    if (data) setFollowingIds(data.map(f => f.following_id))
  }

  async function fetchPosts() {
    setLoading(true)
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
    if (data) {
      const { data: likes } = await supabase.from('post_likes').select('post_id').eq('user_id', user.id)
      const { data: allLikes } = await supabase.from('post_likes').select('post_id')
      const likedIds = likes?.map(l => l.post_id) || []
      const { data: savedPosts } = await supabase.from('saved_posts').select('post_id').eq('user_id', user.id)
      const savedIds = savedPosts?.map(s => s.post_id) || []
      const countMap = {}
      allLikes?.forEach(l => { countMap[l.post_id] = (countMap[l.post_id] || 0) + 1 })
      setPosts(data.map(p => ({ ...p, liked: likedIds.includes(p.id), likes: countMap[p.id] || 0, saved: savedIds.includes(p.id) })))
    }
    setLoading(false)
  }

  function handleNewPost(post) {
    setPosts(prev => [{ ...post, liked: false }, ...prev])
  }

  async function deletePost(postId, imageUrl) {
    if (!window.confirm(t('feed.deletePostConfirm'))) return
    await supabase.from('posts').delete().eq('id', postId)
    if (imageUrl) {
      const path = imageUrl.split('/posts/')[1]
      if (path) await supabase.storage.from('posts').remove([path])
    }
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  const displayedPosts = feedTab === 'following'
    ? posts.filter(p => followingIds.includes(p.user_id))
    : posts

  async function refreshFeed() {
    await Promise.all([fetchPosts(), fetchProfile(), fetchFollowing()])
  }

  const { containerRef: feedScrollRef, scrollRef: feedScrollNodeRef, pullDistance, refreshing, threshold } = usePullToRefresh(refreshFeed)

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
    <button
      onClick={() => feedScrollNodeRef.current && feedScrollNodeRef.current.scrollTo({ top: 0, behavior: 'smooth' })}
      className="border-0 bg-transparent cursor-pointer p-0"
      style={{ overflow: 'hidden', height: '44px', display: 'flex', alignItems: 'center' }}
    >
  <img
    src="/snoutt-logo.png"
    alt="Snoutt"
    style={{ height: '79px', width: 'auto' }}
  />
</button>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSearch(true)}
            className="border-0 bg-transparent cursor-pointer text-gray-500"
          >
            <Search size={22} />
          </button>
          <button
            onClick={() => onOpenNotifications && onOpenNotifications()}
            className="border-0 bg-transparent cursor-pointer text-gray-500 relative"
          >
            <Bell size={22} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-ps-pink rounded-full border border-white flex items-center justify-center text-white text-[9px] font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex bg-white border-b border-gray-100 flex-shrink-0">
        <button
          onClick={() => setFeedTab('all')}
          className="flex-1 py-2.5 text-sm font-medium border-0 bg-transparent cursor-pointer border-b-2 transition-colors"
          style={{ color: feedTab === 'all' ? '#7C3AED' : '#9CA3AF', borderBottomColor: feedTab === 'all' ? '#7C3AED' : 'transparent' }}
        >
          {t('feed.tabAll')}
        </button>
        <button
          onClick={() => setFeedTab('following')}
          className="flex-1 py-2.5 text-sm font-medium border-0 bg-transparent cursor-pointer border-b-2 transition-colors"
          style={{ color: feedTab === 'following' ? '#7C3AED' : '#9CA3AF', borderBottomColor: feedTab === 'following' ? '#7C3AED' : 'transparent' }}
        >
          {t('feed.tabFollowing')}
        </button>
      </div>

      <div ref={feedScrollRef} className="flex-1 overflow-y-auto bg-ps-bg">
        <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} threshold={threshold} />
        <StoriesBar
          profile={profile}
          initialShareFile={sharedStoryFile}
          initialShareCaption={sharedCaption}
          onConsumeInitialShareFile={() => setSharedStoryFile(null)}
        />
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-ps-purple-light flex items-center justify-center overflow-hidden flex-shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl">{profile?.emoji || '🐕'}</span>
            )}
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex-1 text-left text-sm text-gray-400 bg-ps-bg border border-gray-200 rounded-full px-4 py-2.5 cursor-pointer"
          >
            {t('feed.whatIsDoing', { name: profile?.pet_name || t('feed.yourPet') })}
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-ps-purple border-0 cursor-pointer"
          >
            <Plus size={18} color="white" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
            <span className="text-4xl">🐾</span>
            <p className="text-sm">{t('feed.loadingPosts')}</p>
          </div>
        ) : displayedPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
            <span className="text-4xl">📸</span>
            <p className="text-sm">
              {feedTab === 'following' ? t('feed.notFollowingAnyone') : t('feed.noPostsYet')}
            </p>
            {feedTab === 'all' && (
              <button
                onClick={() => setShowCreate(true)}
                className="text-xs font-semibold px-4 py-2 rounded-full border-0 cursor-pointer"
                style={{ background: '#EDE9FE', color: '#7C3AED' }}
              >
                {t('feed.bePioneer')}
              </button>
            )}
          </div>
        ) : (
          displayedPosts.map(p => <Post key={p.id} post={p} currentUserId={user.id} myPetName={profile?.pet_name} onViewProfile={setViewingProfile} onDelete={deletePost} autoOpenComments={p.id === initialPostId && initialPostAction === 'comments'} />)
        )}
      </div>

      {showSearch && (
        <SearchPanel onClose={() => setShowSearch(false)} onViewProfile={setViewingProfile} />
      )}

      {viewingProfile && viewingProfile !== user.id && (
        <div className="absolute inset-0 z-40 bg-ps-bg flex flex-col">
          <PerfilPublico
            key={viewingProfile}
            userId={viewingProfile}
            onBack={() => setViewingProfile(null)}
            onChat={onOpenChat ? (uid) => { setViewingProfile(null); onOpenChat(uid) } : undefined}
          />
        </div>
      )}

      {showCreate && (
        <CreatePostModal
          profile={profile}
          initialFile={sharedPostFile}
          initialCaption={sharedPostFile ? sharedCaption : ''}
          onClose={() => { setShowCreate(false); setSharedPostFile(null) }}
          onCreate={post => { handleNewPost(post); setSharedPostFile(null) }}
        />
      )}
    </div>
  )
}