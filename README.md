# Silkcrayon Studio OS V4

V4 adds real Supabase Auth staff accounts and role-based Studio OS access on top of V3.

## Upgrade from V3

1. Run `supabase/v4-auth-roles.sql` once in Supabase SQL Editor.
2. Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel. Find it in Supabase → Project Settings → API / API Keys. This is the **anon/public** key, not the service-role secret.
3. Ensure `NEXT_PUBLIC_SUPABASE_URL` is present in Vercel.
4. Deploy V4.
5. Visit `/admin/setup` once and use your existing `ADMIN_USERNAME` + `ADMIN_PASSWORD` to create your owner account.
6. Log in at `/admin/login` with the new owner email/password.
7. Open `/admin/staff` to create engineer accounts.

Keep the legacy ADMIN_USERNAME / ADMIN_PASSWORD until the owner bootstrap succeeds. After an owner exists, `/api/auth/bootstrap` refuses to create another first owner.

## Permissions

### Owner
- `/admin` studio/revenue dashboard
- Customers and customer profiles
- Engineer assignment
- Blockouts
- Staff account creation/deactivation
- All session reports

### Engineer
- `/admin/sessions`
- Only bookings assigned to their own account
- Only their own session-report history
- Cannot access revenue/customer/staff administration

## Assignment workflow

An owner assigns the engineer from the Upcoming Sessions table. The booking stores both the auth user ID and display name. When an engineer logs in, their Sessions page only loads bookings assigned to that user ID.

## Important

The Supabase service-role/secret key remains server-only. The anon/public key is intentionally exposed to the browser solely for Supabase authentication.
