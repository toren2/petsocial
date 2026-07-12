// Supabase Edge Function: send-push
//
// Se dispara via un Database Webhook configurado en el Dashboard de
// Supabase (Database > Webhooks) sobre INSERT en public.notifications.
// Por cada suscripcion push guardada del usuario destino, le manda la
// notificacion usando el protocolo Web Push (VAPID).
//
// Variables de entorno requeridas (supabase secrets set ...):
//   VAPID_PUBLIC_KEY
//   VAPID_PRIVATE_KEY
//   VAPID_SUBJECT           (ej. mailto:contacto@snoutt.app)
//   SUPABASE_URL            (ya la inyecta Supabase automaticamente)
//   SUPABASE_SERVICE_ROLE_KEY  (ya la inyecta Supabase automaticamente)

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:contacto@snoutt.app'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json()
    const record = payload.record

    if (!record || !record.user_id) {
      return new Response(JSON.stringify({ ok: false, error: 'no record' }), { status: 400 })
    }

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', record.user_id)

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 })
    }
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200 })
    }

    const notifPayload = JSON.stringify({
      title: record.title || 'Snoutt',
      body: record.body || '',
      data: { type: record.type, ...(record.data || {}) },
    })

    let sent = 0
    const toDelete: string[] = []

    await Promise.all(subs.map(async (sub: { id: string; endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          notifPayload
        )
        sent++
      } catch (err: any) {
        const statusCode = err?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          toDelete.push(sub.id)
        }
      }
    }))

    if (toDelete.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', toDelete)
    }

    return new Response(JSON.stringify({ ok: true, sent, removed: toDelete.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 })
  }
})
