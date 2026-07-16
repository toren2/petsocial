import React, { useState, useEffect, useRef } from 'react'
import { X, Plus, Send, Trash2, Camera, Eye, Repeat, Video } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'
import { notifyMessage } from '../notifications'

function StoryViewer({ stories, startIndex, onClose, onDelete, onShareAsPost, currentUserId }) {
  const { t, language } = useLanguage()
  const [index, setIndex] = useState(startIndex)
  const [progress, setProgress] = useState(0)
  const [showViewers, setShowViewers] = useState(false)
  const [viewers, setViewers] = useState([])
  const [sharing, setSharing] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const [replySent, setReplySent] = useState(false)
  const timerRef = useRef(null)
  const story = stories[index]
  const isVideo = !!story?.video_url

  useEffect(() => {
    setProgress(0)
    setShowViewers(false)
  }, [index])

  // Separado del efecto de arriba para poder pausar/reanudar el avance
  // automatico mientras el usuario esta escribiendo una respuesta, sin
  // reiniciar el progreso de la historia actual.
  useEffect(() => {
    if (isVideo || inputFocused) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(timerRef.current)
          if (index < stories.length - 1) {
            setIndex(i => i + 1)
          } else {
            onClose()
          }
          return 0
        }
        return p + 2
      })
    }, 100)
    return () => clearInterval(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, isVideo, inputFocused])

  useEffect(() => {
    if (!story) return
    recordView()
  }, [story?.id])

  async function recordView() {
    if (!story || story.user_id === currentUserId) return
    await supabase.from('story_views').upsert([{ story_id: story.id, viewer_id: currentUserId }], { onConflict: 'story_id,viewer_id' })
  }

  async function fetchViewers() {
    const { data } = await supabase
      .from('story_views')
      .select('*, profiles(pet_name, emoji, avatar_url)')
      .eq('story_id', story.id)
      .order('created_at', { ascending: false })
    setViewers(data || [])
  }

  async function handleShowViewers() {
    if (story.user_id !== currentUserId) return
    timerRef.current && clearInterval(timerRef.current)
    await fetchViewers()
    setShowViewers(true)
  }

  async function handleShareAsPost() {
    setSharing(true)
    await onShareAsPost(story)
    setSharing(false)
  }

  async function sendStoryReply() {
    const text = replyText.trim()
    if (!text || sendingReply || !story) return
    setSendingReply(true)
    const { error } = await supabase.from('messages').insert([{
      sender_id: currentUserId,
      receiver_id: story.user_id,
      text,
      story_id: story.id,
      story_preview_url: story.image_url || story.video_url || null,
      story_is_video: !!story.video_url,
    }])
    if (!error) {
      setReplyText('')
      setReplySent(true)
      setTimeout(() => setReplySent(false), 2000)
      const { data: myProfile } = await supabase.from('profiles').select('pet_name').eq('id', currentUserId).single()
      await notifyMessage(story.user_id, myProfile?.pet_name || 'Una mascota', currentUserId)
    }
    setSendingReply(false)
  }

  if (!story) return null

  async function handleDelete() {
    if (!window.confirm(t('stories.deleteStoryConfirm'))) return
    await onDelete(story)
    if (index < stories.length - 1) {
      setIndex(i => i + 1)
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col" style={{ height: '100dvh' }}>
      <div className="flex gap-1 px-3 pt-3 pb-2 flex-shrink-0">
        {stories.map((s, i) => (
          <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{ width: i < index ? '100%' : i === index ? (isVideo ? '100%' : `${progress}%`) : '0%' }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 px-4 py-2 flex-shrink-0">
        <div className="w-9 h-9 rounded-full overflow-hidden bg-white/20 flex items-center justify-center flex-shrink-0">
          {story.avatar_url ? (
            <img src={story.avatar_url} alt={story.pet_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg">{story.pet_emoji || '🐕'}</span>
          )}
        </div>
        <div className="flex-1">
          <div className="text-white font-semibold text-sm">{story.pet_name}</div>
          <div className="text-white/60 text-xs">
            {new Date(story.created_at).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        {story.user_id === currentUserId && (
          <>
            <button onClick={handleShareAsPost} disabled={sharing} className="border-0 bg-transparent cursor-pointer text-white/80 mr-1">
              <Repeat size={20} />
            </button>
            <button onClick={handleShowViewers} className="border-0 bg-transparent cursor-pointer text-white/80 mr-1">
              <Eye size={20} />
            </button>
            <button onClick={handleDelete} className="border-0 bg-transparent cursor-pointer text-white/80 mr-2">
              <Trash2 size={20} />
            </button>
          </>
        )}
        <button onClick={onClose} className="border-0 bg-transparent cursor-pointer text-white">
          <X size={24} />
        </button>
      </div>

      <div
        className="flex-1 relative flex items-center justify-center"
        onClick={e => {
          if (showViewers || isVideo) return
          const x = e.clientX / window.innerWidth
          if (x < 0.4) {
            if (index > 0) setIndex(i => i - 1)
          } else {
            if (index < stories.length - 1) setIndex(i => i + 1)
            else onClose()
          }
        }}
      >
        {isVideo ? (
          <video
            src={story.video_url}
            style={{ maxWidth: '100%', maxHeight: '100%' }}
            controls
            playsInline
            autoPlay
            onEnded={() => {
              if (index < stories.length - 1) setIndex(i => i + 1)
              else onClose()
            }}
          />
        ) : (
          <img src={story.image_url} alt="story" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        )}
        {story.caption && (
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
            <p className="text-white text-sm">{story.caption}</p>
          </div>
        )}
        {sharing && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/70 px-4 py-2 rounded-full">
            <span className="text-white text-sm">{t('stories.sharing')}</span>
          </div>
        )}
        {replySent && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 px-4 py-2 rounded-full z-20">
            <span className="text-white text-xs">{t('stories.replySent')}</span>
          </div>
        )}
      </div>

      {story.user_id !== currentUserId && !showViewers && (
        <div
          className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <input
            type="text"
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onKeyDown={e => { if (e.key === 'Enter') sendStoryReply() }}
            placeholder={t('stories.replyPlaceholder')}
            className="flex-1 rounded-full px-4 py-2.5 text-sm text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)' }}
          />
          <button
            onClick={sendStoryReply}
            disabled={!replyText.trim() || sendingReply}
            className="w-10 h-10 rounded-full flex items-center justify-center border-0 cursor-pointer flex-shrink-0"
            style={{ background: replyText.trim() ? '#7C3AED' : 'rgba(255,255,255,0.15)' }}
          >
            <Send size={16} color="white" />
          </button>
        </div>
      )}

      {showViewers && (
        <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl z-10 max-h-[60%] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-ps-purple" />
              <h3 className="font-bold text-gray-900">{t('stories.viewedBy', { count: viewers.length })}</h3>
            </div>
            <button onClick={() => { setShowViewers(false) }} className="border-0 bg-transparent cursor-pointer text-gray-400">
              <X size={20} />
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {viewers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
                <Eye size={32} />
                <p className="text-sm">{t('stories.noOneViewed')}</p>
              </div>
            ) : (
              viewers.map(v => (
                <div key={v.id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-50">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-ps-purple-light flex items-center justify-center flex-shrink-0">
                    {v.profiles?.avatar_url ? (
                      <img src={v.profiles.avatar_url} className="w-full h-full object-cover" alt={v.profiles.pet_name} />
                    ) : (
                      <span className="text-lg">{v.profiles?.emoji || '🐕'}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-gray-900">{v.profiles?.pet_name || 'Mascota'}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(v.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function CreateStoryModal({ profile, onClose, onCreate, initialFile = null, initialCaption = '' }) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [mediaType, setMediaType] = useState(null) // 'image' | 'video'
  const [caption, setCaption] = useState(initialCaption)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!initialFile) return
    const isVideo = initialFile.type.startsWith('video/')
    setMediaFile(initialFile)
    setMediaPreview(URL.createObjectURL(initialFile))
    setMediaType(isVideo ? 'video' : 'image')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleMedia(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const isVideo = file.type.startsWith('video/')
    setMediaFile(file)
    setMediaPreview(URL.createObjectURL(file))
    setMediaType(isVideo ? 'video' : 'image')
  }

  function clearMedia() {
    setMediaFile(null)
    setMediaPreview(null)
    setMediaType(null)
  }

  async function submit() {
    if (!mediaFile) return
    setLoading(true)
    const ext = mediaFile.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const bucket = mediaType === 'video' ? 'videos' : 'stories'
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, mediaFile)
    if (!uploadError) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      const insertData = {
        user_id: user.id,
        caption: caption.trim(),
        ...(mediaType === 'video' ? { video_url: data.publicUrl, image_url: null } : { image_url: data.publicUrl }),
      }
      const { data: story, error } = await supabase.from('stories').insert([insertData]).select()
      if (!error && story) onCreate(story[0])
    }
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end">
      <div className="bg-white rounded-t-3xl flex flex-col flex-shrink-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">{t('stories.newStory')}</h3>
          <button onClick={onClose} className="border-0 bg-transparent cursor-pointer text-gray-400">
            <X size={22} />
          </button>
        </div>
        <div className="px-5 pt-4 pb-2">
          {mediaPreview ? (
            <div className="relative rounded-2xl overflow-hidden" style={{ height: 220 }}>
              {mediaType === 'video' ? (
                <video src={mediaPreview} className="w-full h-full object-cover" controls />
              ) : (
                <img src={mediaPreview} alt="preview" className="w-full h-full object-contain bg-gray-100" />
              )}
              <button
                onClick={clearMedia}
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center border-0 cursor-pointer"
              >
                <X size={16} color="white" />
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => { fileInputRef.current.accept = 'image/*'; fileInputRef.current?.click() }}
                className="flex-1 border-2 border-dashed border-gray-200 rounded-2xl py-8 flex flex-col items-center gap-2 bg-ps-bg cursor-pointer"
              >
                <Camera size={28} className="text-gray-300" />
                <span className="text-xs text-gray-400">{t('createPost.photo')}</span>
              </button>
              <button
                onClick={() => { fileInputRef.current.accept = 'video/*'; fileInputRef.current?.click() }}
                className="flex-1 border-2 border-dashed border-gray-200 rounded-2xl py-8 flex flex-col items-center gap-2 bg-ps-bg cursor-pointer"
              >
                <Video size={28} className="text-gray-300" />
                <span className="text-xs text-gray-400">{t('createPost.video')}</span>
              </button>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleMedia} />
        </div>
        <div className="px-5 pb-2">
          <input
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-ps-bg"
            placeholder={t('stories.addTextOptional')}
            value={caption}
            onChange={e => setCaption(e.target.value)}
          />
        </div>
        <div className="px-5 py-4">
          <button
            onClick={submit}
            disabled={loading || !mediaFile}
            className="w-full py-3.5 rounded-full font-semibold text-white text-base border-0 cursor-pointer flex items-center justify-center gap-2"
            style={{ background: loading || !mediaFile ? '#C4B5FD' : '#7C3AED' }}
          >
            <Send size={16} />
            {loading ? t('stories.publishing') : t('stories.publishStory')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StoriesBar({ profile, initialShareFile = null, initialShareCaption = '', onConsumeInitialShareFile }) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [stories, setStories] = useState([])
  const [viewingStories, setViewingStories] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { fetchStories() }, [])

  // Si llega un archivo compartido desde fuera de la app (galeria del
  // telefono) con destino "historia", abrimos el modal de crear historia
  // ya con el archivo cargado.
  useEffect(() => {
    if (initialShareFile) setShowCreate(true)
  }, [initialShareFile])

  async function fetchStories() {
    const { data } = await supabase
      .from('stories')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(s => s.user_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, pet_name, emoji, avatar_url')
        .in('id', userIds)

      const enriched = data.map(s => ({
        ...s,
        pet_name: profiles?.find(p => p.id === s.user_id)?.pet_name || 'Mascota',
        pet_emoji: profiles?.find(p => p.id === s.user_id)?.emoji || '🐕',
        avatar_url: profiles?.find(p => p.id === s.user_id)?.avatar_url || null,
      }))

      const grouped = userIds.map(uid => ({
        userId: uid,
        pet_name: enriched.find(s => s.user_id === uid)?.pet_name,
        pet_emoji: enriched.find(s => s.user_id === uid)?.pet_emoji,
        avatar_url: enriched.find(s => s.user_id === uid)?.avatar_url,
        isOwn: uid === user.id,
        stories: enriched.filter(s => s.user_id === uid),
      }))

      setStories(grouped)
    } else {
      setStories([])
    }
  }

  async function deleteStory(story) {
    const bucket = story.video_url ? 'videos' : 'stories'
    const url = story.video_url || story.image_url
    const path = url?.split(`/${bucket}/`)[1]
    if (path) await supabase.storage.from(bucket).remove([path])
    await supabase.from('stories').delete().eq('id', story.id)
    fetchStories()
  }

  async function shareStoryAsPost(story) {
    await supabase.from('posts').insert([{
      user_id: user.id,
      image_url: story.image_url || null,
      video_url: story.video_url || null,
      caption: story.caption || '',
      pet_name: profile?.pet_name || 'Mascota',
      pet_emoji: profile?.emoji || '🐕',
      pet_breed: profile?.breed || '',
      avatar_url: profile?.avatar_url || null,
    }])
    alert(t('stories.sharedAsPost'))
  }

  return (
    <>
      <div className="flex gap-3 px-4 py-3 bg-white border-b border-gray-100 overflow-x-auto">
        <div className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer" onClick={() => setShowCreate(true)}>
          <div className="rounded-full p-0.5" style={{ border: '2px dashed #D1D5DB' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-100 overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="mi historia" className="w-full h-full object-cover" />
              ) : (
                <Plus size={22} className="text-gray-400" />
              )}
            </div>
          </div>
          <span className="text-[10px] text-gray-500 max-w-[52px] text-center truncate">{t('stories.myStory')}</span>
        </div>

        {stories.map((group) => (
          <div
            key={group.userId}
            className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
            onClick={() => setViewingStories(group.stories)}
          >
            <div className="rounded-full p-0.5" style={{ border: '2px solid #7C3AED' }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-ps-purple-light overflow-hidden text-2xl">
                {group.avatar_url ? (
                  <img src={group.avatar_url} alt={group.pet_name} className="w-full h-full object-cover" />
                ) : (
                  group.pet_emoji || '🐕'
                )}
              </div>
            </div>
            <span className="text-[10px] text-gray-500 max-w-[52px] text-center truncate">{group.pet_name}</span>
          </div>
        ))}
      </div>

      {viewingStories && (
        <StoryViewer
          stories={viewingStories}
          startIndex={0}
          onClose={() => { setViewingStories(null); fetchStories() }}
          onDelete={deleteStory}
          onShareAsPost={shareStoryAsPost}
          currentUserId={user.id}
        />
      )}

      {showCreate && (
        <CreateStoryModal
          profile={profile}
          initialFile={initialShareFile}
          initialCaption={initialShareCaption}
          onClose={() => { setShowCreate(false); onConsumeInitialShareFile && onConsumeInitialShareFile() }}
          onCreate={() => { fetchStories(); setShowCreate(false); onConsumeInitialShareFile && onConsumeInitialShareFile() }}
        />
      )}
    </>
  )
}