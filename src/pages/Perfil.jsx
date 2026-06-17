import React, { useState, useEffect, useRef } from 'react'
import { Camera, User, Calendar, Maximize2, Users, Zap, MapPin, Grid3x3, Save } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'

const SPECIES  = ['Perro', 'Gato', 'Conejo', 'Ave', 'Otro']
const SIZES    = ['Pequeño', 'Mediano', 'Grande']
const SEXES    = ['Macho', 'Hembra']
const ENERGIES = ['Tranquilo', 'Activo', 'Hiperactivo']
const EMOJIS   = ['🐕', '🐩', '🦮', '🐕‍🦺', '🦊', '🐈', '🐇', '🦜']

export default function Perfil({ onSignOut }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [stats, setStats] = useState({ posts: 0, matches: 0, reviews: 0 })
  const [myPosts, setMyPosts] = useState([])
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({
    pet_name: '', breed: '', species: 'Perro', age: '',
    size: 'Mediano', sex: 'Macho', energy: 'Activo',
    good_with: 'Perros y personas', purpose: 'Amigos',
    location: '', about: '', emoji: '🐕', avatar_url: '',
  })

  useEffect(() => { fetchProfile(); fetchStats(); fetchMyPosts() }, [])

  async function fetchProfile() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
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
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setMyPosts(data)
  }

  async function uploadPhoto(file) {
    setUploadingPhoto(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`
      setForm(f => ({ ...f, avatar_url: url }))
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
      setProfile(p => ({ ...p, avatar_url: url }))
    }
    setUploadingPhoto(false)
  }

  async function saveProfile() {
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        ...form,
        age: parseInt(form.age) || 0,
        updated_at: new Date().toISOString(),
      })
    if (!error) {
      setProfile({ ...form, id: user.id })
      setEditing(false)
    }
    setSaving(false)
  }

  function handle(k, v) { setForm(f => ({ ...f, [k]: v })) }

  if (loading) return (
    <div className="flex flex-col flex-1 items-center justify-center gap-3 text-gray-400">
      <span className="text-4xl">🐾</span>
      <p className="text-sm">Cargando perfil...</p>
    </div>
  )

  if (editing) return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-900">
          {profile ? 'Editar perfil' : 'Crear perfil'}
        </h2>
        {profile && (
          <button onClick={() => setEditing(false)} className="text-sm text-gray-400 border-0 bg-transparent cursor-pointer">
            Cancelar
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-ps-bg px-4 py-4 flex flex-col gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-900 self-start">Foto de tu mascota</h3>
          <div className="relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="avatar" className="w-24 h-24 rounded-full object-cover border-4 border-ps-purple-light" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-ps-purple-light flex items-center justify-center text-5xl border-4 border-ps-purple-light">
                {form.emoji}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-ps-purple rounded-full flex items-center justify-center border-2 border-white">
              {uploadingPhoto ? <span className="text-white text-xs">...</span> : <Camera size={14} color="white" />}
            </div>
          </div>
          <p className="text-xs text-gray-400">Toca para subir una foto</p>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Elige un emoji</h3>
          <div className="flex gap-2 flex-wrap">
            {EMOJIS.map(e => (
              <button key={e} onClick={() => handle('emoji', e)}
                className="text-2xl w-12 h-12 rounded-xl border-0 cursor-pointer flex items-center justify-center"
                style={{ background: form.emoji === e ? '#EDE9FE' : '#F9F7FF', border: form.emoji === e ? '2px solid #7C3AED' : '2px solid transparent' }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-gray-900">Información básica</h3>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Nombre de tu mascota</label>
            <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-ps-bg" placeholder="ej. Hoshi" value={form.pet_name} onChange={e => handle('pet_name', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Raza</label>
            <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-ps-bg" placeholder="ej. Shih Tzu" value={form.breed} onChange={e => handle('breed', e.target.value)} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Especie</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-ps-bg" value={form.species} onChange={e => handle('species', e.target.value)}>
                {SPECIES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Edad (años)</label>
              <input type="number" min="0" max="30" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-ps-bg" placeholder="2" value={form.age} onChange={e => handle('age', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Tamaño</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-ps-bg" value={form.size} onChange={e => handle('size', e.target.value)}>
                {SIZES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Sexo</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-ps-bg" value={form.sex} onChange={e => handle('sex', e.target.value)}>
                {SEXES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Nivel de energía</label>
            <div className="flex gap-2">
              {ENERGIES.map(e => (
                <button key={e} onClick={() => handle('energy', e)}
                  className="flex-1 py-2 rounded-xl text-xs font-medium border-0 cursor-pointer"
                  style={{ background: form.energy === e ? '#7C3AED' : '#EDE9FE', color: form.energy === e ? 'white' : '#7C3AED' }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Ubicación</label>
            <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-ps-bg" placeholder="ej. Bella Vista, Ciudad de Panamá" value={form.location} onChange={e => handle('location', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Sobre tu mascota</label>
            <textarea className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-ps-bg resize-none" placeholder="Cuéntanos sobre tu mascota..." rows={3} value={form.about} onChange={e => handle('about', e.target.value)} />
          </div>
        </div>

        <button
          onClick={saveProfile}
          disabled={saving || !form.pet_name}
          className="w-full py-3.5 rounded-full font-semibold text-white text-base border-0 cursor-pointer flex items-center justify-center gap-2"
          style={{ background: saving || !form.pet_name ? '#C4B5FD' : '#7C3AED' }}
        >
          <Save size={16} />
          {saving ? 'Guardando...' : 'Guardar perfil'}
        </button>
        <button onClick={onSignOut} className="w-full py-3 rounded-full text-sm text-gray-400 border border-gray-200 bg-white cursor-pointer">
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div
        className="flex items-center gap-4 px-5 py-6 flex-shrink-0"
        style={{ background: 'linear-gradient(160deg, #6D28D9, #7C3AED)' }}
      >
        <div className="relative cursor-pointer flex-shrink-0" onClick={() => fileInputRef.current?.click()}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="avatar" className="w-20 h-20 rounded-full object-cover" style={{ border: '3px solid rgba(255,255,255,0.4)' }} />
          ) : (
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-5xl" style={{ background: 'rgba(255,255,255,0.2)', border: '3px solid rgba(255,255,255,0.4)' }}>
              {profile.emoji}
            </div>
          )}
          <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white" style={{ background: '#7C3AED' }}>
            {uploadingPhoto ? <span className="text-white text-xs">...</span> : <Camera size={13} color="white" />}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">{profile.pet_name}</h2>
          <p className="text-white/75 text-sm mt-0.5">{profile.breed} · {profile.age} años · {profile.sex}</p>
          <p className="text-white/60 text-xs mt-0.5 flex items-center gap-1">
            <MapPin size={11} /> {profile.location}
          </p>
        </div>
      </div>

      <div className="flex bg-white border-b border-gray-100 flex-shrink-0">
        {[
          [stats.posts,   'Posts'],
          [stats.matches, 'Matches'],
          [stats.reviews, 'Reviews'],
        ].map(([n, label]) => (
          <div key={label} className="flex-1 py-3.5 text-center border-r border-gray-100 last:border-r-0">
            <div className="text-lg font-bold text-gray-900">{n}</div>
            <div className="text-xs text-gray-400">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-ps-bg">
        <div className="bg-white mx-4 mt-3 rounded-2xl p-4 border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Información</h3>
          {[
            [User,     'Nombre',      profile.pet_name],
            [Calendar, 'Edad',        `${profile.age} años`],
            ['🐾',     'Raza',        profile.breed],
            ['🐕',     'Especie',     profile.species],
            [Maximize2,'Tamaño',      profile.size],
            [Zap,      'Energía',     profile.energy],
            [Users,    'Se lleva con',profile.good_with],
            [MapPin,   'Ubicación',   profile.location],
          ].map(([Icon, label, value]) => (
            <div key={label} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 text-sm">
              <span className="text-gray-400 flex items-center gap-2">
                {typeof Icon === 'string' ? <span>{Icon}</span> : <Icon size={15} />}
                {label}
              </span>
              <span className="font-medium text-gray-800 text-right max-w-[55%]">{value}</span>
            </div>
          ))}
        </div>

        {profile.about && (
          <div className="bg-white mx-4 mt-3 rounded-2xl p-4 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Sobre {profile.pet_name}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{profile.about}</p>
          </div>
        )}

        <div className="bg-white mx-4 mt-3 rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Posts recientes</h3>
            <Grid3x3 size={18} className="text-gray-400" />
          </div>
          {myPosts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Aún no has publicado nada</p>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {myPosts.map(p => (
                <div key={p.id} className="aspect-square rounded-lg overflow-hidden" style={{ background: '#EDE9FE' }}>
                  {p.image_url ? (
                    <img src={p.image_url} alt="post" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">
                      {p.pet_emoji || '🐕'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-4 flex flex-col gap-3">
          <button onClick={() => setEditing(true)} className="btn-purple">Editar perfil</button>
          <button onClick={onSignOut} className="w-full py-3 rounded-full text-sm text-gray-400 border border-gray-200 bg-white cursor-pointer">
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}