import React, { useEffect, useState } from 'react'
import { ArrowLeft, Compass, Map as MapIcon, Trophy, Stethoscope, Scissors, Trees, ShoppingBag, Building2, UtensilsCrossed, Crown, Medal, PawPrint, Lock } from 'lucide-react'
import { supabase } from '../supabase'
import { useLanguage } from '../LanguageContext'

const ICONS = {
  paw: PawPrint,
  compass: Compass,
  map: MapIcon,
  trophy: Trophy,
  stethoscope: Stethoscope,
  scissors: Scissors,
  tree: Trees,
  'shopping-bag': ShoppingBag,
  building: Building2,
  utensils: UtensilsCrossed,
  crown: Crown,
  medal: Medal,
}

export default function BadgesModal({ userId, onBack }) {
  const { t, language } = useLanguage()
  const [badges, setBadges] = useState([])
  const [earnedIds, setEarnedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchBadges() }, [userId])

  async function fetchBadges() {
    setLoading(true)
    const [{ data: allBadges }, { data: userBadges }] = await Promise.all([
      supabase.from('badges').select('*').order('created_at', { ascending: true }),
      supabase.from('user_badges').select('badge_id').eq('user_id', userId),
    ])
    if (allBadges) setBadges(allBadges)
    if (userBadges) setEarnedIds(new Set(userBadges.map(b => b.badge_id)))
    setLoading(false)
  }

  const earnedCount = badges.filter(b => earnedIds.has(b.id)).length

  return (
    <div className="absolute inset-0 bg-white z-50 flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <button onClick={onBack} className="border-0 bg-transparent cursor-pointer text-ps-purple">
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
          <Trophy size={17} className="text-ps-purple" /> {t('badges.title')}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto bg-ps-bg px-4 py-4">
        {loading ? (
          <div className="text-center text-sm text-gray-400 py-8">{t('badges.loading')}</div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{t('badges.summary', { earned: earnedCount, total: badges.length })}</p>
            <div className="grid grid-cols-2 gap-3">
              {badges.map(badge => {
                const earned = earnedIds.has(badge.id)
                const Icon = ICONS[badge.icon] || Medal
                const name = language === 'en' ? badge.name_en : badge.name_es
                const description = language === 'en' ? badge.description_en : badge.description_es
                return (
                  <div
                    key={badge.id}
                    className="bg-white rounded-2xl p-3 border flex flex-col items-center text-center gap-1.5"
                    style={{ borderColor: earned ? '#FDE68A' : '#F3F4F6', opacity: earned ? 1 : 0.55 }}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center relative"
                      style={{ background: earned ? '#FEF3C7' : '#F3F4F6' }}
                    >
                      <Icon size={22} color={earned ? '#D97706' : '#9CA3AF'} />
                      {!earned && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center border-2 border-white">
                          <Lock size={9} color="white" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-gray-900 leading-tight">{name}</span>
                    <span className="text-[10px] text-gray-400 leading-tight">{description}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
