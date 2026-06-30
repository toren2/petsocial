import React, { useState, useEffect, useRef } from 'react'
import { X, Send, Heart } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { notifyComment } from '../notifications'

export default function CommentsModal({ post, onClose }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [profile, setProfile] = useState(null)
  const [replyingTo, setReplyingTo] = useState(null)
  const [likedComments, setLikedComments] = useState([])
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    fetchComments()
    fetchProfile()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  useEffect(() => {
    if (replyingTo) inputRef.current?.focus()
  }, [replyingTo])

  async function fetchProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('pet_name, emoji, avatar_url')
      .eq('id', user.id)
      .single()
    if (data) setProfile(data)
  }

  async function fetchComments() {
    setLoading(true)
    const { data } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    if (data) setComments(data)

    const { data: likes } = await supabase
      .from('comment_likes')
      .select('comment_id')
      .eq('user_id', user.id)
    if (likes) setLikedComments(likes.map(l => l.comment_id))

    setLoading(false)
  }

  async function sendComment() {
    const text = input.trim()
    if (!text) return
    setSending(true)
    setInput('')
    const { data, error } = await supabase
      .from('post_comments')
      .insert([{
        post_id: post.id,
        user_id: user.id,
        pet_name: profile?.pet_name || 'Mascota',
        pet_emoji: profile?.emoji || '🐕',
        avatar_url: profile?.avatar_url || null,
        text,
        parent_id: replyingTo?.id || null,
      }])
      .select()
    if (!error && data) {
      setComments(prev => [...prev, data[0]])
      await notifyComment(post.user_id, user.id, profile?.pet_name || 'Alguien', post.id)
    }
    setReplyingTo(null)
    setSending(false)
  }

  async function toggleLikeComment(comment) {
    const isLiked = likedComments.includes(comment.id)
    const newLikes = isLiked ? comment.likes - 1 : comment.likes + 1

    setLikedComments(prev =>
      isLiked ? prev.filter(id => id !== comment.id) : [...prev, comment.id]
    )
    setComments(prev => prev.map(c => c.id === comment.id ? { ...c, likes: newLikes } : c))

    if (isLiked) {
      await supabase.from('comment_likes').delete().eq('comment_id', comment.id).eq('user_id', user.id)
      await supabase.from('post_comments').update({ likes: newLikes }).eq('id', comment.id)
    } else {
      await supabase.from('comment_likes').insert([{ comment_id: comment.id, user_id: user.id }])
      await supabase.from('post_comments').update({ likes: newLikes }).eq('id', comment.id)
    }
  }

  const topComments = comments.filter(c => !c.parent_id)
  const replies = (parentId) => comments.filter(c => c.parent_id === parentId)

  function CommentItem({ c, isReply = false }) {
    const isLiked = likedComments.includes(c.id)
    return (
      <div className={`flex gap-3 mb-3 ${isReply ? 'ml-10' : ''}`}>
        <div className="w-8 h-8 rounded-full bg-ps-purple-light flex items-center justify-center overflow-hidden flex-shrink-0">
          {c.avatar_url ? (
            <img src={c.avatar_url} alt={c.pet_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm">{c.pet_emoji || '🐕'}</span>
          )}
        </div>
        <div className="flex-1">
          <div className="text-sm">
            <span className="font-semibold text-gray-900">{c.pet_name} </span>
            <span className="text-gray-700">{c.text}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-400">
              {new Date(c.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
            {!isReply && (
              <button
                onClick={() => setReplyingTo(replyingTo?.id === c.id ? null : c)}
                className="text-xs font-semibold text-gray-400 border-0 bg-transparent cursor-pointer"
              >
                Responder
              </button>
            )}
          </div>
          {replies(c.id).length > 0 && (
            <div className="mt-2">
              {replies(c.id).map(r => <CommentItem key={r.id} c={r} isReply />)}
            </div>
          )}
        </div>
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => toggleLikeComment(c)}
            className="border-0 bg-transparent cursor-pointer p-0"
          >
            <Heart size={14} fill={isLiked ? '#EC4899' : 'none'} color={isLiked ? '#EC4899' : '#9CA3AF'} />
          </button>
          {c.likes > 0 && (
            <span className="text-[10px] text-gray-400">{c.likes}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 bg-black/50 z-50 flex flex-col justify-end">
      <div className="bg-white rounded-t-3xl flex flex-col" style={{ maxHeight: '80%' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-gray-900 text-lg">Comentarios</h3>
          <button onClick={onClose} className="border-0 bg-transparent cursor-pointer text-gray-400">
            <X size={22} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-ps-purple-light flex items-center justify-center overflow-hidden flex-shrink-0">
              {post.avatar_url ? (
                <img src={post.avatar_url} alt={post.pet_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm">{post.pet_emoji || '🐕'}</span>
              )}
            </div>
            <div>
              <span className="font-semibold text-sm text-gray-900">{post.pet_name} </span>
              <span className="text-sm text-gray-600">{post.caption}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="text-center text-sm text-gray-400 py-4">Cargando...</div>
          ) : topComments.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-8">
              <p className="text-2xl mb-2">💬</p>
              <p>Sin comentarios todavía</p>
              <p className="text-xs mt-1">¡Sé el primero en comentar!</p>
            </div>
          ) : (
            topComments.map(c => <CommentItem key={c.id} c={c} />)
          )}
          <div ref={bottomRef} />
        </div>

        {replyingTo && (
          <div className="px-5 py-2 bg-ps-bg border-t border-gray-100 flex items-center justify-between flex-shrink-0">
            <span className="text-xs text-gray-500">
              Respondiendo a <span className="font-semibold text-ps-purple">{replyingTo.pet_name}</span>
            </span>
            <button onClick={() => setReplyingTo(null)} className="border-0 bg-transparent cursor-pointer text-gray-400">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-ps-purple-light flex items-center justify-center overflow-hidden flex-shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm">{profile?.emoji || '🐕'}</span>
            )}
          </div>
          <input
            ref={inputRef}
            className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm outline-none bg-ps-bg"
            placeholder={replyingTo ? `Responder a ${replyingTo.pet_name}...` : 'Agrega un comentario...'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendComment()}
          />
          <button
            onClick={sendComment}
            disabled={sending || !input.trim()}
            className="flex items-center justify-center rounded-full border-0 cursor-pointer flex-shrink-0"
            style={{ width: 36, height: 36, background: input.trim() ? '#7C3AED' : '#EDE9FE' }}
          >
            <Send size={16} color={input.trim() ? 'white' : '#C4B5FD'} />
          </button>
        </div>
      </div>
    </div>
  )
}