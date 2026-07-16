import React, { useState, useEffect, useRef } from 'react'
import { Plus, MapPin, Clock, Users, X, Trash2, ArrowLeft, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'
import InviteModal from '../components/InviteModal'
import { usePullToRefresh } from '../usePullToRefresh'
import PullToRefreshIndicator from '../components/PullToRefreshIndicator'

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

function AttendeesModal({ eventId, onClose }) {
  const { t } = useLanguage()
  const [attendees, setAttendees] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAttendees() }, [])

  async function fetchAttendees() {
    setLoading(true)
    const { data } = await supabase
      .from('event_attendees')
      .select('user_id, profiles(pet_name, emoji, avatar_url, breed)')
      .eq('event_id', eventId)
    if (data) setAttendees(data)
    setLoading(false)
  }

  return (
    <div className="absolute inset-0 bg-black/50 z-50 flex flex-col justify-end">
      <div className="bg-white rounded-t-3xl flex flex-col max-h-[70%]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">{t('eventos.attendeesListTitle')}</h3>
          <button onClick={onClose} className="border-0 bg-transparent cursor-pointer text-gray-400">
            <X size={22} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">{t('common.loading')}</div>
          ) : attendees.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-400">
              <span className="text-3xl">🐾</span>
              <p className="text-sm">{t('eventos.noAttendeesYet')}</p>
            </div>
          ) : (
            attendees.map(a => (
              <div key={a.user_id} className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
                <div className="w-11 h-11 rounded-full bg-ps-purple-light flex items-center justify-center text-xl overflow-hidden flex-shrink-0">
                  {a.profiles?.avatar_url ? (
                    <img src={a.profiles.avatar_url} alt={a.profiles.pet_name} className="w-full h-full object-cover" />
                  ) : (
                    a.profiles?.emoji || '🐕'
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-900">{a.profiles?.pet_name}</div>
                  <div className="text-xs text-gray-400">{a.profiles?.breed}</div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="w-full py-3 rounded-full text-sm text-gray-400 border border-gray-200 bg-white cursor-pointer">
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

function EventDetailModal({ event, onClose, onToggle, onInvite, onDelete, currentUserId }) {
  const { t } = useLanguage()
  const typeColors = getTypeColors(t)
  const tc = typeColors[event.type] || { bg: '#EDE9FE', color: '#7C3AED', label: event.type }
  const maxAttendees = event.max_attendees || 10
  const pct = Math.round((event.attendees / maxAttendees) * 100)
  const past = isPast(event.date)
  const [showAttendeesList, setShowAttendeesList] = useState(false)

  return (
    <div className="absolute inset-0 bg-white z-50 flex flex-col overflow-y-auto">
      {/* Header imagen */}
      <div className="relative flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ background: event.bg, height: event.image_url ? 220 : 'auto', paddingTop: event.image_url ? 0 : 48, paddingBottom: event.image_url ? 0 : 48 }}>
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <span className="text-8xl">{event.emoji}</span>
        )}
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
          <div className="flex justify-between items-center text-xs text-gray-400 mb-1.5">
            <span>{t('eventos.attendeesHeader')}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAttendeesList(true)}
                className="text-ps-purple font-medium border-0 bg-transparent cursor-pointer p-0"
              >
                {t('eventos.viewAttendees')}
              </button>
              <span>{pct}%</span>
            </div>
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

      {showAttendeesList && (
        <AttendeesModal eventId={event.id} onClose={() => setShowAttendeesList(false)} />
      )}
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
      <div className="relative h-32 flex items-center justify-center overflow-hidden" style={{ background: event.bg }}>
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <span className="text-5xl">{event.emoji}</span>
        )}
        {past && (
          <span className="absolute top-2 right-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-800/70 text-white">
            {t('eventos.finished')}
          </span>
        )}
        {event.profiles && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full pl-1 pr-2.5 py-1">
            <div className="w-5 h-5 rounded-full overflow-hidden bg-white/30 flex items-center justify-center flex-shrink-0">
              {event.profiles.avatar_url ? (
                <img src={event.profiles.avatar_url} alt={event.profiles.pet_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px]">{event.profiles.emoji || '🐕'}</span>
              )}
            </div>
            <span className="text-[10px] font-semibold text-white">{event.profiles.pet_name}</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-gray-900 text-sm flex-1">{event.title}</h3>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: tc.bg, color: tc.color }}>
            {tc.label}
          </span>
        </div>
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
  const { user } = useAuth()
  const { t } = useLanguage()
  const types = getTypes(t)
  const typeColors = getTypeColors(t)
  const [form, setForm] = useState({
    title: '', type: 'paseo', date: '', time: '',
    location: '', maxAttendees: 10, description: '', image: '',
    lat: null, lng: null,
  })
  const [imageUploading, setImageUploading] = useState(false)
  const locationInputRef = useRef(null)
  const autocompleteRef = useRef(null)

  function handle(k, v) { setForm(f => ({ ...f, [k]: v })) }

  // Autocompletado de Google Places en el campo de ubicacion: asi
  // capturamos lat/lng reales del lugar del evento (no solo el texto),
  // necesarios para el recordatorio de "eventos cerca de ti".
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY

    function attachAutocomplete() {
      if (!locationInputRef.current || !window.google?.maps?.places) return
      autocompleteRef.current = new window.google.maps.places.Autocomplete(locationInputRef.current, {
        fields: ['formatted_address', 'geometry', 'name'],
        componentRestrictions: { country: 'pa' },
      })
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace()
        if (!place.geometry) return
        setForm(f => ({
          ...f,
          location: place.formatted_address || place.name || f.location,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        }))
      })
    }

    if (window.google && window.google.maps) {
      attachAutocomplete()
      return
    }
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      const checkReady = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkReady)
          attachAutocomplete()
        }
      }, 100)
      return () => clearInterval(checkReady)
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = attachAutocomplete
    document.head.appendChild(script)
  }, [])

  async function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/event-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('pet-photos').upload(path, file)
    if (!error) {
      const { data } = supabase.storage.from('pet-photos').getPublicUrl(path)
      handle('image', data.publicUrl)
    }
    setImageUploading(false)
  }

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
            <input
              ref={locationInputRef}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-ps-bg"
              placeholder={t('eventos.locationPlaceholder')}
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value, lat: null, lng: null }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('eventos.eventImage')}</label>
            {form.image ? (
              <div className="relative">
                <img src={form.image} alt="" className="w-full h-32 object-cover rounded-xl" />
                <button
                  onClick={() => handle('image', '')}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center border-0 cursor-pointer bg-black/50"
                >
                  <X size={14} color="white" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 border border-dashed border-gray-300 rounded-xl py-4 cursor-pointer text-xs text-gray-400">
                <ImageIcon size={16} />
                {imageUploading ? t('eventos.uploadingImage') : t('eventos.uploadImage')}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={imageUploading} />
              </label>
            )}
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

export default function Eventos({ initialEventId, onConsumeInitialEvent }) {
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

  useEffect(() => {
    if (!initialEventId || events.length === 0) return
    const found = events.find(e => e.id === initialEventId)
    if (found) {
      setSelectedEvent(found)
      onConsumeInitialEvent && onConsumeInitialEvent()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEventId, events])

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
        image_url: event.image || null,
        lat: event.lat || null, lng: event.lng || null,
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

  const { containerRef: eventosScrollRef, pullDistance, refreshing, threshold } = usePullToRefresh(fetchEvents)

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
      <div ref={eventosScrollRef} className="flex-1 overflow-y-auto bg-ps-bg py-2">
        <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} threshold={threshold} />
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
