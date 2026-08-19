create table if not exists public.cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.applications(id) on delete cascade,
  company_name text not null,
  job_title text not null,
  version integer not null check (version > 0),
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, job_id, version)
);

create index if not exists cover_letters_user_job_idx
  on public.cover_letters(user_id, job_id, version desc);

alter table public.cover_letters enable row level security;
create policy "cover_letters_select_own" on public.cover_letters for select to authenticated using (auth.uid() = user_id);
create policy "cover_letters_insert_own" on public.cover_letters for insert to authenticated with check (auth.uid() = user_id);
create policy "cover_letters_update_own" on public.cover_letters for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cover_letters_delete_own" on public.cover_letters for delete to authenticated using (auth.uid() = user_id);

drop trigger if exists cover_letters_set_updated_at on public.cover_letters;
create trigger cover_letters_set_updated_at before update on public.cover_letters
for each row execute function public.set_updated_at();
