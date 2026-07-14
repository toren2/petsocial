-- ============================================================
-- CHECK-INS EN LUGARES + BADGES (estilo Pokemon Go)
-- ============================================================

create table if not exists place_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id uuid not null references places(id) on delete cascade,
  created_at timestamptz not null default now(),
  checkin_date date generated always as ((created_at at time zone 'America/Panama')::date) stored
);

-- Un check-in por lugar por dia: evita farmear puntos y "robarse" el
-- ranking semanal a punta de spam.
create unique index if not exists ux_checkin_por_dia on place_checkins(user_id, place_id, checkin_date);
create index if not exists idx_checkins_place on place_checkins(place_id);
create index if not exists idx_checkins_user on place_checkins(user_id);

alter table place_checkins enable row level security;
create policy "checkins_select" on place_checkins for select to authenticated using (true);
-- No hay policy de insert: solo se escribe via la funcion checkin_place() de abajo.

-- "Mascota del lugar": quien tiene mas check-ins esta semana (lunes-domingo,
-- hora Panama) en cada lugar. Se calcula en vivo, no hay que esperar un cron.
create or replace view place_current_pet as
select distinct on (place_id)
  place_id,
  user_id,
  count(*) as checkins_this_week
from place_checkins
where created_at >= date_trunc('week', now() at time zone 'America/Panama')
group by place_id, user_id
order by place_id, checkins_this_week desc, min(created_at) asc;

-- Historial de ganadores semanales, para poder mostrar "fuiste Mascota
-- del lugar" aunque ya haya pasado la semana. Se llena con close_weekly_pet_of_place().
create table if not exists place_pet_history (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  checkins integer not null,
  created_at timestamptz not null default now(),
  unique (place_id, week_start)
);
alter table place_pet_history enable row level security;
create policy "pet_history_select" on place_pet_history for select to authenticated using (true);

-- ============================================================
-- Badges
-- ============================================================

create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name_es text not null,
  name_en text not null,
  description_es text not null,
  description_en text not null,
  icon text not null default 'medal',
  created_at timestamptz not null default now()
);
alter table badges enable row level security;
create policy "badges_select" on badges for select to authenticated using (true);

create table if not exists user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id uuid not null references badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);
alter table user_badges enable row level security;
create policy "user_badges_select" on user_badges for select to authenticated using (true);
-- Sin insert directo: solo via award_badge(), funcion interna.

create or replace function award_badge(p_user_id uuid, p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_badge_id uuid;
begin
  select id into v_badge_id from badges where code = p_code;
  if v_badge_id is null then return; end if;
  insert into user_badges (user_id, badge_id) values (p_user_id, v_badge_id) on conflict do nothing;
end;
$$;
revoke execute on function award_badge(uuid, text) from public, anon, authenticated;

-- Seed de badges iniciales. Los codigos fan_<categoria> coinciden con
-- las categorias reales de la tabla places (vet, groom, park, shop, hotel, restaurant).
insert into badges (code, name_es, name_en, description_es, description_en, icon) values
  ('primer_checkin', 'Primera Huella', 'First Paw Print', 'Hiciste tu primer check-in en un lugar.', 'You made your first place check-in.', 'paw'),
  ('explorador_5', 'Explorador', 'Explorer', 'Visitaste 5 lugares distintos.', 'You visited 5 different places.', 'compass'),
  ('trotamundos_15', 'Trotamundos', 'Globetrotter', 'Visitaste 15 lugares distintos.', 'You visited 15 different places.', 'map'),
  ('coleccionista_categorias', 'Coleccionista', 'Collector', 'Visitaste las 6 categorias de lugares.', 'You visited all 6 place categories.', 'trophy'),
  ('fan_vet', 'Fan de Veterinarias', 'Vet Fan', '5 check-ins en veterinarias.', '5 check-ins at vets.', 'stethoscope'),
  ('fan_groom', 'Fan de Grooming', 'Grooming Fan', '5 check-ins en salones de grooming.', '5 check-ins at grooming salons.', 'scissors'),
  ('fan_park', 'Fan de Parques', 'Park Fan', '5 check-ins en parques.', '5 check-ins at parks.', 'tree'),
  ('fan_shop', 'Fan de Pet Shops', 'Pet Shop Fan', '5 check-ins en pet shops.', '5 check-ins at pet shops.', 'shopping-bag'),
  ('fan_hotel', 'Fan de Hoteles', 'Hotel Fan', '5 check-ins en hoteles para mascotas.', '5 check-ins at pet hotels.', 'building'),
  ('fan_restaurant', 'Fan de Restaurantes', 'Restaurant Fan', '5 check-ins en restaurantes pet-friendly.', '5 check-ins at pet-friendly restaurants.', 'utensils'),
  ('mascota_semana', 'Mascota del Lugar', 'Place Pet of the Week', 'Fuiste la mascota con mas check-ins de la semana en un lugar.', 'You were the pet with the most check-ins of the week at a place.', 'crown')
on conflict (code) do nothing;

-- ============================================================
-- Check-in: inserta el check-in, otorga huellas (+5) y desbloquea
-- badges si corresponde. Todo en una sola funcion atomica y segura
-- (SECURITY DEFINER), asi el cliente solo llama a checkin_place(place_id)
-- y no puede falsear check-ins ni puntos.
-- ============================================================

create or replace function checkin_place(p_place_id uuid)
returns place_checkins
language plpgsql
security definer
set search_path = public
as $$
declare
  v_checkin place_checkins;
  v_category text;
  v_distinct_places int;
  v_distinct_categories int;
  v_category_count int;
begin
  insert into place_checkins (user_id, place_id)
  values (auth.uid(), p_place_id)
  returning * into v_checkin;

  perform _award_huellas(auth.uid(), 'checkin', 5, v_checkin.id);

  select category into v_category from places where id = p_place_id;

  select count(distinct place_id) into v_distinct_places
  from place_checkins where user_id = auth.uid();

  select count(distinct p.category) into v_distinct_categories
  from place_checkins c join places p on p.id = c.place_id
  where c.user_id = auth.uid();

  select count(*) into v_category_count
  from place_checkins c join places p on p.id = c.place_id
  where c.user_id = auth.uid() and p.category = v_category;

  if v_distinct_places = 1 then perform award_badge(auth.uid(), 'primer_checkin'); end if;
  if v_distinct_places >= 5 then perform award_badge(auth.uid(), 'explorador_5'); end if;
  if v_distinct_places >= 15 then perform award_badge(auth.uid(), 'trotamundos_15'); end if;
  if v_distinct_categories >= 6 then perform award_badge(auth.uid(), 'coleccionista_categorias'); end if;
  if v_category_count >= 5 and v_category is not null then
    perform award_badge(auth.uid(), 'fan_' || v_category);
  end if;

  return v_checkin;
exception
  when unique_violation then
    raise exception 'Ya hiciste check-in aqui hoy';
end;
$$;

grant execute on function checkin_place(uuid) to authenticated;

-- Cierra la semana: guarda al/los ganador(es) actuales en el historial y
-- les da el badge "Mascota del Lugar". Por ahora se llama manualmente
-- (ej. cada lunes desde el SQL Editor de Supabase); mas adelante se puede
-- automatizar con pg_cron (extension que se activa desde el dashboard).
create or replace function close_weekly_pet_of_place()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare r record;
begin
  for r in select * from place_current_pet loop
    insert into place_pet_history (place_id, user_id, week_start, checkins)
    values (r.place_id, r.user_id, (date_trunc('week', now() at time zone 'America/Panama'))::date, r.checkins_this_week)
    on conflict (place_id, week_start) do nothing;
    perform award_badge(r.user_id, 'mascota_semana');
  end loop;
end;
$$;
revoke execute on function close_weekly_pet_of_place() from public, anon, authenticated;
