# Silkcrayon OS — navigation & organisation redesign

## Scope
This is a **UI-only patch** designed to merge safely with newer mix-engineer and payment patches. It changes navigation, the Workspace menu, owner quick links, and responsive spacing. It does not replace Stripe, Supabase, mix management, or booking implementation files.

## Install
Copy the `app`, `components`, and `lib` folders into the matching locations in the *latest* GitHub repository. Keep all other files. No migration required. Deploy to a Vercel preview and inspect owner and engineer roles.

## What changed
- Owner navigation: Today, Bookings, Mixes, Clients, Money, Menu.
- Engineer navigation: Menu, Today, Calendar, Mixes, Book.
- Workspace menu grouped by Daily operations, People & team, Finance, and Growth & system.
- Owner overview gains quick shortcuts to common work.
- Consistent dark panels, spacing, focus/hover states, and more compact mobile treatment.
- All existing URLs and underlying workflows are retained. Current Calendar acts as Bookings hub; artist/customer directory is labelled Clients.

## Safety & testing
This is not a full screen-by-screen redesign and does not modify existing payment logic or job forms. Test mobile navigation against iPhone viewport and check engineer permission guards. If the Mixes engineer route isn't yet installed, install the engineer-mix workflow patch first or remove that navigation item.
