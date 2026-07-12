-- ============================================================
-- Notificaciones push (Web Push): tabla de suscripciones.
-- ============================================================
-- Cada dispositivo/navegador donde un usuario activa las
-- notificaciones push guarda aqui su "suscripcion" (endpoint +
-- llaves de cifrado). El Edge Function send-push lee estas filas
-- para saber a donde mandar cada push.
--
-- Se borra automaticamente cuando se borra el usuario (ON DELETE
-- CASCADE desde auth.users), asi que no hace falta tocar la
-- funcion delete_own_account().
-- ============================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "select own push subscriptions" on public.push_subscriptions;
create policy "select own push subscriptions" on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "insert own push subscriptions" on public.push_subscriptions;
create policy "insert own push subscriptions" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own push subscriptions" on public.push_subscriptions;
create policy "update own push subscriptions" on public.push_subscriptions
  for update using (auth.uid() = user_id);

drop policy if exists "delete own push subscriptions" on public.push_subscriptions;
create policy "delete own push subscriptions" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.push_subscriptions to authenticated;
