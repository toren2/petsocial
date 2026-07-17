import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, Share2, Bookmark, Trash2 } from 'lucide-react'
import { supabase } from '../supabase'
import { useLanguage } from '../LanguageContext'
import CommentsModal from './CommentsModal'
import { notifyLike } from '../notifications'

// Extraido de Feed.jsx para poder reutilizar la tarjeta completa de post
// (con likes/comentarios/guardar) en otras pantallas -- ej. Perfil.jsx al
// ver "mis publicaciones", que antes usaba una galeria simple sin esas
// interacciones.

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

export default function PostCard({ post, currentUserId, myPetName, onViewProfile, onDelete, autoOpenComments = false }) {
  const { t, language } = useLanguage()
  const [liked, setLiked] = useState(post.liked)
  const [likes, setLikes] = useState(post.likes)
  const [showComments, setShowComments] = useState(false)
  const [commentCount, setCommentCount] = useState(0)
  const [saved, setSaved] = useState(post.saved || false)
  const [showPaw, setShowPaw] = useState(false)
  const lastTapRef = useRef(0)

  useEffect(() => {
    if (autoOpenComments) setShowComments(true)
  }, [autoOpenComments])

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
      await notifyLike(post.user_id, currentUserId, myPetName || t('feed.someone'), post.id)
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
      await navigator.share({ title: `${post.pet_name} ${t('feed.shareOn')}`, text: post.caption || '', url })
    } else {
      await navigator.clipboard.writeText(url)
      alert(t('feed.linkCopied'))
    }
  }

  return (
    <div id={`post-${post.id}`} className="bg-white border-b border-gray-100">
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
            {post.pet_breed} · {new Date(post.created_at).toLocaleDateString(language, { day: 'numeric', month: 'short' })}
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

      <div
        className="w-full relative"
        style={{ height: post.image_url ? 300 : 200 }}
        onClick={handleDoubleTap}
      >
        {post.video_url ? (
          <video src={post.video_url} className="w-full h-full object-cover" controls playsInline />
        ) : post.image_url ? (
          <img src={post.image_url} alt="post" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: '#EDE9FE', fontSize: 80 }}>
            {post.pet_emoji || '🐕'}
          </div>
        )}
        {showPaw && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ animation: 'pawFade 0.9s ease-out forwards' }}
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

      <div className="px-4 pb-1 text-sm font-semibold text-gray-900">{likes} {t('feed.likes')}</div>
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
          onViewProfile={id => {
            setShowComments(false)
            onViewProfile(id)
          }}
        />
      )}
    </div>
  )
}
