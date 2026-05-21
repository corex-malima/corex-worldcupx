# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**WorldCupX** (producto · `Polla Mundialista` como descriptor) — Polla corporativa Mundial 2026.
Marca: **CoreX** · firma **by P&P** · empresa **Malima**.

Dos experiencias:
- **Collaborators**: Register with ticket code, make predictions, view rankings
- **TTHH/Admin (HR)**: Sell tickets, enter match results, recalculate scores

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript check + production bundle
npm run preview      # Preview production build locally
npm run typecheck    # Type-check only (no emit)
```

No test runner is configured; use `npm run typecheck` for correctness checks.

## Environment Setup

Copy `.env.example` to `.env` and fill in:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

If these are empty, the app enters **mock mode** — all hooks return hardcoded data from `src/data/mock/`. This allows full UI development without a Supabase backend.

## Architecture

### Routing
Hash-based routing (`#/login`, `#/dashboard`, etc.) implemented manually in `src/App.tsx` using `useMemo` — no external router library. Routes are protected by `src/routes/ProtectedRoute.tsx` (login required) and `src/routes/AdminRoute.tsx` (admin role required).

### Data Layer Pattern
Each domain area has:
1. A **hook** in `src/hooks/` that abstracts Supabase calls and mock fallback
2. A **service** in `src/services/` for complex RPC operations (ticket sales, employee lookups)
3. A **type** in `src/types/domain.ts` for the shared domain object

Mock checks: every hook starts with `if (USE_MOCKS) return { ...mockData }`.

### Authentication
Login uses cedula (National ID), not email. The flow:
1. Frontend calls RPC `resolve_auth_email_by_cedula(p_cedula)` → gets a synthetic email
2. Supabase Auth signs in with that email
3. Profile loaded from `public.profiles` table to get role/area

Registration validates ticket code → creates Supabase Auth account → calls `complete_registration_with_ticket()` RPC.

### Supabase Integration
- **Client**: `src/lib/supabase.ts` — single singleton, uses anon key only
- **RPC calls**: All mutations use Supabase RPCs (not direct table inserts) to enforce backend validation
- **Views**: `v_my_tickets`, `v_ranking_public` — frontend reads from views, not raw tables
- **SQL files**: `supabase/sql/` contains 15 ordered migration files (`00_` through `14_`) — run them in order when setting up a new Supabase project
- Service role key is **never** used in frontend code

### Prediction System
Predictions are stored in **localStorage** during drafting (`polla_prediction_${ticketId}`). The `usePrediction` hook manages a multi-step draft:
1. Group stage scores (48 matches)
2. Auto-calculated standings + tiebreaker resolution
3. Best 3rd-place team assignments to R16 slots
4. Knockout bracket picks + penalty selections
5. Submit (marks draft as submitted locally; Supabase sync in progress per docs)

### Scoring (`src/lib/scoring.ts`)
- +3 exact score, +1 correct outcome (group and knockout)
- +10 champion bonus, +5 third-place bonus
- Client calculates preview scores; admin triggers `recalculate_all_scores()` RPC for official scores

### Deployment
GitHub Actions (`.github/workflows/deploy.yml`) auto-deploys `main` branch to GitHub Pages. Vite is configured with `base: '/worldcupx/'` in `vite.config.ts`.

## Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Root: hash routing + auth state |
| `src/lib/auth.ts` | Cedula-based sign-in / registration |
| `src/lib/constants.ts` | Env vars, route constants, feature flags |
| `src/lib/scoring.ts` | Point calculation rules |
| `src/lib/bracketBuilder.ts` | Knockout bracket from results |
| `src/lib/standings.ts` | Group standings from prediction scores |
| `src/types/domain.ts` | Core domain types (AppUser, Ticket, RankingRow) |
| `src/types/prediction.ts` | PredictionDraft structure |
| `supabase/sql/` | Ordered DB migrations (run 00→14) |
| `docs/08-scoring.md` | Detailed scoring rules documentation |
