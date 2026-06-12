import React, { useState } from 'react'
import { Search, Bell, Plus, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal } from 'lucide-react'
import { stories, posts as initialPosts } from '../data'

function StoryCircle({ story }) {
  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <div
        className="rounded-full p-0.5"
        style={{ border: story.mine ? '2px dashed #D1D5DB' : `2px solid ${story.color}` }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
          style={{ background: story.bg }}
        >
          {story.mine ? <Plus size={22} className="text-gray-400" /> : story.emoji}
        </div>
      </div>
      <span className="text-[10px] text-gray-500 max-w-[52px] text-center truncate">
        {story.mine ? 'Tu historia' : story.name}
      </span>
    </div>
  )
}

function Post({ post }) {
  const [liked, setLiked] = useState(post.liked)
  const [likes, setLikes] = useState(post.likes)

  function toggleLike() {
    setLiked(l => !l)
    setLikes(n => liked ? n - 1 : n + 1)
  }

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ background: post.avatarBg }}>
          {post.emoji}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm text-gray-900">{post.petName}</div>
          <div className="text-xs text-gray-400">{post.breed} · {post.time}</div>
        </div>
        <button className="border-0 bg-transparent p-1 cursor-pointer text-gray-400">
          <MoreHorizontal size={20} />
        </button>
      </div>

      <div className="w-full flex items-center justify-center" style={{ height: 260, background: post.imgBg, fontSize: 100 }}>
        {post.emoji}
      </div>

      <div className="px-4 pt-2.5 pb-1 flex items-center gap-4">
        <button onClick={toggleLike} className="border-0 bg-transparent p-0 cursor-pointer flex items-center gap-1 text-sm" style={{ color: liked ? '#EC4899' : '#9CA3AF' }} aria-label="Me gusta">
          <Heart size={22} fill={liked ? '#EC4899' : 'none'} />
          <span>{likes}</span>
        </button>
        <button className="border-0 bg-transparent p-0 cursor-pointer flex items-center gap-1 text-sm text-gray-400" aria-label="Comentar">
          <MessageCircle size={22} />
          <span>{post.comments}</span>
        </button>
        <button className="border-0 bg-transparent p-0 cursor-pointer text-gray-400" aria-label="Compartir">
          <Share2 size={20} />
        </button>
        <button className="border-0 bg-transparent p-0 cursor-pointer text-gray-400 ml-auto" aria-label="Guardar">
          <Bookmark size={20} />
        </button>
      </div>

      <div className="px-4 pb-1 text-sm font-semibold text-gray-900">{likes} me gusta</div>
      <div className="px-4 pb-3 text-sm text-gray-800 leading-relaxed">
        <span className="font-semibold">{post.user}</span>{' '}
        {post.caption}{' '}
        <span className="text-ps-purple">{post.hashtags}</span>
      </div>
    </div>
  )
}

export default function Feed() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐾</span>
          <span className="text-lg font-bold text-gray-900">PetSocial</span>
        </div>
        <div className="flex gap-3">
          <button className="border-0 bg-transparent cursor-pointer text-gray-500" aria-label="Buscar">
            <Search size={22} />
          </button>
          <button className="border-0 bg-transparent cursor-pointer text-gray-500 relative" aria-label="Notificaciones">
            <Bell size={22} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-ps-pink rounded-full border border-white" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-ps-bg">
        <div className="flex gap-3 px-4 py-3 bg-white border-b border-gray-100 overflow-x-auto">
          {stories.map(s => <StoryCircle key={s.id} story={s} />)}
        </div>
        {initialPosts.map(p => <Post key={p.id} post={p} />)}
      </div>
    </div>
  )
}