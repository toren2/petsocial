import React, { useState, useEffect, useRef } from 'react'
import { AlertTriangle, HeartPulse, Pill, Scissors, FileText, TrendingUp, Paperclip, X, Plus, Calendar, ExternalLink } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'
import MediaEditor from './MediaEditor'

// Historial medico ampliado: alergias, condiciones cronicas, medicamentos,
// cirugias, notas de consulta, peso y documentos (laboratorio/rayos x).
// Todo ingresado por el dueno de la mascota -- pensado como la "cartilla
// completa" que se le puede mostrar a un veterinario en la consulta.

function formatDate(dateStr, language) {
  if (!dateStr) return ''
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString(language, { day: '2-digit', month: 'short', year: 'numeric' })
}

const RECORD_TABS = ['allergy', 'condition', 'medication', 'surgery', 'note']

function getCategoryConfig(t) {
  return {
    allergy: {
      icon: AlertTriangle, color: '#D97706', bg: '#FEF3C7',
      tabLabel: t('historial.tabAllergies'),
      titleLabel: t('historial.allergyNameLabel'), titlePlaceholder: t('historial.allergyNamePlaceholder'),
      dateLabel: t('historial.dateDetected'),
      hasExtra: true, extraLabel: t('historial.reactionLabel'), extraPlaceholder: t('historial.reactionPlaceholder'),
      hasEndDate: false, emptyText: t('historial.emptyAllergies'),
    },
    condition: {
      icon: HeartPulse, color: '#DC2626', bg: '#FEE2E2',
      tabLabel: t('historial.tabConditions'),
      titleLabel: t('historial.conditionNameLabel'), titlePlaceholder: t('historial.conditionNamePlaceholder'),
      dateLabel: t('historial.dateDiagnosed'),
      hasExtra: false, hasEndDate: false, emptyText: t('historial.emptyConditions'),
    },
    medication: {
      icon: Pill, color: '#3B82F6', bg: '#DBEAFE',
      tabLabel: t('historial.tabMedications'),
      titleLabel: t('historial.medicationNameLabel'), titlePlaceholder: t('historial.medicationNamePlaceholder'),
      dateLabel: t('historial.dateStart'),
      hasExtra: true, extraLabel: t('historial.doseLabel'), extraPlaceholder: t('historial.dosePlaceholder'),
      hasEndDate: true, emptyText: t('historial.emptyMedications'),
    },
    surgery: {
      icon: Scissors, color: '#7C3AED', bg: '#EDE9FE',
      tabLabel: t('historial.tabSurgeries'),
      titleLabel: t('historial.surgeryNameLabel'), titlePlaceholder: t('historial.surgeryNamePlaceholder'),
      dateLabel: t('historial.dateProcedure'),
      hasExtra: true, extraLabel: t('historial.vetClinicOptional'), extraPlaceholder: '',
      hasEndDate: false, emptyText: t('historial.emptySurgeries'),
    },
    note: {
      icon: FileText, color: '#6B7280', bg: '#F3F4F6',
      tabLabel: t('historial.tabNotes'),
      titleLabel: t('historial.noteTitleLabel'), titlePlaceholder: t('historial.noteTitlePlaceholder'),
      dateLabel: t('historial.dateConsult'),
      hasExtra: true, extraLabel: t('historial.vetClinicOptional'), extraPlaceholder: '',
      hasEndDate: false, emptyText: t('historial.emptyNotes'),
    },
  }
}

function WeightChart({ logs, language }) {
  if (logs.length < 2) return null
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date)).slice(-12)
  const weights = sorted.map(l => Number(l.weight_kg))
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const range = max - min || 1
  const W = 300, H = 90, pad = 10
  const points = sorted.map((l, i) => {
    const x = pad + (i / (sorted.length - 1)) * (W - pad * 2)
    const y = H - pad - ((Number(l.weight_kg) - min) / range) * (H - pad * 2)
    return [x, y]
  })
  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return (
    <div className="rounded-2xl border border-gray-100 p-3 mb-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 90 }}>
        <path d={path} fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill="#7C3AED" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{formatDate(sorted[0].date, language)}</span>
        <span>{formatDate(sorted[sorted.length - 1].date, language)}</span>
      </div>
    </div>
  )
}

export default function HistorialMedico() {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const [activeTab, setActiveTab] = useState('allergy')
  const [records, setRecords] = useState([])
  const [weightLogs, setWeightLogs] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [editingDocFile, setEditingDocFile] = useState(null)
  const docFileRef = useRef(null)

  const emptyRecordForm = { title: '', date: '', end_date: '', extra: '', notes: '' }
  const [recordForm, setRecordForm] = useState(emptyRecordForm)
  const [weightForm, setWeightForm] = useState({ date: new Date().toISOString().slice(0, 10), weight_kg: '' })
  const emptyDocForm = { title: '', date: '', doc_type: 'lab', file_url: '' }
  const [docForm, setDocForm] = useState(emptyDocForm)

  const CATEGORY_CONFIG = getCategoryConfig(t)

  useEffect(() => { fetchAll() }, [])
  useEffect(() => { setShowForm(false) }, [activeTab])

  async function fetchAll() {
    setLoading(true)
    const [recordsRes, weightRes, docsRes] = await Promise.all([
      supabase.from('pet_medical_records').select('*').eq('user_id', user.id).order('date', { ascending: false, nullsFirst: false }),
      supabase.from('pet_weight_logs').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('pet_medical_documents').select('*').eq('user_id', user.id).order('date', { ascending: false, nullsFirst: false }),
    ])
    if (recordsRes.data) setRecords(recordsRes.data)
    if (weightRes.data) setWeightLogs(weightRes.data)
    if (docsRes.data) setDocuments(docsRes.data)
    setLoading(false)
  }

  async function saveRecord() {
    if (!recordForm.title.trim()) return
    setSaving(true)
    const { error } = await supabase.from('pet_medical_records').insert([{
      user_id: user.id,
      category: activeTab,
      title: recordForm.title.trim(),
      date: recordForm.date || null,
      end_date: recordForm.end_date || null,
      extra: recordForm.extra.trim() || null,
      notes: recordForm.notes.trim() || null,
    }])
    if (!error) {
      setRecordForm(emptyRecordForm)
      setShowForm(false)
      fetchAll()
    }
    setSaving(false)
  }

  async function deleteRecord(id) {
    if (!window.confirm(t('historial.deleteConfirm'))) return
    await supabase.from('pet_medical_records').delete().eq('id', id)
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  async function saveWeight() {
    const kg = parseFloat(weightForm.weight_kg)
    if (!weightForm.date || !kg || kg <= 0) return
    setSaving(true)
    const { error } = await supabase.from('pet_weight_logs').insert([{
      user_id: user.id, date: weightForm.date, weight_kg: kg,
    }])
    if (!error) {
      setWeightForm({ date: new Date().toISOString().slice(0, 10), weight_kg: '' })
      setShowForm(false)
      fetchAll()
    }
    setSaving(false)
  }

  async function deleteWeight(id) {
    if (!window.confirm(t('historial.weightDeleteConfirm'))) return
    await supabase.from('pet_weight_logs').delete().eq('id', id)
    setWeightLogs(prev => prev.filter(w => w.id !== id))
  }

  async function uploadDocFile(file) {
    setUploadingDoc(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/medical-doc-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('pet-photos').upload(path, file)
    if (!error) {
      const { data } = supabase.storage.from('pet-photos').getPublicUrl(path)
      setDocForm(f => ({ ...f, file_url: data.publicUrl }))
    }
    setUploadingDoc(false)
  }

  async function saveDocument() {
    if (!docForm.title.trim() || !docForm.file_url) return
    setSaving(true)
    const { error } = await supabase.from('pet_medical_documents').insert([{
      user_id: user.id,
      title: docForm.title.trim(),
      date: docForm.date || null,
      doc_type: docForm.doc_type,
      file_url: docForm.file_url,
    }])
    if (!error) {
      setDocForm(emptyDocForm)
      setShowForm(false)
      fetchAll()
    }
    setSaving(false)
  }

  async function deleteDocument(id) {
    if (!window.confirm(t('historial.docsDeleteConfirm'))) return
    await supabase.from('pet_medical_documents').delete().eq('id', id)
    setDocuments(prev => prev.filter(d => d.id !== id))
  }

  const tabs = [
    ...RECORD_TABS.map(k => [k, CATEGORY_CONFIG[k].tabLabel]),
    ['weight', t('historial.tabWeight')],
    ['documents', t('historial.tabDocuments')],
  ]

  const isRecordTab = RECORD_TABS.includes(activeTab)
  const config = isRecordTab ? CATEGORY_CONFIG[activeTab] : null
  const filteredRecords = isRecordTab ? records.filter(r => r.category === activeTab) : []

  const docTypeLabels = {
    lab: t('historial.docsTypeLab'),
    xray: t('historial.docsTypeXray'),
    other: t('historial.docsTypeOther'),
  }

  return (
    <div className="px-4 pb-3">
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
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

      <div className="flex items-center justify-end mb-2">
        <button
          onClick={() => setShowForm(s => !s)}
          className="text-xs font-semibold border-0 cursor-pointer px-3 py-1.5 rounded-full flex items-center gap-1"
          style={{ background: '#EDE9FE', color: '#7C3AED' }}
        >
          {showForm ? <X size={12} /> : <Plus size={12} />}
          {showForm ? t('historial.close') : t('historial.add')}
        </button>
      </div>

      {/* Formulario: categorias de registro (alergia/condicion/medicamento/cirugia/nota) */}
      {showForm && isRecordTab && (
        <div className="bg-ps-bg rounded-2xl p-3 mb-3 flex flex-col gap-2.5 border border-gray-100">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{config.titleLabel}</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
              placeholder={config.titlePlaceholder}
              value={recordForm.title}
              onChange={e => setRecordForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">{config.dateLabel}</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
                value={recordForm.date}
                onChange={e => setRecordForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
            {config.hasEndDate && (
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 mb-1 block">{t('historial.dateEnd')}</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
                  value={recordForm.end_date}
                  onChange={e => setRecordForm(f => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            )}
          </div>
          {config.hasExtra && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">{config.extraLabel}</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
                placeholder={config.extraPlaceholder}
                value={recordForm.extra}
                onChange={e => setRecordForm(f => ({ ...f, extra: e.target.value }))}
              />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('historial.notesLabel')}</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
              placeholder={t('historial.notesPlaceholder')}
              value={recordForm.notes}
              onChange={e => setRecordForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <button
            onClick={saveRecord}
            disabled={saving || !recordForm.title.trim()}
            className="w-full py-2.5 rounded-full font-semibold text-white text-sm border-0 cursor-pointer"
            style={{ background: saving ? '#C4B5FD' : '#7C3AED' }}
          >
            {saving ? t('historial.saving') : t('historial.save')}
          </button>
        </div>
      )}

      {/* Formulario: peso */}
      {showForm && activeTab === 'weight' && (
        <div className="bg-ps-bg rounded-2xl p-3 mb-3 flex flex-col gap-2.5 border border-gray-100">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('historial.weightDateLabel')}</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
                value={weightForm.date}
                onChange={e => setWeightForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('historial.weightLabel')}</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
                placeholder={t('historial.weightPlaceholder')}
                value={weightForm.weight_kg}
                onChange={e => setWeightForm(f => ({ ...f, weight_kg: e.target.value }))}
              />
            </div>
          </div>
          <button
            onClick={saveWeight}
            disabled={saving || !weightForm.weight_kg}
            className="w-full py-2.5 rounded-full font-semibold text-white text-sm border-0 cursor-pointer"
            style={{ background: saving ? '#C4B5FD' : '#7C3AED' }}
          >
            {saving ? t('historial.saving') : t('historial.weightSave')}
          </button>
        </div>
      )}

      {/* Formulario: documentos */}
      {showForm && activeTab === 'documents' && (
        <div className="bg-ps-bg rounded-2xl p-3 mb-3 flex flex-col gap-2.5 border border-gray-100">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('historial.docsTitleLabel')}</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
              placeholder={t('historial.docsTitlePlaceholder')}
              value={docForm.title}
              onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('historial.docsDateLabel')}</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
                value={docForm.date}
                onChange={e => setDocForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('historial.docsTypeLabel')}</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white"
                value={docForm.doc_type}
                onChange={e => setDocForm(f => ({ ...f, doc_type: e.target.value }))}
              >
                <option value="lab">{t('historial.docsTypeLab')}</option>
                <option value="xray">{t('historial.docsTypeXray')}</option>
                <option value="other">{t('historial.docsTypeOther')}</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => docFileRef.current?.click()}
              className="text-xs font-semibold border-0 cursor-pointer px-3 py-1.5 rounded-full flex items-center gap-1"
              style={{ background: '#EDE9FE', color: '#7C3AED' }}
            >
              <Paperclip size={12} /> {uploadingDoc ? t('historial.docsUploading') : t('historial.docsUpload')}
            </button>
            {docForm.file_url && <span className="text-xs text-green-600">✓</span>}
            <input
              ref={docFileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (!f) return
                // el recorte/edicion solo aplica a imagenes -- un PDF de laboratorio
                // se sube tal cual, no tiene sentido pasarlo por el editor visual.
                if (f.type.startsWith('image/')) setEditingDocFile(f)
                else uploadDocFile(f)
              }}
            />

            {editingDocFile && (
              <MediaEditor
                file={editingDocFile}
                onConfirm={file => { setEditingDocFile(null); uploadDocFile(file) }}
                onCancel={() => setEditingDocFile(null)}
              />
            )}
          </div>
          <button
            onClick={saveDocument}
            disabled={saving || !docForm.title.trim() || !docForm.file_url}
            className="w-full py-2.5 rounded-full font-semibold text-white text-sm border-0 cursor-pointer"
            style={{ background: saving ? '#C4B5FD' : '#7C3AED' }}
          >
            {saving ? t('historial.saving') : t('historial.docsSave')}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-6 text-gray-400 text-xs">{t('common.loading')}</div>
      ) : isRecordTab ? (
        filteredRecords.length === 0 ? (
          !showForm && (
            <div onClick={() => setShowForm(true)} className="flex flex-col items-center justify-center gap-2 rounded-2xl cursor-pointer border-2 border-dashed border-gray-200 py-6">
              <config.icon size={26} color={config.color} />
              <p className="text-xs text-gray-400 text-center px-4">{config.emptyText}</p>
            </div>
          )
        ) : (
          <div className="flex flex-col gap-2">
            {filteredRecords.map(r => (
              <div key={r.id} className="flex items-start gap-3 px-3 py-2.5 rounded-2xl border border-gray-100 bg-white">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: config.bg }}>
                  <config.icon size={16} color={config.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{r.title}</p>
                  {r.extra && <p className="text-xs text-gray-500 mt-0.5">{r.extra}</p>}
                  {(r.date || r.end_date) && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Calendar size={10} />
                      {config.hasEndDate
                        ? [
                            r.date && t('historial.since', { date: formatDate(r.date, language) }),
                            r.end_date ? t('historial.until', { date: formatDate(r.end_date, language) }) : (r.date ? t('historial.ongoing') : null),
                          ].filter(Boolean).join(' · ')
                        : formatDate(r.date, language)}
                    </p>
                  )}
                  {r.notes && <p className="text-xs text-gray-400 mt-1">{r.notes}</p>}
                </div>
                <button onClick={() => deleteRecord(r.id)} className="border-0 bg-transparent cursor-pointer text-gray-300 flex-shrink-0" aria-label={t('common.delete')}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'weight' ? (
        weightLogs.length === 0 ? (
          !showForm && (
            <div onClick={() => setShowForm(true)} className="flex flex-col items-center justify-center gap-2 rounded-2xl cursor-pointer border-2 border-dashed border-gray-200 py-6">
              <TrendingUp size={26} color="#16A34A" />
              <p className="text-xs text-gray-400 text-center px-4">{t('historial.weightEmpty')}</p>
            </div>
          )
        ) : (
          <>
            <WeightChart logs={weightLogs} language={language} />
            <div className="flex flex-col gap-2">
              {weightLogs.map(w => (
                <div key={w.id} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-gray-100 bg-white">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#DCFCE7' }}>
                    <TrendingUp size={16} color="#16A34A" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{w.weight_kg} {t('historial.weightKgUnit')}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Calendar size={10} /> {formatDate(w.date, language)}
                    </p>
                  </div>
                  <button onClick={() => deleteWeight(w.id)} className="border-0 bg-transparent cursor-pointer text-gray-300 flex-shrink-0" aria-label={t('common.delete')}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )
      ) : (
        documents.length === 0 ? (
          !showForm && (
            <div onClick={() => setShowForm(true)} className="flex flex-col items-center justify-center gap-2 rounded-2xl cursor-pointer border-2 border-dashed border-gray-200 py-6">
              <Paperclip size={26} color="#7C3AED" />
              <p className="text-xs text-gray-400 text-center px-4">{t('historial.docsEmpty')}</p>
            </div>
          )
        ) : (
          <div className="flex flex-col gap-2">
            {documents.map(d => (
              <div key={d.id} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-gray-100 bg-white">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#EDE9FE' }}>
                  <Paperclip size={16} color="#7C3AED" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{d.title}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                    <span className="font-medium" style={{ color: '#7C3AED' }}>{docTypeLabels[d.doc_type]}</span>
                    {d.date && <span className="flex items-center gap-1"><Calendar size={10} /> {formatDate(d.date, language)}</span>}
                  </p>
                  <a href={d.file_url} target="_blank" rel="noreferrer" className="text-xs font-semibold flex items-center gap-1 mt-1 no-underline" style={{ color: '#7C3AED' }}>
                    <ExternalLink size={11} /> {t('historial.docsView')}
                  </a>
                </div>
                <button onClick={() => deleteDocument(d.id)} className="border-0 bg-transparent cursor-pointer text-gray-300 flex-shrink-0" aria-label={t('common.delete')}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
