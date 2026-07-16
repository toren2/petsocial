# Plan: Mascotas múltiples por cuenta

Documento de diseño, no de ejecución. Nada de esto está implementado todavía —
es la base para decidir alcance y fases antes de tocar código o la base de
datos.

## Por qué ahora

Hoy el modelo es 1 cuenta = 1 mascota (`profiles.id` = `auth.users.id`, y
todas las tablas de contenido cuelgan de `user_id`). Migrar esto después de
tener usuarios reales con vacunas, matches, posts, etc. es mucho más caro y
riesgoso que hacerlo ahora, pre-lanzamiento, con datos de prueba.

## Idea central

No todo necesita volverse "por mascota". Hay dos tipos de datos:

- **De cuenta** (la persona, sin importar cuántas mascotas tenga): idioma,
  fecha de nacimiento del dueño (para el bloqueo de menores), notificaciones
  push, bloqueos/reportes, lista de espera.
- **De mascota** (cada perro/gato tiene el suyo): perfil de swipe, vacunas,
  historial médico, peso, posts, historias, matches, mensajes, huellas/
  insignias, verificación.

La tabla `profiles` se queda como la tabla de **cuenta** (settings del
dueño). Se crea una tabla nueva `pets` para la identidad de cada mascota.

## Esquema nuevo

```sql
create table public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_name text not null,
  breed text, species text, age int, size text, sex text, energy text,
  location text, lat double precision, lng double precision,
  about text, interests text[], avatar_url text, emoji text,
  esterilizado boolean default false, good_with text,
  is_primary boolean default false,
  order_index int default 0,
  created_at timestamptz default now()
);
```

`profiles` pierde los campos de mascota (se migran a `pets`) y gana:
`active_pet_id uuid references pets(id)` — recuerda con cuál mascota entraste
la última vez.

## Qué tablas cambian de `user_id` a `pet_id`

Categoría **de mascota** (cambian a `pet_id`):

- `vaccines`, `pet_medical_records`, `pet_weight_logs`, `pet_medical_documents`, `pet_photos`
- `posts`, `stories`, `story_views`
- `likes`, `matches`, `messages`, `message_reactions`
- `follows` (se sigue a una mascota, no a una persona)
- `huellas_log`, `user_badges`, `place_checkins`, `place_pet_history`
- `verification_requests`, `lost_pets`
- `event_attendees` (opcional, ver nota abajo)

Categoría **de cuenta** (se quedan en `user_id` / `auth.uid()`, sin cambios):

- `push_subscriptions`, `notifications` (el destino sigue siendo la persona;
  el contenido ya puede referenciar qué mascota aplica)
- `blocked_users`, `reports`, `app_reports`
- `saved_places`, `saved_posts`, `saved_pets`, `reviews`
- `waitlist`, `place_suggestions`

Nota sobre `event_attendees`: podría ir por cuenta ("voy al evento") o por
mascota ("llevo a Rex y a Luna"). Recomiendo dejarlo por cuenta con un campo
opcional `pet_ids uuid[]` para no duplicar RSVPs de una misma persona.

## Cómo cambia el RLS

Patrón actual: `using (auth.uid() = user_id)`.

Patrón nuevo para tablas de mascota:
```sql
using (pet_id in (select id from public.pets where owner_id = auth.uid()))
```
Con un índice en `pets(owner_id)` el costo es mínimo. Las políticas que hoy
permiten ver el contenido de la otra persona en un match (chat, perfil
público) necesitan el mismo cambio de indirección, pero la forma general no
cambia.

## Migración de datos existentes

Sin pérdida, porque hoy cada cuenta tiene exactamente una mascota implícita:

1. Por cada fila de `profiles`, crear una fila en `pets` copiando los campos
   de mascota, `is_primary = true`.
2. Backfill de `pet_id` en cada tabla de la lista de arriba, usando el
   `pets.id` recién creado para ese `owner_id`.
3. `profiles.active_pet_id` = ese mismo pet id.

## Cambios de UI

- **Selector de mascota**: un componente (como el selector de cuentas de
  Instagram) en el header del Hub/Perfil — foto + nombre de cada mascota, y
  "+ Agregar mascota". Cambia `activePetId` en `AuthContext` (persistido en
  `profiles.active_pet_id` + localStorage para que no salte al recargar).
- **AuthContext**: expone `pets`, `activePet`, `switchPet(id)`, `addPet()`.
- Todas las pantallas que hoy filtran por `user_id` para datos de mascota
  pasan a filtrar por `activePet.id`: Match, Feed, Vacunas, Historial
  médico, StoriesBar, Chat (la conversación cuelga del match, que es
  mascota-a-mascota), Perdidos, Lugares (check-in), Huellas/Badges.
- **Perfil.jsx** pasa a ser "perfil de la mascota activa", con acceso al
  selector/creador de mascotas desde ahí también.
- Crear una segunda mascota reutiliza el formulario de perfil que ya existe,
  solo que inserta una fila nueva en `pets` en vez de actualizar `profiles`.
- Notificaciones: el payload push ya debería indicar a qué mascota
  corresponde (vacuna de Rex vs. de Luna) para que al tocarla se cambie de
  mascota activa antes de navegar.

## Fases recomendadas (de menor a mayor riesgo)

**Fase 1 — bajo riesgo, alto valor.** Tabla `pets` + migrar vacunas,
historial médico, peso, documentos y fotos de mascota a `pet_id`, con un
selector simple solo para estas pantallas de "registro personal". No se toca
Match, Feed ni Chat todavía. Esto solo ya resuelve el caso de "tengo 2 perros
y quiero llevar su historial por separado" sin tocar lo más sensible de la
app.

**Fase 2 — riesgo medio.** Feed/Historias por mascota (publicar "como Rex" o
"como Luna"), huellas/insignias por mascota, Perdidos por mascota.

**Fase 3 — mayor riesgo y complejidad.** Match/Likes/Chat se vuelven
mascota-a-mascota. Es el cambio más delicado porque toca el grafo social
completo (matches y conversaciones existentes). Los matches/mensajes
existentes se migran automáticamente a la mascota `is_primary` de cada
cuenta, así que nada se rompe para los usuarios actuales — los matches
nuevos hacia adelante ya pueden ser específicos por mascota si el dueño
tiene varias.

## Siguiente paso

Si se aprueba este plan, la Fase 1 es autocontenida y de bajo riesgo — se
puede ejecutar en una sesión sin afectar Match/Chat/Feed en absoluto.
