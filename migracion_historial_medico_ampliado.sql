-- Aplicada via MCP de Supabase (apply_migration, nombre: historial_medico_ampliado)
-- Documenta el esquema para referencia local; la fuente de verdad es la base
-- de datos en produccion.

-- Historial medico ampliado: alergias, condiciones cronicas, medicamentos,
-- cirugias/procedimientos y notas de consulta. Todo ingresado por el dueno
-- de la mascota (no por veterinarios), pensado como "cartilla completa" que
-- el dueno puede mostrar en la clinica.
create table if not exists public.pet_medical_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('allergy','condition','medication','surgery','note')),
  title text not null,
  date date,
  end_date date,
  extra text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.pet_medical_records enable row level security;

create policy "Users can view their own medical records"
  on public.pet_medical_records for select
  using (auth.uid() = user_id);

create policy "Users can insert their own medical records"
  on public.pet_medical_records for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own medical records"
  on public.pet_medical_records for update
  using (auth.uid() = user_id);

create policy "Users can delete their own medical records"
  on public.pet_medical_records for delete
  using (auth.uid() = user_id);

create index if not exists pet_medical_records_user_category_idx
  on public.pet_medical_records (user_id, category);

-- Registro de peso a traves del tiempo
create table if not exists public.pet_weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight_kg numeric not null,
  created_at timestamptz not null default now()
);

alter table public.pet_weight_logs enable row level security;

create policy "Users can view their own weight logs"
  on public.pet_weight_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own weight logs"
  on public.pet_weight_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own weight logs"
  on public.pet_weight_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete their own weight logs"
  on public.pet_weight_logs for delete
  using (auth.uid() = user_id);

create index if not exists pet_weight_logs_user_date_idx
  on public.pet_weight_logs (user_id, date);

-- Documentos medicos (resultados de laboratorio, rayos x, etc.)
create table if not exists public.pet_medical_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  date date,
  file_url text not null,
  doc_type text not null default 'other' check (doc_type in ('lab','xray','other')),
  created_at timestamptz not null default now()
);

alter table public.pet_medical_documents enable row level security;

create policy "Users can view their own medical documents"
  on public.pet_medical_documents for select
  using (auth.uid() = user_id);

create policy "Users can insert their own medical documents"
  on public.pet_medical_documents for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own medical documents"
  on public.pet_medical_documents for update
  using (auth.uid() = user_id);

create policy "Users can delete their own medical documents"
  on public.pet_medical_documents for delete
  using (auth.uid() = user_id);
