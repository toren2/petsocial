-- Migracion: fotos reales de Google Places para los lugares.
-- Se agrega columna image_url a places (foto real del negocio, cacheada
-- desde Google Places Photos en Supabase Storage al momento del seed,
-- para no pagar la API de Google en cada carga de pantalla).

alter table public.places add column if not exists image_url text;

-- Bucket publico para las fotos de lugares
insert into storage.buckets (id, name, public)
values ('places', 'places', true)
on conflict (id) do nothing;

drop policy if exists "places_photos_public_read" on storage.objects;
create policy "places_photos_public_read"
on storage.objects
for select
to public
using (bucket_id = 'places');

drop policy if exists "places_photos_authenticated_write" on storage.objects;
create policy "places_photos_authenticated_write"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'places');
