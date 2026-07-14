-- ============================================================
-- SISTEMA DE HUELLAS (puntos de gamificacion)
-- ============================================================
-- Diseno: las huellas se registran en un "ledger" (huellas_log),
-- nunca se guarda un contador editable directamente. El total se
-- calcula sumando el ledger (vista user_huellas_totals), asi nadie
-- puede falsear sus puntos actualizando una columna desde el cliente.
-- Los puntos NUNCA se revocan (si borras un post, conservas las
-- huellas que ya ganaste por publicarlo) - igual que Duolingo, etc.

create table if not exists huellas_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('post','comment','like','match','event_join','story','profile_complete','checkin')),
  points integer not null,
  ref_id uuid,
  created_at timestamptz not null default now()
);

-- Evita otorgar el mismo punto dos veces por el mismo objeto
-- (ej: dar like/quitar like/dar like de nuevo al mismo post no duplica las huellas).
create unique index if not exists ux_huellas_con_ref on huellas_log(user_id, action, ref_id) where ref_id is not null;
-- Evita que una accion "de una sola vez" (completar perfil) se otorgue mas de una vez.
create unique index if not exists ux_huellas_sin_ref on huellas_log(user_id, action) where ref_id is null;

create index if not exists idx_huellas_log_user on huellas_log(user_id);

alter table huellas_log enable row level security;

-- Las huellas son publicas (se muestran en el perfil publico), por eso el select es abierto.
create policy "huellas_log_select" on huellas_log for select to authenticated using (true);
-- No hay policy de insert: solo se escribe desde funciones internas (SECURITY DEFINER) o triggers.

-- Total de huellas por usuario. Usalo en vez de guardar un contador en profiles.
create or replace view user_huellas_totals as
select user_id, coalesce(sum(points), 0)::int as total_points
from huellas_log
group by user_id;

-- Funcion interna (no llamable desde el cliente, ver revoke abajo).
create or replace function _award_huellas(p_user_id uuid, p_action text, p_points int, p_ref_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into huellas_log (user_id, action, points, ref_id)
  values (p_user_id, p_action, p_points, p_ref_id)
  on conflict do nothing;
end;
$$;

revoke execute on function _award_huellas(uuid, text, int, uuid) from public, anon, authenticated;

-- ============================================================
-- Triggers: otorgan huellas automaticamente cuando ocurre la
-- accion real en la base de datos. No requieren cambios en el
-- frontend y no se pueden falsear desde el cliente.
-- ============================================================

-- Publicar (+10)
create or replace function _trg_huellas_post() returns trigger language plpgsql as $$
begin
  perform _award_huellas(new.user_id, 'post', 10, new.id);
  return new;
end;
$$;
drop trigger if exists trg_huellas_post on posts;
create trigger trg_huellas_post after insert on posts
for each row execute function _trg_huellas_post();

-- Comentar (+5)
create or replace function _trg_huellas_comment() returns trigger language plpgsql as $$
begin
  perform _award_huellas(new.user_id, 'comment', 5, new.id);
  return new;
end;
$$;
drop trigger if exists trg_huellas_comment on post_comments;
create trigger trg_huellas_comment after insert on post_comments
for each row execute function _trg_huellas_comment();

-- Dar like a un post (+2). ref_id = post_id, asi solo se gana una vez por post
-- sin importar cuantas veces le des like/quites el like (evita farmear).
create or replace function _trg_huellas_like() returns trigger language plpgsql as $$
begin
  perform _award_huellas(new.user_id, 'like', 2, new.post_id);
  return new;
end;
$$;
drop trigger if exists trg_huellas_like on post_likes;
create trigger trg_huellas_like after insert on post_likes
for each row execute function _trg_huellas_like();

-- Match (+15 para ambos usuarios)
create or replace function _trg_huellas_match() returns trigger language plpgsql as $$
begin
  perform _award_huellas(new.user1_id, 'match', 15, new.id);
  perform _award_huellas(new.user2_id, 'match', 15, new.id);
  return new;
end;
$$;
drop trigger if exists trg_huellas_match on matches;
create trigger trg_huellas_match after insert on matches
for each row execute function _trg_huellas_match();

-- Historia (+8)
create or replace function _trg_huellas_story() returns trigger language plpgsql as $$
begin
  perform _award_huellas(new.user_id, 'story', 8, new.id);
  return new;
end;
$$;
drop trigger if exists trg_huellas_story on stories;
create trigger trg_huellas_story after insert on stories
for each row execute function _trg_huellas_story();

-- Apuntarse a un evento (+20). ref_id = event_id, asi si sale y vuelve a
-- entrar al mismo evento no se duplica.
create or replace function _trg_huellas_event() returns trigger language plpgsql as $$
begin
  perform _award_huellas(new.user_id, 'event_join', 20, new.event_id);
  return new;
end;
$$;
drop trigger if exists trg_huellas_event on event_attendees;
create trigger trg_huellas_event after insert on event_attendees
for each row execute function _trg_huellas_event();

-- Completar perfil (+50). Esta la dispara el frontend con un RPC
-- (supabase.rpc('claim_profile_complete_bonus')) cuando detecte que
-- el usuario lleno todos los campos del checklist de perfil.
-- El indice unico (user_id, action) sin ref_id garantiza que solo se
-- pueda reclamar una vez por usuario, aunque se llame varias veces.
create or replace function claim_profile_complete_bonus()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform _award_huellas(auth.uid(), 'profile_complete', 50, null);
end;
$$;
grant execute on function claim_profile_complete_bonus() to authenticated;
