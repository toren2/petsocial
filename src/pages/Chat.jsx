import React, { useState, useEffect, useRef, useMemo } from 'react'
import { ArrowLeft, Send, Image, Trash2, X, Check, CheckCheck, Mic, Paperclip, FileText, CornerUpLeft, Download } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { notifyMessage } from '../notifications'
import PerfilPublico from './PerfilPublico'
import UserActionsMenu from '../components/UserActionsMenu'
import VerifiedBadge from '../components/VerifiedBadge'
import { useLanguage } from '../LanguageContext'
import { usePullToRefresh } from '../usePullToRefresh'
import PullToRefreshIndicator from '../components/PullToRefreshIndicator'

function followLabel(following, follower, t) {
  if (following && follower) return { text: t('chat.followStatusFriends'), color: '#7C3AED' }
  if (following && !follower) return { text: t('chat.followStatusFollowing'), color: '#9CA3AF' }
  if (!following && follower) return { text: t('chat.followStatusFollowsYou'), color: '#9CA3AF' }
  return { text: t('chat.notFollowingBadge'), color: '#D97706' }
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function previewForMessage(msg, t) {
  if (msg.image_url) return t('chat.photoPreview')
  if (msg.audio_url) return t('chat.voiceNotePreview')
  if (msg.file_url) return `📄 ${msg.file_name || ''}`
  return msg.text
}

function ConversationList({ onOpen }) {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => { fetchThreads() }, [])

  async function fetchThreads() {
    setLoading(true)

    const { data: matchRows } = await supabase
      .from('matches')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

    const { data: msgRows } = await supabase
      .from('messages')
      .select('sender_id, receiver_id, created_at, text, image_url, audio_url, file_name, read')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    const byOther = {}
    ;(matchRows || []).forEach(m => {
      const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id
      byOther[otherId] = { otherId, matchId: m.id, lastActivity: m.created_at, lastMessage: null, unreadCount: 0 }
    })
    ;(msgRows || []).forEach(msg => {
      const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
      if (!byOther[otherId]) byOther[otherId] = { otherId, matchId: null, lastActivity: msg.created_at, lastMessage: null, unreadCount: 0 }
      const th = byOther[otherId]
      if (!th.lastMessage || new Date(msg.created_at) > new Date(th.lastActivity)) {
        th.lastActivity = msg.created_at
        th.lastMessage = msg
      }
      if (msg.receiver_id === user.id && !msg.read) th.unreadCount += 1
    })

    const threadList = Object.values(byOther)
    if (threadList.length === 0) { setThreads([]); setLoading(false); return }

    const otherIds = threadList.map(th => th.otherId)

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

    const { data: followingRows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in('following_id', otherIds)
    const followingSet = new Set(followingRows?.map(f => f.following_id) || [])

    const { data: followerRows } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', user.id)
      .in('follower_id', otherIds)
    const followerSet = new Set(followerRows?.map(f => f.follower_id) || [])

    const enriched = threadList
      .map(th => ({
        ...th,
        profile: profiles?.find(p => p.id === th.otherId),
        verified: verifiedIds.has(th.otherId),
        following: followingSet.has(th.otherId),
        follower: followerSet.has(th.otherId),
      }))
      .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))

    setThreads(enriched)
    setLoading(false)
  }

  async function deleteConversation(otherId) {
    const thread = threads.find(th => th.otherId === otherId)
    if (!thread) return
    await supabase.from('messages').delete().or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`)
    if (thread.matchId) await supabase.from('matches').delete().eq('id', thread.matchId)
    setThreads(prev => prev.filter(th => th.otherId !== otherId))
    setDeletingId(null)
  }

  const { containerRef: threadsScrollRef, pullDistance, refreshing, threshold } = usePullToRefresh(fetchThreads)

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-900">{t('chat.messages')}</h2>
      </div>
      <div ref={threadsScrollRef} className="flex-1 overflow-y-auto bg-ps-bg">
        <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} threshold={threshold} />
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
            <span className="text-4xl">🐾</span>
            <p className="text-sm">{t('chat.loadingMessages')}</p>
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
            <span className="text-4xl">💬</span>
            <p className="text-sm">{t('chat.noMatchesYet')}</p>
            <p className="text-xs text-center px-8">{t('chat.noMatchesBody')}</p>
          </div>
        ) : (
          threads.map(th => {
            const badge = followLabel(th.following, th.follower, t)
            const unread = th.unreadCount > 0
            const preview = th.lastMessage
              ? `${th.lastMessage.sender_id === user.id ? t('chat.youPrefix') : ''}${previewForMessage(th.lastMessage, t)}`
              : t('chat.noMessagesYet')
            return (
            <div
              key={th.otherId}
              className="flex items-center border-b border-gray-100"
              style={{ background: unread ? '#FAF5FF' : 'white' }}
            >
              <div
                onClick={() => onOpen(th)}
                className="flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-gray-50 flex-1 min-w-0"
              >
                <div className="w-12 h-12 rounded-full bg-ps-purple-light flex items-center justify-center text-2xl overflow-hidden flex-shrink-0">
                  {th.profile?.avatar_url ? (
                    <img src={th.profile.avatar_url} alt={th.profile.pet_name} className="w-full h-full object-cover" />
                  ) : (
                    th.profile?.emoji || '🐕'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm text-gray-900 flex items-center gap-1 ${unread ? 'font-bold' : 'font-semibold'}`}>
                    {th.profile?.pet_name || t('chat.pet')} <VerifiedBadge verified={th.verified} size={13} />
                  </div>
                  <div className={`text-xs truncate mt-0.5 ${unread ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>
                    {preview}
                  </div>
                  <div className="text-[10px] font-medium mt-0.5" style={{ color: badge.color }}>
                    {badge.text}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs text-gray-400">
                    {new Date(th.lastActivity).toLocaleDateString(language, { day: 'numeric', month: 'short' })}
                  </span>
                  {unread && (
                    <span
                      className="flex items-center justify-center rounded-full text-white text-[10px] font-bold"
                      style={{ background: '#7C3AED', minWidth: 18, height: 18, padding: '0 5px' }}
                    >
                      {th.unreadCount > 9 ? '9+' : th.unreadCount}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setDeletingId(th.otherId)}
                className="border-0 bg-transparent cursor-pointer px-4 py-3.5 text-gray-300 active:text-red-400"
              >
                <Trash2 size={17} />
              </button>
            </div>
            )
          })
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

function QuotedPreview({ msg, mine, t }) {
  if (!msg) return null
  return (
    <div
      className="rounded-lg px-2.5 py-1.5 mb-1.5 text-xs border-l-2"
      style={{
        background: mine ? 'rgba(255,255,255,0.15)' : '#F3F4F6',
        borderColor: mine ? 'rgba(255,255,255,0.6)' : '#7C3AED',
        color: mine ? 'rgba(255,255,255,0.9)' : '#4B5563',
      }}
    >
      <div className="truncate">{previewForMessage(msg, t)}</div>
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
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [replyTo, setReplyTo] = useState(null)
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [micError, setMicError] = useState(false)
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)
  const docInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingIntervalRef = useRef(null)

  const msgsById = useMemo(() => {
    const map = {}
    msgs.forEach(m => { map[m.id] = m })
    return map
  }, [msgs])

  useEffect(() => {
    fetchMessages()
    const subscription = supabase
      .channel(`messages:${match.otherId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, payload => {
        if (payload.new.sender_id !== match.otherId) return
        setMsgs(prev => [...prev, payload.new])
        supabase.from('messages').update({ read: true }).eq('id', payload.new.id)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${user.id}`,
      }, payload => {
        if (payload.new.receiver_id !== match.otherId) return
        setMsgs(prev => prev.map(m => m.id === payload.new.id ? { ...m, read: payload.new.read } : m))
      })
      .subscribe()
    return () => {
      supabase.removeChannel(subscription)
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    markIncomingAsRead()
  }

  async function markIncomingAsRead() {
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_id', match.otherId)
      .eq('receiver_id', user.id)
      .eq('read', false)
  }

  function clearReply() { setReplyTo(null) }

  async function sendMsg() {
    const text = input.trim()
    if (!text) return
    setInput('')
    const replyId = replyTo?.id || null
    clearReply()
    const { data, error } = await supabase
      .from('messages')
      .insert([{ sender_id: user.id, receiver_id: match.otherId, text, reply_to_id: replyId }])
      .select()
    if (!error && data) {
      setMsgs(prev => [...prev, data[0]])
      const { data: myProfile } = await supabase.from('profiles').select('pet_name').eq('id', user.id).single()
      await notifyMessage(match.otherId, myProfile?.pet_name || 'Una mascota', user.id)
    }
  }

  async function sendImage(file) {
    if (!file) return
    setUploadingImage(true)
    const replyId = replyTo?.id || null
    clearReply()
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('chat').upload(path, file)
    if (uploadError) { setUploadingImage(false); return }
    const { data: { publicUrl } } = supabase.storage.from('chat').getPublicUrl(path)
    const { data, error } = await supabase
      .from('messages')
      .insert([{ sender_id: user.id, receiver_id: match.otherId, text: '', image_url: publicUrl, reply_to_id: replyId }])
      .select()
    if (!error && data) setMsgs(prev => [...prev, data[0]])
    setUploadingImage(false)
  }

  async function sendFile(file) {
    if (!file) return
    setUploadingFile(true)
    const replyId = replyTo?.id || null
    clearReply()
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('chat').upload(path, file)
    if (uploadError) { setUploadingFile(false); return }
    const { data: { publicUrl } } = supabase.storage.from('chat').getPublicUrl(path)
    const { data, error } = await supabase
      .from('messages')
      .insert([{ sender_id: user.id, receiver_id: match.otherId, text: '', file_url: publicUrl, file_name: file.name, file_size: file.size, reply_to_id: replyId }])
      .select()
    if (!error && data) setMsgs(prev => [...prev, data[0]])
    setUploadingFile(false)
  }

  async function sendAudioBlob(blob) {
    setUploadingAudio(true)
    const replyId = replyTo?.id || null
    clearReply()
    const path = `${user.id}/${Date.now()}.webm`
    const { error: uploadError } = await supabase.storage.from('chat').upload(path, blob, { contentType: 'audio/webm' })
    if (uploadError) { setUploadingAudio(false); return }
    const { data: { publicUrl } } = supabase.storage.from('chat').getPublicUrl(path)
    const { data, error } = await supabase
      .from('messages')
      .insert([{ sender_id: user.id, receiver_id: match.otherId, text: '', audio_url: publicUrl, reply_to_id: replyId }])
      .select()
    if (!error && data) setMsgs(prev => [...prev, data[0]])
    setUploadingAudio(false)
  }

  async function startRecording() {
    setMicError(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach(tr => tr.stop())
        clearInterval(recordingIntervalRef.current)
        const shouldSend = mediaRecorderRef.current?._send
        if (shouldSend && audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          sendAudioBlob(blob)
        }
        setRecording(false)
        setRecordingSeconds(0)
      }
      recorder._send = false
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
      setRecordingSeconds(0)
      recordingIntervalRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch (e) {
      setMicError(true)
    }
  }

  function stopRecording(send) {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current._send = send
      mediaRecorderRef.current.stop()
    }
  }

  async function deleteMessage(msgId) {
    await supabase.from('messages').delete().eq('id', msgId)
    setMsgs(prev => prev.filter(m => m.id !== msgId))
    setSelectedMsg(null)
  }

  function startReply(msg) {
    setReplyTo(msg)
    setSelectedMsg(null)
  }

  function formatDuration(s) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
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
          matchId={match.matchId}
          onBlocked={onBack}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2.5 bg-ps-bg">
        {match.matchId ? (
          <div
            className="flex items-center gap-2 rounded-xl p-3 text-sm font-semibold mb-2"
            style={{ background: 'linear-gradient(90deg, #EDE9FE, #FCE7F3)', color: '#7C3AED' }}
          >
            <span>🐾</span>
            <span>{t('chat.matchBanner')}</span>
          </div>
        ) : (!match.following && !match.follower) && (
          <div
            className="flex items-center gap-2 rounded-xl p-3 text-xs font-medium mb-2"
            style={{ background: '#FEF3C7', color: '#92400E' }}
          >
            <span>⚠️</span>
            <span>{t('chat.notFollowingBanner')}</span>
          </div>
        )}

        {loading ? (
          <div className="text-center text-sm text-gray-400 py-4">{t('chat.loadingConversation')}</div>
        ) : msgs.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-4">{t('chat.sayHi')}</div>
        ) : (
          msgs.map(msg => {
            const mine = msg.sender_id === user.id
            const quoted = msg.reply_to_id ? msgsById[msg.reply_to_id] : null
            return (
            <div
              key={msg.id}
              className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
            >
              {msg.image_url ? (
                <div
                  className="max-w-[75%] rounded-2xl overflow-hidden cursor-pointer"
                  onClick={() => setSelectedMsg(selectedMsg === msg.id ? null : msg.id)}
                >
                  {quoted && <div className="px-2 pt-2"><QuotedPreview msg={quoted} mine={false} t={t} /></div>}
                  <img src={msg.image_url} alt="foto" className="w-full h-auto max-h-64 object-cover" />
                </div>
              ) : msg.audio_url ? (
                <div
                  className="max-w-[75%] px-3 py-2.5 rounded-2xl cursor-pointer"
                  style={{
                    background: mine ? '#7C3AED' : 'white',
                    borderBottomRightRadius: mine ? 4 : 16,
                    borderBottomLeftRadius: mine ? 16 : 4,
                    border: !mine ? '1px solid #E5E7EB' : 'none',
                  }}
                  onClick={() => setSelectedMsg(selectedMsg === msg.id ? null : msg.id)}
                >
                  {quoted && <QuotedPreview msg={quoted} mine={mine} t={t} />}
                  <audio controls src={msg.audio_url} style={{ width: 220, maxWidth: '100%', height: 32 }} />
                </div>
              ) : msg.file_url ? (
                <a
                  href={msg.file_url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => { e.stopPropagation(); setSelectedMsg(selectedMsg === msg.id ? null : msg.id) }}
                  className="max-w-[75%] px-3 py-2.5 rounded-2xl cursor-pointer flex flex-col gap-1 no-underline"
                  style={{
                    background: mine ? '#7C3AED' : 'white',
                    borderBottomRightRadius: mine ? 4 : 16,
                    borderBottomLeftRadius: mine ? 16 : 4,
                    border: !mine ? '1px solid #E5E7EB' : 'none',
                  }}
                >
                  {quoted && <QuotedPreview msg={quoted} mine={mine} t={t} />}
                  <div className="flex items-center gap-2">
                    <div
                      className="flex items-center justify-center rounded-lg flex-shrink-0"
                      style={{ width: 34, height: 34, background: mine ? 'rgba(255,255,255,0.2)' : '#EDE9FE' }}
                    >
                      <FileText size={16} color={mine ? 'white' : '#7C3AED'} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: mine ? 'white' : '#1E1B4B', maxWidth: 160 }}>
                        {msg.file_name || 'Documento'}
                      </div>
                      <div className="text-[10px] flex items-center gap-1" style={{ color: mine ? 'rgba(255,255,255,0.75)' : '#9CA3AF' }}>
                        <Download size={10} /> {formatFileSize(msg.file_size)}
                      </div>
                    </div>
                  </div>
                </a>
              ) : (
                <div
                  className="max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed cursor-pointer"
                  style={{
                    background: mine ? '#7C3AED' : 'white',
                    color: mine ? 'white' : '#1E1B4B',
                    borderBottomRightRadius: mine ? 4 : 16,
                    borderBottomLeftRadius: mine ? 16 : 4,
                    border: !mine ? '1px solid #E5E7EB' : 'none',
                  }}
                  onClick={() => setSelectedMsg(selectedMsg === msg.id ? null : msg.id)}
                >
                  {quoted && <QuotedPreview msg={quoted} mine={mine} t={t} />}
                  {msg.text}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1 px-1">
                <span className="text-[10px] text-gray-400">
                  {new Date(msg.created_at).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}
                </span>
                {mine && (
                  msg.read ? (
                    <CheckCheck size={13} color="#7C3AED" />
                  ) : (
                    <Check size={13} className="text-gray-300" />
                  )
                )}
                {selectedMsg === msg.id && (
                  <>
                    <button
                      onClick={() => startReply(msg)}
                      className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer"
                      style={{ background: '#EDE9FE', color: '#7C3AED' }}
                    >
                      <CornerUpLeft size={10} /> {t('chat.replyMsg')}
                    </button>
                    {mine && (
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer"
                        style={{ background: '#FEE2E2', color: '#EF4444' }}
                      >
                        <Trash2 size={10} /> {t('chat.deleteMsg')}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            )
          })
        )}
        {uploadingImage && (
          <div className="flex items-end justify-end">
            <div className="px-4 py-2.5 rounded-2xl text-sm text-white" style={{ background: '#7C3AED' }}>
              {t('chat.sendingImage')}
            </div>
          </div>
        )}
        {uploadingAudio && (
          <div className="flex items-end justify-end">
            <div className="px-4 py-2.5 rounded-2xl text-sm text-white" style={{ background: '#7C3AED' }}>
              {t('chat.sendingVoiceNote')}
            </div>
          </div>
        )}
        {uploadingFile && (
          <div className="flex items-end justify-end">
            <div className="px-4 py-2.5 rounded-2xl text-sm text-white" style={{ background: '#7C3AED' }}>
              {t('chat.sendingFile')}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {replyTo && !recording && (
        <div className="flex items-center gap-2 px-4 py-2 bg-white border-t border-gray-100 flex-shrink-0">
          <CornerUpLeft size={14} color="#7C3AED" className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold" style={{ color: '#7C3AED' }}>
              {t('chat.replyingTo', { name: replyTo.sender_id === user.id ? (t('chat.youPrefix') || '').replace(':', '').trim() : (match.profile?.pet_name || t('chat.pet')) })}
            </div>
            <div className="text-xs text-gray-500 truncate">{previewForMessage(replyTo, t)}</div>
          </div>
          <button onClick={clearReply} className="border-0 bg-transparent cursor-pointer text-gray-400 flex-shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      {recording ? (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-t border-gray-100 flex-shrink-0">
          <button
            onClick={() => stopRecording(false)}
            className="flex items-center justify-center rounded-full border-0 cursor-pointer text-white flex-shrink-0"
            style={{ width: 36, height: 36, background: '#9CA3AF' }}
          >
            <Trash2 size={16} />
          </button>
          <div className="flex-1 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#EF4444', animation: 'pulseRec 1s infinite' }} />
            <span className="text-sm font-medium text-gray-700">{t('chat.recording')} {formatDuration(recordingSeconds)}</span>
          </div>
          <style>{`@keyframes pulseRec { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }`}</style>
          <button
            onClick={() => stopRecording(true)}
            className="flex items-center justify-center rounded-full bg-ps-purple border-0 cursor-pointer text-white flex-shrink-0"
            style={{ width: 36, height: 36 }}
          >
            <Send size={16} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-t border-gray-100 flex-shrink-0">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={e => sendImage(e.target.files[0])}
          />
          <input
            type="file"
            ref={docInputRef}
            className="hidden"
            onChange={e => sendFile(e.target.files[0])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="border-0 bg-transparent cursor-pointer text-gray-400 flex-shrink-0"
          >
            <Image size={20} />
          </button>
          <button
            onClick={() => docInputRef.current?.click()}
            className="border-0 bg-transparent cursor-pointer text-gray-400 flex-shrink-0"
          >
            <Paperclip size={20} />
          </button>
          <input
            className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm outline-none bg-ps-bg min-w-0"
            placeholder={t('chat.messagePlaceholder')}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMsg()}
          />
          {input.trim() ? (
            <button
              onClick={sendMsg}
              className="flex items-center justify-center rounded-full bg-ps-purple border-0 cursor-pointer text-white flex-shrink-0"
              style={{ width: 36, height: 36 }}
            >
              <Send size={16} />
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="flex items-center justify-center rounded-full border-0 cursor-pointer text-white flex-shrink-0"
              style={{ width: 36, height: 36, background: '#7C3AED' }}
            >
              <Mic size={16} />
            </button>
          )}
        </div>
      )}
      {micError && (
        <div className="px-4 py-1.5 bg-white text-center text-[11px] text-red-500 flex-shrink-0">
          {t('chat.micPermissionDenied')}
        </div>
      )}

      {viewingProfile && (
        <div className="absolute inset-0 z-40 bg-ps-bg flex flex-col">
          <PerfilPublico userId={viewingProfile} onBack={() => setViewingProfile(null)} />
        </div>
      )}
    </div>
  )
}

export default function Chat({ initialUserId, onConsumeInitialUser }) {
  const { user } = useAuth()
  const [activeChat, setActiveChat] = useState(null)

  useEffect(() => {
    if (!initialUserId) return
    openThreadWith(initialUserId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUserId])

  async function openThreadWith(otherId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, pet_name, emoji, breed, location, avatar_url')
      .eq('id', otherId)
      .single()

    const { data: verifiedRow } = await supabase
      .from('verification_requests')
      .select('id')
      .eq('user_id', otherId)
      .eq('status', 'aprobado')
      .maybeSingle()

    const { data: matchRow } = await supabase
      .from('matches')
      .select('id, created_at')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherId}),and(user1_id.eq.${otherId},user2_id.eq.${user.id})`)
      .maybeSingle()

    const { data: followingRow } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', otherId)
      .maybeSingle()

    const { data: followerRow } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', otherId)
      .eq('following_id', user.id)
      .maybeSingle()

    setActiveChat({
      otherId,
      matchId: matchRow?.id || null,
      lastActivity: matchRow?.created_at || new Date().toISOString(),
      profile,
      verified: !!verifiedRow,
      following: !!followingRow,
      follower: !!followerRow,
    })
    onConsumeInitialUser && onConsumeInitialUser()
  }

  if (activeChat) return <Conversation match={activeChat} onBack={() => setActiveChat(null)} />
  return <ConversationList onOpen={setActiveChat} />
}
