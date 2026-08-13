# Public Expo League App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the reusable Expo application template for a public, single-edition league app on iOS and Android.

**Architecture:** The app is an npm workspace in `apps/mobile`, configured at build time by an edition module. Expo Router owns navigation, TanStack Query owns server state and cache, AsyncStorage owns anonymous onboarding/favorites, and the existing Supabase broadcast channel invalidates live snapshots with polling fallback.

**Tech Stack:** Latest stable Expo SDK selected by `create-expo-app`, React Native, Expo Router, TypeScript strict, TanStack Query, AsyncStorage, Supabase JS, Expo Notifications, Vitest, React Native Testing Library, MSW, EAS.

## Global Constraints

- Prerequisite: complete `2026-08-12-mobile-league-foundation-api.md` Tasks 1–8.
- One binary is fixed to one edition slug; no league selector.
- No user account or authenticated dashboard functions.
- UI uses Chilean Spanish and formats dates in `America/Santiago`.
- App stays navigable when notification permission is denied.
- Realtime is advisory; polling every 15 seconds remains active for `LIVE`/`HALFTIME`.
- Keep the last successful snapshot on transient errors and clearly mark stale data.
- Native credentials and Apple/Google/Expo secrets never enter Git.
- Install dependencies using npm and use the versions selected by the current Expo scaffold; do not invent versions.

---

### Task 1: Mobile Core Package and Editorial Contracts

**Files:**
- Create: `packages/mobile-core/package.json`
- Create: `packages/mobile-core/tsconfig.json`
- Create: `packages/mobile-core/src/locale.ts`
- Create: `packages/mobile-core/src/match-status.ts`
- Create: `packages/mobile-core/src/match-clock.ts`
- Create: `packages/mobile-core/src/team-initials.ts`
- Create: `packages/mobile-core/src/index.ts`
- Test: `packages/mobile-core/tests/match-clock.test.ts`
- Test: `packages/mobile-core/tests/match-status.test.ts`
- Modify: `packages/mobile-contracts/src/content.ts`
- Modify: `packages/mobile-contracts/src/index.ts`
- Modify: `packages/mobile-contracts/src/schemas/index.ts`
- Modify: `packages/mobile-contracts/tests/schemas.test.ts`

**Interfaces:**
- Produces: `formatMatchStatus`, `getMatchClock`, `teamInitials`, `APP_LOCALE`, `APP_TIMEZONE`.
- Produces contracts: `MobileArticleSummary/Detail`, `MobileGallerySummary/Detail`, `MobileSponsor`.

- [ ] **Step 1: Write failing pure tests**

```ts
it('formats LIVE in Chilean Spanish', () => {
  expect(formatMatchStatus('LIVE')).toBe('En juego')
})

it('freezes the first-half clock at halftime', () => {
  expect(getMatchClock(halftimeFixture, now)).toMatchObject({ minute: 45, running: false })
})
```

- [ ] **Step 2: Confirm RED**

Run: `npx vitest run packages/mobile-core packages/mobile-contracts`

- [ ] **Step 3: Implement framework-free helpers**

Port behavior from `src/lib/locale.ts`, `src/lib/match-status-ui.ts`, `src/lib/match-clock.ts`, and `src/lib/player-name.ts` without importing Prisma or Next.js.

- [ ] **Step 4: Add editorial DTO schemas**

Public contracts contain only IDs, visible copy, ISO publication dates, and absolute media URLs. They never expose `status`, `authorId`, or storage paths.

- [ ] **Step 5: Verify and commit**

Run: `npx vitest run packages/mobile-core packages/mobile-contracts`

```bash
git add packages/mobile-core packages/mobile-contracts
git commit -m "feat: add shared mobile presentation core"
```

### Task 2: Expo Workspace and Edition Configuration

**Files:**
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/app.json`
- Create: `apps/mobile/app.config.ts`
- Create: `apps/mobile/eas.json`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/vitest.config.ts`
- Create: `apps/mobile/eslint.config.mjs`
- Create: `apps/mobile/editions/liga-invierno-kelme-puerto-varas-2026/edition.config.ts`
- Create: `apps/mobile/editions/liga-invierno-kelme-puerto-varas-2026/assets/icon.png`
- Create: `apps/mobile/editions/liga-invierno-kelme-puerto-varas-2026/assets/splash.png`
- Create: `apps/mobile/editions/liga-invierno-kelme-puerto-varas-2026/assets/adaptive-icon.png`
- Create: `apps/mobile/src/lib/edition.ts`
- Test: `apps/mobile/tests/lib/edition.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `EditionConfig` and `getEditionConfig(editionKey)`.
- Exposes through Expo constants: league slug, API base URL, Supabase public URL/key, colors.

- [ ] **Step 1: Scaffold with the current stable Expo template**

Run: `npx create-expo-app@latest apps/mobile --template tabs --yes`
Install TanStack Query, AsyncStorage, Supabase JS, Expo Constants/Linking/Notifications, Zod, testing libraries, and workspace packages with npm.

- [ ] **Step 2: Write the failing config test**

```ts
it('loads the Puerto Varas edition selected by EDITION', () => {
  const config = getEditionConfig('liga-invierno-kelme-puerto-varas-2026')
  expect(config.slug).toBe('liga-invierno-kelme-puerto-varas-2026')
  expect(config.iosBundleIdentifier).toBeTruthy()
  expect(config.androidPackage).toBeTruthy()
})
```

- [ ] **Step 3: Confirm RED**

Run: `npm run test --workspace @liga/mobile -- tests/lib/edition.test.ts`

- [ ] **Step 4: Implement dynamic Expo config**

Reject unknown `EDITION` values during config evaluation. Configure a unique URL scheme, iOS bundle ID, Android package, icons, splash, and `extra` public values. Generate the three required PNG assets from the current approved Kelme mark in `public/icon.svg` using the repository's existing `sharp` dependency; preserve aspect ratio and required transparent/solid backgrounds.

- [ ] **Step 5: Verify public config**

Run: `npm run test --workspace @liga/mobile -- tests/lib/edition.test.ts`
Run: `$env:EDITION='liga-invierno-kelme-puerto-varas-2026'; npx expo config --type public`
Expected: slug and native identifiers match the edition.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile package.json package-lock.json
git commit -m "feat: scaffold configurable Expo league app"
```

### Task 3: Typed API Client and Query Cache

**Files:**
- Create: `apps/mobile/src/api/client.ts`
- Create: `apps/mobile/src/api/paths.ts`
- Create: `apps/mobile/src/api/query-keys.ts`
- Create: `apps/mobile/src/api/queries.ts`
- Create: `apps/mobile/src/lib/errors.ts`
- Create: `apps/mobile/src/lib/query-client.ts`
- Create: `apps/mobile/src/test/setup.ts`
- Create: `apps/mobile/src/test/mocks/handlers.ts`
- Test: `apps/mobile/tests/api/client.test.ts`
- Test: `apps/mobile/tests/api/queries.test.tsx`

**Interfaces:**
- Produces: `MobileApiClient.get<T>(path, schema, init?)`.
- Produces query hooks for league, home, matches, match, live, standings, stats, teams, player, articles, galleries, sponsors.

- [ ] **Step 1: Test success and safe failures**

```ts
it('parses successful responses with the supplied schema', async () => {
  const result = await client.get('/league', mobileLeagueConfigSchema)
  expect(result.slug).toBe(EDITION_SLUG)
})

it('maps malformed JSON to a user-safe error', async () => {
  await expect(client.get('/broken', mobileLeagueConfigSchema)).rejects.toMatchObject({
    userMessage: 'No pudimos cargar la información',
  })
})
```

- [ ] **Step 2: Confirm RED**

Run: `npm run test --workspace @liga/mobile -- tests/api`

- [ ] **Step 3: Implement API and paths**

All paths include the edition slug. Query keys begin `['mobile', slug, ...]`. Defaults: 30-second stale time, 5-minute garbage collection, limited retries for GETs.

- [ ] **Step 4: Test stale cache preservation**

Seed a successful query, then return a network error and assert cached data stays rendered with an error state available to the UI.

- [ ] **Step 5: Verify and commit**

Run: `npm run test --workspace @liga/mobile -- tests/api`

```bash
git add apps/mobile/src/api apps/mobile/src/lib apps/mobile/src/test apps/mobile/tests/api
git commit -m "feat: add typed mobile data client"
```

### Task 4: Anonymous Onboarding and Favorites

**Files:**
- Create: `apps/mobile/src/storage/keys.ts`
- Create: `apps/mobile/src/storage/onboarding.ts`
- Create: `apps/mobile/src/storage/favorites.ts`
- Create: `apps/mobile/src/hooks/useOnboardingGate.ts`
- Create: `apps/mobile/src/hooks/useFavoriteTeams.ts`
- Create: `apps/mobile/app/(onboarding)/_layout.tsx`
- Create: `apps/mobile/app/(onboarding)/index.tsx`
- Create: `apps/mobile/app/(onboarding)/favorites.tsx`
- Create: `apps/mobile/app/(onboarding)/notifications.tsx`
- Test: `apps/mobile/tests/storage/favorites.test.ts`
- Test: `apps/mobile/tests/onboarding/onboarding-flow.test.tsx`

**Interfaces:**
- Produces: `FavoriteTeamsState { seasonTeamIds: string[]; updatedAt: string }`.
- Produces: `toggleFavoriteTeam(id)`, `completeOnboarding()`.

- [ ] **Step 1: Write failing storage tests**

Test empty default, idempotent toggling, persisted order, and corruption fallback to empty state.

- [ ] **Step 2: Write failing flow test**

```tsx
it('continues when notifications are denied', async () => {
  mockRequestPermissions.mockResolvedValue({ status: 'denied' })
  render(<NotificationOnboardingScreen />)
  await user.press(screen.getByText('Continuar'))
  expect(mockCompleteOnboarding).toHaveBeenCalled()
})
```

- [ ] **Step 3: Confirm RED**

Run: `npm run test --workspace @liga/mobile -- tests/storage tests/onboarding`

- [ ] **Step 4: Implement storage and three screens**

Favorites remain local in this plan. Ask permission only after explaining its use. Do not register an Expo token with the server until the notifications plan.

- [ ] **Step 5: Verify and commit**

Run: `npm run test --workspace @liga/mobile -- tests/storage tests/onboarding`

```bash
git add apps/mobile/src/storage apps/mobile/src/hooks/useOnboardingGate.ts apps/mobile/src/hooks/useFavoriteTeams.ts "apps/mobile/app/(onboarding)" apps/mobile/tests/storage apps/mobile/tests/onboarding
git commit -m "feat: add anonymous mobile onboarding"
```

### Task 5: App Shell, Theme, and Shared States

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/+not-found.tsx`
- Create: `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/src/theme/index.ts`
- Create: `apps/mobile/src/components/ui/AppHeader.tsx`
- Create: `apps/mobile/src/components/states/LoadingState.tsx`
- Create: `apps/mobile/src/components/states/EmptyState.tsx`
- Create: `apps/mobile/src/components/states/ErrorState.tsx`
- Create: `apps/mobile/src/components/states/StaleBanner.tsx`
- Test: `apps/mobile/tests/navigation/tabs.test.tsx`
- Test: `apps/mobile/tests/components/states.test.tsx`

**Interfaces:**
- Produces five tabs: Inicio, Partidos, Tabla, Estadísticas, Más.
- Produces reusable loading/empty/error/stale components.

- [ ] **Step 1: Test the five-tab contract and theme**

Assert labels, accessible roles, and edition primary color. Test that `ErrorState` exposes “Reintentar” without internal error details.

- [ ] **Step 2: Confirm RED**

Run: `npm run test --workspace @liga/mobile -- tests/navigation tests/components/states.test.tsx`

- [ ] **Step 3: Implement providers and shell**

Mount QueryClientProvider, SafeAreaProvider, onboarding gate, status bar, and Expo Router stack. Ensure colors pass contrast checks and state is never communicated only by color.

- [ ] **Step 4: Verify and commit**

Run: `npm run test --workspace @liga/mobile -- tests/navigation tests/components/states.test.tsx`

```bash
git add apps/mobile/app apps/mobile/src/theme apps/mobile/src/components/ui apps/mobile/src/components/states apps/mobile/tests/navigation apps/mobile/tests/components
git commit -m "feat: add mobile navigation shell"
```

### Task 6: Home and Match Fixture

**Files:**
- Create: `apps/mobile/app/(tabs)/index.tsx`
- Create: `apps/mobile/app/(tabs)/matches/index.tsx`
- Create: `apps/mobile/src/components/home/FeaturedLiveMatch.tsx`
- Create: `apps/mobile/src/components/home/HomeSection.tsx`
- Create: `apps/mobile/src/components/match/MatchCard.tsx`
- Create: `apps/mobile/src/components/match/MatchList.tsx`
- Create: `apps/mobile/src/lib/format.ts`
- Test: `apps/mobile/tests/screens/home.test.tsx`
- Test: `apps/mobile/tests/screens/matches.test.tsx`

**Interfaces:**
- Consumes: home/matches query hooks.
- Produces links to `/matches/[matchId]`, `/more/news/[articleId]`, and team details.

- [ ] **Step 1: Test visible home priorities**

Home shows live first, then upcoming, recent results, news, and sponsors. Empty news/sponsor blocks are hidden.

- [ ] **Step 2: Test Chilean date grouping**

Use a UTC fixture that crosses midnight and assert grouping follows `America/Santiago`.

- [ ] **Step 3: Confirm RED**

Run: `npm run test --workspace @liga/mobile -- tests/screens/home.test.tsx tests/screens/matches.test.tsx`

- [ ] **Step 4: Implement screens**

Fixture filters are “Próximos” and “Resultados”; the API remains authoritative for status.

- [ ] **Step 5: Verify and commit**

Run: `npm run test --workspace @liga/mobile -- tests/screens/home.test.tsx tests/screens/matches.test.tsx`

```bash
git add "apps/mobile/app/(tabs)" apps/mobile/src/components/home apps/mobile/src/components/match apps/mobile/src/lib/format.ts apps/mobile/tests/screens
git commit -m "feat: add mobile home and fixture"
```

### Task 7: Standings, Statistics, Teams, and Players

**Files:**
- Create: `apps/mobile/app/(tabs)/standings.tsx`
- Create: `apps/mobile/app/(tabs)/stats.tsx`
- Create: `apps/mobile/app/(tabs)/more/index.tsx`
- Create: `apps/mobile/app/(tabs)/more/teams/index.tsx`
- Create: `apps/mobile/app/(tabs)/more/teams/[seasonTeamId].tsx`
- Create: `apps/mobile/app/(tabs)/more/players/[rosterEntryId].tsx`
- Create: `apps/mobile/src/components/standings/StandingsTable.tsx`
- Create: `apps/mobile/src/components/stats/StatsTabs.tsx`
- Create: `apps/mobile/src/components/teams/TeamCard.tsx`
- Create: `apps/mobile/src/components/teams/RosterList.tsx`
- Test: `apps/mobile/tests/screens/standings.test.tsx`
- Test: `apps/mobile/tests/screens/stats.test.tsx`
- Test: `apps/mobile/tests/screens/teams.test.tsx`

**Interfaces:**
- Consumes sports contracts and favorite-team hook.
- Produces season-scoped team/player navigation.

- [ ] **Step 1: Write screen tests**

Assert all standing columns, favorite highlight plus accessible label, stats categories, roster snapshot values, and initials fallback when crest/photo is null.

- [ ] **Step 2: Confirm RED**

Run: `npm run test --workspace @liga/mobile -- tests/screens/standings.test.tsx tests/screens/stats.test.tsx tests/screens/teams.test.tsx`

- [ ] **Step 3: Implement screens**

Use horizontal scrolling for the standings table without hiding the team name. Team detail includes roster, upcoming matches, recent results, and “Seguir equipo”.

- [ ] **Step 4: Verify and commit**

Run: `npm run test --workspace @liga/mobile -- tests/screens/standings.test.tsx tests/screens/stats.test.tsx tests/screens/teams.test.tsx`

```bash
git add "apps/mobile/app/(tabs)" apps/mobile/src/components/standings apps/mobile/src/components/stats apps/mobile/src/components/teams apps/mobile/tests/screens
git commit -m "feat: add mobile league tables and teams"
```

### Task 8: Match Detail, Live Realtime, and Polling

**Files:**
- Create: `apps/mobile/app/(tabs)/matches/[matchId].tsx`
- Create: `apps/mobile/src/lib/supabase-realtime-client.ts`
- Create: `apps/mobile/src/hooks/useMatchRealtime.ts`
- Create: `apps/mobile/src/hooks/useMobileLiveSnapshot.ts`
- Create: `apps/mobile/src/components/match/LiveScoreboard.tsx`
- Create: `apps/mobile/src/components/match/LiveTimeline.tsx`
- Create: `apps/mobile/src/components/match/LiveFormation.tsx`
- Test: `apps/mobile/tests/hooks/use-match-realtime.test.tsx`
- Test: `apps/mobile/tests/hooks/use-mobile-live-snapshot.test.tsx`
- Test: `apps/mobile/tests/screens/match-detail.test.tsx`

**Interfaces:**
- Subscribes to `match:{matchId}` broadcast `invalidate`.
- Polls every `15_000` ms only while `LIVE` or `HALFTIME`.

- [ ] **Step 1: Port failing realtime tests**

Adapt cases from `tests/hooks/use-live-match-snapshot.test.tsx` and `tests/hooks/use-match-realtime.test.tsx`: 250 ms debounce, stale snapshot retention, unmount abort, polling state, channel cleanup.

- [ ] **Step 2: Add React Native AppState test**

Assert backgrounded app pauses polling and foreground transition immediately invalidates once.

- [ ] **Step 3: Confirm RED**

Run: `npm run test --workspace @liga/mobile -- tests/hooks tests/screens/match-detail.test.tsx`

- [ ] **Step 4: Implement hooks and detail**

Use the slim mobile live contract. Display scoreboard, clock, chronology, formations, MVP, location, and weather. Show `StaleBanner` when realtime degrades.

- [ ] **Step 5: Verify and commit**

Run: `npm run test --workspace @liga/mobile -- tests/hooks tests/screens/match-detail.test.tsx`

```bash
git add "apps/mobile/app/(tabs)/matches" apps/mobile/src/lib/supabase-realtime-client.ts apps/mobile/src/hooks apps/mobile/src/components/match apps/mobile/tests/hooks apps/mobile/tests/screens/match-detail.test.tsx
git commit -m "feat: add realtime mobile match detail"
```

### Task 9: Editorial Screens and League Information

**Files:**
- Create: `apps/mobile/app/(tabs)/more/news/index.tsx`
- Create: `apps/mobile/app/(tabs)/more/news/[articleId].tsx`
- Create: `apps/mobile/app/(tabs)/more/galleries/index.tsx`
- Create: `apps/mobile/app/(tabs)/more/galleries/[galleryId].tsx`
- Create: `apps/mobile/app/(tabs)/more/sponsors.tsx`
- Create: `apps/mobile/app/(tabs)/more/league-info.tsx`
- Create: `apps/mobile/src/components/content/ArticleCard.tsx`
- Create: `apps/mobile/src/components/content/GalleryGrid.tsx`
- Create: `apps/mobile/src/components/content/SponsorList.tsx`
- Test: `apps/mobile/tests/screens/content.test.tsx`

**Interfaces:**
- Consumes editorial contracts; runs against MSW until the CMS plan is complete.

- [ ] **Step 1: Test empty and populated content**

Assert published copy renders, missing media has an accessible fallback, empty collections show “Aún no hay…”, and external sponsor URLs require explicit user action.

- [ ] **Step 2: Confirm RED**

Run: `npm run test --workspace @liga/mobile -- tests/screens/content.test.tsx`

- [ ] **Step 3: Implement screens**

Body content renders safe plain text in MVP; do not render arbitrary HTML. Gallery photos use alt text when provided.

- [ ] **Step 4: Verify and commit**

Run: `npm run test --workspace @liga/mobile -- tests/screens/content.test.tsx`

```bash
git add "apps/mobile/app/(tabs)/more" apps/mobile/src/components/content apps/mobile/tests/screens/content.test.tsx
git commit -m "feat: add mobile league content screens"
```

### Task 10: Deep Links, Offline Polish, and EAS Profiles

**Files:**
- Modify: `apps/mobile/app.config.ts`
- Modify: `apps/mobile/eas.json`
- Create: `apps/mobile/src/lib/deep-links.ts`
- Test: `apps/mobile/tests/lib/deep-links.test.ts`
- Modify: `apps/mobile/package.json`
- Modify: `package.json`

**Interfaces:**
- Produces paths `/matches/:id`, `/more/teams/:id`, `/more/news/:id`.
- Produces development, preview, and production EAS profiles for the pilot edition.

- [ ] **Step 1: Write deep-link tests**

```ts
expect(parseDeepLink('kelmeinvierno2026://matches/m1')).toEqual({
  pathname: '/matches/m1',
})
expect(parseDeepLink('https://invalid.example')).toEqual({ pathname: '/' })
```

- [ ] **Step 2: Confirm RED**

Run: `npm run test --workspace @liga/mobile -- tests/lib/deep-links.test.ts`

- [ ] **Step 3: Implement links and scripts**

Add app scripts `start`, `android`, `ios`, `lint`, `test`, `typecheck`; add root delegating scripts. Configure EAS channels by edition and environment.

- [ ] **Step 4: Run full automated verification**

Run: `npm run test --workspace @liga/mobile`
Run: `npm run typecheck --workspace @liga/mobile`
Run: `npm run lint --workspace @liga/mobile`
Run: `npx vitest run packages/mobile-core packages/mobile-contracts`

- [ ] **Step 5: Run device smoke tests**

Verify Android and iOS: onboarding with permission accepted/denied, favorites, every tab, cached reload, live invalidation, background/foreground, and all deep links.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile package.json package-lock.json
git commit -m "chore: prepare mobile app for internal builds"
```

## Plan Completion Gate

- The pilot edition config produces valid iOS and Android metadata.
- No screen allows selecting another edition.
- All five tabs and detail screens pass tests.
- Live remains usable if Realtime fails.
- Denying notifications never blocks onboarding.
- Content screens are ready for CMS endpoints.
- Internal Android/iOS builds pass smoke tests before store submission.
