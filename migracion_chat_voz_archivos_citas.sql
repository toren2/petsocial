-- Notas de voz, documentos y citar/responder mensajes en Chat.
-- Aplicado en vivo vía Supabase MCP (migration: chat_voice_files_reply).

alter table public.messages
  add column if not exists audio_url text,
  add column if not exists file_url text,
  add column if not exists file_name text,
  add column if not exists file_size bigint,
  add column if not exists reply_to_id uuid references public.messages(id) on delete set null;

create index if not exists messages_reply_to_id_idx on public.messages(reply_to_id);
