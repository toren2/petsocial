import React, { useState, useEffect } from 'react'
import { Syringe, Plus, X, Calendar } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'

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

export default function Vacunas() {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const [vaccines, setVaccines] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: VACCINE_PRESETS[0].name,
    customName: '',
    date_given: new Date().toISOString().slice(0, 10),
    next_due_date: '',
    notes: '',
  })

  useEffect(() => { fetchVaccines() }, [])

  async function fetchVaccines() {
    setLoading(true)
    const { data } = await supabase
      .from('vaccines')
      .select('*')
      .eq('user_id', user.id)
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

  async function saveVaccine() {
    const name = form.name === 'Otra' ? form.customName.trim() : form.name
    if (!name || !form.date_given) return
    setSaving(true)
    const { error } = await supabase.from('vaccines').insert([{
      user_id: user.id,
      name,
      date_given: form.date_given,
      next_due_date: form.next_due_date || null,
      notes: form.notes || null,
    }])
    if (!error) {
      setForm({ name: VACCINE_PRESETS[0].name, customName: '', date_given: new Date().toISOString().slice(0, 10), next_due_date: '', notes: '' })
      setShowForm(false)
      fetchVaccines()
    }
    setSaving(false)
  }

  async function deleteVaccine(id) {
    if (!window.confirm(t('vacunas.deleteConfirm'))) return
    await supabase.from('vaccines').delete().eq('id', id)
    setVaccines(prev => prev.filter(v => v.id !== id))
  }

  return (
    <div className="px-4 pb-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
          <Syringe size={15} className="text-ps-purple" /> {t('vacunas.title')}
        </h3>
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
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('vacunas.notes')}</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
              placeholder={t('vacunas.notesPlaceholder')}
              value={form.notes}
              onChange={e => handle('notes', e.target.value)}
            />
          </div>

          <button
            onClick={saveVaccine}
            disabled={saving || (form.name === 'Otra' ? !form.customName.trim() : false) || !form.date_given}
            className="w-full py-2.5 rounded-full font-semibold text-white text-sm border-0 cursor-pointer"
            style={{ background: saving ? '#C4B5FD' : '#7C3AED' }}
          >
            {saving ? t('vacunas.saving') : t('vacunas.saveVaccine')}
          </button>
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
      ) : (
        <div className="flex flex-col gap-2">
          {vaccines.map(v => {
            const status = getStatus(v.next_due_date, t)
            return (
              <div key={v.id} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-gray-100 bg-white">
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
                <button onClick={() => deleteVaccine(v.id)} className="border-0 bg-transparent cursor-pointer text-gray-300 flex-shrink-0" aria-label={t('common.delete')}>
                  <X size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
