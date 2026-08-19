$ErrorActionPreference = "Stop"
$container = "autotime-job-workflow-migration-test"
$workspace = (Resolve-Path -LiteralPath ".").Path

function ExecSql([string]$db, [string]$sql, [switch]$AllowFailure) {
  $old = $ErrorActionPreference; $ErrorActionPreference = "Continue"
  $output = & docker exec $container psql -X -v ON_ERROR_STOP=1 -U postgres -d $db -c $sql 2>&1
  $code = $LASTEXITCODE; $ErrorActionPreference = $old
  if (-not $AllowFailure -and $code -ne 0) { throw "SQL failed in ${db}: $($output -join "`n")" }
  [pscustomobject]@{ ExitCode=$code; Output=($output -join "`n") }
}
function ApplyFile([string]$db, [string]$path) {
  $old=$ErrorActionPreference; $ErrorActionPreference="Continue"
  $output=& docker exec $container psql -X -v ON_ERROR_STOP=1 -U postgres -d $db -f $path 2>&1
  $code=$LASTEXITCODE; $ErrorActionPreference=$old
  [pscustomobject]@{ ExitCode=$code; Output=($output -join "`n") }
}
function NewDb([string]$db, [bool]$withAuth=$true) {
  & docker exec $container createdb -U postgres $db | Out-Null
  ExecSql $db "create function public.set_updated_at() returns trigger language plpgsql as `$`$ begin new.updated_at = now(); return new; end `$`$;" | Out-Null
  # Mirrors Supabase's platform-level bootstrap: real projects grant table
  # privileges to authenticated/anon/service_role once, outside any
  # migration - RLS policies only take effect once a role already has the
  # base SQL privilege. No migration in this repo restates these grants, so
  # the local test harness must, for tables created after this point too.
  ExecSql $db "grant usage on schema public to anon, authenticated, service_role; alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;" | Out-Null
  if ($withAuth) {
    ExecSql $db "create schema auth; create table auth.users(id uuid primary key,email text,created_at timestamptz default now(),last_sign_in_at timestamptz); create or replace function auth.uid() returns uuid language sql stable as `$`$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid `$`$;" | Out-Null
  }
}
function ExpectFailure($result,[string]$label) { if ($result.ExitCode -eq 0) { throw "$label unexpectedly succeeded" } }

try {
  if (& docker ps -a -q --filter "name=^/$container$") { & docker rm -f $container | Out-Null }
  & docker run --name $container -e POSTGRES_PASSWORD=local-job-workflow-test-only -d postgres:16-alpine | Out-Null
  $ready=$false; for($i=0;$i -lt 30;$i++){ & docker exec $container pg_isready -U postgres 2>$null | Out-Null; if($LASTEXITCODE -eq 0){$ready=$true;break}; Start-Sleep -Seconds 1 }
  if(-not $ready){throw "Isolated PostgreSQL did not become ready"}
  ExecSql "postgres" "create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;" | Out-Null
  & docker cp "supabase/migrations/20260819100000_job_workflow_and_interviews.sql" "${container}:/tmp/job_workflow.sql" | Out-Null

  NewDb "job_workflow_clean"
  $applied = ApplyFile "job_workflow_clean" "/tmp/job_workflow.sql"
  if ($applied.ExitCode -ne 0) { throw "clean apply failed: $($applied.Output)" }
  ExpectFailure (ApplyFile "job_workflow_clean" "/tmp/job_workflow.sql") "second application"

  NewDb "job_workflow_missing_auth" $false
  ExpectFailure (ApplyFile "job_workflow_missing_auth" "/tmp/job_workflow.sql") "missing auth.users"

  foreach ($case in @("table", "policy", "trigger")) {
    $db = "job_workflow_conflict_$case"; NewDb $db
    if ($case -eq "table") { ExecSql $db "create table public.job_workflow_jobs(sentinel int);" | Out-Null }
    if ($case -eq "policy") {
      ExecSql $db "create table public.sentinel_policy_target(id int, user_id uuid); alter table public.sentinel_policy_target enable row level security; create policy `"job_workflow_jobs_select_own`" on public.sentinel_policy_target for select using (true);" | Out-Null
    }
    if ($case -eq "trigger") {
      ExecSql $db "create table public.sentinel_trigger_target(id int); create trigger job_workflow_jobs_set_updated_at before update on public.sentinel_trigger_target for each row execute function public.set_updated_at();" | Out-Null
    }
    ExpectFailure (ApplyFile $db "/tmp/job_workflow.sql") "conflicting $case"
    $partial = ExecSql $db "select to_regclass('public.interview_preparation_snapshots') is null;"
    if ($partial.Output -notmatch "t") { throw "conflicting $case left partial objects (transaction did not roll back)" }
  }

  # RLS sanity check on job_workflow_jobs, representative of the identical
  # auth.uid() = user_id pattern used by all seven tables.
  $ownerA = "10000000-0000-4000-8000-000000000001"
  $ownerB = "10000000-0000-4000-8000-000000000002"
  $jobA = "20000000-0000-4000-8000-000000000001"
  $jobB = "20000000-0000-4000-8000-000000000002"
  ExecSql "job_workflow_clean" "insert into auth.users(id,email) values ('$ownerA','a@test.invalid'),('$ownerB','b@test.invalid');" | Out-Null
  ExecSql "job_workflow_clean" "set role service_role; insert into public.job_workflow_jobs(id,user_id,title,employer,facts,source,captured_at) values ('$jobA','$ownerA','{}','{}','{}','Saved job',now()),('$jobB','$ownerB','{}','{}','{}','Saved job',now()); reset role;" | Out-Null

  $asOwnerA = ExecSql "job_workflow_clean" "set role authenticated; set local request.jwt.claim.sub = '$ownerA'; select count(*) from public.job_workflow_jobs;"
  if ($asOwnerA.Output -notmatch "(?m)^\s*1\s*$") { throw "owner A should see exactly 1 row (their own), saw: $($asOwnerA.Output)" }

  $crossOwnerInsert = ExecSql "job_workflow_clean" "set role authenticated; set local request.jwt.claim.sub = '$ownerA'; insert into public.job_workflow_jobs(id,user_id,title,employer,facts,source,captured_at) values ('30000000-0000-4000-8000-000000000001','$ownerB','{}','{}','{}','Saved job',now());" -AllowFailure
  ExpectFailure $crossOwnerInsert "insert into another user's rows"

  $noAuth = ExecSql "job_workflow_clean" "set role authenticated; select count(*) from public.job_workflow_jobs;" -AllowFailure
  if ($noAuth.ExitCode -eq 0 -and $noAuth.Output -notmatch "(?m)^\s*0\s*$") { throw "unauthenticated role should see 0 rows, saw: $($noAuth.Output)" }

  [pscustomobject]@{
    clean_apply = "passed"
    second_application_rejected = "passed"
    missing_auth_rejected = "passed"
    conflicting_table_rejected_no_partial_objects = "passed"
    conflicting_policy_rejected_no_partial_objects = "passed"
    conflicting_trigger_rejected_no_partial_objects = "passed"
    rls_owner_isolation = "passed"
    rls_cross_owner_insert_denied = "passed"
    rls_unauthenticated_denied = "passed"
  } | ConvertTo-Json -Compress
}
finally {
  if (& docker ps -a -q --filter "name=^/$container$") { & docker rm -f $container | Out-Null }
}
