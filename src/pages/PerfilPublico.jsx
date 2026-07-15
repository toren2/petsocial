import React, { useState, useEffect } from 'react'
import { ArrowLeft, MapPin, Grid3x3, MessageCircle, X, Heart, ChevronLeft, ChevronRight, UserPlus, UserCheck, Trophy, Syringe } from 'lucide-react'
import { supabase } from '../supabase'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'
import UserActionsMenu from '../components/UserActionsMenu'
import VerifiedBadge from '../components/VerifiedBadge'
import HuellasBadge from '../components/HuellasBadge'
import BadgesModal from '../components/BadgesModal'
import { isAdult, isMinorUser } from '../age'

const INTERESTS = [
  { key: 'playful', emoji: '🎾' },
  { key: 'walks', emoji: '🚶' },
  { key: 'beach', emoji: '🏖️' },
  { key: 'treats', emoji: '🦴' },
  { key: 'sleepy', emoji: '😴' },
  { key: 'goodWithKids', emoji: '🧒' },
  { key: 'social', emoji: '🐾' },
  { key: 'water', emoji: '💦' },
  { key: 'hiking', emoji: '🏔️' },
  { key: 'toys', emoji: '🧸' },
]

function PhotoViewer({ posts, startIndex, onClose }) {
  const { t } = useLanguage()
  const [index, setIndex] = useState(startIndex)
  const post = posts[index]

  function prev() { if (index > 0) setIndex(i => i - 1) }
  function next() { if (index < posts.length - 1) setIndex(i => i + 1) }

  if (!post) return null

  return (
    <div className="absolute inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button onClick={onClose} className="border-0 bg-transparent cursor-pointer text-white">
          <X size={24} />
        </button>
        <span className="text-white text-sm font-medium">{index + 1} / {posts.length}</span>
        <div style={{ width: 24 }} />
      </div>

      <div className="flex-1 relative flex items-center justify-center">
        {post.image_url ? (
          <img src={post.image_url} alt="post" className="w-full h-full object-contain" />
        ) : (
          <div className="text-8xl">{post.pet_emoji || '🐕'}</div>
        )}

        {index > 0 && (
          <button
            onClick={prev}
            className="absolute left-3 border-0 bg-black/40 rounded-full p-2 cursor-pointer text-white"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        {index < posts.length - 1 && (
          <button
            onClick={next}
            className="absolute right-3 border-0 bg-black/40 rounded-full p-2 cursor-pointer text-white"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {post.caption && (
        <div className="px-4 py-3 bg-black/60 flex-shrink-0">
          <p className="text-white text-sm leading-relaxed">{post.caption}</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1 text-white/70 text-xs">
              <Heart size={13} />
              <span>{post.likes} {t('perfil.likes')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PerfilPublico({ userId, onBack, onChat }) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const scrollRef = React.useRef(null)
  const topRef = React.useRef(null)
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMatch, setIsMatch] = useState(false)
  const [matchId, setMatchId] = useState(null)
  const [isVerified, setIsVerified] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [theyFollow, setTheyFollow] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [viewingPhoto, setViewingPhoto] = useState(null)
  const [showInfo, setShowInfo] = useState(false)
  const [huellasPoints, setHuellasPoints] = useState(0)
  const [showBadgesModal, setShowBadgesModal] = useState(false)
  const [vaccineStatus, setVaccineStatus] = useState(null)

 useEffect(() => {
  fetchProfile()
  fetchPosts()
  checkMatch()
  checkFollowing()
  checkTheyFollow()
  fetchFollowerCount()
  checkVerified()
  fetchHuellas()
  fetchVaccineStatus()
}, [userId])

useEffect(() => {
  const timeout = setTimeout(() => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ block: 'start' })
    } else if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, 100)
  return () => clearTimeout(timeout)
}, [userId, profile])

  async function fetchProfile() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) setProfile(data)
    setLoading(false)
  }

  async function fetchVaccineStatus() {
    const { data } = await supabase.rpc('get_vaccine_status', { p_user_id: userId })
    setVaccineStatus(data || null)
  }

  async function fetchPosts() {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setPosts(data)
  }

  async function checkMatch() {
    const { data } = await supabase
      .from('matches')
      .select('id')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${user.id})`)
      .single()
    if (data) { setIsMatch(true); setMatchId(data.id) }
  }

  async function checkFollowing() {
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', userId)
      .single()
    setIsFollowing(!!data)
  }

  async function checkTheyFollow() {
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', userId)
      .eq('following_id', user.id)
      .single()
    setTheyFollow(!!data)
  }

  async function fetchFollowerCount() {
    const { count } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId)
    setFollowerCount(count || 0)
  }

  async function fetchHuellas() {
    const { data } = await supabase.from('user_huellas_totals').select('total_points').eq('user_id', userId).maybeSingle()
    setHuellasPoints(data?.total_points || 0)
  }

  async function checkVerified() {
    const { data } = await supabase
      .from('verification_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'aprobado')
      .maybeSingle()
    setIsVerified(!!data)
  }

  async function toggleFollow() {
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', userId)
      setIsFollowing(false)
      setFollowerCount(c => c - 1)
    } else {
      await supabase.from('follows').insert([{ follower_id: user.id, following_id: userId }])
      setIsFollowing(true)
      setFollowerCount(c => c + 1)
    }
  }

  if (loading) return (
    <div className="flex flex-col flex-1 items-center justify-center gap-3 text-gray-400">
      <span className="text-4xl">🐾</span>
      <p className="text-sm">{t('perfil.loadingProfile')}</p>
    </div>
  )

  if (!profile) return (
    <div className="flex flex-col flex-1 items-center justify-center gap-3 text-gray-400">
      <span className="text-4xl">🐾</span>
      <p className="text-sm">{t('perfilPublico.profileNotFound')}</p>
    </div>
  )

  const mutualFollow = isFollowing && theyFollow
  const bothAdults = !isMinorUser(user) && (!profile.birthdate || isAdult(profile.birthdate))
  const canMessage = userId !== user.id && (bothAdults || mutualFollow)

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <button onClick={onBack} className="border-0 bg-transparent cursor-pointer text-ps-purple">
          <ArrowLeft size={22} />
        </button>
        <h2 className="font-bold text-gray-900 text-base flex-1 flex items-center gap-1">
          {profile.pet_name} <VerifiedBadge verified={isVerified} size={15} />
        </h2>
        {canMessage && onChat && (
          <button
            onClick={() => onChat(userId)}
            className="flex items-center gap-1.5 border-0 cursor-pointer px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: '#EDE9FE', color: '#7C3AED' }}
          >
            <MessageCircle size={14} /> {t('perfilPublico.message')}
          </button>
        )}
        {userId !== user.id && (
          <UserActionsMenu
            targetUserId={userId}
            targetPetName={profile.pet_name}
            matchId={matchId}
            onBlocked={onBack}
          />
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-white">
  <div ref={topRef} />
        <div className="flex items-center gap-4 px-4 py-4">
          <div className="flex-shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.pet_name}
                className="w-20 h-20 rounded-full object-cover border-2 border-ps-purple-light"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                style={{ background: '#EDE9FE' }}
              >
                {profile.emoji}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="font-bold text-gray-900 text-lg flex items-center gap-1">
              {profile.pet_name} <VerifiedBadge verified={isVerified} size={16} />
            </div>
            <div className="text-sm text-gray-500">{profile.breed} · {t('perfil.ageValue', { age: profile.age })} · {profile.sex}</div>
            {profile.location && (
              <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <MapPin size={11} /> {profile.location}
              </div>
            )}
            <div className="mt-1.5"><HuellasBadge points={huellasPoints} size="sm" /></div>
            {vaccineStatus === 'ok' && (
              <div className="mt-1.5">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit" style={{ background: '#DBEAFE', color: '#3B82F6' }}>
                  <Syringe size={10} /> {t('perfil.vaccinesUpToDate')}
                </span>
              </div>
            )}
            <div className="flex gap-4 mt-2">
              <div className="text-center">
                <div className="font-bold text-gray-900 text-sm">{posts.length}</div>
                <div className="text-xs text-gray-400">{t('perfil.posts')}</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-900 text-sm">{followerCount}</div>
                <div className="text-xs text-gray-400">{t('perfilPublico.followers')}</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-900 text-sm">{profile.size || '-'}</div>
                <div className="text-xs text-gray-400">{t('perfil.size2')}</div>
              </div>
            </div>
          </div>
        </div>

        {profile.about && (
          <div className="px-4 pb-3">
            <p className="text-sm text-gray-700 leading-relaxed">{profile.about}</p>
          </div>
        )}

        {profile.interests?.length > 0 && (
          <div className="px-4 pb-3 flex gap-1.5 flex-wrap">
            {profile.interests.map(key => {
              const preset = INTERESTS.find(i => i.key === key)
              return (
                <span key={key} className="text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                  {preset?.emoji} {t(`perfil.interest_${key}`)}
                </span>
              )
            })}
          </div>
        )}

        {/* Botón seguir */}
        {userId !== user.id && (
          <div className="px-4 pb-3">
            <button
              onClick={toggleFollow}
              className="w-full py-2.5 rounded-xl text-sm font-semibold border-0 cursor-pointer flex items-center justify-center gap-2"
              style={{
                background: isFollowing ? '#F3F4F6' : '#7C3AED',
                color: isFollowing ? '#6B7280' : 'white',
              }}
            >
              {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
              {isFollowing ? t('perfilPublico.following') : t('perfilPublico.follow')}
            </button>
          </div>
        )}

        <div className="px-4 pb-3 flex gap-2">
          <button
            onClick={() => setShowInfo(s => !s)}
            className="flex-1 py-2 rounded-xl text-xs font-medium border border-gray-200 bg-gray-50 cursor-pointer text-gray-600"
          >
            {showInfo ? t('perfilPublico.hideInfo') : t('perfilPublico.viewFullInfo')}
          </button>
          <button
            onClick={() => setShowBadgesModal(true)}
            className="flex-1 py-2 rounded-xl text-xs font-medium border border-gray-200 bg-gray-50 cursor-pointer text-gray-600 flex items-center justify-center gap-1.5"
          >
            <Trophy size={13} className="text-ps-purple" /> {t('badges.title')}
          </button>
        </div>

        {showInfo && (
          <div className="mx-4 mb-3 rounded-2xl border border-gray-100 overflow-hidden">
            {[
              ['🐾', t('perfil.breed'),        profile.breed],
              ['🐕', t('perfil.species2'),     profile.species],
              ['📏', t('perfil.size2'),        profile.size],
              ['⚡', t('perfil.energy'),       profile.energy],
              ['👥', t('perfil.getsAlongWith'),profile.good_with],
              ['📍', t('perfil.location'),     profile.location],
            ].filter(([, , v]) => v).map(([icon, label, value]) => (
              <div key={label} className="flex justify-between items-center px-4 py-2.5 border-b border-gray-100 last:border-0 text-sm bg-white">
                <span className="text-gray-400 flex items-center gap-2">
                  <span>{icon}</span>{label}
                </span>
                <span className="font-medium text-gray-800 text-right max-w-[55%]">{value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-gray-100 flex items-center justify-center py-2 mb-1">
          <Grid3x3 size={16} className="text-gray-400" />
        </div>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
            <span className="text-4xl">📸</span>
            <p className="text-sm">{t('perfilPublico.noPosts')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map((p, i) => (
              <div
                key={p.id}
                className="aspect-square cursor-pointer overflow-hidden"
                style={{ background: '#EDE9FE' }}
                onClick={() => setViewingPhoto(i)}
              >
                {p.image_url ? (
                  <img src={p.image_url} alt="post" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    {p.pet_emoji || '🐕'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {viewingPhoto !== null && (
        <PhotoViewer
          posts={posts}
          startIndex={viewingPhoto}
          onClose={() => setViewingPhoto(null)}
        />
      )}

      {showBadgesModal && (
        <BadgesModal userId={userId} onBack={() => setShowBadgesModal(false)} />
      )}
    </div>
  )
}
