alter table public.profiles
  add column if not exists photo_url text,
  add column if not exists country_current text,
  add column if not exists countries_target text[] not null default '{}',
  add column if not exists onboarding_step integer not null default 0 check (onboarding_step between 0 and 5),
  add column if not exists onboarding_completed_at timestamptz;

alter table public.profiles alter column full_name set default '';
alter table public.profiles alter column current_country set default '';
alter table public.profiles alter column target_countries set default '';
alter table public.profiles alter column target_roles set default '';
alter table public.profiles alter column work_right_details set default '';
alter table public.profiles alter column base_cv_text set default '';
alter table public.profiles drop constraint if exists profiles_full_name_present;
alter table public.profiles drop constraint if exists profiles_current_country_present;
alter table public.profiles drop constraint if exists profiles_target_countries_present;
alter table public.profiles drop constraint if exists profiles_target_roles_present;
alter table public.profiles drop constraint if exists profiles_work_right_details_present;
alter table public.profiles drop constraint if exists profiles_base_cv_text_present;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false, file_size_limit=5242880, allowed_mime_types=excluded.allowed_mime_types;

create policy "profile_photos_select_own" on storage.objects for select to authenticated
using (bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "profile_photos_insert_own" on storage.objects for insert to authenticated
with check (bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "profile_photos_update_own" on storage.objects for update to authenticated
using (bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "profile_photos_delete_own" on storage.objects for delete to authenticated
using (bucket_id='profile-photos' and (storage.foldername(name))[1]=auth.uid()::text);
