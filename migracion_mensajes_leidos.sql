-- Migracion: estado de leido/no leido en mensajes del chat

alter table public.messages add column if not exists read boolean not null default false;

create index if not exists messages_receiver_read_idx on public.messages(receiver_id, read);

-- Permite que el receptor de un mensaje (no el remitente) pueda marcarlo
-- como leido. Sin esta politica, el UPDATE de "read" fallaria por RLS
-- para cualquiera que no sea el dueno original de la fila.
drop policy if exists "messages_update_mark_read" on public.messages;
create policy "messages_update_mark_read"
on public.messages
for update
to authenticated
using (auth.uid() = receiver_id)
with check (auth.uid() = receiver_id);
