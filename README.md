# Mentor Calendar

A Next.js App Router app for students to plan and log study time, with mentor oversight.

**Stack:** Next.js 16.2.9 (App Router) · React 19 · TypeScript strict · Tailwind v4 · shadcn/ui (base-ui) · Supabase (`@supabase/ssr`) · FullCalendar 6 · recharts · rrule

---

## Environment variables

Create `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://etsaihssgoyexbzprrdo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_fB82cITZOE4OhzvFTne6pw_pT3KOMD6
```

For **Vercel**: add these two variables in Settings → Environment Variables (Production + Preview + Development).

> ⚠️ Never add a service-role key to the frontend. RLS enforces all security at the DB layer.

---

## Local development

```bash
bun install
bun run dev      # → http://localhost:3000
```

### Regenerate TypeScript DB types (after Supabase schema changes)

```bash
npx supabase gen types typescript --project-id etsaihssgoyexbzprrdo > lib/database.types.ts
```

---

## Vercel deploy

1. Push to GitHub, import the project in Vercel.
2. Framework preset: **Next.js** (auto-detected).
3. Add env vars above.
4. Build command: `bun run build` (or leave as `next build`).
5. Deploy.

---

## Seeding dev data

The DB trigger auto-creates a `profiles` row on signup. For compare/stats to show meaningful data you need a mentor, students, categories, events, and time logs.

### Step 1 — Create users in the Supabase Auth dashboard

Go to **Authentication → Users → Add user** and create three users.  
Set the **User metadata** JSON field on each:

| Email | User metadata |
|---|---|
| `mentor@example.com` | `{"role": "mentor", "full_name": "Alice Mentor"}` |
| `student1@example.com` | `{"role": "student", "full_name": "Bob Student"}` |
| `student2@example.com` | `{"role": "student", "full_name": "Carol Student"}` |

The trigger populates `public.profiles` automatically.

### Step 2 — Run seed SQL in Settings → SQL Editor

Replace the three UUID placeholders with the real UUIDs from Authentication → Users.

```sql
DO $$
DECLARE
  mentor_id   uuid := '<MENTOR_UUID>';
  student1_id uuid := '<STUDENT1_UUID>';
  student2_id uuid := '<STUDENT2_UUID>';

  cat1_id uuid := gen_random_uuid();
  cat2_id uuid := gen_random_uuid();
  ev1_id  uuid := gen_random_uuid();
  ev2_id  uuid := gen_random_uuid();
  ev3_id  uuid := gen_random_uuid();
BEGIN

-- Categories (student1 owns them)
INSERT INTO public.categories (id, owner_id, name, kind, color) VALUES
  (cat1_id, student1_id, 'Algorithms',  'course',  '#3b82f6'),
  (cat2_id, student1_id, 'Thesis',      'project', '#8b5cf6');

-- Mentorships
INSERT INTO public.mentorships (mentor_id, student_id) VALUES
  (mentor_id, student1_id),
  (mentor_id, student2_id);

-- Recurring weekly lecture (Monday 10:00 UTC)
INSERT INTO public.events
  (id, student_id, created_by, category_id, title, event_type,
   start_at, end_at, is_recurring, rrule, recurrence_until)
VALUES
  (ev1_id, student1_id, student1_id, cat1_id,
   'Algorithms Lecture', 'lecture',
   '2026-06-01T10:00:00Z', '2026-06-01T12:00:00Z',
   true, 'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO', '2026-08-31T23:59:59Z');

-- One-off study session
INSERT INTO public.events
  (id, student_id, created_by, category_id, title, event_type,
   start_at, end_at, is_recurring)
VALUES
  (ev2_id, student1_id, student1_id, cat2_id,
   'Thesis writing', 'study',
   '2026-06-25T14:00:00Z', '2026-06-25T17:00:00Z',
   false);

-- Deadline (no end_at needed)
INSERT INTO public.events
  (id, student_id, created_by, category_id, title, event_type,
   start_at, is_recurring)
VALUES
  (ev3_id, student1_id, student1_id, cat2_id,
   'Thesis chapter 1 due', 'deadline',
   '2026-07-15T23:59:59Z', false);

-- Time logs
INSERT INTO public.time_logs
  (student_id, event_id, occurrence_start, category_id, title,
   event_type, actual_start, actual_end, actual_minutes, logged_at)
VALUES
  -- Matched: Mon 2026-06-01 lecture
  (student1_id, ev1_id, '2026-06-01T10:00:00Z', cat1_id,
   'Algorithms Lecture', 'lecture',
   '2026-06-01T10:05:00Z', '2026-06-01T11:55:00Z', 110,
   '2026-06-01T12:00:00Z'),

  -- Matched: Mon 2026-06-15
  (student1_id, ev1_id, '2026-06-15T10:00:00Z', cat1_id,
   'Algorithms Lecture', 'lecture',
   '2026-06-15T10:00:00Z', '2026-06-15T12:00:00Z', 120,
   '2026-06-15T12:05:00Z'),

  -- Unplanned log (event_id = null)
  (student1_id, null, null, cat2_id,
   'Extra thesis research', 'study',
   '2026-06-20T09:00:00Z', '2026-06-20T11:30:00Z', 150,
   '2026-06-20T11:35:00Z'),

  -- Matched: thesis session
  (student1_id, ev2_id, '2026-06-25T14:00:00Z', cat2_id,
   'Thesis writing', 'study',
   '2026-06-25T14:10:00Z', '2026-06-25T16:45:00Z', 155,
   '2026-06-25T17:00:00Z');

END $$;
```

After running, sign in as `student1@example.com`, navigate to `/compare` (week 2026-06-15 → 2026-06-30) or `/stats` to see data.

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
proxy.ts                   ← Next.js 16 proxy (session refresh + route guard)
lib/
  database.types.ts        ← generated Supabase types
  supabase/{client,server,proxy}.ts
  recurrence.ts            ← expandOccurrences()
  stats.ts                 ← computeStats() aggregation
  format.ts                ← date/duration/color helpers
  queries/                 ← typed Supabase query helpers
app/
  (auth)/                  ← /login, /signup, /onboarding
  (app)/                   ← authenticated shell + all app routes
  api/generate-plan/       ← route handler proxying the edge function
components/
  app-nav.tsx
  calendar/                ← CalendarView, EventModal, LogModal, RecurrenceBuilder
  ui/                      ← shadcn/ui components
```
