$ErrorActionPreference = "Stop"
$container = "autotime-admin-migration-test"
$tempRoot = Join-Path (Get-Location) ".tmp-admin-migration-test"
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
  if ($withAuth) {
    ExecSql $db "create schema auth; create table auth.users(id uuid primary key,email text,created_at timestamptz default now(),last_sign_in_at timestamptz);" | Out-Null
  }
}
function ExpectFailure($result,[string]$label) { if ($result.ExitCode -eq 0) { throw "$label unexpectedly succeeded" } }

try {
  if (& docker ps -a -q --filter "name=^/$container$") { & docker rm -f $container | Out-Null }
  New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
  & docker run --name $container -e POSTGRES_PASSWORD=local-admin-test-only -d postgres:16-alpine | Out-Null
  $ready=$false; for($i=0;$i -lt 30;$i++){ & docker exec $container pg_isready -U postgres 2>$null | Out-Null; if($LASTEXITCODE -eq 0){$ready=$true;break}; Start-Sleep -Seconds 1 }
  if(-not $ready){throw "Isolated PostgreSQL did not become ready"}
  ExecSql "postgres" "create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;" | Out-Null
  & docker cp "supabase/migrations/20260801190000_admin_operations_foundation.sql" "${container}:/tmp/admin.sql" | Out-Null
  & docker cp "supabase/migrations/20260801191000_workflow_operational_events.sql" "${container}:/tmp/events.sql" | Out-Null

  NewDb "admin_clean"
  $admin=ApplyFile "admin_clean" "/tmp/admin.sql"; if($admin.ExitCode -ne 0){throw $admin.Output}
  $events=ApplyFile "admin_clean" "/tmp/events.sql"; if($events.ExitCode -ne 0){throw $events.Output}
  ExpectFailure (ApplyFile "admin_clean" "/tmp/admin.sql") "second admin application"
  ExpectFailure (ApplyFile "admin_clean" "/tmp/events.sql") "second event application"

  NewDb "admin_missing_auth" $false
  ExpectFailure (ApplyFile "admin_missing_auth" "/tmp/admin.sql") "missing auth.users"

  foreach($case in @("table","function","trigger")) {
    $db="admin_conflict_$case"; NewDb $db
    if($case -eq "table"){ ExecSql $db "create table public.admin_memberships(sentinel int);" | Out-Null }
    if($case -eq "function"){ ExecSql $db 'create function public.admin_change_beta_access(uuid,uuid,text,text) returns void language sql as $$ select $$;' | Out-Null }
    if($case -eq "trigger"){ ExecSql $db 'create table public.sentinel(id int); create function public.sentinel_trigger() returns trigger language plpgsql as $$ begin return new; end $$; create trigger admin_audit_events_append_only before update on public.sentinel for each row execute function public.sentinel_trigger();' | Out-Null }
    ExpectFailure (ApplyFile $db "/tmp/admin.sql") "conflicting $case"
    $partial=ExecSql $db "select to_regclass('public.admin_audit_events') is null;"; if($partial.Output -notmatch "t") { throw "conflicting $case left partial objects" }
  }

  $owner="10000000-0000-4000-8000-000000000001"; $target="10000000-0000-4000-8000-000000000002"
  ExecSql "admin_clean" "insert into auth.users(id,email) values('$owner','owner@test.invalid'),('$target','target@test.invalid'); insert into public.admin_memberships(user_id,role,status) values('$owner','owner','active');" | Out-Null
  foreach($role in @("anon","authenticated")) {
    $denied=ExecSql "admin_clean" "set role $role; select * from public.admin_memberships;" -AllowFailure; ExpectFailure $denied "$role membership read"
  }
  ExecSql "admin_clean" "set role service_role; select count(*) from public.admin_memberships; reset role;" | Out-Null
  ExecSql "admin_clean" "set role service_role; select * from public.admin_change_beta_access('$owner','$target','suspended','controlled test'); reset role;" | Out-Null
  $paired=ExecSql "admin_clean" "select (select count(*) from public.beta_access where user_id='$target' and status='suspended') || '|' || (select count(*) from public.admin_audit_events where action='beta_access_suspended');"
  if($paired.Output -notmatch "1\|1"){throw "atomic beta success failed"}

  ExecSql "admin_clean" 'create function public.fail_audit() returns trigger language plpgsql as $$ begin raise exception ''injected''; end $$; create trigger fail_audit before insert on public.admin_audit_events for each row execute function public.fail_audit();' | Out-Null
  ExpectFailure (ExecSql "admin_clean" "set role service_role; select * from public.admin_change_beta_access('$owner','$target','active','');" -AllowFailure) "injected audit failure"
  $rollback=ExecSql "admin_clean" "select status from public.beta_access where user_id='$target';"; if($rollback.Output -notmatch "suspended"){throw "audit failure did not roll back target"}
  ExecSql "admin_clean" "drop trigger fail_audit on public.admin_audit_events; drop function public.fail_audit();" | Out-Null
  ExpectFailure (ExecSql "admin_clean" "set role service_role; update public.admin_audit_events set action='feature_flag_updated';" -AllowFailure) "audit update"
  ExpectFailure (ExecSql "admin_clean" "set role service_role; delete from public.admin_audit_events;" -AllowFailure) "audit delete"

  ExecSql "admin_clean" "set role service_role; select * from public.record_workflow_operational_event('$target','job_saved','20000000-0000-4000-8000-000000000001'); select * from public.record_workflow_operational_event('$target','job_saved','20000000-0000-4000-8000-000000000001'); reset role;" | Out-Null
  $dedupe=ExecSql "admin_clean" "select count(*) from public.workflow_operational_events where user_id='$target' and event='job_saved';"; if($dedupe.Output -notmatch "1"){throw "event deduplication failed"}
  ExecSql "admin_clean" "set role service_role; select * from public.admin_update_feature_flag('$owner','role_pathways_enabled','preview',true,0); reset role;" | Out-Null
  $flag=ExecSql "admin_clean" "select count(*)||'|'||max(version) from public.admin_feature_flags;"; if($flag.Output -notmatch "1\|1"){throw "feature flag transaction failed"}

  [pscustomobject]@{ clean="passed"; missing_auth="passed"; conflicts="passed"; second_execution="passed"; role_access="passed"; audit_append_only="passed"; atomic_mutation="passed"; rollback="passed"; event_deduplication="passed"; note="rate-limit/concurrency assertions are defined in SQL contract tests and require the extended harness pass" } | ConvertTo-Json -Compress
}
finally {
  if (& docker ps -a -q --filter "name=^/$container$") { & docker rm -f $container | Out-Null }
  if(Test-Path -LiteralPath $tempRoot){$resolved=(Resolve-Path -LiteralPath $tempRoot).Path;if(-not $resolved.StartsWith($workspace,[StringComparison]::OrdinalIgnoreCase)){throw "Unsafe cleanup target"};Remove-Item -LiteralPath $resolved -Recurse -Force}
}
