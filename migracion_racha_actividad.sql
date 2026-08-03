-- Baja la friccion de la racha diaria: ahora un "dia activo" se cumple con
-- check-in fisico en un lugar (como antes) O con simplemente abrir la app.
-- Los check-ins siguen dando sus huellas y badges de siempre; esto solo
-- amplia que cuenta para el contador de racha del Hub y para el
-- recordatorio push de racha en riesgo.

create table if not exists public.daily_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);

alter table public.daily_activity enable row level security;

drop policy if exists "daily_activity_select_own" on public.daily_activity;
create policy "daily_activity_select_own" on public.daily_activity
  for select to authenticated
  using (auth.uid() = user_id);

-- Sin policy de insert: solo se escribe via mark_daily_activity() (SECURITY DEFINER).

create or replace function public.mark_daily_activity()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.daily_activity (user_id, activity_date)
  values (auth.uid(), (now() at time zone 'America/Panama')::date)
  on conflict (user_id, activity_date) do nothing;
end;
$$;

grant execute on function public.mark_daily_activity() to authenticated;

-- Redefine get_checkin_streak para que un "dia activo" sea check-in fisico
-- O actividad simple (abrir la app). Misma logica de racha consecutiva,
-- ahora sobre la union de ambas fuentes de fecha.
create or replace function public.get_checkin_streak(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_streak integer := 0;
  v_expected_date date := current_date;
  v_date date;
  v_has_today boolean;
begin
  select exists(
    select 1 from public.place_checkins where user_id = p_user_id and checkin_date = current_date
    union
    select 1 from public.daily_activity where user_id = p_user_id and activity_date = current_date
  ) into v_has_today;

  if not v_has_today then
    v_expected_date := current_date - 1;
  end if;

  for v_date in
    select d from (
      select checkin_date as d from public.place_checkins where user_id = p_user_id
      union
      select activity_date as d from public.daily_activity where user_id = p_user_id
    ) dates
    order by d desc
  loop
    if v_date = v_expected_date then
      v_streak := v_streak + 1;
      v_expected_date := v_expected_date - 1;
    elsif v_date < v_expected_date then
      exit;
    end if;
  end loop;

  return jsonb_build_object('streak', v_streak, 'checked_in_today', v_has_today);
end;
$function$;

-- Recordatorio push: texto actualizado para no decir literalmente
-- "check-in", ya que ahora alcanza con abrir la app.
create or replace function public.send_streak_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_result jsonb;
  v_streak integer;
  v_sent integer := 0;
  v_plural text;
begin
  for r in
    select distinct p.id
    from public.profiles p
    join public.push_subscriptions ps on ps.user_id = p.id
  loop
    v_result := public.get_checkin_streak(r.id);
    v_streak := (v_result->>'streak')::int;

    if v_streak > 0 and (v_result->>'checked_in_today')::boolean = false then
      if not exists (
        select 1 from public.notifications
        where user_id = r.id
          and type = 'streak_reminder'
          and created_at::date = current_date
      ) then
        v_plural := case when v_streak = 1 then '' else 's' end;
        insert into public.notifications (user_id, type, title, body, data, read)
        values (
          r.id,
          'streak_reminder',
          '🔥 Tu racha está en riesgo',
          'Llevas ' || v_streak || ' día' || v_plural || ' seguido' || v_plural || '. Abre Snoutt hoy para no perderla.',
          jsonb_build_object('streak', v_streak),
          false
        );
        v_sent := v_sent + 1;
      end if;
    end if;
  end loop;

  return v_sent;
end;
$$;

grant execute on function public.send_streak_reminders() to service_role, postgres;
