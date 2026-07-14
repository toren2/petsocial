import React, { useState, useEffect } from 'react'
import { X, Send, Check } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'
import { notifyEventInvite } from '../notifications.js'

export default function InviteModal({ event, onClose }) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState({})
  const [sent, setSent] = useState({})

  useEffect(() => { fetchMatches() }, [])

  async function fetchMatches() {
    setLoading(true)
    const { data } = await supabase
      .from('matches')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

    if (data && data.length > 0) {
      const otherIds = data.map(m => m.user1_id === user.id ? m.user2_id : m.user1_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, pet_name, emoji, breed')
        .in('id', otherIds)
      if (profiles) setMatches(profiles)
    }
    setLoading(false)
  }

  async function sendInvite(receiverId) {
    setSending(s => ({ ...s, [receiverId]: true }))
    const { error } = await supabase
      .from('event_invites')
      .upsert([{
        event_id: event.id,
        sender_id: user.id,
        receiver_id: receiverId,
        status: 'pending',
      }], { onConflict: 'event_id,receiver_id', ignoreDuplicates: true })
    setSending(s => ({ ...s, [receiverId]: false }))
    if (!error) {
  setSent(s => ({ ...s, [receiverId]: true }))
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('pet_name')
    .eq('id', user.id)
    .single()
  await notifyEventInvite(receiverId, myProfile?.pet_name || t('inviteModal.somePet'), event.title, event.id)
}
  }

  return (
    <div className="absolute inset-0 bg-black/50 z-50 flex flex-col justify-end">
      <div className="bg-white rounded-t-3xl flex flex-col max-h-[70%]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">{t('inviteModal.title')}</h3>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[240px]">{event.title}</p>
          </div>
          <button onClick={onClose} className="border-0 bg-transparent cursor-pointer text-gray-400">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              {t('inviteModal.loadingMatches')}
            </div>
          ) : matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-400">
              <span className="text-3xl">🐾</span>
              <p className="text-sm">{t('inviteModal.noMatchesYet')}</p>
            </div>
          ) : (
            matches.map(match => (
              <div key={match.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
                <div className="w-11 h-11 rounded-full bg-ps-purple-light flex items-center justify-center text-xl flex-shrink-0">
                  {match.emoji}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-900">{match.pet_name}</div>
                  <div className="text-xs text-gray-400">{match.breed}</div>
                </div>
                <button
                  onClick={() => !sent[match.id] && sendInvite(match.id)}
                  disabled={sending[match.id] || sent[match.id]}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border-0 cursor-pointer"
                  style={{
                    background: sent[match.id] ? '#DCFCE7' : '#7C3AED',
                    color: sent[match.id] ? '#16A34A' : 'white',
                  }}
                >
                  {sent[match.id] ? (
                    <><Check size={13} /> {t('inviteModal.sent')}</>
                  ) : sending[match.id] ? (
                    t('inviteModal.sending')
                  ) : (
                    <><Send size={13} /> {t('inviteModal.invite')}</>
                  )}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="w-full py-3 rounded-full text-sm text-gray-400 border border-gray-200 bg-white cursor-pointer">
            {t('inviteModal.close')}
          </button>
        </div>
      </div>
    </div>
  )
}