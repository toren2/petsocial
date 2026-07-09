import React, { useState, useRef } from 'react'
import { X, Image, Send, Video } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'

export default function CreatePostModal({ profile, onClose, onCreate }) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [caption, setCaption] = useState('')
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [mediaType, setMediaType] = useState(null) // 'image' | 'video'
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

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
    if (!caption.trim() && !mediaFile) return
    setLoading(true)

    let image_url = null
    let video_url = null

    if (mediaFile) {
      const ext = mediaFile.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const bucket = mediaType === 'video' ? 'videos' : 'posts'
      const { error } = await supabase.storage.from(bucket).upload(path, mediaFile)
      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path)
        if (mediaType === 'video') {
          video_url = data.publicUrl
        } else {
          image_url = data.publicUrl
        }
      }
    }

    const { data, error } = await supabase
      .from('posts')
      .insert([{
        user_id: user.id,
        pet_name: profile?.pet_name || 'Mi mascota',
        pet_emoji: profile?.emoji || '🐕',
        pet_breed: profile?.breed || '',
        avatar_url: profile?.avatar_url || null,
        image_url,
        video_url,
        caption: caption.trim(),
        likes: 0,
      }])
      .select()

    if (!error && data) onCreate(data[0])
    setLoading(false)
    onClose()
  }

  return (
    <div className="absolute inset-0 bg-black/50 z-50 flex flex-col justify-end">
      <div className="bg-white rounded-t-3xl flex flex-col max-h-[90%]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">{t('createPost.newPost')}</h3>
          <button onClick={onClose} className="border-0 bg-transparent cursor-pointer text-gray-400">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {mediaPreview ? (
            <div className="relative rounded-2xl overflow-hidden" style={{ height: 240 }}>
              {mediaType === 'video' ? (
                <video src={mediaPreview} className="w-full h-full object-cover" controls />
              ) : (
                <img src={mediaPreview} alt="preview" className="w-full h-full object-cover" />
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
                <Image size={28} className="text-gray-300" />
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

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleMedia}
          />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-ps-purple-light flex items-center justify-center overflow-hidden flex-shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl">{profile?.emoji || '🐕'}</span>
              )}
            </div>
            <div>
              <div className="font-semibold text-sm text-gray-900">{profile?.pet_name || 'Mi mascota'}</div>
              <div className="text-xs text-gray-400">{profile?.breed}</div>
            </div>
          </div>

          <textarea
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none bg-ps-bg resize-none"
            placeholder={t('createPost.captionPlaceholder')}
            rows={4}
            value={caption}
            onChange={e => setCaption(e.target.value)}
          />
        </div>

        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={submit}
            disabled={loading || (!caption.trim() && !mediaFile)}
            className="w-full py-3.5 rounded-full font-semibold text-white text-base border-0 cursor-pointer flex items-center justify-center gap-2"
            style={{ background: loading || (!caption.trim() && !mediaFile) ? '#C4B5FD' : '#7C3AED' }}
          >
            <Send size={16} />
            {loading ? t('createPost.publishing') : t('createPost.publish')}
          </button>
        </div>
      </div>
    </div>
  )
}