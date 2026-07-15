-- RPC pública y segura para mostrar el estado de vacunación en el perfil público.
-- No expone las filas de la tabla vaccines (marca, fechas, notas) a otros usuarios,
-- solo devuelve el estado calculado: 'ok' | 'overdue' | 'none'.

create or replace function public.get_vaccine_status(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_rows boolean;
  v_has_overdue boolean;
begin
  select exists(select 1 from public.vaccines where user_id = p_user_id) into v_has_rows;
  if not v_has_rows then
    return 'none';
  end if;

  select exists(
    select 1 from public.vaccines
    where user_id = p_user_id
      and next_due_date is not null
      and next_due_date < current_date
  ) into v_has_overdue;

  if v_has_overdue then
    return 'overdue';
  end if;

  return 'ok';
end;
$$;

grant execute on function public.get_vaccine_status(uuid) to authenticated;
