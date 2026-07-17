import React, { useState, useRef, useEffect, useMemo } from 'react'
import { X, Check, RotateCw, Sun, Contrast, RefreshCw } from 'lucide-react'
import { useLanguage } from '../LanguageContext'

// Ventana previa de edicion antes de subir/publicar cualquier foto o video en
// la app. Para fotos: recorte (con presets de relacion de aspecto), rotar en
// pasos de 90 grados, brillo y contraste -- todo con <canvas> nativo, sin
// depender de ninguna libreria externa (el sandbox de este proyecto no tiene
// acceso al registry de npm, y ademas asi evitamos peso extra en el bundle).
// Para videos no hay edicion real (recortar/editar video en el navegador sin
// una libreria pesada tipo ffmpeg.wasm no es viable) -- solo se muestra una
// vista previa antes de confirmar, para que el flujo de "revisar antes de
// publicar" sea consistente entre fotos y videos.

const ASPECTS = {
  square: 1,
  portrait: 4 / 5,
  story: 9 / 16,
  landscape: 16 / 9,
}

const FRAME_MAX_W = 300
const FRAME_MAX_H = 380

function computeFrame(aspectKey, natural, forcedAspect) {
  let aspect
  if (forcedAspect) aspect = forcedAspect
  else if (aspectKey === 'original') aspect = natural ? natural.w / natural.h : 1
  else aspect = ASPECTS[aspectKey] || 1

  let w = FRAME_MAX_W
  let h = w / aspect
  if (h > FRAME_MAX_H) {
    h = FRAME_MAX_H
    w = h * aspect
  }
  return { w, h, aspect }
}

function computeBaseScale(effW, effH, frame) {
  if (!effW || !effH) return 1
  return Math.max(frame.w / effW, frame.h / effH)
}

// Decodifica el archivo a un ImageBitmap con la orientacion EXIF ya
// corregida (imageOrientation: 'from-image'). Esto evita una clase entera
// de bugs de fotos que salen mal encuadradas o "perdidas" fuera del
// recuadro: los navegadores no siempre son consistentes entre lo que
// <img>.naturalWidth/naturalHeight reportan y como rotan visualmente una
// foto con metadata EXIF (muy comun en fotos tomadas con la camara del
// telefono -- justo el flujo que agregamos hace poco). Al decodificar una
// sola vez a un ImageBitmap y usar ESE bitmap tanto para la vista previa
// (canvas) como para el recorte final exportado, la orientacion y el
// tamano usados en todos lados son siempre exactamente los mismos.
async function decodeBitmap(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch (e) {
    // Navegadores sin soporte de la opcion (Safari viejo): probamos sin ella.
    try {
      return await createImageBitmap(file)
    } catch (e2) {
      return null
    }
  }
}

export default function MediaEditor({ file, forcedAspect = null, outputMaxSize = 1600, onConfirm, onCancel }) {
  const { t } = useLanguage()
  const [previewUrl, setPreviewUrl] = useState(null)
  const [isVideo, setIsVideo] = useState(false)
  const [naturalSize, setNaturalSize] = useState(null)
  const [aspectKey, setAspectKey] = useState(forcedAspect ? 'forced' : 'original')
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [brightness, setBrightness] = useState(0)
  const [contrast, setContrast] = useState(0)
  const [processing, setProcessing] = useState(false)

  const bitmapRef = useRef(null)
  const canvasRef = useRef(null)
  const dragRef = useRef(null)

  useEffect(() => {
    if (!file) return
    let cancelled = false
    const video = file.type.startsWith('video/')
    setIsVideo(video)
    setNaturalSize(null)
    setPreviewUrl(null)
    bitmapRef.current = null

    let url = null
    if (video) {
      url = URL.createObjectURL(file)
      setPreviewUrl(url)
    } else {
      decodeBitmap(file).then(bitmap => {
        if (cancelled || !bitmap) return
        bitmapRef.current = bitmap
        setNaturalSize({ w: bitmap.width, h: bitmap.height })
      })
    }

    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
      if (bitmapRef.current) {
        bitmapRef.current.close?.()
        bitmapRef.current = null
      }
    }
  }, [file])

  const frame = useMemo(
    () => computeFrame(aspectKey, naturalSize, forcedAspect),
    [aspectKey, naturalSize, forcedAspect]
  )

  const rotated90 = rotation % 180 !== 0
  const effW = naturalSize ? (rotated90 ? naturalSize.h : naturalSize.w) : 0
  const effH = naturalSize ? (rotated90 ? naturalSize.w : naturalSize.h) : 0
  const baseScale = computeBaseScale(effW, effH, frame)
  const finalScale = baseScale * scale

  // Redibuja la vista previa en el canvas cada vez que cambia el encuadre,
  // zoom, paneo, rotacion, brillo o contraste -- reemplaza el <img> +
  // transform CSS que se usaba antes, que dependia de que naturalWidth/
  // naturalHeight coincidieran exactamente con como el navegador rotaba
  // visualmente la imagen (fragil con fotos de camara con EXIF, y con
  // elementos CSS enormes con filter en navegadores moviles mas viejos).
  useEffect(() => {
    if (isVideo || !naturalSize || !bitmapRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.max(1, Math.round(frame.w * dpr))
    canvas.height = Math.max(1, Math.round(frame.h * dpr))
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, frame.w, frame.h)
    ctx.save()
    ctx.filter = `brightness(${100 + brightness}%) contrast(${100 + contrast}%)`
    ctx.translate(frame.w / 2 + offset.x, frame.h / 2 + offset.y)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale(finalScale, finalScale)
    ctx.drawImage(bitmapRef.current, -naturalSize.w / 2, -naturalSize.h / 2, naturalSize.w, naturalSize.h)
    ctx.restore()
  }, [isVideo, naturalSize, frame, offset, rotation, finalScale, brightness, contrast])

  function resetTransform() {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  function pickAspect(key) {
    setAspectKey(key)
    resetTransform()
  }

  function rotate() {
    setRotation(r => (r + 90) % 360)
    resetTransform()
  }

  function onPointerDown(e) {
    if (isVideo) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, origin: { ...offset } }
  }
  function onPointerMove(e) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setOffset({ x: dragRef.current.origin.x + dx, y: dragRef.current.origin.y + dy })
  }
  function onPointerUp() {
    dragRef.current = null
  }

  async function handleConfirm() {
    if (isVideo || !naturalSize || !bitmapRef.current) {
      onConfirm(file)
      return
    }
    setProcessing(true)
    try {
      const natural = naturalSize
      const rotW = rotated90 ? natural.h : natural.w
      const rotH = rotated90 ? natural.w : natural.h

      // Paso 1: dibujar la imagen completa ya rotada en un canvas intermedio
      // a resolucion nativa (sin recorte todavia).
      const rotCanvas = document.createElement('canvas')
      rotCanvas.width = rotW
      rotCanvas.height = rotH
      const rctx = rotCanvas.getContext('2d')
      rctx.translate(rotW / 2, rotH / 2)
      rctx.rotate((rotation * Math.PI) / 180)
      rctx.drawImage(bitmapRef.current, -natural.w / 2, -natural.h / 2, natural.w, natural.h)

      // Paso 2: calcular el rectangulo de recorte sobre ese canvas rotado,
      // usando la misma matematica de encuadre/zoom/paneo que la vista previa.
      const cropW = frame.w / finalScale
      const cropH = frame.h / finalScale
      const cropCx = rotW / 2 - offset.x / finalScale
      const cropCy = rotH / 2 - offset.y / finalScale
      const cropX = cropCx - cropW / 2
      const cropY = cropCy - cropH / 2

      // Paso 3: exportar a una resolucion razonable (independiente del tamano
      // en pantalla del editor) para no perder calidad ni generar archivos gigantes.
      const scaleFactor = Math.min(outputMaxSize / Math.max(cropW, cropH), 4)
      const outW = Math.max(1, Math.round(cropW * scaleFactor))
      const outH = Math.max(1, Math.round(cropH * scaleFactor))
      const outCanvas = document.createElement('canvas')
      outCanvas.width = outW
      outCanvas.height = outH
      const octx = outCanvas.getContext('2d')
      octx.filter = `brightness(${100 + brightness}%) contrast(${100 + contrast}%)`
      octx.drawImage(rotCanvas, cropX, cropY, cropW, cropH, 0, 0, outW, outH)

      const blob = await new Promise(resolve => outCanvas.toBlob(resolve, 'image/jpeg', 0.9))
      setProcessing(false)
      if (!blob) { onConfirm(file); return }
      const baseName = (file.name || 'foto').replace(/\.\w+$/, '')
      const edited = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
      onConfirm(edited)
    } catch (e) {
      setProcessing(false)
      onConfirm(file)
    }
  }

  const ready = !!file && (isVideo ? !!previewUrl : !!naturalSize)
  if (!file) return null

  const aspectOptions = [
    ['original', t('mediaEditor.aspectOriginal')],
    ['square', t('mediaEditor.aspectSquare')],
    ['portrait', t('mediaEditor.aspectPortrait')],
    ['story', t('mediaEditor.aspectStory')],
    ['landscape', t('mediaEditor.aspectLandscape')],
  ]

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col" style={{ height: '100dvh' }}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button onClick={onCancel} className="border-0 bg-transparent cursor-pointer text-white">
          <X size={22} />
        </button>
        <span className="text-white text-sm font-semibold">{t('mediaEditor.title')}</span>
        <button
          onClick={handleConfirm}
          disabled={processing || !ready}
          className="border-0 cursor-pointer rounded-full w-9 h-9 flex items-center justify-center"
          style={{ background: processing || !ready ? '#C4B5FD' : '#7C3AED' }}
        >
          <Check size={18} color="white" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden px-4">
        {!ready ? (
          <div className="w-9 h-9 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        ) : isVideo ? (
          <video src={previewUrl} controls className="max-w-full max-h-full rounded-2xl" />
        ) : (
          <div
            className="relative overflow-hidden rounded-2xl bg-gray-900 touch-none"
            style={{ width: frame.w, height: frame.h }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 select-none"
              style={{ width: frame.w, height: frame.h, cursor: 'grab' }}
            />
          </div>
        )}
      </div>

      {!isVideo && (
        <div className="flex-shrink-0 bg-black px-4 pt-3 pb-5 flex flex-col gap-3">
          {!forcedAspect && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {aspectOptions.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => pickAspect(key)}
                  className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border-0 cursor-pointer"
                  style={{ background: aspectKey === key ? '#7C3AED' : 'rgba(255,255,255,0.12)', color: 'white' }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={rotate}
              className="w-9 h-9 rounded-full flex items-center justify-center border-0 cursor-pointer flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)' }}
            >
              <RotateCw size={16} color="white" />
            </button>
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={scale}
              onChange={e => setScale(parseFloat(e.target.value))}
              className="flex-1"
            />
            <button
              onClick={resetTransform}
              className="w-9 h-9 rounded-full flex items-center justify-center border-0 cursor-pointer flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)' }}
            >
              <RefreshCw size={14} color="white" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Sun size={15} color="white" className="flex-shrink-0" />
            <input
              type="range"
              min="-50"
              max="50"
              value={brightness}
              onChange={e => setBrightness(parseInt(e.target.value, 10))}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <Contrast size={15} color="white" className="flex-shrink-0" />
            <input
              type="range"
              min="-50"
              max="50"
              value={contrast}
              onChange={e => setContrast(parseInt(e.target.value, 10))}
              className="flex-1"
            />
          </div>
        </div>
      )}

      {isVideo && (
        <div className="flex-shrink-0 bg-black px-4 pb-5 pt-3">
          <p className="text-white/50 text-xs text-center">{t('mediaEditor.videoNotice')}</p>
        </div>
      )}
    </div>
  )
}
