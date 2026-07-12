-- Migracion: fecha de nacimiento en profiles + reglas de seguridad por edad
-- para Match (solo adultos) y Mensajeria abierta (adultos: cualquiera,
-- menores: solo seguimiento mutuo).
--
-- IMPORTANTE: las politicas de INSERT de aqui abajo se crean como
-- "AS RESTRICTIVE". Esto es a proposito: en Postgres, las politicas RLS
-- normales (PERMISSIVE) se combinan con OR, asi que si ya existe una
-- politica antigua y mas permisiva en alguna de estas tablas, agregar
-- una politica PERMISSIVE nueva no restringiria nada (bastaria con
-- cumplir cualquiera de las dos). Una politica RESTRICTIVE en cambio se
-- combina con AND, y siempre se aplica sin importar que otras politicas
-- existan. Esto garantiza que la regla de edad se cumpla de verdad,
-- incluso si alguien intenta llamar a la API directamente (no solo
-- ocultando botones en la app).

-- 1) Columna de fecha de nacimiento en profiles
alter table public.profiles add column if not exists birthdate date;

-- 2) Funciones auxiliares (security definer para que funcionen dentro de
--    las políticas RLS sin depender de los permisos de SELECT del que
--    hace la consulta)

create or replace function public.is_adult_profile(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select birthdate is null or birthdate <= (current_date - interval '18 years')
      from public.profiles
      where id = uid
    ),
    true
  )
$$;

create or replace function public.mutual_follow(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (select 1 from public.follows where follower_id = a and following_id = b)
    and exists (select 1 from public.follows where follower_id = b and following_id = a)
$$;

-- 3) Match (likes / matches): solo entre adultos, sin importar lo que
--    haga el cliente. Esto cierra el acceso real a la funcion de Match
--    para menores, no solo la pantalla.

drop policy if exists "likes_insert_adults_only" on public.likes;
create policy "likes_insert_adults_only"
on public.likes
as restrictive
for insert
to authenticated
with check (
  public.is_adult_profile(sender_id) and public.is_adult_profile(receiver_id)
);

drop policy if exists "matches_insert_adults_only" on public.matches;
create policy "matches_insert_adults_only"
on public.matches
as restrictive
for insert
to authenticated
with check (
  public.is_adult_profile(user1_id) and public.is_adult_profile(user2_id)
);

-- 4) Mensajeria abierta: cualquier adulto puede escribirle a cualquier
--    otro adulto. Si alguna de las dos personas es menor de edad, el
--    mensaje solo se permite si ambas se siguen mutuamente.

drop policy if exists "messages_insert_open_or_mutual" on public.messages;
create policy "messages_insert_open_or_mutual"
on public.messages
as restrictive
for insert
to authenticated
with check (
  (public.is_adult_profile(sender_id) and public.is_adult_profile(receiver_id))
  or public.mutual_follow(sender_id, receiver_id)
);

-- 5) Revisa manualmente en el Dashboard de Supabase (Authentication > Policies
--    o Database > Tables > messages/likes/matches > RLS) que no exista ya una
--    politica de INSERT muy amplia en estas tres tablas que por error tenga
--    "WITH CHECK (true)" sin ninguna condicion — aunque las politicas
--    RESTRICTIVE de arriba ya se aplican siempre, es buena práctica limpiar
--    politicas viejas que ya no reflejan las reglas del producto.
