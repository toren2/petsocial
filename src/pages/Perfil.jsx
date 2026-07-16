import React, { useState, useEffect, useRef } from 'react'
import { Camera, User, Calendar, Maximize2, Users, Zap, MapPin, Grid3x3, Bookmark, Save, X, ChevronLeft, ChevronRight, Heart, Syringe, ArrowLeft, CheckCircle2, Trophy, ShieldAlert, Settings, Newspaper, Plus } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'
import Vacunas from '../components/Vacunas'
import Verificacion from '../components/Verificacion'
import VerifiedBadge from '../components/VerifiedBadge'
import HuellasBadge from '../components/HuellasBadge'
import BadgesModal from '../components/BadgesModal'
import CreatePostModal from '../components/CreatePostModal'
import Configuracion from './Configuracion'

function getVaccineStatus(list) {
  if (!list || list.length === 0) return 'none'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const hasOverdue = list.some(v => v.next_due_date && new Date(`${v.next_due_date}T00:00:00`) < today)
  return hasOverdue ? 'overdue' : 'ok'
}

function isProfileComplete(p, photosCount) {
  return !!(
    p.pet_name && p.breed && p.species && p.age > 0 && p.size && p.sex &&
    p.energy && p.location && p.about && p.interests?.length > 0 && photosCount > 0
  )
}

const INTERESTS = [
  { key: 'playful', emoji: '🎾' },
  { key: 'walks', emoji: '🚶' },
  { key: 'beach', emoji: '🏖️' },
  { key: 'treats', emoji: '🦴' },
  { key: 'sleepy', emoji: '😴' },
  { key: 'goodWithKids', emoji: '🧒' },
  { key: 'social', emoji: '🐾' },
  { key: 'water', emoji: '💦' },
  { key: 'hiking', emoji: '🏔️' },
  { key: 'toys', emoji: '🧸' },
]

const SPECIES  = ['Perro', 'Gato', 'Conejo', 'Ave', 'Otro']
const SIZES    = ['Pequeño', 'Mediano', 'Grande']
const SEXES    = ['Macho', 'Hembra']
const ENERGIES = ['Tranquilo', 'Activo', 'Hiperactivo']
const EMOJIS   = ['🐕', '🐩', '🦮', '🐕‍🦺', '🦊', '🐈', '🐇', '🦜']
const ADMIN_EMAIL = 'josiplopez23@gmail.com'

function PhotoViewer({ posts, startIndex, onClose }) {
  const { t } = useLanguage()
  const [index, setIndex] = useState(startIndex)
  const post = posts[index]
  if (!post) return null
  return (
    <div className="absolute inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button onClick={onClose} className="border-0 bg-transparent cursor-pointer text-white"><X size={24} /></button>
        <span className="text-white text-sm font-medium">{index + 1} / {posts.length}</span>
        <div style={{ width: 24 }} />
      </div>
      <div className="flex-1 relative flex items-center justify-center">
        {post.image_url ? <img src={post.image_url} alt="post" className="w-full h-full object-contain" /> : <div className="text-8xl">{post.pet_emoji || '🐕'}</div>}
        {index > 0 && <button onClick={() => setIndex(i => i - 1)} className="absolute left-3 border-0 bg-black/40 rounded-full p-2 cursor-pointer text-white"><ChevronLeft size={22} /></button>}
        {index < posts.length - 1 && <button onClick={() => setIndex(i => i + 1)} className="absolute right-3 border-0 bg-black/40 rounded-full p-2 cursor-pointer text-white"><ChevronRight size={22} /></button>}
      </div>
      {post.caption && (
        <div className="px-4 py-3 bg-black/60 flex-shrink-0">
          <p className="text-white text-sm leading-relaxed">{post.caption}</p>
          <div className="flex items-center gap-1 mt-2 text-white/70 text-xs"><Heart size={13} /><span>{post.likes} {t('perfil.likes')}</span></div>
        </div>
      )}
    </div>
  )
}

export default function Perfil({ onSignOut, onNavigate, initialOpenVacunas, onConsumeInitialOpenVacunas }) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingPetPhoto, setUploadingPetPhoto] = useState(false)
  const [stats, setStats] = useState({ posts: 0, matches: 0, reviews: 0 })
  const [myPosts, setMyPosts] = useState([])
  const [savedPosts, setSavedPosts] = useState([])
  const [activeTab, setActiveTab] = useState('posts')
  const [petPhotos, setPetPhotos] = useState([])
  const [viewingPhoto, setViewingPhoto] = useState(null)
  const [viewingSavedPhoto, setViewingSavedPhoto] = useState(null)
  const [showInfo, setShowInfo] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [showVacunasModal, setShowVacunasModal] = useState(false)
  const [showBadgesModal, setShowBadgesModal] = useState(false)
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [vaccineStatus, setVaccineStatus] = useState('none')
  const [huellasPoints, setHuellasPoints] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const bonusClaimedRef = useRef(false)
  const fileInputRef = useRef(null)
  const petPhotoRef = useRef(null)
  const [form, setForm] = useState({
    pet_name: '', breed: '', species: 'Perro', age: '',
    size: 'Mediano', sex: 'Macho', energy: 'Activo',
    good_with: 'Perros y personas', purpose: 'Amigos',
    location: '', about: '', emoji: '🐕', avatar_url: '',
    esterilizado: false, interests: [],
  })

  useEffect(() => { fetchProfile(); fetchStats(); fetchMyPosts(); fetchPetPhotos(); fetchSavedPosts(); fetchVaccinesStatus(); fetchHuellas() }, [])

  // Al tocar una notificacion de recordatorio de vacuna, abrimos el modal
  // de Vacunas automaticamente en vez de dejar al usuario en el perfil sin
  // contexto de por que llego aqui.
  useEffect(() => {
    if (!initialOpenVacunas) return
    setShowVacunasModal(true)
    onConsumeInitialOpenVacunas && onConsumeInitialOpenVacunas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOpenVacunas])

  useEffect(() => {
    if (bonusClaimedRef.current) return
    if (!profile) return
    if (isProfileComplete(profile, petPhotos.length)) {
      bonusClaimedRef.current = true
      supabase.rpc('claim_profile_complete_bonus').then(() => fetchHuellas())
    }
  }, [profile, petPhotos])

  async function fetchVaccinesStatus() {
    const { data } = await supabase.from('vaccines').select('next_due_date').eq('user_id', user.id)
    setVaccineStatus(getVaccineStatus(data))
  }

  async function fetchHuellas() {
    const { data } = await supabase.from('user_huellas_totals').select('total_points').eq('user_id', user.id).maybeSingle()
    setHuellasPoints(data?.total_points || 0)
  }

  function toggleInterest(key) {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(key) ? f.interests.filter(k => k !== key) : [...f.interests, key],
    }))
  }

  async function fetchProfile() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setProfile(data)
      setForm({
        pet_name:   data.pet_name   || '',
        breed:      data.breed      || '',
        species:    data.species    || 'Perro',
        age:        data.age        || '',
        size:       data.size       || 'Mediano',
        sex:        data.sex        || 'Macho',
        energy:     data.energy     || 'Activo',
        good_with:  data.good_with  || 'Perros y personas',
        purpose:    data.purpose    || 'Amigos',
        location:   data.location   || '',
        about:      data.about      || '',
        emoji:      data.emoji      || '🐕',
        avatar_url: data.avatar_url || '',
        esterilizado: data.esterilizado || false,
        interests: data.interests || [],
      })
    } else {
      setEditing(true)
    }
    setLoading(false)
  }

  async function fetchStats() {
    const [{ count: posts }, { count: matches }, { count: reviews }] = await Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('matches').select('*', { count: 'exact', head: true }).or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ])
    setStats({ posts: posts || 0, matches: matches || 0, reviews: reviews || 0 })
  }

  async function fetchMyPosts() {
    const { data } = await supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (data) setMyPosts(data)
  }

  async function fetchSavedPosts() {
    const { data: saves } = await supabase.from('saved_posts').select('post_id').eq('user_id', user.id).order('created_at', { ascending: false })
    if (!saves || saves.length === 0) { setSavedPosts([]); return }
    const ids = saves.map(s => s.post_id)
    const { data: posts } = await supabase.from('posts').select('*').in('id', ids)
    if (posts) {
      const ordered = ids.map(id => posts.find(p => p.id === id)).filter(Boolean)
      setSavedPosts(ordered)
    }
  }

  async function fetchPetPhotos() {
    const { data } = await supabase.from('pet_photos').select('*').eq('user_id', user.id).order('order_index', { ascending: true })
    if (data) setPetPhotos(data)
  }

  async function deletePost(post) {
    if (!window.confirm(t('perfil.deletePostConfirm'))) return
    await supabase.from('posts').delete().eq('id', post.id)
    if (post.image_url) {
      const path = post.image_url.split('/posts/')[1]
      if (path) await supabase.storage.from('posts').remove([path])
    }
    setMyPosts(prev => prev.filter(p => p.id !== post.id))
    setStats(s => ({ ...s, posts: s.posts - 1 }))
  }

  async function unsavePost(postId) {
    await supabase.from('saved_posts').delete().eq('post_id', postId).eq('user_id', user.id)
    setSavedPosts(prev => prev.filter(p => p.id !== postId))
  }

  async function uploadPhoto(file) {
    setUploadingPhoto(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`
      setForm(f => ({ ...f, avatar_url: url }))
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
      setProfile(p => ({ ...p, avatar_url: url }))
    }
    setUploadingPhoto(false)
  }

  async function uploadPetPhoto(file) {
    if (petPhotos.length >= 5) { alert(t('perfil.maxPhotosAlert')); return }
    setUploadingPetPhoto(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('pet-photos').upload(path, file)
    if (!error) {
      const { data } = supabase.storage.from('pet-photos').getPublicUrl(path)
      await supabase.from('pet_photos').insert([{ user_id: user.id, photo_url: data.publicUrl, order_index: petPhotos.length }])
      fetchPetPhotos()
    }
    setUploadingPetPhoto(false)
  }

  async function deletePetPhoto(photo) {
    const path = photo.photo_url.split('/pet-photos/')[1]
    if (path) await supabase.storage.from('pet-photos').remove([path])
    await supabase.from('pet_photos').delete().eq('id', photo.id)
    fetchPetPhotos()
  }

  async function saveProfile() {
    setSaving(true)
    const { error } = await supabase.from('profiles').upsert({
      id: user.id, ...form,
      age: parseInt(form.age) || 0,
      birthdate: user.user_metadata?.birthdate || null,
      updated_at: new Date().toISOString(),
    })
    if (!error) {
      setProfile({ ...form, id: user.id })
      setEditing(false)
      fetchStats()
      fetchMyPosts()
    }
    setSaving(false)
  }

  function handle(k, v) { setForm(f => ({ ...f, [k]: v })) }

  if (loading) return (
    <div className="flex flex-col flex-1 items-center justify-center gap-3 text-gray-400">
      <span className="text-4xl">🐾</span>
      <p className="text-sm">{t('perfil.loadingProfile')}</p>
    </div>
  )

  if (editing) return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-900">{profile ? t('perfil.editProfile') : t('perfil.createProfile')}</h2>
        {profile && <button onClick={() => setEditing(false)} className="text-sm text-gray-400 border-0 bg-transparent cursor-pointer">{t('perfil.cancel')}</button>}
      </div>
      <div className="flex-1 overflow-y-auto bg-ps-bg px-4 py-4 flex flex-col gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-900 self-start">{t('perfil.profilePhoto')}</h3>
          <div className="relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            {form.avatar_url ? <img src={form.avatar_url} alt="avatar" className="w-24 h-24 rounded-full object-cover border-4 border-ps-purple-light" /> : <div className="w-24 h-24 rounded-full bg-ps-purple-light flex items-center justify-center text-5xl border-4 border-ps-purple-light">{form.emoji}</div>}
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-ps-purple rounded-full flex items-center justify-center border-2 border-white">
              {uploadingPhoto ? <span className="text-white text-xs">...</span> : <Camera size={14} color="white" />}
            </div>
          </div>
          <p className="text-xs text-gray-400">{t('perfil.tapToUpload')}</p>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('perfil.chooseEmoji')}</h3>
          <div className="flex gap-2 flex-wrap">
            {EMOJIS.map(e => (
              <button key={e} onClick={() => handle('emoji', e)}
                className="text-2xl w-12 h-12 rounded-xl border-0 cursor-pointer flex items-center justify-center"
                style={{ background: form.emoji === e ? '#EDE9FE' : '#F9F7FF', border: form.emoji === e ? '2px solid #7C3AED' : '2px solid transparent' }}
              >{e}</button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-gray-900">{t('perfil.basicInfo')}</h3>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('perfil.petName')}</label>
            <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-ps-bg" placeholder={t('perfil.petNamePlaceholder')} value={form.pet_name} onChange={e => handle('pet_name', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('perfil.breed')}</label>
            <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-ps-bg" placeholder={t('perfil.breedPlaceholder')} value={form.breed} onChange={e => handle('breed', e.target.value)} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('perfil.species')}</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-ps-bg" value={form.species} onChange={e => handle('species', e.target.value)}>
                {SPECIES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('perfil.ageYears')}</label>
              <input type="number" min="0" max="30" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-ps-bg" placeholder="2" value={form.age} onChange={e => handle('age', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('perfil.size')}</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-ps-bg" value={form.size} onChange={e => handle('size', e.target.value)}>
                {SIZES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('perfil.sex')}</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-ps-bg" value={form.sex} onChange={e => handle('sex', e.target.value)}>
                {SEXES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('perfil.energyLevel')}</label>
            <div className="flex gap-2">
              {ENERGIES.map(e => (
                <button key={e} onClick={() => handle('energy', e)}
                  className="flex-1 py-2 rounded-xl text-xs font-medium border-0 cursor-pointer"
                  style={{ background: form.energy === e ? '#7C3AED' : '#EDE9FE', color: form.energy === e ? 'white' : '#7C3AED' }}
                >{e}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('perfil.location')}</label>
            <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-ps-bg" placeholder={t('perfil.locationPlaceholder')} value={form.location} onChange={e => handle('location', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('perfil.about')}</label>
            <textarea className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-ps-bg resize-none" placeholder={t('perfil.aboutPlaceholder')} rows={3} value={form.about} onChange={e => handle('about', e.target.value)} />
          </div>
          <button
            onClick={() => handle('esterilizado', !form.esterilizado)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-ps-bg cursor-pointer"
            style={{ border: 'none' }}
          >
            <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <CheckCircle2 size={16} className={form.esterilizado ? 'text-green-600' : 'text-gray-300'} />
              {t('perfil.sterilizedToggle')}
            </span>
            <div className="w-10 h-6 rounded-full relative transition-colors" style={{ background: form.esterilizado ? '#16A34A' : '#D1D5DB' }}>
              <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform" style={{ left: form.esterilizado ? 18 : 2 }} />
            </div>
          </button>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('perfil.interests')}</h3>
          <div className="flex gap-2 flex-wrap">
            {INTERESTS.map(({ key, emoji }) => (
              <button
                key={key}
                onClick={() => toggleInterest(key)}
                className="text-xs font-medium px-3 py-1.5 rounded-full border-0 cursor-pointer flex items-center gap-1"
                style={{
                  background: form.interests.includes(key) ? '#EDE9FE' : '#F3F4F6',
                  color: form.interests.includes(key) ? '#7C3AED' : '#6B7280',
                  border: form.interests.includes(key) ? '1.5px solid #7C3AED' : '1.5px solid transparent',
                }}
              >
                <span>{emoji}</span> {t(`perfil.interest_${key}`)}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={saveProfile}
          disabled={saving || !form.pet_name}
          className="w-full py-3.5 rounded-full font-semibold text-white text-base border-0 cursor-pointer flex items-center justify-center gap-2"
          style={{ background: saving || !form.pet_name ? '#C4B5FD' : '#7C3AED' }}
        >
          <Save size={16} />
          {saving ? t('perfil.saving') : t('perfil.saveProfile')}
        </button>
        <button onClick={onSignOut} className="w-full py-3 rounded-full text-sm text-gray-400 border border-gray-200 bg-white cursor-pointer">{t('perfil.signOut')}</button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="flex items-center gap-4 px-4 py-4">
          <button
            onClick={() => setShowSettings(true)}
            className="absolute top-3 right-4 z-10 border-0 bg-transparent cursor-pointer text-gray-400"
          >
            <Settings size={20} />
          </button>
          <button
            onClick={() => onNavigate?.('feed')}
            className="absolute top-2.5 right-14 z-10 w-8 h-8 rounded-full flex items-center justify-center border-0 cursor-pointer"
            style={{ background: '#7C3AED', boxShadow: '0 2px 8px rgba(124,58,237,0.4)' }}
            title={t('perfil.goToFeed')}
          >
            <Newspaper size={16} color="white" />
          </button>
          <div className="relative flex-shrink-0 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="w-20 h-20 rounded-full object-cover border-2 border-ps-purple-light" />
            ) : (
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl" style={{ background: '#EDE9FE' }}>{profile.emoji}</div>
            )}
            <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white" style={{ background: '#7C3AED' }}>
              {uploadingPhoto ? <span className="text-white text-xs">...</span> : <Camera size={13} color="white" />}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-gray-900 text-lg flex items-center gap-1">
              {profile.pet_name} <VerifiedBadge verified={isVerified} size={16} />
            </div>
            <div className="text-sm text-gray-500">{profile.breed} · {t('perfil.ageValue', { age: profile.age })} · {profile.sex}</div>
            {profile.location && <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin size={11} /> {profile.location}</div>}
            <div className="mt-1.5"><HuellasBadge points={huellasPoints} size="sm" /></div>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {profile.esterilizado && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: '#DCFCE7', color: '#16A34A' }}>
                  <CheckCircle2 size={10} /> {t('perfil.sterilized')}
                </span>
              )}
              {vaccineStatus === 'ok' && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: '#DBEAFE', color: '#3B82F6' }}>
                  <Syringe size={10} /> {t('perfil.vaccinesUpToDate')}
                </span>
              )}
              {vaccineStatus === 'overdue' && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: '#FEF3C7', color: '#D97706' }}>
                  <Syringe size={10} /> {t('perfil.vaccinesOverdue')}
                </span>
              )}
              {vaccineStatus === 'none' && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: '#F3F4F6', color: '#9CA3AF' }}>
                  <Syringe size={10} /> {t('perfil.vaccinesNone')}
                </span>
              )}
            </div>
            <div className="flex gap-4 mt-2">
              {[['posts', t('perfil.posts')], ['matches', t('perfil.matches')], ['reviews', t('perfil.reviews')]].map(([k, label]) => (
                <div key={label} className="text-center">
                  <div className="font-bold text-gray-900 text-sm">{stats[k]}</div>
                  <div className="text-xs text-gray-400">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {profile.about && <div className="px-4 pb-3"><p className="text-sm text-gray-700 leading-relaxed">{profile.about}</p></div>}

        {profile.interests?.length > 0 && (
          <div className="px-4 pb-3 flex gap-1.5 flex-wrap">
            {profile.interests.map(key => {
              const preset = INTERESTS.find(i => i.key === key)
              return (
                <span key={key} className="text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                  {preset?.emoji} {t(`perfil.interest_${key}`)}
                </span>
              )
            })}
          </div>
        )}

        <div className="px-4 pb-3 flex gap-2">
          <button onClick={() => setEditing(true)} className="flex-1 py-2 rounded-xl text-xs font-semibold border border-gray-200 bg-gray-50 cursor-pointer text-gray-700">{t('perfil.editProfile')}</button>
          <button onClick={() => setShowInfo(s => !s)} className="flex-1 py-2 rounded-xl text-xs font-semibold border border-gray-200 bg-gray-50 cursor-pointer text-gray-700">{showInfo ? t('perfil.hideInfo') : t('perfil.viewInfo')}</button>
          <button onClick={onSignOut} className="py-2 px-3 rounded-xl text-xs font-semibold border border-gray-200 bg-gray-50 cursor-pointer text-gray-500">{t('perfil.exit')}</button>
        </div>

        {showInfo && (
          <div className="mx-4 mb-3 rounded-2xl border border-gray-100 overflow-hidden">
            {[
              [User, t('perfil.name'), profile.pet_name],
              [Calendar, t('perfil.age'), t('perfil.ageValue', { age: profile.age })],
              ['🐾', t('perfil.breed'), profile.breed],
              ['🐕', t('perfil.species2'), profile.species],
              [Maximize2, t('perfil.size2'), profile.size],
              [Zap, t('perfil.energy'), profile.energy],
              [Users, t('perfil.getsAlongWith'), profile.good_with],
              [MapPin, t('perfil.location'), profile.location],
            ].map(([Icon, label, value]) => (
              <div key={label} className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100 last:border-0 text-sm bg-white">
                <span className="text-gray-400 flex items-center gap-2">
                  {typeof Icon === 'string' ? <span>{Icon}</span> : <Icon size={15} />}
                  {label}
                </span>
                <span className="font-medium text-gray-800 text-right max-w-[55%]">{value}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setShowVacunasModal(true)}
          className="w-full flex items-center justify-between px-4 py-2.5 border-0 bg-transparent cursor-pointer text-left"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Syringe size={15} className="text-ps-purple" /> {t('vacunas.title')}
          </span>
          <ChevronRight size={16} className="text-gray-300" />
        </button>

        <button
          onClick={() => setShowBadgesModal(true)}
          className="w-full flex items-center justify-between px-4 py-2.5 border-0 bg-transparent cursor-pointer text-left"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Trophy size={15} className="text-ps-purple" /> {t('badges.title')}
          </span>
          <ChevronRight size={16} className="text-gray-300" />
        </button>

        {user?.email === ADMIN_EMAIL && (
          <button
            onClick={() => onNavigate?.('admin')}
            className="w-full flex items-center justify-between px-4 py-2.5 border-0 bg-transparent cursor-pointer text-left"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <ShieldAlert size={15} className="text-ps-purple" /> Moderación
            </span>
            <ChevronRight size={16} className="text-gray-300" />
          </button>
        )}

        <Verificacion onStatusChange={setIsVerified} />

        {/* Tabs Posts / Guardados */}
        <div className="border-t border-gray-100 flex items-center">
          <button
            onClick={() => setActiveTab('posts')}
            className="flex-1 flex items-center justify-center py-2.5 border-0 bg-transparent cursor-pointer border-b-2"
            style={{ borderBottomColor: activeTab === 'posts' ? '#7C3AED' : 'transparent' }}
          >
            <Grid3x3 size={16} color={activeTab === 'posts' ? '#7C3AED' : '#9CA3AF'} />
          </button>
          <button
            onClick={() => setShowCreatePost(true)}
            className="flex items-center justify-center border-0 cursor-pointer flex-shrink-0 rounded-full mx-3"
            style={{ width: 30, height: 30, background: '#7C3AED', boxShadow: '0 2px 8px rgba(124,58,237,0.4)' }}
            title={t('perfil.newPost')}
          >
            <Plus size={17} color="white" />
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className="flex-1 flex items-center justify-center py-2.5 border-0 bg-transparent cursor-pointer border-b-2"
            style={{ borderBottomColor: activeTab === 'saved' ? '#7C3AED' : 'transparent' }}
          >
            <Bookmark size={16} color={activeTab === 'saved' ? '#7C3AED' : '#9CA3AF'} />
          </button>
        </div>

        {activeTab === 'posts' && (
          myPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
              <span className="text-4xl">📸</span>
              <p className="text-sm">{t('perfil.noPostsYet')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5">
              {myPosts.map((p, i) => (
                <div key={p.id} className="aspect-square overflow-hidden relative" style={{ background: '#EDE9FE' }}>
                  <div onClick={() => setViewingPhoto(i)} className="w-full h-full cursor-pointer">
                    {p.image_url ? <img src={p.image_url} alt="post" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl">{p.pet_emoji || '🐕'}</div>}
                  </div>
                  <button onClick={e => { e.stopPropagation(); deletePost(p) }} className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center border-0 cursor-pointer" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <span style={{ color: 'white', fontSize: 12 }}>✕</span>
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'saved' && (
          savedPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
              <Bookmark size={36} className="text-gray-200" />
              <p className="text-sm">{t('perfil.noSavedPosts')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5">
              {savedPosts.map((p, i) => (
                <div key={p.id} className="aspect-square overflow-hidden relative" style={{ background: '#EDE9FE' }}>
                  <div onClick={() => setViewingSavedPhoto(i)} className="w-full h-full cursor-pointer">
                    {p.image_url ? <img src={p.image_url} alt="post" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl">{p.pet_emoji || '🐕'}</div>}
                  </div>
                  <button onClick={e => { e.stopPropagation(); unsavePost(p.id) }} className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center border-0 cursor-pointer" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <Bookmark size={11} color="white" fill="white" />
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {/* Fotos de match */}
        <div className="px-4 pt-4 pb-3 border-t border-gray-100 mt-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">{t('perfil.matchPhotos', { count: petPhotos.length })}</h3>
            {petPhotos.length < 5 && (
              <button
                onClick={() => petPhotoRef.current?.click()}
                className="text-xs font-semibold border-0 cursor-pointer px-3 py-1.5 rounded-full"
                style={{ background: '#EDE9FE', color: '#7C3AED' }}
              >
                {uploadingPetPhoto ? t('perfil.uploading') : t('perfil.addPhoto')}
              </button>
            )}
            <input ref={petPhotoRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadPetPhoto(e.target.files[0])} />
          </div>
          {petPhotos.length === 0 ? (
            <div onClick={() => petPhotoRef.current?.click()} className="flex flex-col items-center justify-center gap-2 rounded-2xl cursor-pointer border-2 border-dashed border-gray-200 py-6">
              <span className="text-3xl">📸</span>
              <p className="text-xs text-gray-400 text-center">{t('perfil.addUpToPhotos')}</p>
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {petPhotos.map(photo => (
                <div key={photo.id} className="relative flex-shrink-0" style={{ width: 100, height: 100 }}>
                  <img src={photo.photo_url} alt="pet" className="w-full h-full object-cover rounded-2xl" />
                  <button
                    onClick={() => deletePetPhoto(photo)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center border-0 cursor-pointer"
                    style={{ background: 'rgba(0,0,0,0.5)' }}
                  >
                    <span style={{ color: 'white', fontSize: 12 }}>✕</span>
                  </button>
                </div>
              ))}
              {petPhotos.length < 5 && (
                <div onClick={() => petPhotoRef.current?.click()} className="flex-shrink-0 flex items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 cursor-pointer" style={{ width: 100, height: 100 }}>
                  <span className="text-2xl text-gray-300">+</span>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {viewingPhoto !== null && (
        <PhotoViewer posts={myPosts} startIndex={viewingPhoto} onClose={() => setViewingPhoto(null)} />
      )}
      {viewingSavedPhoto !== null && (
        <PhotoViewer posts={savedPosts} startIndex={viewingSavedPhoto} onClose={() => setViewingSavedPhoto(null)} />
      )}

      {showCreatePost && (
        <CreatePostModal
          profile={profile}
          onClose={() => setShowCreatePost(false)}
          onCreate={post => {
            setMyPosts(prev => [post, ...prev])
            setStats(s => ({ ...s, posts: s.posts + 1 }))
            setActiveTab('posts')
          }}
        />
      )}

      {showVacunasModal && (
        <div className="absolute inset-0 bg-white z-50 flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <button onClick={() => setShowVacunasModal(false)} className="border-0 bg-transparent cursor-pointer text-ps-purple">
              <ArrowLeft size={22} />
            </button>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
              <Syringe size={17} className="text-ps-purple" /> {t('vacunas.title')}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto bg-white pt-3">
            <Vacunas hideTitle />
          </div>
        </div>
      )}

      {showBadgesModal && (
        <BadgesModal userId={user.id} onBack={() => setShowBadgesModal(false)} />
      )}

      {showSettings && (
        <Configuracion onBack={() => setShowSettings(false)} onSignOut={onSignOut} />
      )}
    </div>
  )
}
