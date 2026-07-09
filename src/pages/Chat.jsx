import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Send, Image, Smile, Trash2, X } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { notifyMessage } from '../notifications'
import PerfilPublico from './PerfilPublico'
import UserActionsMenu from '../components/UserActionsMenu'
import VerifiedBadge from '../components/VerifiedBadge'
import { useLanguage } from '../LanguageContext'

function ConversationList({ onOpen }) {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => { fetchMatches() }, [])

  async function fetchMatches() {
    setLoading(true)
    const { data } = await supabase
      .from('matches')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (data && data.length > 0) {
      const otherIds = data.map(m => m.user1_id === user.id ? m.user2_id : m.user1_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, pet_name, emoji, breed, location, avatar_url')
        .in('id', otherIds)

      const { data: verifiedRows } = await supabase
        .from('verification_requests')
        .select('user_id')
        .in('user_id', otherIds)
        .eq('status', 'aprobado')
      const verifiedIds = new Set(verifiedRows?.map(v => v.user_id) || [])

      const matchesWithProfiles = data.map(m => {
        const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id
        const profile = profiles?.find(p => p.id === otherId)
        return { ...m, otherId, profile, verified: verifiedIds.has(otherId) }
      })
      setMatches(matchesWithProfiles)
    }
    setLoading(false)
  }

  async function deleteConversation(matchId) {
  const match = matches.find(m => m.id === matchId)
  if (!match) return
  await supabase.from('messages').delete().or(`and(sender_id.eq.${user.id},receiver_id.eq.${match.otherId}),and(sender_id.eq.${match.otherId},receiver_id.eq.${user.id})`)
  await supabase.from('matches').delete().eq('id', matchId)
  setMatches(prev => prev.filter(m => m.id !== matchId))
  setDeletingId(null)
}

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-900">{t('chat.messages')}</h2>
      </div>
      <div className="flex-1 overflow-y-auto bg-ps-bg">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
            <span className="text-4xl">🐾</span>
            <p className="text-sm">{t('chat.loadingMessages')}</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
            <span className="text-4xl">💬</span>
            <p className="text-sm">{t('chat.noMatchesYet')}</p>
            <p className="text-xs text-center px-8">{t('chat.noMatchesBody')}</p>
          </div>
        ) : (
          matches.map(match => (
            <div key={match.id} className="flex items-center border-b border-gray-100 bg-white">
              <div
                onClick={() => onOpen(match)}
                className="flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-gray-50 flex-1 min-w-0"
              >
                <div className="w-12 h-12 rounded-full bg-ps-purple-light flex items-center justify-center text-2xl overflow-hidden flex-shrink-0">
                  {match.profile?.avatar_url ? (
                    <img src={match.profile.avatar_url} alt={match.profile.pet_name} className="w-full h-full object-cover" />
                  ) : (
                    match.profile?.emoji || '🐕'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-900 flex items-center gap-1">
                    {match.profile?.pet_name || t('chat.pet')} <VerifiedBadge verified={match.verified} size={13} />
                  </div>
                  <div className="text-xs text-gray-400 truncate mt-0.5">
                    {match.profile?.breed} · {match.profile?.location}
                  </div>
                </div>
                <div className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(match.created_at).toLocaleDateString(language, { day: 'numeric', month: 'short' })}
                </div>
              </div>
              <button
                onClick={() => setDeletingId(match.id)}
                className="border-0 bg-transparent cursor-pointer px-4 py-3.5 text-gray-300 active:text-red-400"
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))
        )}
      </div>

      {deletingId && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-3xl w-full p-6 flex flex-col gap-4">
            <h3 className="font-bold text-gray-900 text-lg">{t('chat.deleteConversationTitle')}</h3>
            <p className="text-sm text-gray-500">{t('chat.deleteConversationBody')}</p>
            <button
              onClick={() => deleteConversation(deletingId)}
              className="w-full py-3 rounded-full font-semibold text-white border-0 cursor-pointer"
              style={{ background: '#EF4444' }}
            >
              {t('chat.deleteConversation')}
            </button>
            <button
              onClick={() => setDeletingId(null)}
              className="w-full py-3 rounded-full font-semibold border-0 cursor-pointer"
              style={{ background: '#F3F4F6', color: '#6B7280' }}
            >
              {t('chat.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Conversation({ match, onBack }) {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewingProfile, setViewingProfile] = useState(null)
  const [selectedMsg, setSelectedMsg] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchMessages()
    const subscription = supabase
      .channel(`messages:${match.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, payload => {
        setMsgs(prev => [...prev, payload.new])
      })
      .subscribe()
    return () => supabase.removeChannel(subscription)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  async function fetchMessages() {
    setLoading(true)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${match.otherId}),and(sender_id.eq.${match.otherId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
    if (data) setMsgs(data)
    setLoading(false)
  }

  async function sendMsg() {
    const text = input.trim()
    if (!text) return
    setInput('')
    const { data, error } = await supabase
      .from('messages')
      .insert([{ sender_id: user.id, receiver_id: match.otherId, text }])
      .select()
    if (!error && data) {
      setMsgs(prev => [...prev, data[0]])
      const { data: myProfile } = await supabase.from('profiles').select('pet_name').eq('id', user.id).single()
      await notifyMessage(match.otherId, myProfile?.pet_name || 'Una mascota')
    }
  }

  async function sendImage(file) {
    if (!file) return
    setUploadingImage(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('chat').upload(path, file)
    if (uploadError) { setUploadingImage(false); return }
    const { data: { publicUrl } } = supabase.storage.from('chat').getPublicUrl(path)
    const { data, error } = await supabase
      .from('messages')
      .insert([{ sender_id: user.id, receiver_id: match.otherId, text: '', image_url: publicUrl }])
      .select()
    if (!error && data) setMsgs(prev => [...prev, data[0]])
    setUploadingImage(false)
  }

  async function deleteMessage(msgId) {
    await supabase.from('messages').delete().eq('id', msgId)
    setMsgs(prev => prev.filter(m => m.id !== msgId))
    setSelectedMsg(null)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <button onClick={onBack} className="border-0 bg-transparent cursor-pointer text-ps-purple">
          <ArrowLeft size={22} />
        </button>
        <div
          className="w-10 h-10 rounded-full bg-ps-purple-light flex items-center justify-center text-xl flex-shrink-0 overflow-hidden cursor-pointer"
          onClick={() => setViewingProfile(match.otherId)}
        >
          {match.profile?.avatar_url ? (
            <img src={match.profile.avatar_url} alt={match.profile.pet_name} className="w-full h-full object-cover" />
          ) : (
            match.profile?.emoji || '🐕'
          )}
        </div>
        <div className="flex-1 cursor-pointer" onClick={() => setViewingProfile(match.otherId)}>
          <div className="font-semibold text-gray-900 text-base flex items-center gap-1">
            {match.profile?.pet_name || t('chat.pet')} <VerifiedBadge verified={match.verified} size={14} />
          </div>
          <div className="text-xs text-gray-400">{match.profile?.breed}</div>
        </div>
        <UserActionsMenu
          targetUserId={match.otherId}
          targetPetName={match.profile?.pet_name}
          matchId={match.id}
          onBlocked={onBack}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2.5 bg-ps-bg">
        <div
          className="flex items-center gap-2 rounded-xl p-3 text-sm font-semibold mb-2"
          style={{ background: 'linear-gradient(90deg, #EDE9FE, #FCE7F3)', color: '#7C3AED' }}
        >
          <span>🐾</span>
          <span>{t('chat.matchBanner')}</span>
        </div>

        {loading ? (
          <div className="text-center text-sm text-gray-400 py-4">{t('chat.loadingConversation')}</div>
        ) : msgs.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-4">{t('chat.sayHi')}</div>
        ) : (
          msgs.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender_id === user.id ? 'items-end' : 'items-start'}`}
            >
              {msg.image_url ? (
                <div
                  className="max-w-[75%] rounded-2xl overflow-hidden cursor-pointer"
                  onClick={() => msg.sender_id === user.id && setSelectedMsg(selectedMsg === msg.id ? null : msg.id)}
                >
                  <img src={msg.image_url} alt="foto" className="w-full h-auto max-h-64 object-cover" />
                </div>
              ) : (
                <div
                  className="max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed cursor-pointer"
                  style={{
                    background: msg.sender_id === user.id ? '#7C3AED' : 'white',
                    color: msg.sender_id === user.id ? 'white' : '#1E1B4B',
                    borderBottomRightRadius: msg.sender_id === user.id ? 4 : 16,
                    borderBottomLeftRadius: msg.sender_id === user.id ? 16 : 4,
                    border: msg.sender_id !== user.id ? '1px solid #E5E7EB' : 'none',
                  }}
                  onClick={() => msg.sender_id === user.id && setSelectedMsg(selectedMsg === msg.id ? null : msg.id)}
                >
                  {msg.text}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1 px-1">
                <span className="text-[10px] text-gray-400">
                  {new Date(msg.created_at).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}
                </span>
                {selectedMsg === msg.id && msg.sender_id === user.id && (
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer"
                    style={{ background: '#FEE2E2', color: '#EF4444' }}
                  >
                    <Trash2 size={10} /> {t('chat.deleteMsg')}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        {uploadingImage && (
          <div className="flex items-end justify-end">
            <div className="px-4 py-2.5 rounded-2xl text-sm text-white" style={{ background: '#7C3AED' }}>
              {t('chat.sendingImage')}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-t border-gray-100 flex-shrink-0">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="hidden"
          onChange={e => sendImage(e.target.files[0])}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="border-0 bg-transparent cursor-pointer text-gray-400"
        >
          <Image size={20} />
        </button>
        <input
          className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm outline-none bg-ps-bg"
          placeholder={t('chat.messagePlaceholder')}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMsg()}
        />
        <button className="border-0 bg-transparent cursor-pointer text-gray-400">
          <Smile size={20} />
        </button>
        <button
          onClick={sendMsg}
          className="flex items-center justify-center rounded-full bg-ps-purple border-0 cursor-pointer text-white flex-shrink-0"
          style={{ width: 36, height: 36 }}
        >
          <Send size={16} />
        </button>
      </div>

      {viewingProfile && (
        <div className="absolute inset-0 z-40 bg-ps-bg flex flex-col">
          <PerfilPublico userId={viewingProfile} onBack={() => setViewingProfile(null)} />
        </div>
      )}
    </div>
  )
}

export default function Chat() {
  const [activeChat, setActiveChat] = useState(null)
  if (activeChat) return <Conversation match={activeChat} onBack={() => setActiveChat(null)} />
  return <ConversationList onOpen={setActiveChat} />
}