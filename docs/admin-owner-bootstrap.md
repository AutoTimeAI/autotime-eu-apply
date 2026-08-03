# Owner bootstrap

This procedure is manual and review-only. Never use email matching and never commit a real identity. Applying migrations and granting an owner require separate approval.

## 1. Verify the account outside the mutation transaction

Replace the placeholder with one exact authenticated Supabase UUID and run only this read query:

```sql
select id, email, created_at, last_sign_in_at
from auth.users
where id = '<REVIEWED_AUTH_USER_UUID>'::uuid;
```

Stop unless exactly one row is returned and a second operator confirms that the limited account information is the intended account. A nonexistent or malformed UUID must not be substituted with an email query.

Check for a conflict:

```sql
select user_id, role, status, created_at
from public.admin_memberships
where user_id = '<REVIEWED_AUTH_USER_UUID>'::uuid;
```

Stop if any row exists. Review it instead of overwriting it.

## 2. Bootstrap atomically

After human confirmation, run the following as a controlled database administrator. Every unexpected count raises an exception and rolls back both inserts.

```sql
begin;
create temporary table bootstrap_target(user_id uuid primary key) on commit drop;
insert into bootstrap_target values ('<REVIEWED_AUTH_USER_UUID>'::uuid);

do $bootstrap$
declare v_target uuid; v_count integer;
begin
  select user_id into strict v_target from bootstrap_target;
  select count(*) into v_count from auth.users where id = v_target;
  if v_count <> 1 then raise exception 'bootstrap requires exactly one auth user'; end if;
  select count(*) into v_count from public.admin_memberships where user_id = v_target;
  if v_count <> 0 then raise exception 'bootstrap membership conflict'; end if;

  insert into public.admin_memberships(user_id, role, status, created_by)
  values (v_target, 'owner', 'active', null);
  if not found then raise exception 'owner membership was not inserted'; end if;

  insert into public.admin_audit_events(actor_user_id, action, target_type, target_id, metadata)
  values (v_target, 'admin_owner_bootstrapped', 'admin_membership', v_target::text,
    jsonb_build_object('method', 'controlled_sql'));

  select count(*) into v_count from public.admin_memberships
    where user_id = v_target and role = 'owner' and status = 'active';
  if v_count <> 1 then raise exception 'bootstrap verification failed'; end if;
end
$bootstrap$;
commit;
```

Verify with an exact UUID query. This must return one row and one corresponding audit record:

```sql
select user_id, role, status from public.admin_memberships
where user_id = '<REVIEWED_AUTH_USER_UUID>'::uuid;
select actor_user_id, action, target_type, created_at from public.admin_audit_events
where actor_user_id = '<REVIEWED_AUTH_USER_UUID>'::uuid
  and action = 'admin_owner_bootstrapped';
```

Membership is checked on every protected request. Signing out and back in is optional verification, not required for a suspension or downgrade to take effect.

## Narrow recovery for an incorrect UUID

Confirm the exact incorrect UUID independently. This suspends only that membership and records recovery atomically; it does not delete history.

```sql
begin;
update public.admin_memberships set status='suspended', updated_at=now()
where user_id='<EXACT_INCORRECT_UUID>'::uuid and role='owner' and status='active';
do $check$ begin if (select count(*) from public.admin_memberships where user_id='<EXACT_INCORRECT_UUID>'::uuid and status='suspended') <> 1 then raise exception 'recovery target mismatch'; end if; end $check$;
insert into public.admin_audit_events(actor_user_id, action, target_type, target_id, metadata)
values ('<RECOVERY_OPERATOR_UUID>'::uuid, 'admin_owner_recovery_suspended', 'admin_membership', '<EXACT_INCORRECT_UUID>', jsonb_build_object('reason','incorrect bootstrap UUID'));
commit;
```

If the UUID does not exist or a membership conflicts, stop and investigate. Never broaden the `where` clause and never select or update by email alone.
