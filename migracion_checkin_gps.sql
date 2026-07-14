-- ============================================================
-- Actualiza checkin_place para validar que el usuario este cerca
-- del lugar (GPS), estilo Pokemon Go. Reemplaza la version anterior
-- de migracion_checkins_badges.sql (que no validaba distancia).
-- Correr DESPUES de migracion_huellas.sql y migracion_checkins_badges.sql.
-- ============================================================

drop function if exists checkin_place(uuid);

create or replace function checkin_place(p_place_id uuid, p_lat double precision, p_lng double precision)
returns place_checkins
language plpgsql
security definer
set search_path = public
as $$
declare
  v_checkin place_checkins;
  v_place_lat double precision;
  v_place_lng double precision;
  v_distance_km double precision;
  v_category text;
  v_distinct_places int;
  v_distinct_categories int;
  v_category_count int;
begin
  select lat, lng, category into v_place_lat, v_place_lng, v_category
  from places where id = p_place_id;

  if v_place_lat is null or v_place_lng is null then
    raise exception 'Este lugar no tiene ubicacion registrada';
  end if;

  -- Formula haversine: distancia en km entre el usuario y el lugar.
  v_distance_km := 6371 * acos(
    least(1, greatest(-1,
      cos(radians(p_lat)) * cos(radians(v_place_lat)) * cos(radians(v_place_lng) - radians(p_lng))
      + sin(radians(p_lat)) * sin(radians(v_place_lat))
    ))
  );

  -- Radio permitido: 150 metros. Ajustable si hace falta.
  if v_distance_km > 0.15 then
    raise exception 'Tienes que estar cerca del lugar para hacer check-in (estas a % km)', round(v_distance_km::numeric, 2);
  end if;

  insert into place_checkins (user_id, place_id)
  values (auth.uid(), p_place_id)
  returning * into v_checkin;

  perform _award_huellas(auth.uid(), 'checkin', 5, v_checkin.id);

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

grant execute on function checkin_place(uuid, double precision, double precision) to authenticated;
