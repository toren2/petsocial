import React, { useState, useEffect } from 'react'
import { Search, Bell, Plus, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import CreatePostModal from '../components/CreatePostModal'

function StoryCircle({ name, avatarUrl, emoji, color, bg, mine, onPress }) {
  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0" onClick={onPress}>
      <div
        className="rounded-full p-0.5"
        style={{ border: mine ? '2px dashed #D1D5DB' : `2px solid ${color || '#7C3AED'}` }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl overflow-hidden"
          style={{ background: bg || '#EDE9FE' }}
        >
          {mine ? (
            <Plus size={22} className="text-gray-400" />
          ) : avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            emoji || '🐕'
          )}
        </div>
      </div>
      <span className="text-[10px] text-gray-500 max-w-[52px] text-center truncate">
        {mine ? 'Tu historia' : name}
      </span>
    </div>
  )
}

function Post({ post, currentUserId, onLike }) {
  const [liked, setLiked] = useState(post.liked)
  const [likes, setLikes] = useState(post.likes)

  async function toggleLike() {
    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', currentUserId)
      await supabase.from('posts').update({ likes: likes - 1 }).eq('id', post.id)
      setLikes(l => l - 1)
    } else {
      await supabase.from('post_likes').insert([{ post_id: post.id, user_id: currentUserId }])
      await supabase.from('posts').update({ likes: likes + 1 }).eq('id', post.id)
      setLikes(l => l + 1)
    }
    setLiked(l => !l)
  }

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="w-10 h-10 rounded-full bg-ps-purple-light flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
          {post.avatar_url ? (
            <img src={post.avatar_url} alt={post.pet_name} className="w-full h-full object-cover" />
          ) : (
            post.pet_emoji || '🐕'
          )}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm text-gray-900">{post.pet_name}</div>
          <div className="text-xs text-gray-400">
            {post.pet_breed} · {new Date(post.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
          </div>
        </div>
        <button className="border-0 bg-transparent p-1 cursor-pointer text-gray-400">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {post.image_url && (
        <div className="w-full" style={{ height: 300 }}>
          <img src={post.image_url} alt="post" className="w-full h-full object-cover" />
        </div>
      )}

      {!post.image_url && (
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
        <button className="border-0 bg-transparent p-0 cursor-pointer flex items-center gap-1 text-sm text-gray-400">
          <MessageCircle size={22} />
        </button>
        <button className="border-0 bg-transparent p-0 cursor-pointer text-gray-400">
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
    </div>
  )
}

export default function Feed() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [profile, setProfile] = useState(null)
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    fetchPosts()
    fetchProfile()
    fetchMatches()
  }, [])

  async function fetchProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (data) setProfile(data)
  }

  async function fetchMatches() {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .limit(5)

    if (data && data.length > 0) {
      const otherIds = data.map(m => m.user1_id === user.id ? m.user2_id : m.user1_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, pet_name, emoji, avatar_url')
        .in('id', otherIds)
      if (profiles) setMatches(profiles)
    }
  }

  async function fetchPosts() {
    setLoading(true)
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      const { data: likes } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id)

      const likedIds = likes?.map(l => l.post_id) || []
      setPosts(data.map(p => ({ ...p, liked: likedIds.includes(p.id) })))
    }
    setLoading(false)
  }

  function handleNewPost(post) {
    setPosts(prev => [{ ...post, liked: false }, ...prev])
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐾</span>
          <span className="text-lg font-bold text-gray-900">PetSocial</span>
        </div>
        <div className="flex gap-3">
          <button className="border-0 bg-transparent cursor-pointer text-gray-500" aria-label="Buscar">
            <Search size={22} />
          </button>
          <button className="border-0 bg-transparent cursor-pointer text-gray-500 relative" aria-label="Notificaciones">
            <Bell size={22} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-ps-pink rounded-full border border-white" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-ps-bg">
        {/* Stories */}
        <div className="flex gap-3 px-4 py-3 bg-white border-b border-gray-100 overflow-x-auto">
          <StoryCircle
            mine
            name="Tu historia"
            onPress={() => setShowCreate(true)}
          />
          {matches.map(m => (
            <StoryCircle
              key={m.id}
              name={m.pet_name}
              avatarUrl={m.avatar_url}
              emoji={m.emoji}
              color="#7C3AED"
              bg="#EDE9FE"
            />
          ))}
        </div>

        {/* Botón crear post */}
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
          posts.map(p => (
            <Post key={p.id} post={p} currentUserId={user.id} />
          ))
        )}
      </div>

      {showCreate && (
        <CreatePostModal
          profile={profile}
          onClose={() => setShowCreate(false)}
          onCreate={handleNewPost}
        />
      )}
    </div>
  )
}