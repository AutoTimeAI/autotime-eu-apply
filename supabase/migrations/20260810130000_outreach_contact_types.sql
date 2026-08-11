alter table public.outreach_messages
  add column if not exists contact_type text not null default 'recruiter';
alter table public.outreach_messages drop constraint if exists outreach_messages_contact_type_check;
alter table public.outreach_messages add constraint outreach_messages_contact_type_check
  check (contact_type in ('recruiter','hiring_manager','peer_target_role'));
create index if not exists outreach_messages_user_contact_type_idx
  on public.outreach_messages(user_id, contact_type, created_at desc);
