import React, { useState, useEffect } from 'react'
import { Search, Bell, Plus, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Trash2 } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import CreatePostModal from '../components/CreatePostModal'
import StoriesBar from '../components/StoriesBar'
import Notifications from '../components/Notifications'
import PerfilPublico from './PerfilPublico'
import CommentsModal from '../components/CommentsModal'

function Post({ post, currentUserId, onViewProfile, onDelete }) {
  const [liked, setLiked] = useState(post.liked)
  const [likes, setLikes] = useState(post.likes)
  const [showComments, setShowComments] = useState(false)
  const [commentCount, setCommentCount] = useState(0)

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

      {post.image_url ? (
        <div className="w-full" style={{ height: 300 }}>
          <img src={post.image_url} alt="post" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full flex items-center justify-center" style={{ height: 200, background: '#EDE9FE', fontSize: 80 }}>
          {post.pet_emoji || '🐕'}
        </div>
      )}

      <div className="px-4 pt-2.5 pb-1 flex items-center gap-4">
        <button
          onClick={toggleLike}
          className="border-0 bg-transparent p-0 cursor-pointer flex items-center gap-1 text-sm"
          style={{ color: liked ? '#EC4899' : '#9CA3AF' }}
          aria-label="Me gusta"
        >
          <Heart size={22} fill={liked ? '#EC4899' : 'none'} />
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
        <button className="border-0 bg-transparent p-0 cursor-pointer text-gray-400 ml-auto">
          <Bookmark size={20} />
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
      const countMap = {}
      allLikes?.forEach(l => { countMap[l.post_id] = (countMap[l.post_id] || 0) + 1 })
      setPosts(data.map(p => ({ ...p, liked: likedIds.includes(p.id), likes: countMap[p.id] || 0 })))
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
          <button className="border-0 bg-transparent cursor-pointer text-gray-500" aria-label="Buscar">
            <Search size={22} />
          </button>
          <button
            onClick={() => { setShowNotifications(true); setUnreadCount(0) }}
            className="border-0 bg-transparent cursor-pointer text-gray-500 relative"
            aria-label="Notificaciones"
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
            aria-label="Crear post"
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