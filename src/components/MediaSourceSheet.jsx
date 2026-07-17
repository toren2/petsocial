import React, { useRef } from 'react'
import { Camera, Image as ImageIcon, Video } from 'lucide-react'
import { useLanguage } from '../LanguageContext'

// Menu de origen de archivo (camara vs galeria), estilo action-sheet que
// desliza desde abajo. Reemplaza el patron anterior de "click directo abre
// el picker de galeria" en todas las pantallas de subida de la app. Se monta
// solo cuando `open` es true (el padre controla el estado). Al elegir una
// opcion dispara el input oculto correspondiente; onSelect recibe el File
// elegido (por camara o galeria) listo para pasar al flujo existente
// (MediaEditor, upload directo, etc).
export default function MediaSourceSheet({
  open,
  onClose,
  onSelect,
  accept = 'image/*',
  mode = 'photo', // 'photo' | 'video' -> ajusta accept/label de la opcion de camara
}) {
  const { t } = useLanguage()
  const cameraRef = useRef(null)
  const galleryRef = useRef(null)

  if (!open) return null

  function handleFile(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    onClose()
    if (f) onSelect(f)
  }

  const isVideo = mode === 'video'

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-md bg-white rounded-t-3xl overflow-hidden pb-[env(safe-area-inset-bottom)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-9 h-1 rounded-full bg-gray-200" />
        </div>

        <button
          onClick={() => cameraRef.current?.click()}
          className="w-full flex items-center gap-3 px-5 py-3.5 border-0 bg-transparent cursor-pointer text-left"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#EDE9FE' }}>
            {isVideo ? <Video size={17} color="#7C3AED" /> : <Camera size={17} color="#7C3AED" />}
          </div>
          <span className="text-sm font-semibold text-gray-900">
            {isVideo ? t('mediaSource.recordVideo') : t('mediaSource.takePhoto')}
          </span>
        </button>

        <button
          onClick={() => galleryRef.current?.click()}
          className="w-full flex items-center gap-3 px-5 py-3.5 border-0 bg-transparent cursor-pointer text-left border-t border-gray-100"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#EDE9FE' }}>
            <ImageIcon size={17} color="#7C3AED" />
          </div>
          <span className="text-sm font-semibold text-gray-900">{t('mediaSource.chooseGallery')}</span>
        </button>

        <button
          onClick={onClose}
          className="w-full py-3.5 text-sm font-semibold text-gray-400 border-0 bg-transparent cursor-pointer border-t border-gray-100 mt-1"
        >
          {t('common.cancel')}
        </button>

        <input
          ref={cameraRef}
          type="file"
          accept={isVideo ? 'video/*' : 'image/*'}
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />
        <input ref={galleryRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
      </div>
    </div>
  )
}
