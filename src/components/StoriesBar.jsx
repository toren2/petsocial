import React, { useState, useEffect, useRef } from 'react'
import { X, Plus, Send } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'

function StoryViewer({ stories, startIndex, onClose }) {
  const [index, setIndex] = useState(startIndex)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef(null)
  const story = stories[index]

  useEffect(() => {
    setProgress(0)
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
  }, [index])

  if (!story) return null

  return (
    <div className="absolute inset-0 bg-black z-50 flex flex-col">
      {/* Progress bars */}
      <div className="flex gap-1 px-3 pt-3 pb-2 flex-shrink-0">
        {stories.map((s, i) => (
          <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{ width: i < index ? '100%' : i === index ? `${progress}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
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
            {new Date(story.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <button onClick={onClose} className="border-0 bg-transparent cursor-pointer text-white">
          <X size={24} />
        </button>
      </div>

      {/* Image */}
      <div className="flex-1 relative" onClick={e => {
        const x = e.clientX / window.innerWidth
        if (x < 0.4) {
          if (index > 0) setIndex(i => i - 1)
        } else {
          if (index < stories.length - 1) setIndex(i => i + 1)
          else onClose()
        }
      }}>
        <img src={story.image_url} alt="story" className="w-full h-full object-cover" />
        {story.caption && (
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
            <p className="text-white text-sm">{story.caption}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function CreateStoryModal({ profile, onClose, onCreate }) {
  const { user } = useAuth()
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [caption, setCaption] = useState('')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  function handleImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function submit() {
    if (!imageFile) return
    setLoading(true)
    const ext = imageFile.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('stories')
      .upload(path, imageFile)
    if (!uploadError) {
      const { data } = supabase.storage.from('stories').getPublicUrl(path)
      const { data: story, error } = await supabase
        .from('stories')
        .insert([{
          user_id: user.id,
          image_url: data.publicUrl,
          caption: caption.trim(),
        }])
        .select()
      if (!error && story) onCreate(story[0])
    }
    setLoading(false)
    onClose()
  }

  return (
    <div className="absolute inset-0 bg-black/50 z-50 flex flex-col justify-end">
      <div className="bg-white rounded-t-3xl flex flex-col max-h-[90%]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">Nueva historia</h3>
          <button onClick={onClose} className="border-0 bg-transparent cursor-pointer text-gray-400">
            <X size={22} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {imagePreview ? (
            <div className="relative rounded-2xl overflow-hidden" style={{ height: 300 }}>
              <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
              <button
                onClick={() => { setImageFile(null); setImagePreview(null) }}
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center border-0 cursor-pointer"
              >
                <X size={16} color="white" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-12 flex flex-col items-center gap-2 bg-ps-bg cursor-pointer"
            >
              <Plus size={32} className="text-gray-300" />
              <span className="text-sm text-gray-400">Toca para agregar una foto</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
          <textarea
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none bg-ps-bg resize-none"
            placeholder="Agrega un texto a tu historia... (opcional)"
            rows={3}
            value={caption}
            onChange={e => setCaption(e.target.value)}
          />
        </div>
        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={submit}
            disabled={loading || !imageFile}
            className="w-full py-3.5 rounded-full font-semibold text-white text-base border-0 cursor-pointer flex items-center justify-center gap-2"
            style={{ background: loading || !imageFile ? '#C4B5FD' : '#7C3AED' }}
          >
            <Send size={16} />
            {loading ? 'Publicando...' : 'Publicar historia'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StoriesBar({ profile, onCreatePost }) {
  const { user } = useAuth()
  const [stories, setStories] = useState([])
  const [viewingStories, setViewingStories] = useState(null)
  const [viewingIndex, setViewingIndex] = useState(0)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { fetchStories() }, [])

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
    }
  }

  function handleCreateStory(story) {
    fetchStories()
  }

  function openStories(group, index) {
    setViewingStories(group.stories)
    setViewingIndex(0)
  }

  return (
    <>
      <div className="flex gap-3 px-4 py-3 bg-white border-b border-gray-100 overflow-x-auto">
        {/* Mi historia */}
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
          <span className="text-[10px] text-gray-500 max-w-[52px] text-center truncate">Tu historia</span>
        </div>

        {/* Stories de otros */}
        {stories.map((group, i) => (
          <div
            key={group.userId}
            className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
            onClick={() => openStories(group, i)}
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
          startIndex={viewingIndex}
          onClose={() => setViewingStories(null)}
        />
      )}

      {showCreate && (
        <CreateStoryModal
          profile={profile}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreateStory}
        />
      )}
    </>
  )
}