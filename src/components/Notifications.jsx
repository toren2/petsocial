import React, { useState, useEffect } from 'react'
import { X, Heart, MessageCircle, Calendar, Bell } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'

function NotificationIcon({ type }) {
  if (type === 'match') return <Heart size={18} color="white" />
  if (type === 'message') return <MessageCircle size={18} color="white" />
  if (type === 'event_invite') return <Calendar size={18} color="white" />
  if (type === 'like') return <Heart size={18} color="white" />
  if (type === 'comment') return <MessageCircle size={18} color="white" />
  return <Bell size={18} color="white" />
}

function iconBg(type) {
  if (type === 'match') return '#EC4899'
  if (type === 'message') return '#7C3AED'
  if (type === 'event_invite') return '#0F9B8E'
  if (type === 'like') return '#EC4899'
  if (type === 'comment') return '#D97706'
  return '#6B7280'
}

export default function Notifications({ onClose, onNavigate }) {
  const { user } = useAuth()
  const { t, language } = useLanguage()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()

    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, payload => {
        setNotifications(prev => [payload.new, ...prev])
      })
      .subscribe()

    return () => supabase.removeChannel(subscription)
  }, [])

  async function fetchNotifications() {
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setNotifications(data)
    setLoading(false)
  }

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function markRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const unread = notifications.filter(n => !n.read).length

  return (
    <div className="absolute inset-0 bg-white z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-gray-900">{t('notifications.title')}</h2>
          {unread > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#EC4899', color: 'white' }}>
              {unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-ps-purple border-0 bg-transparent cursor-pointer font-medium">
              {t('notifications.markAll')}
            </button>
          )}
          <button onClick={onClose} className="border-0 bg-transparent cursor-pointer text-gray-400">
            <X size={22} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-ps-bg">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
            {t('common.loading')}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
            <Bell size={40} className="text-gray-200" />
            <p className="text-sm">{t('notifications.noNotifications')}</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              onClick={() => {
                markRead(n.id)
                if (onNavigate && (n.type === 'match' || n.type === 'message')) onNavigate(n)
              }}
              className="flex items-start gap-3 px-4 py-3.5 border-b border-gray-100 cursor-pointer"
              style={{ background: n.read ? 'white' : '#F5F3FF' }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: iconBg(n.type) }}
              >
                <NotificationIcon type={n.type} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-900">{n.title}</div>
                {n.body && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>}
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(n.created_at).toLocaleDateString(language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {!n.read && (
                <div className="w-2 h-2 rounded-full bg-ps-purple flex-shrink-0 mt-1.5" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}