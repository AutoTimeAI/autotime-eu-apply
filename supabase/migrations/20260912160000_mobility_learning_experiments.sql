-- Frozen experiment assignments and append-only evaluation results.
begin;
create table public.mobility_learning_experiments (
  id uuid primary key default gen_random_uuid(), name text not null,
  protocol_version text not null, hypothesis text not null,
  primary_metric text not null, minimum_per_variant integer not null check (minimum_per_variant >= 5),
  starts_at timestamptz not null, ends_at timestamptz,
  initial_state text not null check (initial_state in ('draft', 'running')),
  recorded_at timestamptz not null default now()
);
create table public.mobility_learning_experiment_events (
  id uuid primary key default gen_random_uuid(), experiment_id uuid not null references public.mobility_learning_experiments(id),
  action text not null check (action in ('start', 'stop', 'complete', 'invalidate')),
  reason text not null check (length(trim(reason)) > 0), actor_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now()
);
create table public.mobility_learning_assignments (
  id uuid primary key default gen_random_uuid(), experiment_id uuid not null references public.mobility_learning_experiments(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_id uuid not null references public.mobility_learning_consents(id) on delete cascade,
  variant text not null check (variant in ('control', 'treatment')),
  assignment_key_sha256 text not null check (assignment_key_sha256 ~ '^[a-f0-9]{64}$'),
  assigned_at timestamptz not null, unique (experiment_id, user_id)
);
create table public.mobility_learning_evaluation_runs (
  id uuid primary key default gen_random_uuid(), experiment_id uuid not null references public.mobility_learning_experiments(id),
  evaluator_version text not null, dataset_cutoff_at timestamptz not null,
  control_metrics jsonb not null, treatment_metrics jsonb not null,
  eligible_for_rollout boolean not null, reason_codes text[] not null,
  result_sha256 text not null check (result_sha256 ~ '^[a-f0-9]{64}$'), recorded_at timestamptz not null default now(),
  constraint mobility_learning_evaluation_metrics_object check (jsonb_typeof(control_metrics) = 'object' and jsonb_typeof(treatment_metrics) = 'object'),
  constraint mobility_learning_evaluation_rollout_reasons check (not eligible_for_rollout or cardinality(reason_codes) = 0)
);
create trigger mobility_learning_experiments_immutable before update or delete on public.mobility_learning_experiments for each row execute function public.reject_mobility_immutable_mutation();
create trigger mobility_learning_experiment_events_immutable before update or delete on public.mobility_learning_experiment_events for each row execute function public.reject_mobility_immutable_mutation();
create trigger mobility_learning_assignments_immutable before update or delete on public.mobility_learning_assignments for each row execute function public.reject_mobility_immutable_mutation();
create trigger mobility_learning_evaluation_runs_immutable before update or delete on public.mobility_learning_evaluation_runs for each row execute function public.reject_mobility_immutable_mutation();
alter table public.mobility_learning_experiments enable row level security;
alter table public.mobility_learning_experiment_events enable row level security;
alter table public.mobility_learning_assignments enable row level security;
alter table public.mobility_learning_evaluation_runs enable row level security;
revoke all on public.mobility_learning_experiments from anon, authenticated;
revoke all on public.mobility_learning_experiment_events from anon, authenticated;
revoke all on public.mobility_learning_assignments from anon, authenticated;
revoke all on public.mobility_learning_evaluation_runs from anon, authenticated;
commit;
