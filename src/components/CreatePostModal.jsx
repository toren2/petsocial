import React, { useState, useRef } from 'react'
import { X, Image, Send } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'

export default function CreatePostModal({ profile, onClose, onCreate }) {
  const { user } = useAuth()
  const [caption, setCaption] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  function handleImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function submit() {
    if (!caption.trim() && !imageFile) return
    setLoading(true)

    let image_url = null

    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('posts')
        .upload(path, imageFile)
      if (!error) {
        const { data } = supabase.storage.from('posts').getPublicUrl(path)
        image_url = data.publicUrl
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
          <h3 className="font-bold text-gray-900 text-lg">Nuevo post</h3>
          <button onClick={onClose} className="border-0 bg-transparent cursor-pointer text-gray-400">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {/* Preview de imagen */}
          {imagePreview ? (
            <div className="relative rounded-2xl overflow-hidden" style={{ height: 240 }}>
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
              className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-10 flex flex-col items-center gap-2 bg-ps-bg cursor-pointer"
            >
              <Image size={32} className="text-gray-300" />
              <span className="text-sm text-gray-400">Toca para agregar una foto</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImage}
          />

          {/* Header del post */}
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
            placeholder="¿Qué está haciendo tu mascota? 🐾"
            rows={4}
            value={caption}
            onChange={e => setCaption(e.target.value)}
          />
        </div>

        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={submit}
            disabled={loading || (!caption.trim() && !imageFile)}
            className="w-full py-3.5 rounded-full font-semibold text-white text-base border-0 cursor-pointer flex items-center justify-center gap-2"
            style={{ background: loading || (!caption.trim() && !imageFile) ? '#C4B5FD' : '#7C3AED' }}
          >
            <Send size={16} />
            {loading ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  )
}