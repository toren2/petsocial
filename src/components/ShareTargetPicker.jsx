import React, { useEffect, useState } from 'react'
import { X, Image, Video } from 'lucide-react'
import { useLanguage } from '../LanguageContext'

// Se muestra cuando el usuario comparte una foto/video desde fuera de la
// app (galeria del telefono, via el menu nativo de "Compartir") y llega a
// Snoutt a traves del Web Share Target. Deja elegir a donde publicarlo.
export default function ShareTargetPicker({ file, onPickFeed, onPickStory, onClose }) {
  const { t } = useLanguage()
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  if (!file) return null
  const isVideo = file.type.startsWith('video/')

  return (
    <div className="absolute inset-0 bg-black/50 z-50 flex flex-col justify-end">
      <div className="bg-white rounded-t-3xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">{t('shareTarget.title')}</h3>
          <button onClick={onClose} className="border-0 bg-transparent cursor-pointer text-gray-400">
            <X size={22} />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="relative rounded-2xl overflow-hidden bg-gray-100" style={{ height: 200 }}>
            {isVideo ? (
              <video src={preview} className="w-full h-full object-cover" muted playsInline />
            ) : (
              preview && <img src={preview} alt="compartido" className="w-full h-full object-cover" />
            )}
          </div>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          <p className="text-xs text-gray-400 text-center">{t('shareTarget.subtitle')}</p>
          <button
            onClick={onPickFeed}
            className="w-full py-3.5 rounded-full font-semibold text-white text-base border-0 cursor-pointer flex items-center justify-center gap-2"
            style={{ background: '#7C3AED' }}
          >
            <Image size={16} /> {t('shareTarget.toFeed')}
          </button>
          <button
            onClick={onPickStory}
            className="w-full py-3.5 rounded-full font-semibold text-base cursor-pointer flex items-center justify-center gap-2"
            style={{ background: '#F5F3FF', color: '#7C3AED', border: '1.5px solid #DDD6FE' }}
          >
            <Video size={16} /> {t('shareTarget.toStory')}
          </button>
        </div>
      </div>
    </div>
  )
}
