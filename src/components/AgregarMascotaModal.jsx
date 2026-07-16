import React, { useState, useRef } from 'react'
import { X, Camera } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'
import MediaEditor from './MediaEditor'

const SPECIES  = ['Perro', 'Gato', 'Conejo', 'Ave', 'Otro']
const SIZES    = ['Pequeño', 'Mediano', 'Grande']
const SEXES    = ['Macho', 'Hembra']
const ENERGIES = ['Tranquilo', 'Activo', 'Hiperactivo']
const EMOJIS   = ['🐕', '🐩', '🦮', '🐕‍🦺', '🦊', '🐈', '🐇', '🦜']

// Form simple para agregar una segunda (o tercera...) mascota a la cuenta.
// A diferencia del form de edicion de Perfil.jsx (mas completo, con
// ubicacion/intereses/sobre-mi porque alimenta el swipe de Match), este solo
// cubre lo minimo necesario para identificar la mascota en las pantallas de
// registro personal -- Match/Feed siguen sin tocarse en la Fase 1.
export default function AgregarMascotaModal({ onClose, onCreated }) {
  const { user, addPet } = useAuth()
  const { t } = useLanguage()
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [editingPhotoFile, setEditingPhotoFile] = useState(null)
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({
    pet_name: '', breed: '', species: 'Perro', age: '',
    size: 'Mediano', sex: 'Macho', energy: 'Activo',
    emoji: '🐕', avatar_url: '',
  })

  function handle(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function uploadPhoto(file) {
    setUploadingPhoto(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/pet-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file)
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      handle('avatar_url', data.publicUrl)
    }
    setUploadingPhoto(false)
  }

  async function save() {
    if (!form.pet_name.trim()) return
    setSaving(true)
    const { data, error } = await addPet({
      pet_name: form.pet_name.trim(),
      breed: form.breed.trim() || null,
      species: form.species,
      age: parseInt(form.age) || null,
      size: form.size,
      sex: form.sex,
      energy: form.energy,
      emoji: form.emoji,
      avatar_url: form.avatar_url || null,
    })
    setSaving(false)
    if (!error) {
      onCreated && onCreated(data)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-white z-[65] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <button onClick={onClose} className="border-0 bg-transparent cursor-pointer text-gray-500">
          <X size={22} />
        </button>
        <h2 className="text-base font-bold text-gray-900">{t('mascotas.addPetTitle')}</h2>
        <div style={{ width: 22 }} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        <div className="flex flex-col items-center gap-2 mb-2">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden cursor-pointer flex-shrink-0"
            style={{ background: '#EDE9FE' }}
            onClick={() => fileInputRef.current?.click()}
          >
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Camera size={22} color="#7C3AED" />
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-semibold border-0 cursor-pointer bg-transparent"
            style={{ color: '#7C3AED' }}
          >
            {uploadingPhoto ? t('verificacion.uploading') : t('perfil.tapToUpload')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files?.[0] && setEditingPhotoFile(e.target.files[0])}
          />
        </div>

        <div className="flex gap-2 justify-center flex-wrap">
          {EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => handle('emoji', e)}
              className="text-xl border-0 cursor-pointer rounded-full w-9 h-9 flex items-center justify-center"
              style={{ background: form.emoji === e ? '#EDE9FE' : 'transparent' }}
            >
              {e}
            </button>
          ))}
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">{t('perfil.petName')}</label>
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
            placeholder={t('perfil.petNamePlaceholder')}
            value={form.pet_name}
            onChange={e => handle('pet_name', e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">{t('perfil.species')}</label>
          <select
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
            value={form.species}
            onChange={e => handle('species', e.target.value)}
          >
            {SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">{t('perfil.breed')}</label>
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
            placeholder={t('perfil.breedPlaceholder')}
            value={form.breed}
            onChange={e => handle('breed', e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('perfil.ageYears')}</label>
            <input
              type="number"
              min="0"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
              value={form.age}
              onChange={e => handle('age', e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('perfil.size')}</label>
            <select
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
              value={form.size}
              onChange={e => handle('size', e.target.value)}
            >
              {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('perfil.sex')}</label>
            <select
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
              value={form.sex}
              onChange={e => handle('sex', e.target.value)}
            >
              {SEXES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('perfil.energyLevel')}</label>
            <select
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
              value={form.energy}
              onChange={e => handle('energy', e.target.value)}
            >
              {ENERGIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving || !form.pet_name.trim()}
          className="w-full py-2.5 rounded-full font-semibold text-white text-sm border-0 cursor-pointer mt-2"
          style={{ background: saving ? '#C4B5FD' : '#7C3AED' }}
        >
          {saving ? t('vacunas.saving') : t('mascotas.savePet')}
        </button>
      </div>

      {editingPhotoFile && (
        <MediaEditor
          file={editingPhotoFile}
          forcedAspect={1}
          onConfirm={file => { setEditingPhotoFile(null); uploadPhoto(file) }}
          onCancel={() => setEditingPhotoFile(null)}
        />
      )}
    </div>
  )
}
