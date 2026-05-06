# Austin Shelter Bed Map — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a free public web app where Austin shelter staff tap one button to update bed counts and anyone can see real-time availability on a map.

**Architecture:** Next.js 14 App Router handles all pages. Supabase provides the database, auth, and real-time subscriptions. Leaflet.js renders the map on the client using OpenStreetMap tiles. No backend server needed — all DB calls go through the Supabase client library directly from the browser.

**Tech Stack:** Next.js 14, Tailwind CSS, Supabase (Postgres + Auth + Realtime), Leaflet.js, Vercel (hosting)

---

## File Map

```
austin-shelter-map/
├── app/
│   ├── layout.tsx               ← root layout, fonts, global styles
│   ├── page.tsx                 ← public map page (/)
│   ├── login/
│   │   └── page.tsx             ← magic link login (/login)
│   ├── update/
│   │   └── page.tsx             ← staff update page (/update)
│   ├── about/
│   │   └── page.tsx             ← about page (/about)
│   └── auth/
│       └── callback/
│           └── route.ts         ← Supabase auth callback handler
├── components/
│   ├── Map.tsx                  ← Leaflet map (client component)
│   ├── ShelterMarker.tsx        ← individual marker + popup logic
│   ├── FilterBar.tsx            ← All/Men/Women/Family filter buttons
│   ├── UpdateForm.tsx           ← +/- bed count form for staff
│   └── Toast.tsx                ← success/error notification
├── lib/
│   ├── supabase/
│   │   ├── client.ts            ← browser Supabase client (singleton)
│   │   └── server.ts            ← server Supabase client (for SSR)
│   ├── types.ts                 ← TypeScript types for Shelter, BedCount, Profile
│   └── utils.ts                 ← getMarkerColor(), formatTimeAgo(), isStale()
├── supabase/
│   └── migrations/
│       └── 001_initial.sql      ← all DB tables, view, RLS policies
├── .env.local                   ← SUPABASE_URL, SUPABASE_ANON_KEY (never commit)
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`, `next.config.js`, `tailwind.config.ts`, `app/layout.tsx`, `.env.local`

- [ ] **Step 1: Scaffold Next.js app**

Open a terminal in `C:\Users\hogri\OneDrive\Desktop\austin-shelter-map` and run:

```bash
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir no --import-alias "@/*"
```

When prompted: answer **Yes** to TypeScript, **Yes** to Tailwind, **Yes** to App Router. Answer **No** to `src/` directory.

Expected output: files created, `npm install` runs automatically.

- [ ] **Step 2: Install additional dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr leaflet react-leaflet
npm install --save-dev @types/leaflet
```

Expected: packages added to `node_modules/`, no errors.

- [ ] **Step 3: Create `.env.local`**

Create file `austin-shelter-map/.env.local` with this content (you'll fill in real values in Task 2):

```
NEXT_PUBLIC_SUPABASE_URL=placeholder
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
```

- [ ] **Step 4: Verify dev server starts**

```bash
npm run dev
```

Open `http://localhost:3000` in your browser. You should see the default Next.js welcome page. Press `Ctrl+C` to stop.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js app with Tailwind and Supabase deps"
```

---

## Task 2: Supabase Project Setup

**Files:**
- Create: `supabase/migrations/001_initial.sql`
- Modify: `.env.local`

- [ ] **Step 1: Create a Supabase account and project**

1. Go to `https://supabase.com` and sign up for a free account
2. Click "New Project"
3. Name it `austin-shelter-map`
4. Choose a strong database password (save it somewhere)
5. Region: US East (closest to Austin)
6. Wait ~2 minutes for the project to spin up

- [ ] **Step 2: Get your API keys**

In your Supabase project dashboard:
1. Click "Project Settings" (gear icon, bottom left)
2. Click "API"
3. Copy "Project URL" → paste as `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
4. Copy "anon public" key → paste as `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`

Your `.env.local` should now look like:
```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- [ ] **Step 3: Create the database schema**

Create file `supabase/migrations/001_initial.sql`:

```sql
-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Shelters table
create table shelters (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  address       text not null,
  lat           float not null,
  lng           float not null,
  total_beds    int not null,
  bed_types     jsonb default '{"men": 0, "women": 0, "family": 0}'::jsonb,
  phone         text,
  contact_email text,
  created_at    timestamptz default now()
);

-- Bed counts (append-only log)
create table bed_counts (
  id                 uuid primary key default gen_random_uuid(),
  shelter_id         uuid references shelters(id) not null,
  available_beds     int not null,
  available_by_type  jsonb default '{}'::jsonb,
  notes              text,
  updated_at         timestamptz default now(),
  updated_by         uuid references auth.users(id)
);

-- User profiles
create table profiles (
  id          uuid primary key references auth.users(id),
  shelter_id  uuid references shelters(id),
  role        text check (role in ('staff', 'admin')),
  full_name   text
);

-- View: latest bed count per shelter
create view shelter_latest as
select distinct on (s.id)
  s.id,
  s.name,
  s.address,
  s.lat,
  s.lng,
  s.total_beds,
  s.bed_types,
  s.phone,
  bc.available_beds,
  bc.available_by_type,
  bc.notes,
  bc.updated_at
from shelters s
left join bed_counts bc on bc.shelter_id = s.id
order by s.id, bc.updated_at desc;

-- Seed 3 real Austin shelters for testing
insert into shelters (name, address, lat, lng, total_beds, bed_types, phone) values
  ('ARCH (Austin Resource Center for the Homeless)', '500 E 7th St, Austin, TX 78701', 30.2643, -97.7358, 200, '{"men": 150, "women": 50, "family": 0}', '512-305-4100'),
  ('Salvation Army Austin', '501 E 8th St, Austin, TX 78701', 30.2653, -97.7355, 100, '{"men": 60, "women": 30, "family": 10}', '512-476-1111'),
  ('Caritas of Austin', '611 Neches St, Austin, TX 78701', 30.2689, -97.7393, 75, '{"men": 40, "women": 25, "family": 10}', '512-472-4135');

-- Row Level Security: public can read shelters and shelter_latest
alter table shelters enable row level security;
alter table bed_counts enable row level security;
alter table profiles enable row level security;

create policy "Public read shelters" on shelters for select using (true);
create policy "Public read bed_counts" on bed_counts for select using (true);
create policy "Staff insert bed_counts" on bed_counts for insert
  with check (auth.uid() = updated_by);
create policy "Users read own profile" on profiles for select
  using (auth.uid() = id);
```

- [ ] **Step 4: Run the SQL in Supabase**

1. In your Supabase dashboard, click "SQL Editor" (left sidebar)
2. Click "New query"
3. Paste the entire SQL from `001_initial.sql`
4. Click "Run"

Expected: green "Success" message. No red errors.

- [ ] **Step 5: Verify tables exist**

In Supabase dashboard, click "Table Editor". You should see: `shelters`, `bed_counts`, `profiles`. Click `shelters` — you should see 3 rows (the Austin shelters we seeded).

- [ ] **Step 6: Enable Realtime on bed_counts**

In Supabase dashboard:
1. Click "Database" → "Replication"
2. Find `bed_counts` in the list
3. Toggle it ON

- [ ] **Step 7: Commit**

```bash
git add supabase/ .env.local
git commit -m "feat: add database schema and seed data"
```

Note: `.env.local` is listed in `.gitignore` by default — that's correct. Your API keys should never be committed to git.

---

## Task 3: TypeScript Types and Utilities

**Files:**
- Create: `lib/types.ts`, `lib/utils.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts`

- [ ] **Step 1: Create TypeScript types**

Create `lib/types.ts`:

```typescript
export type Shelter = {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  total_beds: number
  bed_types: { men: number; women: number; family: number }
  phone: string | null
  available_beds: number | null
  available_by_type: { men: number; women: number; family: number } | null
  notes: string | null
  updated_at: string | null
}

export type BedCount = {
  id: string
  shelter_id: string
  available_beds: number
  available_by_type: { men: number; women: number; family: number }
  notes: string | null
  updated_at: string
  updated_by: string
}

export type Profile = {
  id: string
  shelter_id: string | null
  role: 'staff' | 'admin'
  full_name: string | null
}

export type FilterType = 'all' | 'men' | 'women' | 'family'
```

- [ ] **Step 2: Create utility functions**

Create `lib/utils.ts`:

```typescript
import type { Shelter } from './types'

// Returns Leaflet marker color based on availability percentage
export function getMarkerColor(shelter: Shelter): 'green' | 'yellow' | 'red' | 'gray' {
  if (isStale(shelter)) return 'gray'
  if (shelter.available_beds === null) return 'gray'
  if (shelter.total_beds === 0) return 'gray'

  const pct = shelter.available_beds / shelter.total_beds
  if (pct > 0.2) return 'green'
  if (pct > 0.05) return 'yellow'
  return 'red'
}

// Returns true if shelter hasn't been updated in 4+ hours
export function isStale(shelter: Shelter): boolean {
  if (!shelter.updated_at) return true
  const updatedAt = new Date(shelter.updated_at)
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000)
  return updatedAt < fourHoursAgo
}

// Returns human-readable "2 hours ago" string
export function formatTimeAgo(isoString: string | null): string {
  if (!isoString) return 'Never updated'
  const date = new Date(isoString)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// Returns available beds for a specific filter type
export function getAvailableForType(
  shelter: Shelter,
  filter: 'men' | 'women' | 'family'
): number {
  if (!shelter.available_by_type) return 0
  return shelter.available_by_type[filter] ?? 0
}
```

- [ ] **Step 3: Create Supabase browser client**

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 4: Create Supabase server client**

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component — safe to ignore
          }
        },
      },
    }
  )
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors printed. If you see errors, check that all file paths match exactly.

- [ ] **Step 6: Commit**

```bash
git add lib/
git commit -m "feat: add types, utils, and Supabase clients"
```

---

## Task 4: Root Layout and Global Styles

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/globals.css`

- [ ] **Step 1: Update root layout**

Replace the contents of `app/layout.tsx` with:

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Austin Shelter Map',
  description: 'Real-time shelter bed availability across Austin, TX',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-white min-h-screen`}>
        <nav className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
          <a href="/" className="text-lg font-bold text-white">
            🏠 Austin Shelter Map
          </a>
          <div className="flex gap-4 text-sm text-gray-300">
            <a href="/" className="hover:text-white">Map</a>
            <a href="/about" className="hover:text-white">About</a>
            <a href="/login" className="hover:text-white">Staff Login</a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Update global CSS**

Replace the contents of `app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Leaflet CSS — required for the map to render correctly */
@import 'leaflet/dist/leaflet.css';

/* Make the map fill its container */
.leaflet-container {
  width: 100%;
  height: 100%;
}
```

- [ ] **Step 3: Verify dev server still works**

```bash
npm run dev
```

Open `http://localhost:3000`. You should see a dark navbar at the top with "Austin Shelter Map", and a dark background. No red errors in the terminal.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat: add root layout and global styles"
```

---

## Task 5: Shelter Map Component

**Files:**
- Create: `components/Map.tsx`, `components/ShelterMarker.tsx`, `components/FilterBar.tsx`

- [ ] **Step 1: Create the FilterBar component**

Create `components/FilterBar.tsx`:

```typescript
'use client'
import type { FilterType } from '@/lib/types'

const filters: { label: string; value: FilterType }[] = [
  { label: 'All Beds', value: 'all' },
  { label: 'Men', value: 'men' },
  { label: 'Women', value: 'women' },
  { label: 'Family', value: 'family' },
]

type Props = {
  active: FilterType
  onChange: (filter: FilterType) => void
}

export default function FilterBar({ active, onChange }: Props) {
  return (
    <div className="flex gap-2 p-3 bg-gray-900 border-b border-gray-800">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            active === f.value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create the Map component**

Create `components/Map.tsx`:

```typescript
'use client'
import { useEffect, useRef } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import type { Shelter, FilterType } from '@/lib/types'
import { getMarkerColor, isStale, formatTimeAgo, getAvailableForType } from '@/lib/utils'

// Marker colors as Leaflet icon SVGs
const COLORS = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  gray: '#6b7280',
}

type Props = {
  shelters: Shelter[]
  filter: FilterType
}

export default function Map({ shelters, filter }: Props) {
  const mapRef = useRef<LeafletMap | null>(null)
  const containerId = 'shelter-map'

  useEffect(() => {
    // Leaflet must run in the browser only
    if (typeof window === 'undefined') return

    const initMap = async () => {
      const L = (await import('leaflet')).default

      // Only create the map once
      if (!mapRef.current) {
        mapRef.current = L.map(containerId).setView([30.2672, -97.7431], 13)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(mapRef.current)
      }

      const map = mapRef.current

      // Remove existing markers
      map.eachLayer((layer) => {
        if ((layer as any)._isMarker) map.removeLayer(layer)
      })

      // Add a marker for each shelter
      shelters.forEach((shelter) => {
        const color = COLORS[getMarkerColor(shelter)]
        const stale = isStale(shelter)

        const available =
          filter === 'all'
            ? shelter.available_beds ?? 0
            : getAvailableForType(shelter, filter)

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width: 28px; height: 28px;
            background: ${color};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          "></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        })

        const marker = L.marker([shelter.lat, shelter.lng], { icon })
        ;(marker as any)._isMarker = true

        const timeText = stale
          ? `⚠️ ${formatTimeAgo(shelter.updated_at)} — may be outdated`
          : formatTimeAgo(shelter.updated_at)

        marker.bindPopup(`
          <div style="font-family: sans-serif; min-width: 180px;">
            <strong style="font-size: 14px;">${shelter.name}</strong><br/>
            <span style="color: #555; font-size: 12px;">${shelter.address}</span><br/>
            <br/>
            <span style="font-size: 20px; font-weight: bold; color: ${color};">
              ${available}
            </span>
            <span style="color: #555;"> beds available</span><br/>
            <span style="font-size: 11px; color: #888;">${timeText}</span><br/>
            ${shelter.phone ? `<br/><a href="tel:${shelter.phone}" style="color: #3b82f6;">${shelter.phone}</a>` : ''}
          </div>
        `)

        marker.addTo(map)
      })
    }

    initMap()
  }, [shelters, filter])

  return (
    <div id={containerId} style={{ width: '100%', height: '100%' }} />
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/
git commit -m "feat: add Map and FilterBar components"
```

---

## Task 6: Public Map Page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace the home page**

Replace the entire contents of `app/page.tsx` with:

```typescript
'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import FilterBar from '@/components/FilterBar'
import { createClient } from '@/lib/supabase/client'
import type { Shelter, FilterType } from '@/lib/types'

// Load map dynamically — Leaflet requires the browser, not the server
const Map = dynamic(() => import('@/components/Map'), { ssr: false })

export default function HomePage() {
  const [shelters, setShelters] = useState<Shelter[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Load initial data
    const loadShelters = async () => {
      const { data, error } = await supabase
        .from('shelter_latest')
        .select('*')

      if (error) {
        console.error('Error loading shelters:', error)
      } else {
        setShelters((data as Shelter[]) ?? [])
      }
      setLoading(false)
    }

    loadShelters()

    // Subscribe to real-time updates on bed_counts
    const channel = supabase
      .channel('bed_counts_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bed_counts' },
        () => {
          // Reload shelter_latest when any new bed count comes in
          loadShelters()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 57px)' }}>
      <FilterBar active={filter} onChange={setFilter} />

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          Loading shelters...
        </div>
      ) : (
        <div className="flex-1">
          <Map shelters={shelters} filter={filter} />
        </div>
      )}

      <div className="px-4 py-2 bg-gray-900 border-t border-gray-800 text-xs text-gray-500">
        Data is self-reported by partner shelters. Always call ahead to confirm availability.
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test the map in the browser**

```bash
npm run dev
```

Open `http://localhost:3000`. You should see:
- Dark navbar at top
- Filter buttons (All Beds, Men, Women, Family)
- A map of Austin with 3 colored markers (they'll be gray since no bed counts exist yet)
- Disclaimer text at bottom

Click a marker — a popup should appear with the shelter name and address.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add public map page with real-time subscription"
```

---

## Task 7: Auth Callback Route

**Files:**
- Create: `app/auth/callback/route.ts`

- [ ] **Step 1: Create the auth callback handler**

Create `app/auth/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/update`)
}
```

This route handles the magic link click — Supabase redirects here with a `code`, we exchange it for a session, then redirect to `/update`.

- [ ] **Step 2: Configure Supabase redirect URL**

In your Supabase dashboard:
1. Click "Authentication" → "URL Configuration"
2. Under "Redirect URLs", add: `http://localhost:3000/auth/callback`
3. Click Save

- [ ] **Step 3: Commit**

```bash
git add app/auth/
git commit -m "feat: add auth callback route for magic link login"
```

---

## Task 8: Login Page

**Files:**
- Create: `app/login/page.tsx`

- [ ] **Step 1: Create the login page**

Create `app/login/page.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">📧</div>
          <h1 className="text-xl font-bold mb-2">Check your email</h1>
          <p className="text-gray-400 text-sm">
            We sent a login link to <strong>{email}</strong>. Click it to sign in — no password needed.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full">
        <h1 className="text-2xl font-bold mb-1">Shelter Staff Login</h1>
        <p className="text-gray-400 text-sm mb-6">
          Enter your email. We'll send you a login link — no password needed.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-semibold transition-colors"
          >
            {loading ? 'Sending...' : 'Send login link'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test the login page**

```bash
npm run dev
```

Open `http://localhost:3000/login`. You should see a dark card with an email input and "Send login link" button. Enter your own email and click send — you should see "Check your email" confirmation.

Check your inbox. There should be an email from Supabase with a login link.

- [ ] **Step 3: Commit**

```bash
git add app/login/
git commit -m "feat: add magic link login page"
```

---

## Task 9: Staff Update Page

**Files:**
- Create: `app/update/page.tsx`, `components/UpdateForm.tsx`, `components/Toast.tsx`

- [ ] **Step 1: Create Toast component**

Create `components/Toast.tsx`:

```typescript
'use client'
import { useEffect } from 'react'

type Props = {
  message: string
  type: 'success' | 'error'
  onDismiss: () => void
}

export default function Toast({ message, type, onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-white font-medium shadow-xl z-50 ${
        type === 'success' ? 'bg-green-600' : 'bg-red-600'
      }`}
    >
      {message}
    </div>
  )
}
```

- [ ] **Step 2: Create UpdateForm component**

Create `components/UpdateForm.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Toast from './Toast'
import type { Shelter, BedCount } from '@/lib/types'

type Props = {
  shelter: Shelter
  userId: string
  recentUpdates: BedCount[]
  onUpdate: () => void
}

export default function UpdateForm({ shelter, userId, recentUpdates, onUpdate }: Props) {
  const [available, setAvailable] = useState(shelter.available_beds ?? 0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const change = (delta: number) => {
    setAvailable((v) => Math.max(0, Math.min(shelter.total_beds, v + delta)))
  }

  const handleSubmit = async () => {
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.from('bed_counts').insert({
      shelter_id: shelter.id,
      available_beds: available,
      notes: notes || null,
      updated_by: userId,
    })

    if (error) {
      setToast({ message: 'Error saving. Try again.', type: 'error' })
    } else {
      setToast({ message: '✓ Updated successfully!', type: 'success' })
      setNotes('')
      onUpdate()
    }
    setLoading(false)
  }

  return (
    <div className="max-w-sm mx-auto p-4">
      <h1 className="text-2xl font-bold mb-1">{shelter.name}</h1>
      <p className="text-gray-400 text-sm mb-6">{shelter.address}</p>

      {/* Big +/- counter */}
      <div className="bg-gray-900 rounded-2xl p-6 mb-4">
        <p className="text-gray-400 text-sm mb-4 text-center">Available beds right now</p>
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => change(-1)}
            className="w-16 h-16 rounded-full bg-gray-800 text-3xl font-bold hover:bg-gray-700 active:scale-95 transition-all"
          >
            −
          </button>
          <span className="text-6xl font-bold w-20 text-center">{available}</span>
          <button
            onClick={() => change(1)}
            className="w-16 h-16 rounded-full bg-gray-800 text-3xl font-bold hover:bg-gray-700 active:scale-95 transition-all"
          >
            +
          </button>
        </div>
        <p className="text-center text-gray-500 text-sm mt-3">of {shelter.total_beds} total beds</p>
      </div>

      {/* Notes */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional note (e.g. 'Lobby full, overflow available')"
        className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none text-sm mb-4"
        rows={2}
      />

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-bold text-lg transition-colors"
      >
        {loading ? 'Saving...' : 'Update Count'}
      </button>

      {/* Recent updates */}
      {recentUpdates.length > 0 && (
        <div className="mt-6">
          <p className="text-gray-500 text-xs mb-2">Recent updates</p>
          {recentUpdates.map((u) => (
            <div key={u.id} className="flex justify-between text-sm py-1 border-b border-gray-800">
              <span className="font-medium">{u.available_beds} beds</span>
              <span className="text-gray-500">
                {new Date(u.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create the update page**

Create `app/update/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import UpdateFormWrapper from './UpdateFormWrapper'

export default async function UpdatePage() {
  const supabase = createClient()

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load their profile to find their shelter
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.shelter_id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full text-center">
          <h1 className="text-xl font-bold mb-2">Account not set up</h1>
          <p className="text-gray-400 text-sm">
            Your account hasn't been linked to a shelter yet. Contact the admin to get set up.
          </p>
        </div>
      </div>
    )
  }

  // Load their shelter
  const { data: shelter } = await supabase
    .from('shelter_latest')
    .select('*')
    .eq('id', profile.shelter_id)
    .single()

  // Load last 5 updates for this shelter
  const { data: recentUpdates } = await supabase
    .from('bed_counts')
    .select('*')
    .eq('shelter_id', profile.shelter_id)
    .order('updated_at', { ascending: false })
    .limit(5)

  return (
    <div className="min-h-screen py-6">
      <UpdateFormWrapper
        shelter={shelter}
        userId={user.id}
        recentUpdates={recentUpdates ?? []}
      />
    </div>
  )
}
```

- [ ] **Step 4: Create the client wrapper**

Create `app/update/UpdateFormWrapper.tsx`:

```typescript
'use client'
import { useRouter } from 'next/navigation'
import UpdateForm from '@/components/UpdateForm'
import type { Shelter, BedCount } from '@/lib/types'

type Props = {
  shelter: Shelter
  userId: string
  recentUpdates: BedCount[]
}

export default function UpdateFormWrapper({ shelter, userId, recentUpdates }: Props) {
  const router = useRouter()
  return (
    <UpdateForm
      shelter={shelter}
      userId={userId}
      recentUpdates={recentUpdates}
      onUpdate={() => router.refresh()}
    />
  )
}
```

- [ ] **Step 5: Test the update page end-to-end**

1. Click the magic link from your email (from Task 8 testing)
2. You should be redirected to `/update`
3. You'll see "Account not set up" — that's correct, your profile isn't linked to a shelter yet

To test the form with a real shelter, run this SQL in Supabase SQL Editor (replace the UUID with your actual user ID from Authentication → Users):

```sql
insert into profiles (id, shelter_id, role, full_name)
select
  '<your-user-uuid>',
  id,
  'staff',
  'Test Staff'
from shelters
where name = 'ARCH (Austin Resource Center for the Homeless)';
```

Refresh `/update` — you should now see the ARCH shelter with +/- buttons. Hit "Update Count" — you should see a green toast and the recent updates list populate.

- [ ] **Step 6: Verify map updates in real-time**

Open `http://localhost:3000` in a second browser tab. Submit a bed count update from `/update`. Within 1-2 seconds, the marker on the public map should change color. No page refresh needed.

- [ ] **Step 7: Commit**

```bash
git add app/update/ components/UpdateForm.tsx components/Toast.tsx
git commit -m "feat: add staff update page with real-time bed count submission"
```

---

## Task 10: About Page

**Files:**
- Create: `app/about/page.tsx`

- [ ] **Step 1: Create about page**

Create `app/about/page.tsx`:

```typescript
export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">About Austin Shelter Map</h1>
      <p className="text-gray-400 text-sm mb-8">Built by a student in Austin, TX</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">What this is</h2>
        <p className="text-gray-300 leading-relaxed">
          Austin Shelter Map is a free, real-time map of emergency shelter bed availability across Austin.
          Shelter staff update bed counts directly from their phones. Outreach workers, case managers,
          and people in need can see availability instantly — no phone calls required.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Why I built this</h2>
        <p className="text-gray-300 leading-relaxed">
          Shelter bed availability in Austin is tracked through manual phone calls and spreadsheets.
          Outreach workers waste time calling multiple shelters before finding one with space.
          This tool removes that friction.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Important disclaimer</h2>
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4 text-yellow-200 text-sm">
          Bed availability data is self-reported by partner shelter staff. It may not reflect real-time
          conditions. Always call the shelter directly to confirm space is available before sending someone there.
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Partner shelters</h2>
        <p className="text-gray-400 text-sm">
          Interested in listing your shelter? Email{' '}
          <a href="mailto:your@email.com" className="text-blue-400 hover:underline">
            your@email.com
          </a>
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Source code</h2>
        <p className="text-gray-300 text-sm">
          This project is open source.{' '}
          <a
            href="https://github.com/yourusername/austin-shelter-map"
            className="text-blue-400 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub →
          </a>
        </p>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Update the placeholder email and GitHub link**

In `app/about/page.tsx`, replace:
- `your@email.com` with your actual email
- `yourusername` with your GitHub username (create a GitHub account if you don't have one)

- [ ] **Step 3: Commit**

```bash
git add app/about/
git commit -m "feat: add about page"
```

---

## Task 11: Deploy to Vercel

**Files:**
- No code changes — deployment configuration

- [ ] **Step 1: Push code to GitHub**

1. Go to `https://github.com` and create a new repository called `austin-shelter-map` (public)
2. Follow GitHub's instructions to push your existing repo:

```bash
git remote add origin https://github.com/yourusername/austin-shelter-map.git
git branch -M main
git push -u origin main
```

- [ ] **Step 2: Deploy on Vercel**

1. Go to `https://vercel.com` and sign up with your GitHub account
2. Click "Add New Project"
3. Import your `austin-shelter-map` repository
4. Under "Environment Variables", add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click "Deploy"

Wait ~2 minutes. Vercel will give you a URL like `austin-shelter-map.vercel.app`.

- [ ] **Step 3: Update Supabase redirect URL for production**

In Supabase dashboard → Authentication → URL Configuration → Redirect URLs, add:
```
https://austin-shelter-map.vercel.app/auth/callback
```

- [ ] **Step 4: Test the production deployment**

Open your Vercel URL. Verify:
- Map loads with Austin shelters
- Login page works
- Magic link redirects to the Vercel URL (not localhost)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: production deploy to Vercel"
git push
```

---

## Self-Review

**Spec coverage check:**
- ✅ Public map with color-coded markers (Task 6)
- ✅ Filter bar: All/Men/Women/Family (Task 5)
- ✅ Real-time updates via Supabase Realtime (Task 6)
- ✅ Stale data warning after 4 hours (Task 3 `isStale`, Task 5 popup)
- ✅ Staff magic link login (Tasks 7, 8)
- ✅ Staff update form with +/- buttons (Task 9)
- ✅ Last 5 updates shown on update page (Task 9)
- ✅ Notes field (Task 9)
- ✅ About page with disclaimer (Task 10)
- ✅ Vercel deploy (Task 11)
- ✅ Mobile-first update page (48px+ tap targets) (Task 9)
- ✅ Append-only bed_counts table (Task 2)

**Type consistency check:**
- `Shelter` type used consistently across Map, FilterBar, UpdateForm, and pages
- `getMarkerColor`, `isStale`, `formatTimeAgo`, `getAvailableForType` defined in Task 3 and used in Task 5
- `createClient()` from `lib/supabase/client.ts` used in all client components
- `createClient()` from `lib/supabase/server.ts` used in all server components
