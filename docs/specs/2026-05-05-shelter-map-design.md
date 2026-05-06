# Austin Shelter Bed Map — Design Spec
**Date:** 2026-05-05
**Author:** hogri
**Status:** Approved

---

## Problem

Austin shelter bed availability is tracked via manual phone calls and spreadsheets. Outreach workers, case managers, and people seeking shelter have no way to see real-time availability across the city. Shelter staff waste time answering the same phone calls repeatedly.

## Solution

A free, public web app where:
- Shelter staff log in on their phone and tap a button to update available beds
- Anyone can view a live map of Austin shelters color-coded by availability
- Every update is logged, enabling trend analysis over time

---

## Users

| User | Goal | Device |
|------|------|--------|
| Shelter staff | Update bed count in <10 seconds | Phone |
| Outreach worker | Find beds for a client right now | Phone or laptop |
| Public / person in need | Find nearest shelter with space | Phone |
| Admin (you) | Onboard shelters, fix data | Laptop |

---

## Architecture

```
Shelter Staff (phone)
      │ magic-link login
      ▼
Update Page (/update)
      │ writes
      ▼
Supabase DB (Postgres + Auth + Realtime)
      │ realtime subscription
      ▼
Public Map (/) ◀── Outreach / Public
```

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS | Industry standard, free deploy on Vercel |
| Map | Leaflet.js + OpenStreetMap | Free, no API key required |
| Database + Auth | Supabase (free tier) | Postgres + realtime + magic-link auth built in |
| Hosting | Vercel | Free, one-click Next.js deploy |
| Domain | austinshelters.org (Cloudflare) | ~$10/yr |

**Total monthly cost: $0** (domain is $10/yr one-time)

---

## Data Model

```sql
-- Shelters registered in the system
shelters (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  address      text NOT NULL,
  lat          float NOT NULL,
  lng          float NOT NULL,
  total_beds   int NOT NULL,
  bed_types    jsonb,        -- { men: 50, women: 30, family: 10 }
  phone        text,
  contact_email text,
  created_at   timestamptz DEFAULT now()
)

-- Append-only log of every bed count update
bed_counts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shelter_id     uuid REFERENCES shelters(id),
  available_beds int NOT NULL,
  available_by_type jsonb,  -- { men: 12, women: 5, family: 0 }
  notes          text,      -- optional staff note
  updated_at     timestamptz DEFAULT now(),
  updated_by     uuid REFERENCES auth.users(id)
)

-- Maps Supabase auth users to shelters + roles
profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id),
  shelter_id  uuid REFERENCES shelters(id),
  role        text CHECK (role IN ('staff', 'admin')),
  full_name   text
)
```

Map reads a view `shelter_latest` = most recent `bed_counts` row per shelter (via `DISTINCT ON`). All historical rows are preserved for trend analysis.

---

## Pages

### `/` — Public Map
- Leaflet map centered on Austin (30.2672° N, 97.7431° W)
- One marker per shelter, colored: green (>20% capacity), yellow (5-20%), red (<5% or full), gray (not updated in >4 hours)
- Click marker → popup: shelter name, address, available beds, last updated, phone
- Filter bar: All | Men | Women | Family
- No login required

### `/update` — Staff Update Page
- Protected: redirect to `/login` if not authenticated
- Shows staff member's shelter name prominently
- Large +/- buttons for total available beds
- Optional: per-category breakdown (men/women/family)
- Optional notes field ("lobby is full, overflow available")
- Submit → instant DB write → toast confirmation
- Shows last 5 updates made by this staff member

### `/login` — Magic Link Auth
- Email input only (no password)
- "Send me a login link" → Supabase sends email
- Link opens app, sets session cookie, redirects to `/update`

### `/about` — About Page
- What this is, who built it, partner organizations
- Disclaimer: data is self-reported, always call ahead
- GitHub link, contact email

---

## Key Behaviors

**Real-time updates:** Supabase Realtime subscription on the public map. When staff submits an update, the marker color changes within 1-2 seconds for all viewers — no page refresh needed.

**Stale data warning:** If a shelter hasn't updated in 4+ hours, its marker turns gray and a "⚠️ Last updated Xh ago" badge appears on the popup.

**Mobile-first:** The `/update` page is designed for a staff member standing at a front desk on a phone. Buttons are large (min 48px tap target), form is minimal.

**No passwords:** Magic link auth only. Shelter staff do not need to remember credentials.

---

## Out of Scope (v1)

- Native iOS/Android app
- Bed reservation / booking system
- HMIS integration
- Automated scraping / AI predictions
- Multi-language support (add in v2 once partners request it)
- SMS updates

---

## Build Plan (12 Weeks)

| Weeks | Milestone |
|-------|-----------|
| 1–2 | Next.js + Supabase setup, static map with hardcoded shelter data |
| 3–4 | Auth + staff update form working end-to-end |
| 5–6 | Real-time map updates from DB, marker color logic |
| 7 | Mobile polish, error states, stale-data warnings |
| 8 | Vercel deploy, domain, HTTPS |
| 9 | Onboard ECHO + 1 partner shelter (soft launch) |
| 10–11 | Iterate on partner feedback |
| 12 | Public launch, press outreach |

---

## Success Metrics (for college essays)

- Number of shelter partners using the system
- Number of bed count updates submitted
- Endorsement quote from ECHO or a partner shelter director
- Uptime %
- Press coverage (Austin Monitor, KUT, r/Austin)
