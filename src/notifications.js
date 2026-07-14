import { supabase } from './supabase'

export async function createNotification(userId, type, title, body, data = {}) {
  await supabase.from('notifications').insert([{
    user_id: userId,
    type,
    title,
    body,
    data,
    read: false,
  }])
}

export async function notifyMatch(myId, theirId, myPetName, theirPetName) {
  await createNotification(
    theirId,
    'match',
    '¡Nuevo match! 🐾',
    `${myPetName} y ${theirPetName} se han gustado`,
    { matchUserId: myId }
  )
}

export async function notifyMessage(receiverId, senderPetName, senderId) {
  await createNotification(
    receiverId,
    'message',
    'Nuevo mensaje 💬',
    `${senderPetName} te ha enviado un mensaje`,
    { senderId }
  )
}

export async function notifyEventInvite(receiverId, senderPetName, eventTitle, eventId) {
  await createNotification(
    receiverId,
    'event_invite',
    'Te invitaron a un evento 🎉',
    `${senderPetName} te invitó a: ${eventTitle}`,
    { eventId }
  )
}

export async function notifyLike(postOwnerId, likerId, likerPetName, postId) {
  if (postOwnerId === likerId) return
  await createNotification(
    postOwnerId,
    'like',
    'Nuevo like en tu post ❤️',
    `A ${likerPetName} le gustó tu publicación`,
    { postId }
  )
}

export async function notifyComment(postOwnerId, commenterId, commenterPetName, postId) {
  if (postOwnerId === commenterId) return
  await createNotification(
    postOwnerId,
    'comment',
    'Nuevo comentario 💬',
    `${commenterPetName} comentó tu publicación`,
    { postId }
  )
}