# Nail salon booking app (portfolio project)

An online appointment booking app for a small nail salon, built with **Next.js (App Router), TypeScript, Tailwind CSS and PostgreSQL (Neon)**.

> **Status: work in progress, not production-ready.** Email notifications, blocking time slots,
> a privacy notice and deployment are still missing (see [Limitations](#limitations-and-next-steps)).
> The public repository uses neutral demo data ("Demo Nail Studio"). Real salon data is supplied
> through environment variables and is not part of the repository.

The UI and the code identifiers/comments are in Hungarian, because the app is built for a Hungarian salon.

## What it does

**Guest side**
- Price list grouped into categories (gel polish, nail extensions, refills) with S / M / L variants and optional nail art
- Monthly calendar that marks each day with its number of free slots (full or closed days are disabled), followed by the **actually free start times** for the chosen service
- Booking form (name, phone, email, note, consent) with instant validation in the browser
- Confirmation screen

**Admin side** (`/admin`, password protected)
- Upcoming bookings grouped by day, plus the past 60 days
- Cancelling a booking (with confirmation); the slot becomes bookable again immediately

**Demo mode:** without a `DATABASE_URL` the app runs with generated sample bookings and does not save anything,
so it can be tried out without a database.

## How it works

```
Browser (React client component)
  │  1. picks service → day → free time (free slots computed from booked time ranges only, no personal data)
  │  2. validates the form instantly (same function as the server)
  ▼
Server Action  app/foglalas/actions.ts   ← treats all input as untrusted
  │  3. checks the shape of the request
  │  4. looks up service + price + duration on the server (the browser never sends the price)
  │  5. validates guest data again
  │  6. recomputes free slots from current bookings (past / too far ahead / closed / taken → rejected)
  ▼
PostgreSQL  db/schema.sql
     7. INSERT with parameters (no SQL injection)
     8. EXCLUDE USING gist (idoszak WITH &&) – two active bookings can never overlap,
        even if two guests submit at the same moment → error 23P01 → "this slot was just taken"
```

Key design decisions:

- **Double-booking protection lives in the database**, not only in application code. A booking is stored as a
  time range (`tstzrange`, `[)` = start included, end excluded), and an exclusion constraint forbids overlapping
  active ranges. A plain `UNIQUE` on the start time would not catch a 10:30 booking overlapping a 10:00–11:00 one.
  `npm run db:utkozes-proba` runs two concurrent transactions against the database to demonstrate this.
- **Free-slot calculation is a pure function** (`lib/idopontok.ts`): it takes opening hours, existing bookings,
  "now" and the service length, and returns start times in 30-minute steps. It is unit-tested and used in both the
  browser and the server.
- **Time zone:** "now" is always Europe/Budapest, regardless of the server or the visitor's time zone;
  the database stores `timestamptz`.
- **Least privilege:** the app connects with a restricted database role (`SELECT, INSERT, UPDATE`, no `DELETE`);
  cancelling sets a status instead of deleting the row.
- **Admin login:** only a salted **scrypt hash** of the password is stored in an environment variable. A successful
  login sets an **HMAC-signed, httpOnly, sameSite=lax** cookie that expires after 12 hours. Every admin page and
  Server Action checks the session again on the server. Comparisons use `timingSafeEqual`.
- **No secrets in the client:** database code is marked `server-only`, so the build fails if a client component
  imports it. Only booked *time ranges* are sent to the browser, never guest details.

## Project structure

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Landing page (services, opening hours, contact) |
| `app/foglalas/` | Booking page and the booking Server Action |
| `app/admin/` | Admin login, booking list, cancel/logout actions |
| `components/` | Calendar, booking flow, service picker, admin UI |
| `lib/idopontok.ts` | Free-slot calculation, date helpers, Budapest time |
| `lib/validacio.ts` | Guest data validation (shared by browser and server) |
| `lib/salon.ts` | Salon data, price list, nail art options (demo values) |
| `lib/adatbazis.ts` | PostgreSQL queries (server only) |
| `lib/auth.ts`, `lib/jelszo.ts` | Password hashing, signed session cookie |
| `db/schema.sql` | Table, overlap constraint, restricted role |
| `scripts/` | DB setup, connection check, concurrency test, admin password setup |

## Running locally

Requirements: Node.js (developed with Node 26; the scripts run `.ts` files directly with Node), npm.

```bash
npm install
npm run dev          # http://localhost:3000  (demo mode without a database)
```

Optional, with a PostgreSQL (Neon) database – copy `.env.example` to `.env.local` and follow its comments:

```bash
npm run db:setup         # creates the table and the restricted app role
npm run db:check         # checks the connection
npm run db:utkozes-proba # concurrent double-booking test
npm run admin:jelszo     # sets the admin password (stores only the hash)
```

Checks:

```bash
npm test        # 34 unit tests (node:test)
npm run lint
npm run build
```

## Tests

`npm test` runs 34 unit tests with Node's built-in test runner:

- **free slots** – closed days, past days, last bookable start time, overlap with existing bookings,
  minimum notice for today, Budapest winter/summer time, calendar month layout
- **validation** – name length, several phone formats, invalid email, note length, missing consent
- **password & session** – correct/wrong password, salted hashes, expired/forged/foreign-key sessions, garbage input
- **price list** – prices, nail art price ranges, unique IDs

The Server Actions, database queries and UI are not covered by automated tests yet. The database overlap
constraint has its own manual check script (`npm run db:utkozes-proba`), which needs a configured database.

## Limitations and next steps

- No email notifications yet (salon + guest confirmation)
- Admin cannot block time ranges or edit opening hours / services from the UI yet
- Privacy notice is not written yet (required before going live)
- Login brute-force protection is only a 1-second delay per wrong attempt – no real rate limiting
- Single shared admin password, single staff member
- Durations in the price list are estimates; address and phone number are placeholders
- Not deployed

## Built with AI assistance

This project was developed with an AI coding assistant (Claude Code). `CLAUDE.md` contains the project rules the
assistant followed (security rules, server-side validation, no secrets in Git).

---

## Magyar összefoglaló

Online időpontfoglaló egy kis körmösszalonnak (Next.js, TypeScript, Tailwind CSS, PostgreSQL/Neon).
A vendég kiválasztja a szolgáltatást, a naptárban a napot, majd csak a ténylegesen szabad időpontok közül választhat,
és megadja az adatait. A szerver minden adatot újra ellenőriz, az árat és az időtartamot maga számolja,
a dupla foglalást pedig az adatbázis akadályozza meg (átfedő időszakok tiltása, `EXCLUDE USING gist`), egyszerre
érkező foglalásoknál is. Jelszóval védett adminfelület: foglalások listája és lemondás.

**Állapot: fejlesztés alatt, nem élesítésre kész.** Hiányzik még az e-mail-értesítés, az időszakok letiltása,
az adatkezelési tájékoztató és az élesítés. A nyilvános repóban semleges demóadatok vannak; a valódi szalon adatai
környezeti változókból érkeznek, és nem részei a repónak.
