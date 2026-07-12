import React, { useState, useEffect } from 'react'
import { ArrowLeft, Flag, BadgeCheck, ShieldAlert } from 'lucide-react'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return }
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    setError('')
    const [{ data: r, error: rErr }, { data: v, error: vErr }] = await Promise.all([
      supabase.rpc('admin_list_reports'),
      supabase.rpc('admin_list_verification_requests'),
    ])
    if (rErr || vErr) {
      setError((rErr || vErr).message)
    } else {
      setReports(r || [])
      setVerifications(v || [])
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

  const pendingReports = reports.filter(r => r.status === 'pendiente')
  const otherReports = reports.filter(r => r.status !== 'pendiente')
  const pendingVerifications = verifications.filter(v => v.status === 'pendiente')
  const otherVerifications = verifications.filter(v => v.status !== 'pendiente')

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

      <div className="flex bg-white border-b border-gray-100 flex-shrink-0">
        <button
          onClick={() => setTab('reportes')}
          className="flex-1 py-2.5 text-sm font-medium border-0 bg-transparent cursor-pointer border-b-2 flex items-center justify-center gap-1.5"
          style={{ color: tab === 'reportes' ? '#7C3AED' : '#9CA3AF', borderBottomColor: tab === 'reportes' ? '#7C3AED' : 'transparent' }}
        >
          <Flag size={14} /> Reportes {pendingReports.length > 0 && `(${pendingReports.length})`}
        </button>
        <button
          onClick={() => setTab('verificaciones')}
          className="flex-1 py-2.5 text-sm font-medium border-0 bg-transparent cursor-pointer border-b-2 flex items-center justify-center gap-1.5"
          style={{ color: tab === 'verificaciones' ? '#7C3AED' : '#9CA3AF', borderBottomColor: tab === 'verificaciones' ? '#7C3AED' : 'transparent' }}
        >
          <BadgeCheck size={14} /> Verificaciones {pendingVerifications.length > 0 && `(${pendingVerifications.length})`}
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
        ) : (
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
        )}
      </div>
    </div>
  )
}
