-- ============================================================
-- Panel de moderacion basico: funciones RPC para que un admin
-- (Josip, dueno de la cuenta josiplopez23@gmail.com) pueda ver y
-- resolver reportes de usuarios y solicitudes de verificacion
-- pendientes, sin necesidad de entrar directo a Supabase.
-- ============================================================
-- Estas funciones son SECURITY DEFINER y verifican internamente
-- que quien llama sea el admin (is_admin()), asi que no dependen
-- de las políticas RLS existentes en reports/verification_requests
-- y no exponen datos a otros usuarios aunque el EXECUTE este
-- otorgado a todos los usuarios autenticados.
-- ============================================================

-- Asegurar columna de estado en reports (si no existia)
alter table public.reports add column if not exists status text not null default 'pendiente';

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from auth.users where id = auth.uid() and email = 'josiplopez23@gmail.com'
  );
$$;

create or replace function admin_list_reports()
returns table (
  id uuid,
  reporter_id uuid,
  reporter_pet_name text,
  reported_id uuid,
  reported_pet_name text,
  reason text,
  details text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'No autorizado';
  end if;
  return query
    select r.id, r.reporter_id, rp.pet_name, r.reported_id, tp.pet_name, r.reason, r.details, r.status, r.created_at
    from public.reports r
    left join public.profiles rp on rp.id = r.reporter_id
    left join public.profiles tp on tp.id = r.reported_id
    order by r.created_at desc;
end;
$$;

create or replace function admin_update_report_status(p_report_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'No autorizado';
  end if;
  update public.reports set status = p_status where id = p_report_id;
end;
$$;

create or replace function admin_list_verification_requests()
returns table (
  id uuid,
  user_id uuid,
  pet_name text,
  avatar_url text,
  breed text,
  photo_url text,
  note text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'No autorizado';
  end if;
  return query
    select vr.id, vr.user_id, p.pet_name, p.avatar_url, p.breed, vr.photo_url, vr.note, vr.status, vr.created_at
    from public.verification_requests vr
    left join public.profiles p on p.id = vr.user_id
    order by vr.created_at desc;
end;
$$;

create or replace function admin_update_verification_status(p_request_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'No autorizado';
  end if;
  update public.verification_requests set status = p_status where id = p_request_id;
end;
$$;

revoke all on function is_admin() from public;
revoke all on function is_admin() from anon;
grant execute on function is_admin() to authenticated;

revoke all on function admin_list_reports() from public;
revoke all on function admin_list_reports() from anon;
grant execute on function admin_list_reports() to authenticated;

revoke all on function admin_update_report_status(uuid, text) from public;
revoke all on function admin_update_report_status(uuid, text) from anon;
grant execute on function admin_update_report_status(uuid, text) to authenticated;

revoke all on function admin_list_verification_requests() from public;
revoke all on function admin_list_verification_requests() from anon;
grant execute on function admin_list_verification_requests() to authenticated;

revoke all on function admin_update_verification_status(uuid, text) from public;
revoke all on function admin_update_verification_status(uuid, text) from anon;
grant execute on function admin_update_verification_status(uuid, text) to authenticated;
