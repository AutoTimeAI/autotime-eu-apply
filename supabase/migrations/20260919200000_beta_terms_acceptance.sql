-- Real, tracked beta-acknowledgement acceptance, per the founder's decision
-- to close the "founder confirmation of beta terms" release gate with
-- actual evidence rather than static, unattributed text. Recording
-- user_id + a server-set timestamp (never client-supplied) is defensible
-- evidence that a specific user actually accepted, if this is ever
-- questioned - a text block on a page proves nothing about who saw it.
alter table public.profiles
  add column if not exists beta_terms_accepted_at timestamptz;
