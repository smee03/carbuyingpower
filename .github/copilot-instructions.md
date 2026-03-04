# Copilot Instructions for car-offers-mvp/web

This document gives an AI agent the quick context needed to be productive in this Next.js + Supabase project.

---
## 1. Big-picture architecture

- **Framework**: Next.js 13+ with the **App Router**. Pages live under `src/app` and are a mix of **server components** (default) and **client components** (`"use client"` at the top).
- **Styling**: Tailwind CSS configured via `tailwind.config.mjs` and `globals.css` under `app`.
- **Data & auth**: Supabase is the only backend. Client code uses `supabaseClient.ts`; server-side utilities live in `supabaseAdmin.ts`. See `src/lib/actionsAuth.ts` for an example server action that enforces authentication.
- **API routes**: Organized under `src/app/api/.../route.ts` following Next.js conventions. Each route exports `GET`/`POST` etc. to talk to Supabase directly. Examples:
  - `api/buyer-requests/[id]/offers/route.ts` returns offers for a buyer request.
  - `api/dealer-offers/route.ts` is used by dealers to create offers.

---
## 2. Key directories and patterns

- **`src/app`**: main application code.
  - Each folder may contain a `page.tsx` (component), `route.ts` (API), or nested routes.
  - `auth/page.tsx` is the login UI; it uses Supabase's `signIn` in a client component.
  - Buyer/dealer dashboards are under `buyer` and `dealer` subfolders.
  - When a page needs browser state or effects, it includes `"use client"` at the top (see `buyer/requests/page.tsx`).

- **`src/components`**: reusable UI pieces. Example: `UserAccount.tsx` displays logged‑in user info by calling `supabase.auth.getUser()` in a `useEffect`.

- **`src/lib`**: utility modules.
  - `supabaseClient.ts` exports the client-side Supabase instance.
  - `supabaseAdmin.ts` creates a server-side client using the `SUPABASE_SERVICE_ROLE_KEY` environment variable.
  - `actionsAuth.ts` has helper functions like `requireUser()` which check authentication in server components/routes.

---
## 3. Developer workflows

- **Local dev**: run `npm install` once, then `npm run dev` from the `web` folder to start Next.js.
- **Build/production**: `npm run build` and `npm run start`.
- **Linting**: `npm run lint` uses ESLint with the `eslint-config-next` preset.
- There are currently **no automated tests** in the repo.

> ⚠️ Environment variables are required for Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

---
## 4. Conventions & patterns

- **Naming**: API route files are named `route.ts`; client pages use PascalCase (e.g. `BuyerRequestsPage`).
- **Data fetching**: client components call Supabase directly via `supabase` imported from `lib/supabaseClient`. Server routes prefer `supabaseAdmin` to avoid exposing keys.
- **Status badges**: many UI components use inline conditional classes (see `StatusBadge` in `buyer/requests/page.tsx`).
- **Links**: use `next/link` with `href` strings; avoid dynamic imports.

---
## 5. External integrations

- Supabase for database, auth, and realtime.
- No other third-party services are currently used.

---
## 6. Useful files to inspect when reasoning

| File | Purpose |
|------|---------|
| `src/app/buyer/requests/page.tsx` | shows client-side state, request list, and reusable components like `StatusBadge`.
| `src/lib/actionsAuth.ts` | authentication helpers for server code.
| `src/app/api/*/route.ts` | API contract with Supabase.
| `src/components/UserAccount.tsx` | example client component using `supabase.auth.getUser()`.

---
## 7. Tips for AI code agents

- Always check if a component lives under `src/app`—it may be a server component by default.
- When adding new database interactions, mirror existing patterns in `buyer-requests` and `dealer-offers` routes.
- Follow Tailwind utility classes and the existing design tokens (rounded-2xl, shadow-sm, etc.).
- Avoid adding client-only code in server components; instead mark them with `"use client"` and move state/effects there.

---
Please review these instructions and let me know if there are any gaps or specifics you'd like added.