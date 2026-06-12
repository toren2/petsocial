import React, { useState, useEffect } from 'react'
import { Plus, MapPin, Clock, Users, X } from 'lucide-react'
import { supabase } from '../supabase'

const types = [
  { id: 'all',        label: 'Todos',      emoji: '📅' },
  { id: 'paseo',      label: 'Paseos',     emoji: '🦮' },
  { id: 'meetup',     label: 'Meetups',    emoji: '🐾' },
  { id: 'feria',      label: 'Ferias',     emoji: '❤️' },
  { id: 'cumpleanos', label: 'Cumpleaños', emoji: '🎂' },
]

const typeColors = {
  paseo:      { bg: '#E0F7F4', color: '#0F9B8E', label: 'Paseo' },
  meetup:     { bg: '#EDE9FE', color: '#7C3AED', label: 'Meetup' },
  feria:      { bg: '#FCE7F3', color: '#EC4899', label: 'Feria' },
  cumpleanos: { bg: '#FEF9C3', color: '#CA8A04', label: 'Cumpleaños' },
}

function EventCard({ event, onToggle }) {
  const tc = typeColors[event.type] || { bg: '#EDE9FE', color: '#7C3AED', label: event.type }
  const maxAttendees = event.max_attendees || event.maxAttendees || 10
  const pct = Math.round((event.attendees / maxAttendees) * 100)

  return (
    <div className="bg-white mx-4 my-2 rounded-2xl overflow-hidden border border-gray-100">
      <div className="flex items-center justify-center text-6xl py-6" style={{ background: event.bg }}>
        {event.emoji}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-gray-900 text-base flex-1">{event.title}</h3>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: tc.bg, color: tc.color }}>
            {tc.label}
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-3 leading-relaxed">{event.description}</p>
        <div className="flex flex-col gap-1.5 mb-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock size={13} className="text-ps-purple" />
            <span>{event.date} · {event.time}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MapPin size={13} className="text-ps-purple" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Users size={13} className="text-ps-purple" />
            <span>{event.attendees} / {maxAttendees} asistentes</span>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
          <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: tc.color }} />
        </div>
        <button
          onClick={() => onToggle(event.id)}
          className="w-full py-2.5 rounded-full text-sm font-semibold border-0 cursor-pointer transition-all"
          style={{
            background: event.joined ? '#F3F4F6' : '#7C3AED',
            color: event.joined ? '#6B7280' : 'white',
          }}
        >
          {event.joined ? '✓ Apuntado' : 'Me apunto'}
        </button>
      </div>
    </div>
  )
}

function CreateEventModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    title: '', type: 'paseo', date: '', time: '',
    location: '', maxAttendees: 10, description: '',
  })

  function handle(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function submit() {
    if (!form.title || !form.date || !form.location) return
    onCreate({
      ...form,
      emoji: types.find(t => t.id === form.type)?.emoji || '📅',
      bg: typeColors[form.type]?.bg || '#EDE9FE',
    })
    onClose()
  }

  return (
    <div className="absolute inset-0 bg-black/50 z-50 flex flex-col justify-end">
      <div className="bg-white rounded-t-3xl flex flex-col max-h-[90%]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">Crear evento</h3>
          <button onClick={onClose} className="border-0 bg-transparent cursor-pointer text-gray-400">
            <X size={22} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Nombre del evento</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-ps-bg"
              placeholder="ej. Paseo grupal Parque Omar"
              value={form.title}
              onChange={e => handle('title', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Tipo de evento</label>
            <div className="flex gap-2 flex-wrap">
              {types.filter(t => t.id !== 'all').map(t => (
                <button
                  key={t.id}
                  onClick={() => handle('type', t.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border-0 cursor-pointer"
                  style={{
                    background: form.type === t.id ? '#7C3AED' : '#EDE9FE',
                    color: form.type === t.id ? 'white' : '#7C3AED',
                  }}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Fecha</label>
              <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-ps-bg" value={form.date} onChange={e => handle('date', e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Hora</label>
              <input type="time" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-ps-bg" value={form.time} onChange={e => handle('time', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Ubicación</label>
            <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-ps-bg" placeholder="ej. Parque Omar, San Francisco" value={form.location} onChange={e => handle('location', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Máx. asistentes: {form.maxAttendees}</label>
            <input type="range" min="2" max="100" value={form.maxAttendees} onChange={e => handle('maxAttendees', parseInt(e.target.value))} className="w-full accent-ps-purple" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Descripción</label>
            <textarea className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-ps-bg resize-none" placeholder="Cuéntale a la comunidad de qué se trata..." rows={3} value={form.description} onChange={e => handle('description', e.target.value)} />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={submit}
            className="w-full py-3.5 rounded-full font-semibold text-white text-base border-0 cursor-pointer"
            style={{ background: form.title && form.date && form.location ? '#7C3AED' : '#C4B5FD' }}
          >
            Crear evento
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Eventos() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState('all')
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { fetchEvents() }, [])

  async function fetchEvents() {
    setLoading(true)
    const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false })
    if (!error && data) setEvents(data)
    setLoading(false)
  }

  async function createEvent(event) {
    const { data, error } = await supabase
      .from('events')
      .insert([{
        title: event.title, type: event.type, emoji: event.emoji,
        date: event.date, time: event.time, location: event.location,
        max_attendees: event.maxAttendees, attendees: 1,
        host: 'hoshi_oficial', description: event.description, bg: event.bg,
      }])
      .select()
    console.log('data:', data, 'error:', error)
    if (!error && data) setEvents(prev => [data[0], ...prev])
  }

  async function toggleAttend(id) {
    const event = events.find(e => e.id === id)
    if (!event) return
    const newAttendees = event.joined ? event.attendees - 1 : event.attendees + 1
    const { error } = await supabase.from('events').update({ attendees: newAttendees }).eq('id', id)
    if (!error) setEvents(evs => evs.map(e => e.id === id ? { ...e, joined: !e.joined, attendees: newAttendees } : e))
  }

  const filtered = activeType === 'all' ? events : events.filter(e => e.type === activeType)

  if (loading) return (
    <div className="flex flex-col flex-1 items-center justify-center gap-3 text-gray-400">
      <span className="text-4xl">🐾</span>
      <p className="text-sm">Cargando eventos...</p>
    </div>
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-900">Eventos</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 bg-ps-purple text-white text-xs font-semibold px-3.5 py-2 rounded-full border-0 cursor-pointer">
          <Plus size={14} /> Crear
        </button>
      </div>
      <div className="flex gap-2 px-4 py-2.5 bg-white border-b border-gray-100 overflow-x-auto flex-shrink-0">
        {types.map(t => (
          <button key={t.id} onClick={() => setActiveType(t.id)}
            className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-full border-0 cursor-pointer whitespace-nowrap flex-shrink-0"
            style={{ background: activeType === t.id ? '#7C3AED' : '#EDE9FE', color: activeType === t.id ? 'white' : '#7C3AED' }}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto bg-ps-bg py-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
            <span className="text-4xl">📅</span>
            <p className="text-sm">No hay eventos todavía — ¡crea el primero!</p>
          </div>
        ) : (
          filtered.map(e => <EventCard key={e.id} event={e} onToggle={toggleAttend} />)
        )}
      </div>
      {showCreate && <CreateEventModal onClose={() => setShowCreate(false)} onCreate={createEvent} />}
    </div>
  )
}