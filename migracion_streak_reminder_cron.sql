-- Recordatorio push diario de racha: cierra el loop de re-enganche de la
-- racha de check-ins (get_checkin_streak) mandando una notificacion push
-- a quien tenga streak > 0 y todavia no haya hecho check-in hoy.
--
-- La insercion en public.notifications dispara automaticamente el Database
-- Webhook -> Edge Function send-push que ya existe, ademas de aparecer en
-- la campanita in-app (tipo 'streak_reminder', manejado en
-- src/components/Notifications.jsx y src/App.jsx).

create extension if not exists pg_cron;

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
      -- evita duplicados si el job corriera mas de una vez el mismo dia
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
          'Llevas ' || v_streak || ' día' || v_plural || ' seguido' || v_plural || '. Haz check-in hoy para no perderla.',
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

-- Corre todos los dias a las 23:00 UTC = 18:00 hora de Panama (UTC-5),
-- dandole al usuario varias horas de margen antes de medianoche.
select cron.schedule(
  'streak-reminder-daily',
  '0 23 * * *',
  $$select public.send_streak_reminders();$$
);
