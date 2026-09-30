-- Lets an authenticated beta user submit their own feedback into
-- beta_feedback. Previously this table granted insert/update only to
-- service_role and carried no RLS policy at all, so despite the table,
-- migration, and admin read-side UI all existing, there was no working
-- in-app path for a real tester to submit feedback - none of the app's own
-- API routes wrote to it either. Insert-only for users: they can add a row
-- for themselves but never read, update, or delete beta_feedback (including
-- their own submissions) - status/internal_notes stay admin-only via the
-- existing service_role grant.
grant insert (category, rating, message, product_area, route, technical_context, user_id)
  on table public.beta_feedback to authenticated;

create policy "beta_feedback_insert_own"
on public.beta_feedback
for insert
to authenticated
with check ((select auth.uid()) = user_id);
