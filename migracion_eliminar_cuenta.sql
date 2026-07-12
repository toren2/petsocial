-- ============================================================
-- Eliminar cuenta: funcion RPC que un usuario autenticado puede
-- llamar para borrar permanentemente su cuenta y todos sus datos.
-- ============================================================
-- IMPORTANTE: esto es DESTRUCTIVO e IRREVERSIBLE. Se borra:
--   - Todo el contenido del usuario (posts, historias, comentarios,
--     likes, reviews, vacunas, check-ins, huellas, badges, mascotas
--     perdidas, eventos creados, invitaciones, matches, mensajes,
--     notificaciones, follows, bloqueos, reportes, verificacion)
--   - Los archivos que subio a Storage (fotos, videos, comprobantes)
--   - Su perfil (profiles)
--   - Su cuenta de autenticacion (auth.users)
--
-- Se ejecuta como SECURITY DEFINER para poder borrar tambien filas
-- de OTROS usuarios que dependen del contenido de este usuario
-- (ej. comentarios de otros en sus posts, vistas de sus historias,
-- asistentes a sus eventos) sin lo cual las llaves foraneas
-- impedirian borrar ese contenido.
-- ============================================================

create or replace function delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  -- Likes e interacciones sobre comentarios/posts propios y ajenos
  delete from public.comment_likes
    where user_id = v_uid
       or comment_id in (select id from public.post_comments where user_id = v_uid or post_id in (select id from public.posts where user_id = v_uid));

  delete from public.post_comments
    where user_id = v_uid
       or post_id in (select id from public.posts where user_id = v_uid);

  delete from public.post_likes
    where user_id = v_uid
       or post_id in (select id from public.posts where user_id = v_uid);

  delete from public.saved_posts
    where user_id = v_uid
       or post_id in (select id from public.posts where user_id = v_uid);

  delete from public.story_views
    where viewer_id = v_uid
       or story_id in (select id from public.stories where user_id = v_uid);

  delete from public.stories where user_id = v_uid;

  delete from public.posts where user_id = v_uid;

  delete from public.pet_photos where user_id = v_uid;

  delete from public.reviews where user_id = v_uid;

  delete from public.vaccines where user_id = v_uid;

  delete from public.place_checkins where user_id = v_uid;

  delete from public.huellas_log where user_id = v_uid;

  delete from public.user_badges where user_id = v_uid;

  delete from public.place_pet_history where user_id = v_uid;

  delete from public.lost_pets where user_id = v_uid;

  -- Eventos: asistentes/invitaciones ajenas a eventos que este
  -- usuario organizo, mas las propias
  delete from public.event_attendees
    where user_id = v_uid
       or event_id in (select id from public.events where user_id = v_uid);

  delete from public.event_invites
    where sender_id = v_uid
       or receiver_id = v_uid
       or event_id in (select id from public.events where user_id = v_uid);

  delete from public.events where user_id = v_uid;

  delete from public.messages
    where sender_id = v_uid or receiver_id = v_uid;

  delete from public.matches
    where user1_id = v_uid or user2_id = v_uid;

  delete from public.notifications where user_id = v_uid;

  delete from public.follows
    where follower_id = v_uid or following_id = v_uid;

  delete from public.blocked_users
    where blocker_id = v_uid or blocked_id = v_uid;

  delete from public.reports
    where reporter_id = v_uid or reported_id = v_uid;

  delete from public.likes
    where sender_id = v_uid or receiver_id = v_uid;

  delete from public.saved_pets
    where user_id = v_uid or saved_user_id = v_uid;

  delete from public.verification_requests where user_id = v_uid;

  -- Archivos subidos por el usuario (avatars, posts, pet-photos,
  -- historias, comprobantes de vacunas, verificacion, etc.)
  delete from storage.objects where owner = v_uid;

  -- Perfil y cuenta de autenticacion (al final, todo lo demas ya
  -- fue borrado explicitamente arriba, asi que esto es seguro
  -- exista o no un ON DELETE CASCADE configurado)
  delete from public.profiles where id = v_uid;

  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function delete_own_account() from public;
revoke all on function delete_own_account() from anon;
grant execute on function delete_own_account() to authenticated;
