-- Migracion: rediseno de Lugares (v2)
-- - saved_places: guardar/marcar lugares favoritos
-- - place_suggestions: que un usuario sugiera un lugar nuevo (Agregar lugar)
-- - app_reports: reportar un lugar existente o un problema general de la app
-- - RPCs de admin siguiendo el mismo patron que admin_list_reports / admin_update_report_status

-- 1. Guardar lugares
create table if not exists public.saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, place_id)
);

alter table public.saved_places enable row level security;

drop policy if exists "saved_places_select_own" on public.saved_places;
create policy "saved_places_select_own" on public.saved_places for select to authenticated using (auth.uid() = user_id);

drop policy if exists "saved_places_insert_own" on public.saved_places;
create policy "saved_places_insert_own" on public.saved_places for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "saved_places_delete_own" on public.saved_places;
create policy "saved_places_delete_own" on public.saved_places for delete to authenticated using (auth.uid() = user_id);

-- 2. Sugerir un lugar nuevo
create table if not exists public.place_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  address text,
  description text,
  contact_phone text,
  whatsapp_number text,
  instagram_handle text,
  status text not null default 'pendiente',
  created_at timestamptz not null default now()
);

alter table public.place_suggestions enable row level security;

drop policy if exists "place_suggestions_insert_own" on public.place_suggestions;
create policy "place_suggestions_insert_own" on public.place_suggestions for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "place_suggestions_select_own" on public.place_suggestions;
create policy "place_suggestions_select_own" on public.place_suggestions for select to authenticated using (auth.uid() = user_id);

-- 3. Reportar un lugar existente o un problema general
create table if not exists public.app_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('lugar', 'problema')),
  place_id uuid references public.places(id) on delete set null,
  reason text,
  details text,
  status text not null default 'pendiente',
  created_at timestamptz not null default now()
);

alter table public.app_reports enable row level security;

drop policy if exists "app_reports_insert_own" on public.app_reports;
create policy "app_reports_insert_own" on public.app_reports for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "app_reports_select_own" on public.app_reports;
create policy "app_reports_select_own" on public.app_reports for select to authenticated using (auth.uid() = user_id);

-- 4. RPCs de admin: sugerencias de lugares

create or replace function public.admin_list_place_suggestions()
returns table(
  id uuid, user_id uuid, user_pet_name text, name text, category text,
  address text, description text, contact_phone text, whatsapp_number text,
  instagram_handle text, status text, created_at timestamptz
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not is_admin() then
    raise exception 'No autorizado';
  end if;
  return query
    select s.id, s.user_id, p.pet_name, s.name, s.category, s.address, s.description,
           s.contact_phone, s.whatsapp_number, s.instagram_handle, s.status, s.created_at
    from public.place_suggestions s
    left join public.profiles p on p.id = s.user_id
    order by s.created_at desc;
end;
$function$;

create or replace function public.admin_update_place_suggestion_status(p_suggestion_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  s record;
  v_type text;
begin
  if not is_admin() then
    raise exception 'No autorizado';
  end if;

  update public.place_suggestions set status = p_status where id = p_suggestion_id;

  if p_status = 'aprobado' then
    select * into s from public.place_suggestions where id = p_suggestion_id;

    v_type := case s.category
      when 'vet' then 'Veterinaria'
      when 'groom' then 'Grooming'
      when 'park' then 'Parque pet-friendly'
      when 'shop' then 'Pet Shop'
      when 'hotel' then 'Hotel para mascotas'
      when 'restaurant' then 'Restaurante pet-friendly'
      when 'emergency24h' then 'Hospital veterinario 24h'
      else 'Lugar pet-friendly'
    end;

    insert into public.places (name, type, category, address, open, hours, contact_phone, whatsapp_number, instagram_handle, rating, reviews)
    values (s.name, v_type, s.category, coalesce(s.address, 'Panamá'), true, 'Ver horario en Google Maps', s.contact_phone, s.whatsapp_number, s.instagram_handle, 4.5, 0);
  end if;
end;
$function$;

-- 5. RPCs de admin: reportes de lugar / problema

create or replace function public.admin_list_app_reports()
returns table(
  id uuid, user_id uuid, user_pet_name text, type text, place_id uuid,
  place_name text, reason text, details text, status text, created_at timestamptz
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not is_admin() then
    raise exception 'No autorizado';
  end if;
  return query
    select r.id, r.user_id, p.pet_name, r.type, r.place_id, pl.name, r.reason, r.details, r.status, r.created_at
    from public.app_reports r
    left join public.profiles p on p.id = r.user_id
    left join public.places pl on pl.id = r.place_id
    order by r.created_at desc;
end;
$function$;

create or replace function public.admin_update_app_report_status(p_report_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not is_admin() then
    raise exception 'No autorizado';
  end if;
  update public.app_reports set status = p_status where id = p_report_id;
end;
$function$;
