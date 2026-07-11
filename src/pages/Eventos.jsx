import React, { useState, useEffect } from 'react'
import { Plus, MapPin, Clock, Users, X, Trash2, ArrowLeft } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'
import InviteModal from '../components/InviteModal'

function isPast(dateStr) {
  if (!dateStr) return false
  const eventDate = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return eventDate < today
}

function getTypes(t) {
  return [
    { id: 'all',        label: t('eventos.typeAll'),        emoji: '📅' },
    { id: 'paseo',      label: t('eventos.typePaseo'),      emoji: '🦮' },
    { id: 'meetup',     label: t('eventos.typeMeetup'),     emoji: '🐾' },
    { id: 'feria',      label: t('eventos.typeFeria'),      emoji: '❤️' },
    { id: 'cumpleanos', label: t('eventos.typeCumpleanos'), emoji: '🎂' },
  ]
}

function getTypeColors(t) {
  return {
    paseo:      { bg: '#E0F7F4', color: '#0F9B8E', label: t('eventos.tcPaseo') },
    meetup:     { bg: '#EDE9FE', color: '#7C3AED', label: t('eventos.tcMeetup') },
    feria:      { bg: '#FCE7F3', color: '#EC4899', label: t('eventos.tcFeria') },
    cumpleanos: { bg: '#FEF9C3', color: '#CA8A04', label: t('eventos.tcCumpleanos') },
  }
}

function EventDetailModal({ event, onClose, onToggle, onInvite, onDelete, currentUserId }) {
  const { t } = useLanguage()
  const typeColors = getTypeColors(t)
  const tc = typeColors[event.type] || { bg: '#EDE9FE', color: '#7C3AED', label: event.type }
  const maxAttendees = event.max_attendees || 10
  const pct = Math.round((event.attendees / maxAttendees) * 100)
  const past = isPast(event.date)

  return (
    <div className="absolute inset-0 bg-white z-50 flex flex-col overflow-y-auto">
      {/* Header imagen */}
      <div className="flex items-center justify-center text-8xl py-12 relative flex-shrink-0" style={{ background: event.bg }}>
        {event.emoji}
        <button onClick={onClose} className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center border-0 cursor-pointer bg-black/30">
          <ArrowLeft size={20} color="white" />
        </button>
        {past && (
          <span className="absolute top-4 right-4 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-800/70 text-white">
            {t('eventos.finished')}
          </span>
        )}
        {event.user_id === currentUserId && (
          <button
            onClick={() => { onDelete(event.id); onClose() }}
            className="absolute bottom-4 right-4 w-9 h-9 rounded-full flex items-center justify-center border-0 cursor-pointer bg-black/30"
          >
            <Trash2 size={16} color="white" />
          </button>
        )}
      </div>

      {/* Contenido */}
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-bold text-gray-900 text-xl flex-1">{event.title}</h2>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: tc.bg, color: tc.color }}>
            {tc.label}
          </span>
        </div>

        {/* Creador */}
        {event.profiles && (
          <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: '#F9F7FF' }}>
            <div className="w-10 h-10 rounded-full overflow-hidden bg-ps-purple-light flex items-center justify-center flex-shrink-0">
              {event.profiles.avatar_url ? (
                <img src={event.profiles.avatar_url} className="w-full h-full object-cover" alt={event.profiles.pet_name} />
              ) : (
                <span className="text-lg">{event.profiles.emoji || '🐕'}</span>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400">{t('eventos.organizedBy')}</p>
              <p className="text-sm font-semibold text-gray-900">{event.profiles.pet_name}</p>
            </div>
          </div>
        )}

        {/* Descripción */}
        {event.description && (
          <p className="text-sm text-gray-600 leading-relaxed">{event.description}</p>
        )}

        {/* Detalles */}
        <div className="flex flex-col gap-3 p-4 rounded-2xl bg-gray-50">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Clock size={16} className="text-ps-purple flex-shrink-0" />
            <span>{event.date} · {event.time}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <MapPin size={16} className="text-ps-purple flex-shrink-0" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Users size={16} className="text-ps-purple flex-shrink-0" />
            <span>{t('eventos.attendeesCount', { count: event.attendees, max: maxAttendees })}</span>
          </div>
        </div>

        {/* Barra de progreso */}
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span>{t('eventos.attendeesHeader')}</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: tc.color }} />
          </div>
        </div>

        {/* Botones */}
        {!past && (
          <div className="flex flex-col gap-2 mt-2">
            <button
              onClick={() => onInvite(event)}
              className="w-full py-3 rounded-full text-sm font-semibold border-0 cursor-pointer"
              style={{ background: '#EDE9FE', color: '#7C3AED' }}
            >
              {t('eventos.inviteFriends')}
            </button>
            <button
              onClick={() => onToggle(event.id)}
              className="w-full py-3 rounded-full text-sm font-semibold border-0 cursor-pointer"
              style={{
                background: event.joined ? '#F3F4F6' : '#7C3AED',
                color: event.joined ? '#6B7280' : 'white',
              }}
            >
              {event.joined ? t('eventos.joined') : t('eventos.joinEvent')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function EventCard({ event, onSelect }) {
  const { t } = useLanguage()
  const typeColors = getTypeColors(t)
  const tc = typeColors[event.type] || { bg: '#EDE9FE', color: '#7C3AED', label: event.type }
  const maxAttendees = event.max_attendees || 10
  const past = isPast(event.date)

  return (
    <div
      onClick={() => onSelect(event)}
      className="bg-white mx-4 my-2 rounded-2xl overflow-hidden border border-gray-100 cursor-pointer active:opacity-80"
      style={{ opacity: past ? 0.65 : 1 }}
    >
      <div className="flex items-center justify-center text-5xl py-5 relative" style={{ background: event.bg }}>
        {event.emoji}
        {past && (
          <span className="absolute top-2 right-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-800/70 text-white">
            {t('eventos.finished')}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-gray-900 text-sm flex-1">{event.title}</h3>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: tc.bg, color: tc.color }}>
            {tc.label}
          </span>
        </div>
        {event.profiles && (
          <p className="text-xs text-gray-400 mb-2">{t('eventos.by', { name: event.profiles.pet_name })}</p>
        )}
        <div className="flex flex-col gap-1 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <Clock size={11} className="text-ps-purple" />
            <span>{event.date} · {event.time}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={11} className="text-ps-purple" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={11} className="text-ps-purple" />
            <span>{t('eventos.attendeesCount', { count: event.attendees, max: maxAttendees })}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function CreateEventModal({ onClose, onCreate }) {
  const { t } = useLanguage()
  const types = getTypes(t)
  const typeColors = getTypeColors(t)
  const [form, setForm] = useState({
    title: '', type: 'paseo', date: '', time: '',
    location: '', maxAttendees: 10, description: '',
  })

  function handle(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function submit() {
    if (!form.title || !form.date || !form.location) return
    onCreate({
      ...form,
      emoji: types.find(ty => ty.id === form.type)?.emoji || '📅',
      bg: typeColors[form.type]?.bg || '#EDE9FE',
    })
    onClose()
  }

  return (
    <div className="absolute inset-0 bg-black/50 z-50 flex flex-col justify-end">
      <div className="bg-white rounded-t-3xl flex flex-col max-h-[90%]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">{t('eventos.createEventTitle')}</h3>
          <button onClick={onClose} className="border-0 bg-transparent cursor-pointer text-gray-400">
            <X size={22} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('eventos.eventName')}</label>
            <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-ps-bg" placeholder={t('eventos.eventNamePlaceholder')} value={form.title} onChange={e => handle('title', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('eventos.eventType')}</label>
            <div className="flex gap-2 flex-wrap">
              {types.filter(ty => ty.id !== 'all').map(ty => (
                <button key={ty.id} onClick={() => handle('type', ty.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border-0 cursor-pointer"
                  style={{ background: form.type === ty.id ? '#7C3AED' : '#EDE9FE', color: form.type === ty.id ? 'white' : '#7C3AED' }}>
                  {ty.emoji} {ty.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('eventos.date')}</label>
              <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-ps-bg" value={form.date} onChange={e => handle('date', e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('eventos.time')}</label>
              <input type="time" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-ps-bg" value={form.time} onChange={e => handle('time', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('eventos.location')}</label>
            <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-ps-bg" placeholder={t('eventos.locationPlaceholder')} value={form.location} onChange={e => handle('location', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('eventos.maxAttendees', { count: form.maxAttendees })}</label>
            <input type="range" min="2" max="100" value={form.maxAttendees} onChange={e => handle('maxAttendees', parseInt(e.target.value))} className="w-full accent-ps-purple" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('eventos.description')}</label>
            <textarea className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-ps-bg resize-none" placeholder={t('eventos.descriptionPlaceholder')} rows={3} value={form.description} onChange={e => handle('description', e.target.value)} />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100">
          <button onClick={submit} className="w-full py-3.5 rounded-full font-semibold text-white text-base border-0 cursor-pointer"
            style={{ background: form.title && form.date && form.location ? '#7C3AED' : '#C4B5FD' }}>
            {t('eventos.createEventBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Eventos() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const types = getTypes(t)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [inviteEvent, setInviteEvent] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)

  useEffect(() => { fetchEvents() }, [])

  async function fetchEvents() {
    setLoading(true)
    const { data, error } = await supabase
      .from('events')
      .select('*, profiles(pet_name, emoji, avatar_url)')
      .order('date', { ascending: true })

    const { data: myAttendance } = await supabase
      .from('event_attendees')
      .select('event_id')
      .eq('user_id', user.id)
    const joinedIds = new Set(myAttendance?.map(a => a.event_id) || [])

    if (!error && data) {
      setEvents(data.map(e => ({ ...e, joined: joinedIds.has(e.id) })))
    }
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
        user_id: user.id,
      }])
      .select('*, profiles(pet_name, emoji, avatar_url)')
    if (!error && data) setEvents(prev => [...prev, data[0]])
  }

  async function deleteEvent(id) {
    if (!window.confirm(t('eventos.deleteEventConfirm'))) return
    await supabase.from('events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
    setSelectedEvent(null)
  }

  async function toggleAttend(id) {
    const event = events.find(e => e.id === id)
    if (!event) return
    const newAttendees = event.joined ? event.attendees - 1 : event.attendees + 1

    const attendanceError = event.joined
      ? (await supabase.from('event_attendees').delete().eq('event_id', id).eq('user_id', user.id)).error
      : (await supabase.from('event_attendees').insert([{ event_id: id, user_id: user.id }])).error
    if (attendanceError) return

    const { error } = await supabase.from('events').update({ attendees: newAttendees }).eq('id', id)
    if (!error) {
      setEvents(evs => evs.map(e => e.id === id ? { ...e, joined: !e.joined, attendees: newAttendees } : e))
      setSelectedEvent(prev => prev?.id === id ? { ...prev, joined: !prev.joined, attendees: newAttendees } : prev)
    }
  }

  const filtered = activeType === 'all' ? events : events.filter(e => e.type === activeType)
  const upcoming = filtered.filter(e => !isPast(e.date))
  const past = filtered.filter(e => isPast(e.date))

  if (loading) return (
    <div className="flex flex-col flex-1 items-center justify-center gap-3 text-gray-400">
      <span className="text-4xl">🐾</span>
      <p className="text-sm">{t('eventos.loadingEvents')}</p>
    </div>
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <h2 className="text-xl font-bold text-gray-900">{t('eventos.title')}</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 bg-ps-purple text-white text-xs font-semibold px-3.5 py-2 rounded-full border-0 cursor-pointer">
          <Plus size={14} /> {t('eventos.create')}
        </button>
      </div>
      <div className="flex gap-2 px-4 py-2.5 bg-white border-b border-gray-100 overflow-x-auto flex-shrink-0">
        {types.map(ty => (
          <button key={ty.id} onClick={() => setActiveType(ty.id)}
            className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-full border-0 cursor-pointer whitespace-nowrap flex-shrink-0"
            style={{ background: activeType === ty.id ? '#7C3AED' : '#EDE9FE', color: activeType === ty.id ? 'white' : '#7C3AED' }}
          >
            {ty.emoji} {ty.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto bg-ps-bg py-2">
        {upcoming.length === 0 && past.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
            <span className="text-4xl">📅</span>
            <p className="text-sm">{t('eventos.noEventsYet')}</p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <div className="px-4 py-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('eventos.upcoming')}</span>
                </div>
                {upcoming.map(e => <EventCard key={e.id} event={e} onSelect={setSelectedEvent} />)}
              </>
            )}
            {past.length > 0 && (
              <>
                <div className="px-4 py-2 mt-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('eventos.finishedSection')}</span>
                </div>
                {past.map(e => <EventCard key={e.id} event={e} onSelect={setSelectedEvent} />)}
              </>
            )}
          </>
        )}
      </div>

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onToggle={toggleAttend}
          onInvite={setInviteEvent}
          onDelete={deleteEvent}
          currentUserId={user.id}
        />
      )}

      {showCreate && <CreateEventModal onClose={() => setShowCreate(false)} onCreate={createEvent} />}
      {inviteEvent && <InviteModal event={inviteEvent} onClose={() => setInviteEvent(null)} />}
    </div>
  )
}
