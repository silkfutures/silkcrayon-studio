# Credit email logging and shared OS polish

Apply after v20.12.11. Copy these files into the existing repository, preserving paths, then redeploy. No new SQL migration or environment variable is required; the v20.12.11 credit migration must already be installed.

## Naomi's existing credit

Do not import the voucher again. Open Artists → Naomi → Import existing credit → Resend latest voucher email. Confirm the displayed recipient. This action only emails information about her latest imported voucher; it never writes another credit entry. The attempt appears under Studio credit · email in Automations.

The previous release called the email provider without logging. A missing historical log does not establish that the email was not sent. This patch cannot establish historical delivery. Sent means provider acceptance, not inbox delivery. No emails have been sent from this workspace.

Imports now preserve a successful credit result even when email sending fails, and show the email outcome explicitly. Every new voucher email attempt is logged, including deliberate resends. No email is attempted if creation of its log fails.

The old form's fixed £300 / 6-hour defaults are removed. Confirm unused value and original terms before converting any legacy voucher to hours; £300 equals six hours only at an agreed £50/hour conversion.

## Shared design corrections

- Back control moved into document flow with safe-area spacing, addressing the overlap in the supplied phone screenshot.
- Admin-only readable form labels, 16px inputs and visible keyboard focus.
- Touch targets, wrapping action groups, long email addresses and feedback messages.
- Table scrolling kept within its container; automation journey wraps.
- Mobile calendar action wrapping and more legible month entries.
- Bottom content spacing accounts for device safe area.
- Automations clarifies provider acceptance and displays failure details.

The existing public website styling is unchanged. This is a source-based shared-layout review, not an authenticated live visual audit of every OS screen. No live Supabase, Resend or inbox access was available for verification. Historical send status remains unknown.
