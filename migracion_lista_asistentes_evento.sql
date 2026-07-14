-- Migracion: permitir que cualquier usuario autenticado pueda ver quien
-- esta anotado en un evento (lista de asistentes visible para el
-- anfitrion y para los demas asistentes, no solo tu propia fila).

drop policy if exists "event_attendees_select_all" on public.event_attendees;
create policy "event_attendees_select_all"
on public.event_attendees
for select
to authenticated
using (true);
