import React, { useState, useEffect, useRef } from 'react'
import { Syringe, Plus, X, Calendar, ChevronLeft, Camera, CreditCard } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'
import VerifiedBadge from './VerifiedBadge'
import TarjetaVacunas from './TarjetaVacunas'
import MediaEditor from './MediaEditor'
import PetSwitcher from './PetSwitcher'
import AgregarMascotaModal from './AgregarMascotaModal'

const VACCINE_PRESETS = [
  { name: 'Rábica (Rabia)', intervalDays: 365 },
  { name: 'Múltiple / Polivalente', intervalDays: 365 },
  { name: 'Bordetella (Tos de las perreras)', intervalDays: 365 },
  { name: 'Leptospirosis', intervalDays: 365 },
  { name: 'Triple felina', intervalDays: 365 },
  { name: 'Leucemia felina', intervalDays: 365 },
  { name: 'Desparasitación', intervalDays: 90 },
  { name: 'Otra', intervalDays: null },
]

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatDate(dateStr, language) {
  if (!dateStr) return ''
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString(language, { day: '2-digit', month: 'short', year: 'numeric' })
}

function getStatus(nextDueDate, t) {
  if (!nextDueDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(`${nextDueDate}T00:00:00`)
  const diffDays = Math.round((due - today) / 86400000)

  if (diffDays < 0) return { label: t('vacunas.statusOverdue', { days: Math.abs(diffDays) }), color: '#DC2626', bg: '#FEE2E2' }
  if (diffDays === 0) return { label: t('vacunas.statusToday'), color: '#DC2626', bg: '#FEE2E2' }
  if (diffDays <= 14) return { label: t('vacunas.statusSoon', { days: diffDays, plural: diffDays === 1 ? '' : 's' }), color: '#D97706', bg: '#FEF3C7' }
  return { label: t('vacunas.statusOk'), color: '#16A34A', bg: '#DCFCE7' }
}

function getCategory(nextDueDate) {
  if (!nextDueDate) return 'uptodate'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(`${nextDueDate}T00:00:00`)
  const diffDays = Math.round((due - today) / 86400000)
  if (diffDays <= 0) return 'overdue'
  if (diffDays <= 14) return 'upcoming'
  return 'uptodate'
}

function getOverallStatus(vaccines, t) {
  if (!vaccines || vaccines.length === 0) {
    return { key: 'none', label: t('vacunas.summaryStatusNone'), color: '#9CA3AF', bg: '#F3F4F6' }
  }
  const categories = vaccines.map(v => getCategory(v.next_due_date))
  if (categories.includes('overdue')) {
    return { key: 'overdue', label: t('vacunas.summaryStatusOverdue'), color: '#DC2626', bg: '#FEE2E2' }
  }
  if (categories.includes('upcoming')) {
    return { key: 'upcoming', label: t('vacunas.summaryStatusUpcoming'), color: '#D97706', bg: '#FEF3C7' }
  }
  return { key: 'uptodate', label: t('vacunas.summaryStatusUpToDate'), color: '#16A34A', bg: '#DCFCE7' }
}

export default function Vacunas({ hideTitle = false, petInfo = {} }) {
  const { user, pets, activePet, activePetId, switchPet } = useAuth()
  const { t, language } = useLanguage()
  const [vaccines, setVaccines] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [viewingVaccine, setViewingVaccine] = useState(null)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [showTarjeta, setShowTarjeta] = useState(false)
  const [editingReceiptFile, setEditingReceiptFile] = useState(null)
  const [showAddPet, setShowAddPet] = useState(false)
  const receiptInputRef = useRef(null)
  const [form, setForm] = useState({
    name: VACCINE_PRESETS[0].name,
    customName: '',
    date_given: new Date().toISOString().slice(0, 10),
    next_due_date: '',
    vet_clinic: '',
    lot_number: '',
    notes: '',
    receipt_url: '',
  })

  useEffect(() => {
    if (!activePet) return
    fetchVaccines()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePet?.id])

  async function fetchVaccines() {
    if (!activePet) return
    setLoading(true)
    const { data } = await supabase
      .from('vaccines')
      .select('*')
      .eq('pet_id', activePet.id)
      .order('next_due_date', { ascending: true, nullsFirst: false })
    if (data) setVaccines(data)
    setLoading(false)
  }

  function handle(k, v) {
    setForm(f => {
      const next = { ...f, [k]: v }
      // auto-sugerir próxima dosis según el intervalo típico de la vacuna elegida,
      // solo si el usuario aún no ha llenado ese campo manualmente
      if ((k === 'name' || k === 'date_given') && !f.next_due_date) {
        const preset = VACCINE_PRESETS.find(p => p.name === next.name)
        if (preset?.intervalDays && next.date_given) {
          next.next_due_date = addDays(next.date_given, preset.intervalDays)
        }
      }
      return next
    })
  }

  async function uploadReceipt(file) {
    setUploadingReceipt(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/vaccine-receipt-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('pet-photos').upload(path, file)
    if (!error) {
      const { data } = supabase.storage.from('pet-photos').getPublicUrl(path)
      handle('receipt_url', data.publicUrl)
    }
    setUploadingReceipt(false)
  }

  async function saveVaccine() {
    const name = form.name === 'Otra' ? form.customName.trim() : form.name
    if (!name || !form.date_given || !activePet) return
    setSaving(true)
    const { error } = await supabase.from('vaccines').insert([{
      user_id: user.id,
      pet_id: activePet.id,
      name,
      date_given: form.date_given,
      next_due_date: form.next_due_date || null,
      vet_clinic: form.vet_clinic.trim() || null,
      lot_number: form.lot_number.trim() || null,
      notes: form.notes || null,
      receipt_url: form.receipt_url || null,
    }])
    if (!error) {
      setForm({
        name: VACCINE_PRESETS[0].name, customName: '', date_given: new Date().toISOString().slice(0, 10),
        next_due_date: '', vet_clinic: '', lot_number: '', notes: '', receipt_url: '',
      })
      setShowForm(false)
      fetchVaccines()
    }
    setSaving(false)
  }

  async function deleteVaccine(id) {
    if (!window.confirm(t('vacunas.deleteConfirm'))) return
    await supabase.from('vaccines').delete().eq('id', id)
    setVaccines(prev => prev.filter(v => v.id !== id))
    setViewingVaccine(null)
  }

  const tabs = [
    ['all', t('vacunas.tabAll')],
    ['uptodate', t('vacunas.tabUpToDate')],
    ['upcoming', t('vacunas.tabUpcoming')],
    ['overdue', t('vacunas.tabOverdue')],
  ]
  const filteredVaccines = activeTab === 'all' ? vaccines : vaccines.filter(v => getCategory(v.next_due_date) === activeTab)

  // Resumen para el encabezado y la tarjeta digital
  const appliedCount = vaccines.length
  const upcomingCount = vaccines.filter(v => v.next_due_date).length
  const overallStatus = getOverallStatus(vaccines, t)
  const lastUpdatedRaw = vaccines.reduce((max, v) => (!max || v.date_given > max ? v.date_given : max), null)
  const lastUpdatedLabel = lastUpdatedRaw ? formatDate(lastUpdatedRaw, language) : null
  const petInfoResolved = {
    ...petInfo,
    ageLabel: petInfo.age ? t('perfil.ageValue', { age: petInfo.age }) : null,
  }

  // Vista de detalle de una vacuna
  if (viewingVaccine) {
    const status = getStatus(viewingVaccine.next_due_date, t)
    const rows = [
      [Calendar, t('vacunas.dateGiven'), formatDate(viewingVaccine.date_given, language)],
      [Calendar, t('vacunas.nextDose'), viewingVaccine.next_due_date ? formatDate(viewingVaccine.next_due_date, language) : '—'],
      ['🏥', t('vacunas.vetClinic'), viewingVaccine.vet_clinic || '—'],
      ['🏷️', t('vacunas.lotNumber'), viewingVaccine.lot_number || '—'],
      ['📝', t('vacunas.notes'), viewingVaccine.notes || '—'],
    ]
    return (
      <div className="px-4 pb-3">
        <button
          onClick={() => setViewingVaccine(null)}
          className="flex items-center gap-1 text-xs font-medium text-ps-purple border-0 bg-transparent cursor-pointer mb-3 p-0"
        >
          <ChevronLeft size={14} /> {t('vacunas.backAria')}
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#EDE9FE' }}>
            <Syringe size={20} color="#7C3AED" />
          </div>
          <div>
            <p className="text-base font-bold text-gray-900">{viewingVaccine.name}</p>
            {status && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1" style={{ background: status.bg, color: status.color }}>
                {status.label}
              </span>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 overflow-hidden">
          {rows.map(([icon, label, value]) => (
            <div key={label} className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100 last:border-0 text-sm bg-white">
              <span className="text-gray-400 flex items-center gap-2">
                {typeof icon === 'string' ? <span>{icon}</span> : React.createElement(icon, { size: 15 })}
                {label}
              </span>
              <span className="font-medium text-gray-800 text-right max-w-[55%]">{value}</span>
            </div>
          ))}
        </div>
        {viewingVaccine.receipt_url && (
          <a
            href={viewingVaccine.receipt_url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center gap-2 text-xs font-semibold no-underline"
            style={{ color: '#7C3AED' }}
          >
            <Camera size={13} /> {t('vacunas.viewPhoto')}
          </a>
        )}
        <button
          onClick={() => deleteVaccine(viewingVaccine.id)}
          className="w-full py-2.5 mt-4 rounded-full text-sm font-semibold border-0 cursor-pointer"
          style={{ background: '#FEE2E2', color: '#DC2626' }}
        >
          {t('vacunas.deleteVaccineBtn')}
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 pb-3">
      {pets.length > 0 && (
        <PetSwitcher
          pets={pets}
          activePetId={activePetId}
          onSwitch={switchPet}
          onAddClick={() => setShowAddPet(true)}
        />
      )}

      {petInfo.name && (
        <div className="mb-3">
          <div className="flex items-center gap-3 mb-3">
            {petInfo.avatarUrl ? (
              <img src={petInfo.avatarUrl} alt={petInfo.name} className="w-14 h-14 rounded-full object-cover border-2 border-ps-purple-light flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0" style={{ background: '#EDE9FE' }}>{petInfo.emoji || '🐾'}</div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-900 text-base flex items-center gap-1">
                {petInfo.name} <VerifiedBadge verified={petInfo.verified} size={14} />
              </div>
              <div className="text-xs text-gray-500 truncate">
                {[petInfo.breed, petInfoResolved.ageLabel, petInfo.sex].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>

          <div className="rounded-2xl px-3 py-2.5 mb-2.5 flex items-center gap-2" style={{ background: overallStatus.bg }}>
            <Syringe size={16} color={overallStatus.color} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold" style={{ color: overallStatus.color }}>{overallStatus.label}</p>
              {lastUpdatedLabel && (
                <p className="text-[10px] mt-0.5" style={{ color: overallStatus.color, opacity: 0.75 }}>
                  {t('vacunas.summaryLastUpdated', { date: lastUpdatedLabel })}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 mb-2.5">
            <div className="flex-1 rounded-2xl border border-gray-100 py-2.5 text-center">
              <p className="text-lg font-bold text-gray-900">{appliedCount}</p>
              <p className="text-[10px] text-gray-400">{t('vacunas.statAppliedLabel')}</p>
            </div>
            <div className="flex-1 rounded-2xl border border-gray-100 py-2.5 text-center">
              <p className="text-lg font-bold text-gray-900">{upcomingCount}</p>
              <p className="text-[10px] text-gray-400">{t('vacunas.statUpcomingLabel')}</p>
            </div>
          </div>

          {vaccines.length > 0 && (
            <button
              onClick={() => setShowTarjeta(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full font-semibold text-white text-sm border-0 cursor-pointer"
              style={{ background: '#7C3AED' }}
            >
              <CreditCard size={15} /> {t('vacunas.viewCard')}
            </button>
          )}
        </div>
      )}

      <div className={`flex items-center mb-2 ${hideTitle ? 'justify-end' : 'justify-between'}`}>
        {!hideTitle && (
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <Syringe size={15} className="text-ps-purple" /> {t('vacunas.title')}
          </h3>
        )}
        <button
          onClick={() => setShowForm(s => !s)}
          className="text-xs font-semibold border-0 cursor-pointer px-3 py-1.5 rounded-full flex items-center gap-1"
          style={{ background: '#EDE9FE', color: '#7C3AED' }}
        >
          {showForm ? <X size={12} /> : <Plus size={12} />}
          {showForm ? t('vacunas.close') : t('vacunas.add')}
        </button>
      </div>

      {showForm && (
        <div className="bg-ps-bg rounded-2xl p-3 mb-2 flex flex-col gap-2.5 border border-gray-100">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('vacunas.vaccineLabel')}</label>
            <select
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
              value={form.name}
              onChange={e => handle('name', e.target.value)}
            >
              {VACCINE_PRESETS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          </div>

          {form.name === 'Otra' && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('vacunas.vaccineNameLabel')}</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
                placeholder={t('vacunas.vaccineNamePlaceholder')}
                value={form.customName}
                onChange={e => handle('customName', e.target.value)}
              />
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('vacunas.dateGiven')}</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
                value={form.date_given}
                onChange={e => handle('date_given', e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('vacunas.nextDose')}</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
                value={form.next_due_date}
                onChange={e => handle('next_due_date', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('vacunas.vetClinic')}</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
              placeholder={t('vacunas.vetClinicPlaceholder')}
              value={form.vet_clinic}
              onChange={e => handle('vet_clinic', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('vacunas.lotNumber')}</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
              placeholder={t('vacunas.lotNumberPlaceholder')}
              value={form.lot_number}
              onChange={e => handle('lot_number', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('vacunas.notes')}</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
              placeholder={t('vacunas.notesPlaceholder')}
              value={form.notes}
              onChange={e => handle('notes', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('vacunas.receipt')}</label>
            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer overflow-hidden"
                style={{ background: '#EFF6FF' }}
                onClick={() => receiptInputRef.current?.click()}
              >
                {form.receipt_url ? <img src={form.receipt_url} alt="comprobante" className="w-full h-full object-cover" /> : <Camera size={18} color="#3B82F6" />}
              </div>
              <button
                onClick={() => receiptInputRef.current?.click()}
                className="text-xs font-semibold border-0 cursor-pointer px-3 py-1.5 rounded-full"
                style={{ background: '#EDE9FE', color: '#7C3AED' }}
              >
                {uploadingReceipt ? t('verificacion.uploading') : t('vacunas.uploadReceipt')}
              </button>
              <input ref={receiptInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && setEditingReceiptFile(e.target.files[0])} />
            </div>
          </div>

          {editingReceiptFile && (
            <MediaEditor
              file={editingReceiptFile}
              onConfirm={file => { setEditingReceiptFile(null); uploadReceipt(file) }}
              onCancel={() => setEditingReceiptFile(null)}
            />
          )}

          <button
            onClick={saveVaccine}
            disabled={saving || (form.name === 'Otra' ? !form.customName.trim() : false) || !form.date_given || !activePet}
            className="w-full py-2.5 rounded-full font-semibold text-white text-sm border-0 cursor-pointer"
            style={{ background: saving ? '#C4B5FD' : '#7C3AED' }}
          >
            {saving ? t('vacunas.saving') : t('vacunas.saveVaccine')}
          </button>
        </div>
      )}

      {!loading && vaccines.length > 0 && (
        <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border-0 cursor-pointer"
              style={{ background: activeTab === key ? '#7C3AED' : '#F3F4F6', color: activeTab === key ? 'white' : '#6B7280' }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-6 text-gray-400 text-xs">{t('common.loading')}</div>
      ) : vaccines.length === 0 ? (
        !showForm && (
          <div onClick={() => setShowForm(true)} className="flex flex-col items-center justify-center gap-2 rounded-2xl cursor-pointer border-2 border-dashed border-gray-200 py-6">
            <span className="text-3xl">💉</span>
            <p className="text-xs text-gray-400 text-center">{t('vacunas.emptyState')}</p>
          </div>
        )
      ) : filteredVaccines.length === 0 ? (
        <div className="flex items-center justify-center py-6 text-gray-400 text-xs">{t('vacunas.emptyTab')}</div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredVaccines.map(v => {
            const status = getStatus(v.next_due_date, t)
            return (
              <div key={v.id} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-gray-100 bg-white">
                <div onClick={() => setViewingVaccine(v)} className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#EDE9FE' }}>
                    <Syringe size={16} color="#7C3AED" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{v.name}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Calendar size={10} /> {t('vacunas.applied')}: {formatDate(v.date_given, language)}
                      {v.next_due_date && <> · {t('vacunas.next')}: {formatDate(v.next_due_date, language)}</>}
                    </p>
                  </div>
                  {status && (
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0" style={{ background: status.bg, color: status.color }}>
                      {status.label}
                    </span>
                  )}
                </div>
                <button onClick={() => deleteVaccine(v.id)} className="border-0 bg-transparent cursor-pointer text-gray-300 flex-shrink-0" aria-label={t('common.delete')}>
                  <X size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showTarjeta && (
        <TarjetaVacunas
          petInfo={petInfoResolved}
          appliedCount={appliedCount}
          upcomingCount={upcomingCount}
          overallStatus={overallStatus}
          lastUpdated={lastUpdatedLabel}
          onClose={() => setShowTarjeta(false)}
        />
      )}

      {showAddPet && (
        <AgregarMascotaModal onClose={() => setShowAddPet(false)} />
      )}
    </div>
  )
}
