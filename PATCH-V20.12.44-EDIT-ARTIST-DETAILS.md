# v20.12.44 — Edit artist details from the Artists profile

**Where:** Artists → open an artist → **Details → Edit details** (owner only).

**What you can edit:**
- Full name, artist name, email, phone
- Instagram/social, genre, postcode, area
- Goals/notes

**Behaviour:**
- Changing the email asks you to confirm first. The new address becomes the artist's My Studio sign-in and where booking emails go.
- An email that already belongs to another artist is rejected, with that artist's name shown, so records never get merged by accident.
- The linked CRM contact (name, email, phone) updates too. Bookings show the new details straight away.

**Install:**
- Copy the 3 files over your project and deploy.
- No SQL is needed.
- This patch is independent of the engineer offers/payouts patch.
