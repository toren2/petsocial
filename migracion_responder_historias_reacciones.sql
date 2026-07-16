-- Migracion aplicada directamente en Supabase (proyecto pvlaruqwbaxdpdndwfvh)
-- via MCP el 2026-07-16. Este archivo queda como registro/documentacion.

-- Responder historias: el mensaje de respuesta queda ligado a la historia
-- (para mostrar el thumbnail dentro del chat) sin depender de que la
-- historia siga existiendo (expira/se borra a las 24h).
alter table public.messages
  add column if not exists story_id uuid references public.stories(id) on delete set null,
  add column if not exists story_preview_url text,
  add column if not exists story_is_video boolean not null default false;

-- Reacciones con emoji a mensajes de chat. Un usuario solo puede tener una
-- reaccion por mensaje (tocar el mismo emoji de nuevo la quita, tocar otro
-- la reemplaza), igual que WhatsApp/iMessage.
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);

alter table public.message_reactions enable row level security;

-- Solo los dos participantes de la conversacion (sender/receiver del
-- mensaje) pueden ver, crear o quitar reacciones sobre ese mensaje.
create policy "message_reactions_select_participants"
  on public.message_reactions for select
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_reactions.message_id
        and (m.sender_id = auth.uid() or m.receiver_id = auth.uid())
    )
  );

create policy "message_reactions_insert_own"
  on public.message_reactions for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.messages m
      where m.id = message_reactions.message_id
        and (m.sender_id = auth.uid() or m.receiver_id = auth.uid())
    )
  );

create policy "message_reactions_update_own"
  on public.message_reactions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "message_reactions_delete_own"
  on public.message_reactions for delete
  using (user_id = auth.uid());

create index if not exists idx_message_reactions_message_id on public.message_reactions(message_id);
create index if not exists idx_messages_story_id on public.messages(story_id);
