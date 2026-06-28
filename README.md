# Calendar App

A personal calendar + study-tracking app with **calendar sharing**. Every user owns their own calendar and can invite collaborators (viewer or editor) to it.

**Stack:** Next.js 16.2.9 (App Router) · React 19 · TypeScript strict · Tailwind v4 · shadcn/ui (base-ui) · Supabase (`@supabase/ssr`) · FullCalendar 6 · recharts · rrule

---

## Environment variables

Create `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://etsaihssgoyexbzprrdo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_fB82cITZOE4OhzvFTne6pw_pT3KOMD6
```

For **Vercel**: Settings → Environment Variables → add both for Production + Preview + Development.

> ⚠️ Never add a service-role key to the frontend. RLS enforces all security.

### Supabase Auth redirect URL

In your Supabase project: **Authentication → URL Configuration**, add your site URL:

```
https://your-app.vercel.app
https://*.vercel.app   (optional, for preview deployments)
```

---

## Local development

```bash
bun install
bun run dev      # → http://localhost:3000
```

### Regenerate TypeScript DB types (after schema changes)

```bash
npx supabase gen types typescript --project-id etsaihssgoyexbzprrdo > lib/database.types.ts
```

---

## Vercel deploy

1. Push to GitHub, import the project in Vercel.
2. Framework preset: **Next.js** (auto-detected).
3. Add env vars above.
4. Build command: `bun run build` (or leave default `next build`).
5. Add your production URL to Supabase Auth → URL Configuration.
6. Deploy.

---

## Features

| Route | Description |
|---|---|
| `/calendar` | FullCalendar (month/week/day/list), event CRUD, recurrence, log actuals |
| `/compare` | Planned vs. actual for a date range |
| `/stats` | recharts: hours by category/type, over time, adherence % |
| `/sharing` | Invite collaborators to **your** calendar (viewer or editor) |
| `/invitations` | Accept/decline calendars shared with you |
| `/plan/generate` | AI-proposed weekly plan (edge function), accept/edit/discard |
| `/settings/categories` | Create/edit/delete categories with kind + color |

**Calendar switcher** (header) — browse "My calendar" or any accepted shared calendar. Viewer access: read-only (mutating controls hidden + RLS-enforced). Editor access: full CRUD.

---

## Seeding dev data

The DB trigger auto-creates a `profiles` row on signup.

### Step 1 — Create two users in the Supabase Auth dashboard

Go to **Authentication → Users → Add user** and create:

| Email | User metadata JSON |
|---|---|
| `alice@example.com` | `{"full_name": "Alice"}` |
| `bob@example.com` | `{"full_name": "Bob"}` |

Set any password for both. The trigger creates `profiles` rows automatically.

### Step 2 — Run seed SQL in SQL Editor

Replace the two UUID placeholders with the real UUIDs from Authentication → Users.

```sql
DO $$
DECLARE
  alice_id uuid := '<ALICE_UUID>';
  bob_id   uuid := '<BOB_UUID>';

  cat1_id uuid := gen_random_uuid();
  cat2_id uuid := gen_random_uuid();
  ev1_id  uuid := gen_random_uuid();
  ev2_id  uuid := gen_random_uuid();
  ev3_id  uuid := gen_random_uuid();
BEGIN

-- Categories (owned by Alice)
INSERT INTO public.categories (id, owner_id, name, kind, color) VALUES
  (cat1_id, alice_id, 'Algorithms',  'course',  '#3b82f6'),
  (cat2_id, alice_id, 'Thesis',      'project', '#8b5cf6');

-- Recurring weekly lecture on Monday 10:00 UTC (Alice's calendar)
INSERT INTO public.events
  (id, owner_id, created_by, category_id, title, event_type,
   start_at, end_at, is_recurring, rrule, recurrence_until)
VALUES
  (ev1_id, alice_id, alice_id, cat1_id,
   'Algorithms Lecture', 'lecture',
   '2026-06-01T10:00:00Z', '2026-06-01T12:00:00Z',
   true, 'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO', '2026-08-31T23:59:59Z');

-- One-off study session
INSERT INTO public.events
  (id, owner_id, created_by, category_id, title, event_type,
   start_at, end_at, is_recurring)
VALUES
  (ev2_id, alice_id, alice_id, cat2_id,
   'Thesis writing', 'study',
   '2026-06-25T14:00:00Z', '2026-06-25T17:00:00Z', false);

-- Deadline
INSERT INTO public.events
  (id, owner_id, created_by, category_id, title, event_type,
   start_at, is_recurring)
VALUES
  (ev3_id, alice_id, alice_id, cat2_id,
   'Thesis chapter 1 due', 'deadline',
   '2026-07-15T23:59:59Z', false);

-- Time logs (Alice)
INSERT INTO public.time_logs
  (owner_id, event_id, occurrence_start, category_id, title,
   event_type, actual_start, actual_end, actual_minutes, logged_at)
VALUES
  (alice_id, ev1_id, '2026-06-01T10:00:00Z', cat1_id,
   'Algorithms Lecture', 'lecture',
   '2026-06-01T10:05:00Z', '2026-06-01T11:55:00Z', 110,
   '2026-06-01T12:00:00Z'),

  (alice_id, ev1_id, '2026-06-15T10:00:00Z', cat1_id,
   'Algorithms Lecture', 'lecture',
   '2026-06-15T10:00:00Z', '2026-06-15T12:00:00Z', 120,
   '2026-06-15T12:05:00Z'),

  -- Unplanned log (event_id = null)
  (alice_id, null, null, cat2_id,
   'Extra thesis research', 'study',
   '2026-06-20T09:00:00Z', '2026-06-20T11:30:00Z', 150,
   '2026-06-20T11:35:00Z'),

  (alice_id, ev2_id, '2026-06-25T14:00:00Z', cat2_id,
   'Thesis writing', 'study',
   '2026-06-25T14:10:00Z', '2026-06-25T16:45:00Z', 155,
   '2026-06-25T17:00:00Z');

-- Accepted editor share: Bob can edit Alice's calendar
INSERT INTO public.calendar_shares
  (owner_id, invitee_email, collaborator_id, permission, status)
VALUES
  (alice_id, 'bob@example.com', bob_id, 'editor', 'accepted');

END $$;
```

After running:
- Sign in as `alice@example.com` → see calendar events, run `/compare` for 2026-06-01 → 2026-06-30, check `/stats`.
- Sign in as `bob@example.com` → `/invitations` shows Alice's share (already accepted); calendar switcher lists Alice's calendar; as editor Bob can add events.
- To test viewer flow: change the share `permission` to `'viewer'` in the SQL editor and reload — mutating controls disappear and RLS rejects writes.

---

## Notable Next.js 16 breaking changes

| Old (≤15) | New (v16) |
|---|---|
| `middleware.ts` | `proxy.ts` at root; export `proxy()` |
| `cookies()` sync | `await cookies()` |
| `params` is plain object | `params` is `Promise<{}>` — must `await` |
| Middleware on Edge runtime | Proxy defaults to Node.js runtime |
| `error.js` `reset` prop | `unstable_retry` prop |
| shadcn with `@radix-ui` | shadcn 2.x uses `@base-ui/react` — no `asChild`, use `render` prop |

---

## Project structure

```
proxy.ts                         ← Next.js 16 proxy (session refresh + route guard)
lib/
  database.types.ts              ← generated Supabase types + convenience aliases
  active-calendar.ts             ← getActiveCalendar() — active ownerId + canEdit + switcher list
  supabase/{client,server,proxy}.ts
  recurrence.ts                  ← expandOccurrences()
  stats.ts                       ← computeStats() aggregation
  format.ts                      ← date/duration/color helpers
  queries/
    events.ts  time-logs.ts  profiles.ts  calendar-shares.ts
app/
  (auth)/                        ← /login, /signup, /onboarding
  (app)/                         ← authenticated shell (layout loads active calendar)
    calendar/  compare/  stats/
    sharing/   invitations/
    plan/generate/
    settings/categories/
  api/generate-plan/             ← route handler proxying the edge function
components/
  app-nav.tsx                    ← nav (pending-invite badge)
  calendar-switcher.tsx          ← header dropdown; calls setActiveCalendarAction
  calendar/                      ← CalendarView, EventModal, LogModal, RecurrenceBuilder
  ui/                            ← shadcn/ui components
```
