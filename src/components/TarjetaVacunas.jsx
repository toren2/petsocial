import React, { useState } from 'react'
import { ArrowLeft, Share2, Download, PawPrint, BadgeCheck } from 'lucide-react'
import { useLanguage } from '../LanguageContext'

// Tarjeta digital de vacunas: version DOM para vista previa en pantalla, y
// version generada por Canvas (sin dependencias nuevas de npm, ya que el
// sandbox no tiene acceso al registry de npm) para compartir/descargar como
// imagen PNG. Ambas versiones se mantienen visualmente alineadas a mano.

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ')
  let line = ''
  let curY = y
  const lines = []
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  lines.forEach((l, i) => ctx.fillText(l, x, curY + i * lineHeight))
  return curY + lines.length * lineHeight
}

function loadImage(url) {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

async function renderCardCanvas({ petInfo, appliedCount, upcomingCount, overallStatus, lastUpdated, t }) {
  const scale = 2
  const W = 720, H = 900
  const canvas = document.createElement('canvas')
  canvas.width = W * scale
  canvas.height = H * scale
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)

  // fondo blanco con esquinas redondeadas
  ctx.fillStyle = '#FFFFFF'
  roundRect(ctx, 0, 0, W, H, 28)
  ctx.fill()
  ctx.save()
  roundRect(ctx, 0, 0, W, H, 28)
  ctx.clip()

  // banda morada superior
  const grad = ctx.createLinearGradient(0, 0, W, 190)
  grad.addColorStop(0, '#7C3AED')
  grad.addColorStop(1, '#6D28D9')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, 190)

  ctx.fillStyle = '#FFFFFF'
  ctx.font = '700 30px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('🐾 snoutt', 36, 56)
  ctx.font = '600 14px sans-serif'
  ctx.globalAlpha = 0.85
  ctx.fillText(t('tarjeta.subtitle'), 36, 80)
  ctx.globalAlpha = 1

  // avatar circular superpuesto
  const avatarR = 62
  const avatarCx = W / 2
  const avatarCy = 190
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.arc(avatarCx, avatarCy, avatarR + 6, 0, Math.PI * 2)
  ctx.fill()

  const img = await loadImage(petInfo.avatarUrl)
  if (img) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(avatarCx, avatarCy, avatarR, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(img, avatarCx - avatarR, avatarCy - avatarR, avatarR * 2, avatarR * 2)
    ctx.restore()
  } else {
    ctx.fillStyle = '#EDE9FE'
    ctx.beginPath()
    ctx.arc(avatarCx, avatarCy, avatarR, 0, Math.PI * 2)
    ctx.fill()
    ctx.font = '52px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(petInfo.emoji || '🐾', avatarCx, avatarCy + 18)
  }

  // nombre
  ctx.textAlign = 'center'
  ctx.fillStyle = '#111827'
  ctx.font = '700 28px sans-serif'
  ctx.fillText(petInfo.name || '', avatarCx, 300)

  // raza . edad . sexo
  ctx.font = '400 16px sans-serif'
  ctx.fillStyle = '#6B7280'
  const subLine = [petInfo.breed, petInfo.ageLabel, petInfo.sex].filter(Boolean).join('  ·  ')
  ctx.fillText(subLine, avatarCx, 328)

  // pill de estado
  ctx.font = '700 14px sans-serif'
  const pillText = overallStatus.label
  const pillW = ctx.measureText(pillText).width + 44
  const pillH = 32
  const pillX = avatarCx - pillW / 2
  const pillY = 348
  ctx.fillStyle = overallStatus.bg
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2)
  ctx.fill()
  ctx.fillStyle = overallStatus.color
  ctx.fillText(pillText, avatarCx, pillY + 21)

  // cajas de estadisticas
  const boxY = 410, boxH = 96, boxGap = 16, boxW = (W - 72 - boxGap) / 2
  const boxes = [
    [appliedCount, t('tarjeta.appliedLabel')],
    [upcomingCount, t('tarjeta.upcomingLabel')],
  ]
  boxes.forEach(([num, label], i) => {
    const bx = 36 + i * (boxW + boxGap)
    ctx.fillStyle = '#F9FAFB'
    roundRect(ctx, bx, boxY, boxW, boxH, 18)
    ctx.fill()
    ctx.strokeStyle = '#F3F4F6'
    ctx.lineWidth = 1
    roundRect(ctx, bx, boxY, boxW, boxH, 18)
    ctx.stroke()
    ctx.fillStyle = '#7C3AED'
    ctx.font = '700 34px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(String(num), bx + boxW / 2, boxY + 46)
    ctx.fillStyle = '#6B7280'
    ctx.font = '400 13px sans-serif'
    ctx.fillText(label, bx + boxW / 2, boxY + 72)
  })

  // divider
  ctx.strokeStyle = '#F3F4F6'
  ctx.beginPath()
  ctx.moveTo(36, 540)
  ctx.lineTo(W - 36, 540)
  ctx.stroke()

  // disclaimer
  ctx.fillStyle = '#9CA3AF'
  ctx.font = '400 14px sans-serif'
  ctx.textAlign = 'center'
  wrapText(ctx, t('tarjeta.disclaimer'), avatarCx, 575, W - 100, 20)

  // badge "registrado por el dueno"
  ctx.font = '600 12px sans-serif'
  const badgeText = `✓ ${t('tarjeta.ownerVerified')}`
  const badgeW = ctx.measureText(badgeText).width + 32
  ctx.fillStyle = '#F5F3FF'
  roundRect(ctx, avatarCx - badgeW / 2, 630, badgeW, 30, 15)
  ctx.fill()
  ctx.fillStyle = '#7C3AED'
  ctx.fillText(badgeText, avatarCx, 649)

  // fecha
  if (lastUpdated) {
    ctx.fillStyle = '#D1D5DB'
    ctx.font = '400 12px sans-serif'
    ctx.fillText(t('tarjeta.lastUpdated', { date: lastUpdated }), avatarCx, 685)
  }

  // watermark inferior
  ctx.fillStyle = '#7C3AED'
  ctx.font = '700 15px sans-serif'
  ctx.fillText('🐾 snoutt.app', avatarCx, H - 30)

  ctx.restore()
  return canvas
}

export default function TarjetaVacunas({ petInfo, appliedCount, upcomingCount, overallStatus, lastUpdated, onClose }) {
  const { t } = useLanguage()
  const [busy, setBusy] = useState(null) // 'share' | 'download' | null
  const [error, setError] = useState(false)

  async function getBlob() {
    const canvas = await renderCardCanvas({ petInfo, appliedCount, upcomingCount, overallStatus, lastUpdated, t })
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  }

  async function handleDownload() {
    setBusy('download')
    setError(false)
    try {
      const blob = await getBlob()
      if (!blob) throw new Error('no blob')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `snoutt-vacunas-${(petInfo.name || 'mascota').toLowerCase().replace(/\s+/g, '-')}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch (e) {
      setError(true)
    }
    setBusy(null)
  }

  async function handleShare() {
    setBusy('share')
    setError(false)
    try {
      const blob = await getBlob()
      if (!blob) throw new Error('no blob')
      const file = new File([blob], `snoutt-vacunas-${(petInfo.name || 'mascota').toLowerCase().replace(/\s+/g, '-')}.png`, { type: 'image/png' })
      const shareText = t('tarjeta.shareText', { name: petInfo.name || '' })
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: shareText })
      } else {
        // sin soporte de Web Share con archivos: recurrir a descarga directa
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 5000)
      }
    } catch (e) {
      if (e?.name !== 'AbortError') setError(true)
    }
    setBusy(null)
  }

  return (
    <div className="absolute inset-0 bg-white z-[60] flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <button onClick={onClose} className="border-0 bg-transparent cursor-pointer text-ps-purple">
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-lg font-bold text-gray-900">{t('tarjeta.title')}</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
          <div className="px-5 pt-5 pb-16 text-white relative" style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}>
            <p className="font-bold text-lg flex items-center gap-1"><PawPrint size={18} /> snoutt</p>
            <p className="text-[11px] font-semibold tracking-wide opacity-85 mt-0.5">{t('tarjeta.subtitle')}</p>
          </div>
          <div className="px-5 pb-5 flex flex-col items-center text-center -mt-12">
            {petInfo.avatarUrl ? (
              <img src={petInfo.avatarUrl} alt={petInfo.name} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow" />
            ) : (
              <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl border-4 border-white shadow" style={{ background: '#EDE9FE' }}>{petInfo.emoji || '🐾'}</div>
            )}
            <div className="font-bold text-gray-900 text-lg mt-2.5 flex items-center gap-1">
              {petInfo.name} {petInfo.verified && <BadgeCheck size={16} color="#3B82F6" />}
            </div>
            <p className="text-sm text-gray-500">{[petInfo.breed, petInfo.ageLabel, petInfo.sex].filter(Boolean).join(' · ')}</p>

            <span className="text-xs font-bold px-3 py-1.5 rounded-full mt-3" style={{ background: overallStatus.bg, color: overallStatus.color }}>
              {overallStatus.label}
            </span>

            <div className="flex gap-3 w-full mt-4">
              <div className="flex-1 rounded-2xl border border-gray-100 bg-gray-50 py-3">
                <p className="text-2xl font-bold text-ps-purple">{appliedCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t('tarjeta.appliedLabel')}</p>
              </div>
              <div className="flex-1 rounded-2xl border border-gray-100 bg-gray-50 py-3">
                <p className="text-2xl font-bold text-ps-purple">{upcomingCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t('tarjeta.upcomingLabel')}</p>
              </div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed mt-4">{t('tarjeta.disclaimer')}</p>

            <span className="text-[11px] font-semibold px-3 py-1 rounded-full mt-3" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
              ✓ {t('tarjeta.ownerVerified')}
            </span>

            {lastUpdated && <p className="text-[11px] text-gray-300 mt-2">{t('tarjeta.lastUpdated', { date: lastUpdated })}</p>}
          </div>
        </div>

        {error && <p className="text-xs text-red-500 text-center mt-3">{t('tarjeta.errorGenerating')}</p>}

        <div className="flex gap-3 mt-5 pb-2">
          <button
            onClick={handleShare}
            disabled={busy !== null}
            className="flex-1 py-3 rounded-full font-semibold text-white text-sm border-0 cursor-pointer flex items-center justify-center gap-2"
            style={{ background: busy === 'share' ? '#C4B5FD' : '#7C3AED' }}
          >
            <Share2 size={15} /> {busy === 'share' ? t('tarjeta.generating') : t('tarjeta.share')}
          </button>
          <button
            onClick={handleDownload}
            disabled={busy !== null}
            className="flex-1 py-3 rounded-full font-semibold text-sm cursor-pointer flex items-center justify-center gap-2"
            style={{ background: '#F5F3FF', color: '#7C3AED', border: '1.5px solid #DDD6FE' }}
          >
            <Download size={15} /> {busy === 'download' ? t('tarjeta.generating') : t('tarjeta.download')}
          </button>
        </div>
      </div>
    </div>
  )
}
