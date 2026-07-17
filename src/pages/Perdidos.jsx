import React, { useState, useEffect, useRef } from 'react'
import { AlertTriangle, Camera, MapPin, X, Plus, MessageCircle, CheckCircle, Clock } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'
import { usePullToRefresh } from '../usePullToRefresh'
import PullToRefreshIndicator from '../components/PullToRefreshIndicator'
import MediaEditor from '../components/MediaEditor'
import MediaSourceSheet from '../components/MediaSourceSheet'

const SPECIES = ['Perro', 'Gato', 'Conejo', 'Ave', 'Otro']

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function timeAgo(dateStr, t) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffH = Math.floor(diffMs / 3600000)
  if (diffH < 1) return t('perdidos.timeAgoMoment')
  if (diffH < 24) return t('perdidos.timeAgoHours', { h: diffH })
  const diffD = Math.floor(diffH / 24)
  return t('perdidos.timeAgoDays', { d: diffD })
}

export default function Perdidos({ onNavigate }) {
  const { user, pets } = useAuth()
  const { t } = useLanguage()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [selected, setSelected] = useState(null)
  const [editingPhotoFile, setEditingPhotoFile] = useState(null)
  const [showPhotoSheet, setShowPhotoSheet] = useState(false)
  const [form, setForm] = useState({
    pet_name: '', species: 'Perro', breed: '', description: '',
    photo_url: '', last_seen_lat: null, last_seen_lng: null, last_seen_address: '',
  })

  useEffect(() => {
    fetchReports()
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      )
    }
  }, [])

  async function fetchReports() {
    setLoading(true)
    const { data } = await supabase
      .from('lost_pets')
      .select('*')
      .eq('status', 'perdido')
      .order('created_at', { ascending: false })
    if (data) setReports(data)
    setLoading(false)
  }

  function useMyLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => setForm(f => ({ ...f, last_seen_lat: pos.coords.latitude, last_seen_lng: pos.coords.longitude })),
      () => alert(t('perdidos.noLocationAlert')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  async function uploadPhoto(file) {
    setUploadingPhoto(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/lost-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('pet-photos').upload(path, file)
    if (!error) {
      const { data } = supabase.storage.from('pet-photos').getPublicUrl(path)
      setForm(f => ({ ...f, photo_url: data.publicUrl }))
    }
    setUploadingPhoto(false)
  }

  function handle(k, v) { setForm(f => ({ ...f, [k]: v })) }

  // Fase 2 de mascotas multiples: si el dueno ya tiene sus mascotas
  // cargadas en la app, dejamos prellenar el reporte con un tap en vez de
  // volver a escribir nombre/especie/raza/foto a mano. El reporte sigue
  // siendo su propia fila independiente (no se guarda pet_id) -- esto es
  // solo una ayuda de formulario.
  function fillFromPet(pet) {
    setForm(f => ({
      ...f,
      pet_name: pet.pet_name || f.pet_name,
      species: pet.species || f.species,
      breed: pet.breed || '',
      photo_url: pet.avatar_url || f.photo_url,
    }))
  }

  async function saveReport() {
    if (!form.pet_name.trim()) return
    setSaving(true)
    const { error } = await supabase.from('lost_pets').insert([{
      user_id: user.id,
      pet_name: form.pet_name.trim(),
      species: form.species,
      breed: form.breed || null,
      photo_url: form.photo_url || null,
      description: form.description || null,
      last_seen_lat: form.last_seen_lat,
      last_seen_lng: form.last_seen_lng,
      last_seen_address: form.last_seen_address || null,
    }])
    if (!error) {
      setForm({ pet_name: '', species: 'Perro', breed: '', description: '', photo_url: '', last_seen_lat: null, last_seen_lng: null, last_seen_address: '' })
      setShowForm(false)
      fetchReports()
    }
    setSaving(false)
  }

  async function markAsFound(id) {
    if (!window.confirm(t('perdidos.markFoundConfirm'))) return
    await supabase.from('lost_pets').update({ status: 'encontrado', resolved_at: new Date().toISOString() }).eq('id', id)
    setReports(prev => prev.filter(r => r.id !== id))
    setSelected(null)
  }

  async function contactOwner(report) {
    if (!user || report.user_id === user.id) return

    const { data: block } = await supabase
      .from('blocked_users')
      .select('id')
      .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${report.user_id}),and(blocker_id.eq.${report.user_id},blocked_id.eq.${user.id})`)
      .maybeSingle()
    if (block) { alert(t('perdidos.cannotContactAlert')); return }

    const { data: existing } = await supabase
      .from('matches')
      .select('id')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${report.user_id}),and(user1_id.eq.${report.user_id},user2_id.eq.${user.id})`)
      .maybeSingle()

    if (!existing) {
      await supabase.from('matches').upsert(
        [{ user1_id: user.id, user2_id: report.user_id }],
        { onConflict: 'user1_id,user2_id', ignoreDuplicates: true }
      )
    }
    alert(t('perdidos.conversationOpenedAlert', { name: report.pet_name }))
    onNavigate('chat')
  }

  let list = [...reports]
  if (userLocation) {
    list = list.map(r => ({
      ...r,
      distance: (r.last_seen_lat && r.last_seen_lng)
        ? getDistance(userLocation.lat, userLocation.lng, r.last_seen_lat, r.last_seen_lng)
        : null,
    })).sort((a, b) => {
      if (a.distance == null) return 1
      if (b.distance == null) return -1
      return a.distance - b.distance
    })
  }

  const { containerRef: perdidosScrollRef, pullDistance, refreshing, threshold } = usePullToRefresh(fetchReports)

  if (selected) {
    const isOwner = selected.user_id === user.id
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
          <button onClick={() => setSelected(null)} className="border-0 bg-transparent cursor-pointer text-ps-purple">
            <X size={22} />
          </button>
          <h2 className="text-lg font-bold text-gray-900">{t('perdidos.detailTitle')}</h2>
        </div>
        <div className="flex-1 overflow-y-auto bg-ps-bg">
          {selected.photo_url ? (
            <img src={selected.photo_url} alt={selected.pet_name} className="w-full object-cover" style={{ height: 240 }} />
          ) : (
            <div className="w-full flex items-center justify-center text-6xl" style={{ height: 200, background: '#FEE2E2' }}>🐾</div>
          )}
          <div className="p-4 flex flex-col gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: '#FEE2E2', color: '#DC2626' }}>{t('perdidos.statusLost')}</span>
                <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={11} /> {timeAgo(selected.created_at, t)}</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mt-2">{selected.pet_name}</h3>
              <p className="text-sm text-gray-500">{selected.species}{selected.breed ? ` · ${selected.breed}` : ''}</p>
            </div>

            {selected.description && (
              <div className="bg-white rounded-2xl p-3 border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-1">{t('perdidos.description')}</p>
                <p className="text-sm text-gray-700 leading-relaxed">{selected.description}</p>
              </div>
            )}

            {(selected.last_seen_address || selected.last_seen_lat) && (
              <div className="bg-white rounded-2xl p-3 border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1"><MapPin size={12} /> {t('perdidos.lastSeen')}</p>
                <p className="text-sm text-gray-700">{selected.last_seen_address || t('perdidos.locationOnMap')}</p>
                {selected.distance != null && <p className="text-xs text-gray-400 mt-0.5">{t('perdidos.distanceFromYou', { distance: selected.distance.toFixed(1) })}</p>}
              </div>
            )}

            {isOwner ? (
              <button
                onClick={() => markAsFound(selected.id)}
                className="w-full py-3 rounded-full font-semibold text-white text-sm border-0 cursor-pointer flex items-center justify-center gap-2"
                style={{ background: '#16A34A' }}
              >
                <CheckCircle size={16} /> {t('perdidos.markAsFound')}
              </button>
            ) : (
              <button
                onClick={() => contactOwner(selected)}
                className="w-full py-3 rounded-full font-semibold text-white text-sm border-0 cursor-pointer flex items-center justify-center gap-2"
                style={{ background: '#7C3AED' }}
              >
                <MessageCircle size={16} /> {t('perdidos.contactOwner')}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-1.5"><AlertTriangle size={18} color="#DC2626" /> {t('perdidos.title')}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{t('perdidos.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="text-xs font-semibold border-0 cursor-pointer px-3 py-2 rounded-full flex items-center gap-1 flex-shrink-0"
          style={{ background: showForm ? '#F3F4F6' : '#FEE2E2', color: showForm ? '#6B7280' : '#DC2626' }}
        >
          {showForm ? <X size={13} /> : <Plus size={13} />}
          {showForm ? t('perdidos.close') : t('perdidos.report')}
        </button>
      </div>

      <div ref={perdidosScrollRef} className="flex-1 overflow-y-auto bg-ps-bg px-4 py-3">
        <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} threshold={threshold} />
        {showForm && (
          <div className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 flex flex-col gap-3">
            <h3 className="text-sm font-bold text-gray-900">{t('perdidos.reportFormTitle')}</h3>

            {pets && pets.length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('perdidos.fillFromPet')}</label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {pets.map(pet => (
                    <button
                      key={pet.id}
                      onClick={() => fillFromPet(pet)}
                      className="flex items-center gap-1.5 flex-shrink-0 border border-gray-200 rounded-full pl-1 pr-3 py-1 cursor-pointer bg-white"
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: '#FEE2E2' }}>
                        {pet.avatar_url ? (
                          <img src={pet.avatar_url} alt={pet.pet_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs">{pet.emoji || '🐾'}</span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-gray-700">{pet.pet_name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 cursor-pointer overflow-hidden"
                style={{ background: '#FEE2E2' }}
                onClick={() => setShowPhotoSheet(true)}
              >
                {form.photo_url ? <img src={form.photo_url} alt="foto" className="w-full h-full object-cover" /> : <Camera size={20} color="#DC2626" />}
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 mb-1">{t('perdidos.photoOptional')}</p>
                <button onClick={() => setShowPhotoSheet(true)} className="text-xs font-semibold border-0 cursor-pointer px-3 py-1.5 rounded-full" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                  {uploadingPhoto ? t('perdidos.uploading') : t('perdidos.uploadPhoto')}
                </button>
              </div>
              <MediaSourceSheet
                open={showPhotoSheet}
                onClose={() => setShowPhotoSheet(false)}
                onSelect={file => setEditingPhotoFile(file)}
              />

              {editingPhotoFile && (
                <MediaEditor
                  file={editingPhotoFile}
                  onConfirm={file => { setEditingPhotoFile(null); uploadPhoto(file) }}
                  onCancel={() => setEditingPhotoFile(null)}
                />
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('perdidos.petName')}</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-ps-bg" placeholder={t('perdidos.petNamePlaceholder')} value={form.pet_name} onChange={e => handle('pet_name', e.target.value)} />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 mb-1 block">{t('perdidos.species')}</label>
                <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-ps-bg" value={form.species} onChange={e => handle('species', e.target.value)}>
                  {SPECIES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 mb-1 block">{t('perdidos.breedOptional')}</label>
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-ps-bg" placeholder={t('perdidos.breedPlaceholder')} value={form.breed} onChange={e => handle('breed', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('perdidos.descriptionLabel')}</label>
              <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-ps-bg resize-none" placeholder={t('perdidos.descriptionPlaceholder')} rows={3} value={form.description} onChange={e => handle('description', e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('perdidos.zoneOptional')}</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-ps-bg mb-2" placeholder={t('perdidos.zonePlaceholder')} value={form.last_seen_address} onChange={e => handle('last_seen_address', e.target.value)} />
              <button
                onClick={useMyLocation}
                className="text-xs font-semibold border-0 cursor-pointer px-3 py-1.5 rounded-full flex items-center gap-1"
                style={{ background: form.last_seen_lat ? '#DCFCE7' : '#EDE9FE', color: form.last_seen_lat ? '#16A34A' : '#7C3AED' }}
              >
                <MapPin size={12} /> {form.last_seen_lat ? t('perdidos.locationMarked') : t('perdidos.useMyLocation')}
              </button>
            </div>

            <button
              onClick={saveReport}
              disabled={saving || !form.pet_name.trim()}
              className="w-full py-3 rounded-full font-semibold text-white text-sm border-0 cursor-pointer"
              style={{ background: saving || !form.pet_name.trim() ? '#FCA5A5' : '#DC2626' }}
            >
              {saving ? t('perdidos.publishing') : t('perdidos.publishAlert')}
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
            <span className="text-4xl">🐾</span>
            <p className="text-sm">{t('perdidos.loadingAlerts')}</p>
          </div>
        ) : list.length === 0 ? (
          !showForm && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
              <span className="text-5xl">🐾</span>
              <p className="text-sm font-medium">{t('perdidos.noneReported')}</p>
              <p className="text-xs text-center px-8">{t('perdidos.noneReportedBody')}</p>
            </div>
          )
        ) : (
          <div className="flex flex-col gap-2">
            {list.map(r => (
              <div key={r.id} onClick={() => setSelected(r)} className="flex gap-3 bg-white rounded-2xl p-3 border border-gray-100 cursor-pointer active:bg-gray-50">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: '#FEE2E2' }}>
                  {r.photo_url ? <img src={r.photo_url} alt={r.pet_name} className="w-full h-full object-cover" /> : <span className="text-2xl">🐾</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <p className="font-bold text-sm text-gray-900">{r.pet_name}</p>
                    {r.distance != null && <span className="text-xs text-gray-400 flex-shrink-0">{r.distance.toFixed(1)} km</span>}
                  </div>
                  <p className="text-xs text-gray-400">{r.species}{r.breed ? ` · ${r.breed}` : ''}</p>
                  {r.last_seen_address && <p className="text-xs text-gray-400 truncate mt-0.5 flex items-center gap-1"><MapPin size={10} /> {r.last_seen_address}</p>}
                  <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1"><Clock size={10} /> {timeAgo(r.created_at, t)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
