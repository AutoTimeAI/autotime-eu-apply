# Staging Seed Data

Use seeded staging data to verify the product without touching production.

## Accounts

Create test users in the development or staging Supabase project:

| User | Purpose | Plan |
|---|---|---|
| `free-user@example.com` | Free plan gating | Free |
| `pro-user@example.com` | Cloud sync, AI, billing portal | Pro |
| `past-due-user@example.com` | Billing failure handling | Past due |

## Supabase Rows

Seed only non-sensitive fake data:

- One complete candidate profile.
- One incomplete candidate profile.
- Five saved/synced application-like records when application sync exists.
- AI usage rows for the current month.
- Subscription rows for free, pro, and past-due states.

## Stripe Test Mode

Use Stripe test mode only:

- Monthly test price ID.
- Annual test price ID.
- Test customer for `pro-user@example.com`.
- Test subscription with `user_id` metadata set to the Supabase user id.

## Smoke Checks

Run these checks after seeding:

1. Free user cannot sync profile.
2. Pro user can sync profile.
3. Past-due user is treated as non-Pro for paid feature gates.
4. Stripe test webhook updates the matching subscription row.
5. Billing portal opens only when a Stripe customer exists.
