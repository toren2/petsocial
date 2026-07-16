-- Migracion aplicada directamente en Supabase (proyecto pvlaruqwbaxdpdndwfvh)
-- via MCP el 2026-07-16. Este archivo queda como registro/documentacion.

-- 1) Coordenadas para el recordatorio de "eventos cerca de ti". Hasta
-- ahora la app solo usaba geolocalizacion en el momento
-- (navigator.geolocation) sin persistirla, asi que un cron en el
-- servidor no tenia forma de saber donde esta cada usuario. Guardamos
-- la ultima ubicacion conocida del perfil (capturada cuando el usuario
-- ya dio permiso de ubicacion en el Hub) y las coordenadas del evento
-- (elegidas por el anfitrion via Google Places Autocomplete al crear
-- el evento).

alter table public.profiles
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists location_updated_at timestamptz;

alter table public.events
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- 2) Recordatorio push de eventos pet-friendly cerca del usuario, mismo
-- patron de push que send_streak_reminders / send_vaccine_reminders.
-- Compara distancia real (formula de Haversine) entre la ultima
-- ubicacion conocida del perfil y las coordenadas del evento. Solo
-- avisa una vez por evento (el guard no depende de la fecha, ya que un
-- evento no cambia de ubicacion).

create or replace function public.send_event_proximity_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_sent integer := 0;
begin
  for r in
    select event_id, title, emoji, event_date, user_id, distance_km from (
      select
        e.id as event_id,
        e.title,
        e.emoji,
        e.date as event_date,
        p.id as user_id,
        (
          6371 * acos(
            least(1, greatest(-1,
              cos(radians(p.lat)) * cos(radians(e.lat)) * cos(radians(e.lng) - radians(p.lng))
              + sin(radians(p.lat)) * sin(radians(e.lat))
            ))
          )
        ) as distance_km
      from public.events e
      join public.profiles p on p.lat is not null and p.lng is not null
      join public.push_subscriptions ps on ps.user_id = p.id
      where e.lat is not null and e.lng is not null
        and e.user_id <> p.id
        and e.date::date between current_date and current_date + 3
        and not exists (
          select 1 from public.event_attendees ea
          where ea.event_id = e.id and ea.user_id = p.id
        )
    ) sub
    where distance_km <= 15
  loop
    if not exists (
      select 1 from public.notifications
      where user_id = r.user_id
        and type = 'event_nearby'
        and data->>'eventId' = r.event_id::text
    ) then
      insert into public.notifications (user_id, type, title, body, data, read)
      values (
        r.user_id,
        'event_nearby',
        coalesce(r.emoji, '📅') || ' Evento cerca de ti',
        '"' || r.title || '" es el ' || to_char(r.event_date::date, 'DD/MM') || ', a ' || round(r.distance_km) || ' km de ti.',
        jsonb_build_object('eventId', r.event_id, 'distanceKm', round(r.distance_km)),
        false
      );
      v_sent := v_sent + 1;
    end if;
  end loop;

  return v_sent;
end;
$$;

grant execute on function public.send_event_proximity_reminders() to service_role, postgres;

-- Corre cada viernes a las 15:00 UTC = 10:00 am hora de Panama, para
-- avisar de eventos del fin de semana con tiempo de sobra.
select cron.schedule(
  'event-proximity-weekly',
  '0 15 * * 5',
  $$select public.send_event_proximity_reminders();$$
);
