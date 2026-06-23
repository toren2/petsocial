import React, { useState, useEffect, useRef } from 'react'
import { X, Send } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'

export default function CommentsModal({ post, onClose }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [profile, setProfile] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    fetchComments()
    fetchProfile()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

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
      }])
      .select()
    if (!error && data) setComments(prev => [...prev, data[0]])
    setSending(false)
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

        {/* Post preview */}
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

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="text-center text-sm text-gray-400 py-4">Cargando...</div>
          ) : comments.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-8">
              <p className="text-2xl mb-2">💬</p>
              <p>Sin comentarios todavía</p>
              <p className="text-xs mt-1">¡Sé el primero en comentar!</p>
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-3 mb-4">
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
                  <div className="text-xs text-gray-400 mt-0.5">
                    {new Date(c.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-ps-purple-light flex items-center justify-center overflow-hidden flex-shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm">{profile?.emoji || '🐕'}</span>
            )}
          </div>
          <input
            className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm outline-none bg-ps-bg"
            placeholder="Agrega un comentario..."
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