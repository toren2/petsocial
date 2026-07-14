import React, { useState, useEffect } from 'react'
import { ArrowLeft, Flag, BadgeCheck, ShieldAlert, MapPin, AlertTriangle } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'

const ADMIN_EMAIL = 'josiplopez23@gmail.com'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('es-PA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function StatusBadge({ status }) {
  const map = {
    pendiente: { bg: '#FEF3C7', color: '#B45309', label: 'Pendiente' },
    revisado: { bg: '#DBEAFE', color: '#3B82F6', label: 'Revisado' },
    descartado: { bg: '#F3F4F6', color: '#6B7280', label: 'Descartado' },
    aprobado: { bg: '#DCFCE7', color: '#16A34A', label: 'Aprobado' },
    rechazado: { bg: '#FEE2E2', color: '#DC2626', label: 'Rechazado' },
  }
  const s = map[status] || map.pendiente
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

export default function AdminModeracion({ onBack }) {
  const { user } = useAuth()
  const isAdmin = user?.email === ADMIN_EMAIL
  const [tab, setTab] = useState('reportes')
  const [reports, setReports] = useState([])
  const [verifications, setVerifications] = useState([])
  const [placeSuggestions, setPlaceSuggestions] = useState([])
  const [appReports, setAppReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return }
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    setError('')
    const [
      { data: r, error: rErr },
      { data: v, error: vErr },
      { data: ps, error: psErr },
      { data: ar, error: arErr },
    ] = await Promise.all([
      supabase.rpc('admin_list_reports'),
      supabase.rpc('admin_list_verification_requests'),
      supabase.rpc('admin_list_place_suggestions'),
      supabase.rpc('admin_list_app_reports'),
    ])
    if (rErr || vErr || psErr || arErr) {
      setError((rErr || vErr || psErr || arErr).message)
    } else {
      setReports(r || [])
      setVerifications(v || [])
      setPlaceSuggestions(ps || [])
      setAppReports(ar || [])
    }
    setLoading(false)
  }

  async function updateReport(id, status) {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    await supabase.rpc('admin_update_report_status', { p_report_id: id, p_status: status })
  }

  async function updateVerification(id, status) {
    setVerifications(prev => prev.map(v => v.id === id ? { ...v, status } : v))
    await supabase.rpc('admin_update_verification_status', { p_request_id: id, p_status: status })
  }

  async function updatePlaceSuggestion(id, status) {
    setPlaceSuggestions(prev => prev.map(s => s.id === id ? { ...s, status } : s))
    await supabase.rpc('admin_update_place_suggestion_status', { p_suggestion_id: id, p_status: status })
  }

  async function updateAppReport(id, status) {
    setAppReports(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    await supabase.rpc('admin_update_app_report_status', { p_report_id: id, p_status: status })
  }

  const pendingReports = reports.filter(r => r.status === 'pendiente')
  const otherReports = reports.filter(r => r.status !== 'pendiente')
  const pendingVerifications = verifications.filter(v => v.status === 'pendiente')
  const otherVerifications = verifications.filter(v => v.status !== 'pendiente')
  const pendingSuggestions = placeSuggestions.filter(s => s.status === 'pendiente')
  const otherSuggestions = placeSuggestions.filter(s => s.status !== 'pendiente')
  const pendingAppReports = appReports.filter(r => r.status === 'pendiente')
  const otherAppReports = appReports.filter(r => r.status !== 'pendiente')

  if (!isAdmin) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-3 text-gray-400 px-8 text-center">
        <ShieldAlert size={36} />
        <p className="text-sm">No tienes acceso a esta sección.</p>
        <button onClick={onBack} className="text-xs font-semibold text-ps-purple border-0 bg-transparent cursor-pointer">Volver</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-white">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <button onClick={onBack} className="border-0 bg-transparent cursor-pointer text-ps-purple">
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-lg font-bold text-gray-900">Moderación</h2>
      </div>

      <div className="flex bg-white border-b border-gray-100 flex-shrink-0 overflow-x-auto">
        <button
          onClick={() => setTab('reportes')}
          className="flex-1 py-2.5 px-2 text-sm font-medium border-0 bg-transparent cursor-pointer border-b-2 flex items-center justify-center gap-1.5 whitespace-nowrap"
          style={{ color: tab === 'reportes' ? '#7C3AED' : '#9CA3AF', borderBottomColor: tab === 'reportes' ? '#7C3AED' : 'transparent' }}
        >
          <Flag size={14} /> Reportes {pendingReports.length > 0 && `(${pendingReports.length})`}
        </button>
        <button
          onClick={() => setTab('verificaciones')}
          className="flex-1 py-2.5 px-2 text-sm font-medium border-0 bg-transparent cursor-pointer border-b-2 flex items-center justify-center gap-1.5 whitespace-nowrap"
          style={{ color: tab === 'verificaciones' ? '#7C3AED' : '#9CA3AF', borderBottomColor: tab === 'verificaciones' ? '#7C3AED' : 'transparent' }}
        >
          <BadgeCheck size={14} /> Verificaciones {pendingVerifications.length > 0 && `(${pendingVerifications.length})`}
        </button>
        <button
          onClick={() => setTab('lugares')}
          className="flex-1 py-2.5 px-2 text-sm font-medium border-0 bg-transparent cursor-pointer border-b-2 flex items-center justify-center gap-1.5 whitespace-nowrap"
          style={{ color: tab === 'lugares' ? '#7C3AED' : '#9CA3AF', borderBottomColor: tab === 'lugares' ? '#7C3AED' : 'transparent' }}
        >
          <MapPin size={14} /> Lugares {pendingSuggestions.length > 0 && `(${pendingSuggestions.length})`}
        </button>
        <button
          onClick={() => setTab('appReportes')}
          className="flex-1 py-2.5 px-2 text-sm font-medium border-0 bg-transparent cursor-pointer border-b-2 flex items-center justify-center gap-1.5 whitespace-nowrap"
          style={{ color: tab === 'appReportes' ? '#7C3AED' : '#9CA3AF', borderBottomColor: tab === 'appReportes' ? '#7C3AED' : 'transparent' }}
        >
          <AlertTriangle size={14} /> App {pendingAppReports.length > 0 && `(${pendingAppReports.length})`}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-ps-bg px-4 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
            <span className="text-4xl">🐾</span>
            <p className="text-sm">Cargando...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-600">{error}</div>
        ) : tab === 'reportes' ? (
          [...pendingReports, ...otherReports].length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
              <Flag size={32} className="text-gray-200" />
              <p className="text-sm">No hay reportes</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {[...pendingReports, ...otherReports].map(r => (
                <div key={r.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">
                      {r.reporter_pet_name || 'Alguien'} reportó a {r.reported_pet_name || 'un usuario'}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="text-xs text-gray-500">Motivo: <span className="font-medium text-gray-700">{r.reason}</span></div>
                  {r.details && <div className="text-xs text-gray-500">{r.details}</div>}
                  <div className="text-[10px] text-gray-400">{formatDate(r.created_at)}</div>
                  {r.status === 'pendiente' && (
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => updateReport(r.id, 'revisado')} className="flex-1 py-2 rounded-full text-xs font-semibold border-0 cursor-pointer" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                        Marcar revisado
                      </button>
                      <button onClick={() => updateReport(r.id, 'descartado')} className="flex-1 py-2 rounded-full text-xs font-semibold border-0 cursor-pointer" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                        Descartar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : tab === 'verificaciones' ? (
          [...pendingVerifications, ...otherVerifications].length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
              <BadgeCheck size={32} className="text-gray-200" />
              <p className="text-sm">No hay solicitudes de verificación</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {[...pendingVerifications, ...otherVerifications].map(v => (
                <div key={v.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-ps-purple-light flex items-center justify-center overflow-hidden flex-shrink-0">
                      {v.avatar_url ? <img src={v.avatar_url} alt={v.pet_name} className="w-full h-full object-cover" /> : <span className="text-xl">🐕</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900">{v.pet_name || 'Sin nombre'}</div>
                      <div className="text-xs text-gray-400">{v.breed}</div>
                    </div>
                    <StatusBadge status={v.status} />
                  </div>
                  {v.photo_url && (
                    <a href={v.photo_url} target="_blank" rel="noopener noreferrer">
                      <img src={v.photo_url} alt="verificación" className="w-full rounded-xl object-cover" style={{ maxHeight: 220 }} />
                    </a>
                  )}
                  {v.note && <div className="text-xs text-gray-500">{v.note}</div>}
                  <div className="text-[10px] text-gray-400">{formatDate(v.created_at)}</div>
                  {v.status === 'pendiente' && (
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => updateVerification(v.id, 'aprobado')} className="flex-1 py-2 rounded-full text-xs font-semibold border-0 cursor-pointer" style={{ background: '#DCFCE7', color: '#16A34A' }}>
                        Aprobar
                      </button>
                      <button onClick={() => updateVerification(v.id, 'rechazado')} className="flex-1 py-2 rounded-full text-xs font-semibold border-0 cursor-pointer" style={{ background: '#FEE2E2', color: '#DC2626' }}>
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : tab === 'lugares' ? (
          [...pendingSuggestions, ...otherSuggestions].length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
              <MapPin size={32} className="text-gray-200" />
              <p className="text-sm">No hay lugares sugeridos</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {[...pendingSuggestions, ...otherSuggestions].map(s => (
                <div key={s.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">{s.name}</span>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="text-xs text-gray-500">Sugerido por {s.user_pet_name || 'alguien'} · categoría: <span className="font-medium text-gray-700">{s.category}</span></div>
                  {s.address && <div className="text-xs text-gray-500">{s.address}</div>}
                  {s.description && <div className="text-xs text-gray-500">{s.description}</div>}
                  {s.contact_phone && <div className="text-xs text-gray-500">Tel: {s.contact_phone}</div>}
                  <div className="text-[10px] text-gray-400">{formatDate(s.created_at)}</div>
                  {s.status === 'pendiente' && (
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => updatePlaceSuggestion(s.id, 'aprobado')} className="flex-1 py-2 rounded-full text-xs font-semibold border-0 cursor-pointer" style={{ background: '#DCFCE7', color: '#16A34A' }}>
                        Aprobar (agregar a Lugares)
                      </button>
                      <button onClick={() => updatePlaceSuggestion(s.id, 'rechazado')} className="flex-1 py-2 rounded-full text-xs font-semibold border-0 cursor-pointer" style={{ background: '#FEE2E2', color: '#DC2626' }}>
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          [...pendingAppReports, ...otherAppReports].length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
              <AlertTriangle size={32} className="text-gray-200" />
              <p className="text-sm">No hay reportes de la app</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {[...pendingAppReports, ...otherAppReports].map(r => (
                <div key={r.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">
                      {r.type === 'lugar' ? `Reporte de lugar${r.place_name ? ': ' + r.place_name : ''}` : 'Problema de la app'}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="text-xs text-gray-500">De {r.user_pet_name || 'alguien'}</div>
                  {r.reason && <div className="text-xs text-gray-500">Motivo: <span className="font-medium text-gray-700">{r.reason}</span></div>}
                  {r.details && <div className="text-xs text-gray-500">{r.details}</div>}
                  <div className="text-[10px] text-gray-400">{formatDate(r.created_at)}</div>
                  {r.status === 'pendiente' && (
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => updateAppReport(r.id, 'revisado')} className="flex-1 py-2 rounded-full text-xs font-semibold border-0 cursor-pointer" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                        Marcar revisado
                      </button>
                      <button onClick={() => updateAppReport(r.id, 'descartado')} className="flex-1 py-2 rounded-full text-xs font-semibold border-0 cursor-pointer" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                        Descartar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
