# Runs the mobility-profiles migration safety test suite against a
# disposable local PostgreSQL container. Not wired to a package.json script;
# invoke directly, e.g.
# `powershell -File scripts/run-local-mobility-migration-test.ps1`.
#
# Requires Docker on PATH. Side effects: creates (and always removes, even on
# failure, via the `finally` block) a `postgres:16-alpine` container named
# `autotime-mobility-migration-test`, plus a local
# `.tmp-mobility-migration-test` scratch directory holding a generated
# bootstrap SQL file. Applies
# `supabase/migrations/20260729120000_mobility_profiles_entry_gate.sql`
# against several throwaway databases (each bootstrapped with a minimal
# `auth` schema, `auth.uid()`, and a pre-existing sentinel table used to
# detect unwanted side effects) to verify: clean application succeeds and
# creates the expected policies/trigger/foreign key, re-applying fails, and
# applying against a pre-existing conflicting table/policy/trigger fails
# without modifying the pre-existing objects (atomic rollback). On success
# prints a compact JSON summary object to stdout; throws (non-zero exit) on
# the first failed assertion.
$ErrorActionPreference = "Stop"
$container = "autotime-mobility-migration-test"
$tempRoot = Join-Path (Get-Location) ".tmp-mobility-migration-test"
$workspace = (Resolve-Path -LiteralPath ".").Path

# Runs a single SQL command in database $database via
# `docker exec ... psql -c`, stopping on first error. Returns an object with
# ExitCode and combined Output (never throws itself).
function Invoke-ContainerPsql([string]$database, [string]$command) {
  $output = & docker exec $container psql -v ON_ERROR_STOP=1 -U postgres -d $database -c $command 2>&1
  [pscustomobject]@{ ExitCode = $LASTEXITCODE; Output = ($output -join "`n") }
}

# Applies the copied migration file (`/tmp/mobility.sql` inside the
# container) to database $database via `docker exec ... psql -f`. Never
# throws — always returns { ExitCode, Output } so callers can assert
# success/failure.
function Apply-Migration([string]$database) {
  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $output = & docker exec $container psql -v ON_ERROR_STOP=1 -U postgres -d $database -f /tmp/mobility.sql 2>&1
  $exitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousPreference
  [pscustomobject]@{ ExitCode = $exitCode; Output = ($output -join "`n") }
}

# Creates database $database in the container and applies the generated
# `/tmp/bootstrap.sql` (the minimal auth schema/sentinel table) to it. Throws
# if either step fails.
function New-TestDatabase([string]$database) {
  & docker exec $container createdb -U postgres $database | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not create $database" }
  & docker exec $container psql -v ON_ERROR_STOP=1 -U postgres -d $database -f /tmp/bootstrap.sql | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not bootstrap $database" }
}

try {
  $existingContainer = & docker ps -a -q --filter "name=^/$container$"
  if ($existingContainer) { & docker rm -f $container | Out-Null }
  New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
  $bootstrapPath = Join-Path $tempRoot "bootstrap.sql"
  $bootstrap = @"
create schema auth;
do `$`$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end `$`$;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as `$`$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid `$`$;
create function public.set_updated_at() returns trigger language plpgsql as `$`$ begin new.updated_at = now(); return new; end `$`$;
create table public.existing_application_sentinel (id integer primary key, marker text not null);
insert into public.existing_application_sentinel values (1, 'unchanged');
create schema supabase_migrations;
create table supabase_migrations.schema_migrations (version text primary key, statements text[]);
"@
  [IO.File]::WriteAllText($bootstrapPath, $bootstrap, [Text.UTF8Encoding]::new($false))

  & docker run --name $container -e POSTGRES_PASSWORD=local-migration-test-only -d postgres:16-alpine | Out-Null
  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    & docker exec $container pg_isready -U postgres 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw "Isolated PostgreSQL did not become ready" }

  & docker cp "supabase/migrations/20260729120000_mobility_profiles_entry_gate.sql" "${container}:/tmp/mobility.sql" | Out-Null
  & docker cp $bootstrapPath "${container}:/tmp/bootstrap.sql" | Out-Null

  New-TestDatabase "mobility_clean"
  $clean = Apply-Migration "mobility_clean"
  if ($clean.ExitCode -ne 0) { throw "Clean migration failed: $($clean.Output)" }
  $cleanState = Invoke-ContainerPsql "mobility_clean" "select (to_regclass('public.mobility_profiles') is not null)::text || '|' || (select count(*) from pg_policies where schemaname='public' and tablename='mobility_profiles') || '|' || (select count(*) from pg_trigger where tgname='mobility_profiles_set_updated_at' and not tgisinternal) || '|' || (select count(*) from public.mobility_profiles) || '|' || (select marker from public.existing_application_sentinel where id=1) || '|' || (select count(*) from pg_constraint where conrelid='public.mobility_profiles'::regclass and contype='f' and confrelid='auth.users'::regclass);"
  if ($cleanState.Output -notmatch "(?:t|true)\|4\|1\|0\|unchanged\|1") { throw "Clean verification failed: $($cleanState.Output)" }
  $second = Apply-Migration "mobility_clean"
  if ($second.ExitCode -eq 0) { throw "Second migration application unexpectedly succeeded" }

  New-TestDatabase "mobility_table_conflict"
  $null = Invoke-ContainerPsql "mobility_table_conflict" "create table public.mobility_profiles (sentinel integer);"
  $tableConflict = Apply-Migration "mobility_table_conflict"
  if ($tableConflict.ExitCode -eq 0) { throw "Pre-existing table did not fail" }
  $tableState = Invoke-ContainerPsql "mobility_table_conflict" "select (select count(*) from information_schema.columns where table_schema='public' and table_name='mobility_profiles' and column_name='sentinel') || '|' || (select count(*) from pg_policies where schemaname='public' and tablename='mobility_profiles');"
  if ($tableState.Output -notmatch "1\|0") { throw "Pre-existing table was modified: $($tableState.Output)" }

  New-TestDatabase "mobility_policy_conflict"
  $null = Invoke-ContainerPsql "mobility_policy_conflict" "alter table public.existing_application_sentinel enable row level security; create policy mobility_profiles_select_own on public.existing_application_sentinel for select to authenticated using (true);"
  $policyConflict = Apply-Migration "mobility_policy_conflict"
  if ($policyConflict.ExitCode -eq 0) { throw "Policy conflict did not fail" }
  $policyState = Invoke-ContainerPsql "mobility_policy_conflict" "select (to_regclass('public.mobility_profiles') is null)::text || '|' || (select marker from public.existing_application_sentinel where id=1);"
  if ($policyState.Output -notmatch "(?:t|true)\|unchanged") { throw "Policy failure left partial schema: $($policyState.Output)" }

  New-TestDatabase "mobility_trigger_conflict"
  $null = Invoke-ContainerPsql "mobility_trigger_conflict" 'create function public.sentinel_trigger() returns trigger language plpgsql as $$ begin return new; end $$; create trigger mobility_profiles_set_updated_at before update on public.existing_application_sentinel for each row execute function public.sentinel_trigger();'
  $triggerConflict = Apply-Migration "mobility_trigger_conflict"
  if ($triggerConflict.ExitCode -eq 0) { throw "Trigger conflict did not fail" }
  $triggerState = Invoke-ContainerPsql "mobility_trigger_conflict" "select (to_regclass('public.mobility_profiles') is null)::text || '|' || (select marker from public.existing_application_sentinel where id=1);"
  if ($triggerState.Output -notmatch "(?:t|true)\|unchanged") { throw "Trigger failure left partial schema: $($triggerState.Output)" }

  [pscustomobject]@{
    clean_application = "passed"
    second_application_fails = "passed"
    preexisting_table_fails_unchanged = "passed"
    conflicting_policy_fails_atomically = "passed"
    conflicting_trigger_fails_atomically = "passed"
    owner_policies = 4
    mobility_rows_created = 0
    existing_application_sentinel = "unchanged"
    foreign_key_to_auth_users = "verified"
  } | ConvertTo-Json -Compress
}
finally {
  $existingContainer = & docker ps -a -q --filter "name=^/$container$"
  if ($existingContainer) { & docker rm -f $container | Out-Null }
  if (Test-Path -LiteralPath $tempRoot) {
    $resolvedTemp = (Resolve-Path -LiteralPath $tempRoot).Path
    if (-not $resolvedTemp.StartsWith($workspace, [StringComparison]::OrdinalIgnoreCase)) {
      throw "Temporary cleanup target escaped workspace"
    }
    Remove-Item -LiteralPath $resolvedTemp -Recurse -Force
  }
}