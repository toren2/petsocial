-- Migracion aplicada directamente en Supabase (proyecto pvlaruqwbaxdpdndwfvh)
-- via MCP el 2026-07-16. Este archivo queda como registro/documentacion.
--
-- Recordatorio push de vacunas proximas: mismo patron que
-- send_streak_reminders (migracion_streak_reminder_cron.sql), pero para
-- vacunas. Manda un push cuando faltan exactamente 3 dias para la
-- proxima dosis y otro el mismo dia que vence, evitando duplicados si
-- el cron corre mas de una vez el mismo dia para la misma vacuna.

create or replace function public.send_vaccine_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_days_until integer;
  v_sent integer := 0;
begin
  for r in
    select v.id as vaccine_id, v.user_id, v.name, v.next_due_date, p.pet_name
    from public.vaccines v
    join public.profiles p on p.id = v.user_id
    join public.push_subscriptions ps on ps.user_id = v.user_id
    where v.next_due_date is not null
      and v.next_due_date - current_date in (3, 0)
    group by v.id, v.user_id, v.name, v.next_due_date, p.pet_name
  loop
    v_days_until := r.next_due_date - current_date;

    if not exists (
      select 1 from public.notifications
      where user_id = r.user_id
        and type = 'vaccine_reminder'
        and data->>'vaccineId' = r.vaccine_id::text
        and created_at::date = current_date
    ) then
      insert into public.notifications (user_id, type, title, body, data, read)
      values (
        r.user_id,
        'vaccine_reminder',
        case when v_days_until = 0 then '💉 Vacuna hoy' else '💉 Vacuna próxima' end,
        case
          when v_days_until = 0 then 'La vacuna "' || r.name || '" de ' || coalesce(r.pet_name, 'tu mascota') || ' vence hoy.'
          else 'La vacuna "' || r.name || '" de ' || coalesce(r.pet_name, 'tu mascota') || ' vence en ' || v_days_until || ' días.'
        end,
        jsonb_build_object('vaccineId', r.vaccine_id, 'daysUntil', v_days_until),
        false
      );
      v_sent := v_sent + 1;
    end if;
  end loop;

  return v_sent;
end;
$$;

grant execute on function public.send_vaccine_reminders() to service_role, postgres;

-- Corre todos los dias a las 13:00 UTC = 8:00 am hora de Panama (UTC-5),
-- para que el aviso llegue en la mañana y no en medio de la noche.
select cron.schedule(
  'vaccine-reminder-daily',
  '0 13 * * *',
  $$select public.send_vaccine_reminders();$$
);
