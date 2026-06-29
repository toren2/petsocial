import React, { useState, useEffect, useRef } from 'react'
import { Search, Bell, Plus, MessageCircle, Share2, Bookmark, Trash2, X } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import CreatePostModal from '../components/CreatePostModal'
import StoriesBar from '../components/StoriesBar'
import Notifications from '../components/Notifications'
import PerfilPublico from './PerfilPublico'
import CommentsModal from '../components/CommentsModal'

function PawIcon({ size = 22, filled = false, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="17" rx="5" ry="3.5" />
      <ellipse cx="7" cy="11" rx="2" ry="2.5" />
      <ellipse cx="17" cy="11" rx="2" ry="2.5" />
      <ellipse cx="9.5" cy="7" rx="1.5" ry="2" />
      <ellipse cx="14.5" cy="7" rx="1.5" ry="2" />
    </svg>
  )
}

function SearchPanel({ onClose, onViewProfile }) {
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
            placeholder="Buscar mascotas..."
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
            <span className="text-sm">Buscando...</span>
          </div>
        ) : query.trim() === '' ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <span className="text-4xl">🔍</span>
            <p className="text-sm">Busca por nombre de mascota</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <span className="text-4xl">🐾</span>
            <p className="text-sm">No se encontraron mascotas</p>
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

function Post({ post, currentUserId, onViewProfile, onDelete }) {
  const [liked, setLiked] = useState(post.liked)
  const [likes, setLikes] = useState(post.likes)
  const [showComments, setShowComments] = useState(false)
  const [commentCount, setCommentCount] = useState(0)
  const [saved, setSaved] = useState(post.saved || false)
  const [showPaw, setShowPaw] = useState(false)
  const lastTapRef = useRef(0)

  async function toggleSave() {
    const newSaved = !saved
    setSaved(newSaved)
    if (newSaved) {
      await supabase.from('saved_posts').insert([{ post_id: post.id, user_id: currentUserId }])
    } else {
      await supabase.from('saved_posts').delete().eq('post_id', post.id).eq('user_id', currentUserId)
    }
  }

  useEffect(() => {
    supabase
      .from('post_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id)
      .then(({ count }) => setCommentCount(count || 0))
  }, [])

  async function toggleLike() {
    const newLiked = !liked
    const newLikes = newLiked ? likes + 1 : likes - 1
    setLiked(newLiked)
    setLikes(newLikes)
    if (newLiked) {
      await supabase.from('post_likes').insert([{ post_id: post.id, user_id: currentUserId }])
    } else {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', currentUserId)
    }
  }

  function handleDoubleTap() {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      if (!liked) toggleLike()
      setShowPaw(true)
      setTimeout(() => setShowPaw(false), 900)
    }
    lastTapRef.current = now
  }

  async function handleShare() {
    const url = `${window.location.origin}?post=${post.id}`
    if (navigator.share) {
      await navigator.share({ title: `${post.pet_name} en PetSocial`, text: post.caption || '', url })
    } else {
      await navigator.clipboard.writeText(url)
      alert('Link copiado al portapapeles')
    }
  }

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div
          className="w-10 h-10 rounded-full bg-ps-purple-light flex items-center justify-center text-xl flex-shrink-0 overflow-hidden cursor-pointer"
          onClick={() => onViewProfile(post.user_id)}
        >
          {post.avatar_url ? (
            <img src={post.avatar_url} alt={post.pet_name} className="w-full h-full object-cover" />
          ) : (
            post.pet_emoji || '🐕'
          )}
        </div>
        <div className="flex-1 cursor-pointer" onClick={() => onViewProfile(post.user_id)}>
          <div className="font-semibold text-sm text-gray-900">{post.pet_name}</div>
          <div className="text-xs text-gray-400">
            {post.pet_breed} · {new Date(post.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
          </div>
        </div>
        {post.user_id === currentUserId && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(post.id, post.image_url) }}
            className="border-0 bg-transparent p-1 cursor-pointer text-gray-400"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>

      {/* Imagen con doble tap */}
      <div
        className="w-full relative"
        style={{ height: post.image_url ? 300 : 200 }}
        onClick={handleDoubleTap}
      >
        {post.image_url ? (
          <img src={post.image_url} alt="post" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: '#EDE9FE', fontSize: 80 }}>
            {post.pet_emoji || '🐕'}
          </div>
        )}

        {/* Huellita fading */}
        {showPaw && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              animation: 'pawFade 0.9s ease-out forwards',
            }}
          >
            <div style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}>
              <PawIcon size={100} filled color="#7C3AED" />
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pawFade {
          0%   { opacity: 0; transform: scale(0.5); }
          30%  { opacity: 1; transform: scale(1.1); }
          60%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.05); }
        }
      `}</style>

      <div className="px-4 pt-2.5 pb-1 flex items-center gap-4">
        <button
          onClick={toggleLike}
          className="border-0 bg-transparent p-0 cursor-pointer flex items-center gap-1 text-sm"
          style={{ color: liked ? '#7C3AED' : '#9CA3AF' }}
        >
          <PawIcon size={22} filled={liked} color={liked ? '#7C3AED' : '#9CA3AF'} />
          <span>{likes}</span>
        </button>
        <button
          onClick={() => setShowComments(true)}
          className="border-0 bg-transparent p-0 cursor-pointer flex items-center gap-1 text-sm text-gray-400"
        >
          <MessageCircle size={22} />
          {commentCount > 0 && <span>{commentCount}</span>}
        </button>
        <button
          onClick={handleShare}
          className="border-0 bg-transparent p-0 cursor-pointer text-gray-400"
        >
          <Share2 size={20} />
        </button>
        <button
          onClick={toggleSave}
          className="border-0 bg-transparent p-0 cursor-pointer ml-auto"
          style={{ color: saved ? '#7C3AED' : '#9CA3AF' }}
        >
          <Bookmark size={20} fill={saved ? '#7C3AED' : 'none'} />
        </button>
      </div>

      <div className="px-4 pb-1 text-sm font-semibold text-gray-900">{likes} me gusta</div>
      {post.caption && (
        <div className="px-4 pb-3 text-sm text-gray-800 leading-relaxed">
          <span className="font-semibold">{post.pet_name} </span>
          {post.caption}
        </div>
      )}

      {showComments && (
        <CommentsModal
          post={post}
          onClose={() => { setShowComments(false); supabase.from('post_comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id).then(({ count }) => setCommentCount(count || 0)) }}
        />
      )}
    </div>
  )
}

export default function Feed() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [viewingProfile, setViewingProfile] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchPosts()
    fetchProfile()
    fetchUnreadCount()
  }, [])

  async function fetchProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) setProfile(data)
  }

  async function fetchUnreadCount() {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)
    setUnreadCount(count || 0)
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
    if (!window.confirm('¿Eliminar este post?')) return
    await supabase.from('posts').delete().eq('id', postId)
    if (imageUrl) {
      const path = imageUrl.split('/posts/')[1]
      if (path) await supabase.storage.from('posts').remove([path])
    }
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐾</span>
          <span className="text-lg font-bold text-gray-900">PetSocial</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSearch(true)}
            className="border-0 bg-transparent cursor-pointer text-gray-500"
          >
            <Search size={22} />
          </button>
          <button
            onClick={() => { setShowNotifications(true); setUnreadCount(0) }}
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

      <div className="flex-1 overflow-y-auto bg-ps-bg">
        <StoriesBar profile={profile} />
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
            ¿Qué está haciendo {profile?.pet_name || 'tu mascota'}? 🐾
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
            <p className="text-sm">Cargando posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
            <span className="text-4xl">📸</span>
            <p className="text-sm">No hay posts todavía</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-xs font-semibold px-4 py-2 rounded-full border-0 cursor-pointer"
              style={{ background: '#EDE9FE', color: '#7C3AED' }}
            >
              ¡Sé el primero en publicar!
            </button>
          </div>
        ) : (
          posts.map(p => <Post key={p.id} post={p} currentUserId={user.id} onViewProfile={setViewingProfile} onDelete={deletePost} />)
        )}
      </div>

      {showSearch && (
        <SearchPanel onClose={() => setShowSearch(false)} onViewProfile={setViewingProfile} />
      )}

      {viewingProfile && viewingProfile !== user.id && (
        <div className="absolute inset-0 z-40 bg-ps-bg flex flex-col">
          <PerfilPublico userId={viewingProfile} onBack={() => setViewingProfile(null)} />
        </div>
      )}

      {showNotifications && (
        <Notifications onClose={() => setShowNotifications(false)} />
      )}

      {showCreate && (
        <CreatePostModal profile={profile} onClose={() => setShowCreate(false)} onCreate={handleNewPost} />
      )}
    </div>
  )
}