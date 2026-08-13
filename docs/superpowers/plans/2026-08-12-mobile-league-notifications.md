# Mobile Favorites and Expo Push Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Register anonymous app installations, synchronize favorite teams, and deliver deduplicated Expo notifications for match start, goals, and final score.

**Architecture:** Anonymous installation IDs act as unguessable bearer identifiers. Sports writes enqueue durable notification records; a protected Vercel cron claims outbox rows, resolves favorite-team recipients, creates idempotent deliveries, sends Expo batches, and retries transient failures. The Expo app registers its token and maps notification data to existing match deep links.

**Tech Stack:** Next.js 16.2.9, Prisma 7/PostgreSQL, Expo Push Service, Expo Notifications, Vercel Cron, Zod 4, Vitest 4, React Native Testing Library.

## Global Constraints

- Prerequisites: foundation API and Expo app plans complete.
- Only published `LEAGUE` seasons generate notifications.
- First kickoff notifies followers of either team; second-half kickoff does not.
- Goals notify followers of the scoring team; own goals resolve to the benefited opponent.
- Final score notifies followers of either team.
- Notification failures never reverse or block sports mutations.
- Each outbox event and each installation delivery is unique.
- Invalid Expo tokens deactivate the installation.
- No historical event generates retroactive notifications.
- Push payload contains no secret or personal data.
- Denied permission leaves all app content usable.
- UI and push copy use Chilean Spanish.

---

### Task 1: Notification and Installation Data Model

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260812160000_mobile_notifications/migration.sql`
- Create: `src/lib/validations/mobile-installation.ts`
- Modify: `packages/mobile-contracts/src/index.ts`
- Modify: `packages/mobile-contracts/src/schemas/index.ts`
- Modify: `packages/mobile-contracts/tests/schemas.test.ts`
- Test: `tests/lib/validations-mobile-installation.test.ts`

**Interfaces:**
- Produces models: `MobileInstallation`, `TeamSubscription`, `NotificationOutbox`, `NotificationDelivery`.
- Produces enums for platform, installation status, notification kind, outbox status, and delivery status.
- Produces request/response schemas for installation and subscription APIs.

- [ ] **Step 1: Write failing validation tests**

```ts
it.each(['ExpoPushToken[abc]', 'ExponentPushToken[abc]'])('accepts Expo token %s', (token) => {
  expect(
    registerInstallationSchema.safeParse({
      installationId: crypto.randomUUID(),
      expoPushToken: token,
      platform: 'IOS',
    }).success,
  ).toBe(true)
})

it('rejects more than twenty team subscriptions', () => {
  expect(replaceSubscriptionsSchema.safeParse({ teams: makeTeams(21) }).success).toBe(false)
})
```

- [ ] **Step 2: Confirm RED**

Run: `npx vitest run tests/lib/validations-mobile-installation.test.ts packages/mobile-contracts`

- [ ] **Step 3: Add schema and migration**

`MobileInstallation.id` is the app-generated UUID. Scope it to `seasonId`, index active installations, and retain one token per installation. `TeamSubscription` is unique on installation and `SeasonTeam`. Outbox has unique `dedupeKey`; delivery is unique on outbox and installation.

- [ ] **Step 4: Implement shared contracts**

Define `RegisterInstallationRequest/Response`, `ReplaceSubscriptionsRequest/Response`, and `MobilePushData` with path `/matches/{matchId}`.

- [ ] **Step 5: Verify and commit**

Run: `npx prisma generate`
Run: `npx vitest run tests/lib/validations-mobile-installation.test.ts packages/mobile-contracts`
Run: `npx tsc --noEmit`

```bash
git add prisma/schema.prisma prisma/migrations/20260812160000_mobile_notifications src/lib/validations/mobile-installation.ts packages/mobile-contracts tests/lib/validations-mobile-installation.test.ts
git commit -m "feat: add mobile notification data model"
```

### Task 2: Installation and Favorite-Team Services

**Files:**
- Create: `src/lib/mobile/installations/register.ts`
- Create: `src/lib/mobile/installations/subscriptions.ts`
- Create: `src/lib/mobile/installations/deactivate.ts`
- Create: `src/lib/mobile/installations/rate-limit.ts`
- Test: `tests/lib/mobile-installations.test.ts`

**Interfaces:**
- Produces: `registerInstallation(input)`.
- Produces: `replaceTeamSubscriptions(input)`.
- Produces: `deactivateInstallation(seasonId, installationId)`.
- Produces: `checkInstallationRateLimit(key, now)`.

- [ ] **Step 1: Write failing registration tests**

Assert upsert reactivates an inactive installation, updates token/version/lastSeen, and rejects reuse of an installation ID under another season.

- [ ] **Step 2: Write failing subscription tests**

```ts
it('rejects a seasonTeamId from another season', async () => {
  mockSeasonTeamCount.mockResolvedValue(1)
  await expect(
    replaceTeamSubscriptions({
      seasonId: 's1',
      installationId: 'i1',
      teams: [{ seasonTeamId: 'st1' }, { seasonTeamId: 'st-other' }],
    }),
  ).rejects.toMatchObject({ status: 400 })
})
```

- [ ] **Step 3: Confirm RED**

Run: `npx vitest run tests/lib/mobile-installations.test.ts`

- [ ] **Step 4: Implement transactional replacement**

Validate installation and every season team before deleting existing subscriptions. Then delete/create in one transaction. Use a 10-requests/minute process-local limiter keyed by slug, IP, and operation; document its MVP limitation.

- [ ] **Step 5: Verify and commit**

Run: `npx vitest run tests/lib/mobile-installations.test.ts`

```bash
git add src/lib/mobile/installations tests/lib/mobile-installations.test.ts
git commit -m "feat: manage anonymous mobile favorites"
```

### Task 3: Public Installation API and Proxy Policy

**Files:**
- Create: `src/app/api/mobile/v1/leagues/[slug]/installations/route.ts`
- Create: `src/app/api/mobile/v1/leagues/[slug]/installations/[installationId]/route.ts`
- Create: `src/app/api/mobile/v1/leagues/[slug]/installations/[installationId]/subscriptions/route.ts`
- Modify: `src/lib/proxy-policy.ts`
- Modify: `tests/lib/proxy-policy.test.ts`
- Test: `tests/api/mobile-installations.test.ts`

**Interfaces:**
- Produces POST installation, PUT subscriptions, DELETE installation.

- [ ] **Step 1: Write route tests**

Test unknown/unpublished slug 404; malformed token 400; registration 201; cross-season team 400; delete 204; rate limited 429 with `Retry-After`.

- [ ] **Step 2: Write proxy tests**

Only the three intended methods/routes are public. Notification job and arbitrary mobile POST paths remain protected.

- [ ] **Step 3: Confirm RED**

Run: `npx vitest run tests/api/mobile-installations.test.ts tests/lib/proxy-policy.test.ts`

- [ ] **Step 4: Implement thin routes**

Resolve published season by slug first. Require path installation ID to match the bearer UUID. Never return push tokens.

- [ ] **Step 5: Verify and commit**

Run: `npx vitest run tests/api/mobile-installations.test.ts tests/lib/proxy-policy.test.ts`

```bash
git add src/app/api/mobile src/lib/proxy-policy.ts tests/api/mobile-installations.test.ts tests/lib/proxy-policy.test.ts
git commit -m "feat: expose mobile favorite subscriptions"
```

### Task 4: Notification Dedupe, Scoring Team, and Payload

**Files:**
- Create: `src/lib/mobile/notifications/types.ts`
- Create: `src/lib/mobile/notifications/dedupe-key.ts`
- Create: `src/lib/mobile/notifications/scoring-team.ts`
- Create: `src/lib/mobile/notifications/payload.ts`
- Test: `tests/lib/mobile-notification-dedupe.test.ts`
- Test: `tests/lib/mobile-scoring-team.test.ts`
- Test: `tests/lib/mobile-notification-payload.test.ts`

**Interfaces:**
- Produces `buildNotificationDedupeKey`.
- Produces `resolveScoringTeamId`.
- Produces `buildMatchNotificationPayload`.

- [ ] **Step 1: Write failing dedupe tests**

Start/final keys use season+match+kind. Goal keys additionally require `matchEventId`; calling without it throws.

- [ ] **Step 2: Write failing own-goal tests**

For `OWN_GOAL`, an event assigned to home resolves away and vice versa. Missing league team IDs resolves null and does not enqueue.

- [ ] **Step 3: Write failing copy/deep-link tests**

Assert start, goal with current score/scorer, and final copy plus stable data:

```ts
expect(payload.data).toEqual({
  type: 'match',
  slug: 'liga-invierno-kelme-puerto-varas-2026',
  matchId: 'm1',
  kind: 'GOAL',
  path: '/matches/m1',
})
```

- [ ] **Step 4: Confirm RED**

Run: `npx vitest run tests/lib/mobile-notification-dedupe.test.ts tests/lib/mobile-scoring-team.test.ts tests/lib/mobile-notification-payload.test.ts`

- [ ] **Step 5: Implement pure functions and verify**

Run the same command; expect PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/mobile/notifications tests/lib/mobile-notification-dedupe.test.ts tests/lib/mobile-scoring-team.test.ts tests/lib/mobile-notification-payload.test.ts
git commit -m "feat: define mobile match notifications"
```

### Task 5: Durable Enqueue from Sports Mutations

**Files:**
- Create: `src/lib/mobile/notifications/enqueue.ts`
- Modify: `src/lib/match-events.ts`
- Modify: `src/app/api/matches/[id]/route.ts`
- Test: `tests/lib/mobile-notification-enqueue.test.ts`
- Test: `tests/lib/match-events-notifications.test.ts`
- Test: `tests/api/match-status-notifications.test.ts`

**Interfaces:**
- Produces: `enqueueMatchNotification(input): Promise<{ enqueued: boolean; outboxId?: string }>`.

- [ ] **Step 1: Test enqueue eligibility**

Ignore friendly matches, unpublished editions, missing enrollment, and duplicate P2002. Create correct seasonTeam target for goals and both match teams for start/final payload context.

- [ ] **Step 2: Test event call sites**

First-half `KICKOFF`, `GOAL`, `OWN_GOAL`, and `FULLTIME` call enqueue after persistence. `HALFTIME` and second-half kickoff do not.

- [ ] **Step 3: Test admin status call site**

Direct `SCHEDULED → LIVE` creates start; any non-finished → `FINISHED` creates final; unchanged state creates nothing.

- [ ] **Step 4: Test failure isolation**

Mock enqueue rejection and assert the already persisted event/status response still succeeds while logging a structured warning.

- [ ] **Step 5: Confirm RED**

Run: `npx vitest run tests/lib/mobile-notification-enqueue.test.ts tests/lib/match-events-notifications.test.ts tests/api/match-status-notifications.test.ts`

- [ ] **Step 6: Implement call sites and verify**

Use dedupe keys as the final protection against duplicate event and direct status paths.

- [ ] **Step 7: Commit**

```bash
git add src/lib/mobile/notifications/enqueue.ts src/lib/match-events.ts "src/app/api/matches/[id]/route.ts" tests/lib/mobile-notification-enqueue.test.ts tests/lib/match-events-notifications.test.ts tests/api/match-status-notifications.test.ts
git commit -m "feat: enqueue mobile match alerts"
```

### Task 6: Expo Push Client and Recipient Resolution

**Files:**
- Create: `src/lib/mobile/notifications/expo-push.ts`
- Create: `src/lib/mobile/notifications/recipients.ts`
- Test: `tests/lib/expo-push.test.ts`
- Test: `tests/lib/mobile-notification-recipients.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `sendExpoPush(messages): Promise<ExpoPushTicket[]>`.
- Produces: `findSubscribedInstallations({ seasonId, seasonTeamIds, kind })`.

- [ ] **Step 1: Test recipient preference filters**

Inactive installation, wrong season, and disabled kind are excluded. Duplicate subscriptions return one recipient.

- [ ] **Step 2: Test Expo HTTP behavior**

Mock batches of 101 messages and assert chunks of 100 and 1. Parse ok, transient error, and `DeviceNotRegistered`. Include Authorization only when `EXPO_ACCESS_TOKEN` is set.

- [ ] **Step 3: Confirm RED**

Run: `npx vitest run tests/lib/expo-push.test.ts tests/lib/mobile-notification-recipients.test.ts`

- [ ] **Step 4: Implement and verify**

Use `https://exp.host/--/api/v2/push/send`, JSON, default sound, and high priority. Do not log tokens.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mobile/notifications/expo-push.ts src/lib/mobile/notifications/recipients.ts tests/lib/expo-push.test.ts tests/lib/mobile-notification-recipients.test.ts .env.example
git commit -m "feat: add Expo notification delivery client"
```

### Task 7: Concurrent-Safe Outbox Processor

**Files:**
- Create: `src/lib/mobile/notifications/claim-outbox.ts`
- Create: `src/lib/mobile/notifications/process-outbox.ts`
- Test: `tests/lib/mobile-notification-process.test.ts`

**Interfaces:**
- Produces: `claimPendingOutbox(limit, now)` using a short PostgreSQL transaction and `FOR UPDATE SKIP LOCKED`.
- Produces: `processPendingNotifications({ limit = 20 })`.

- [ ] **Step 1: Test idempotent deliveries**

Running the processor twice creates one `NotificationDelivery` per outbox+installation and sends only unsent deliveries.

- [ ] **Step 2: Test retry policy**

Transient failures set outbox `FAILED`, increment attempts, and schedule `min(2^attempts * 30s, 3600s)`. Stop retrying after eight attempts.

- [ ] **Step 3: Test invalid token handling**

`DeviceNotRegistered` marks delivery `INVALID_TOKEN` and installation `INACTIVE`. Other recipients continue.

- [ ] **Step 4: Test no-recipient completion**

An outbox event with no subscriptions becomes `SENT` with zero deliveries and is not retried forever.

- [ ] **Step 5: Confirm RED**

Run: `npx vitest run tests/lib/mobile-notification-process.test.ts`

- [ ] **Step 6: Implement claim/process**

Claim and mark rows `PROCESSING` in the same short transaction. Perform network I/O after commit. Persist each ticket result and then finalize outbox.

- [ ] **Step 7: Verify and commit**

Run: `npx vitest run tests/lib/mobile-notification-process.test.ts`

```bash
git add src/lib/mobile/notifications/claim-outbox.ts src/lib/mobile/notifications/process-outbox.ts tests/lib/mobile-notification-process.test.ts
git commit -m "feat: process mobile notification outbox"
```

### Task 8: Protected Job and Vercel Cron

**Files:**
- Create: `src/app/api/jobs/notifications/process/route.ts`
- Create: `src/lib/mobile/notifications/trigger-process.ts`
- Modify: `src/app/api/matches/[id]/events/route.ts`
- Modify: `src/app/api/matches/[id]/route.ts`
- Modify: `vercel.json`
- Test: `tests/api/notification-job.test.ts`
- Test: `tests/api/notification-trigger.test.ts`

**Interfaces:**
- Produces protected GET job using existing `hasValidCronAuthorization`.

- [ ] **Step 1: Write cron auth tests**

Follow `tests/api/database-health.test.ts`: missing/wrong bearer 401, valid bearer 200, processor failure 503 with generic body.

- [ ] **Step 2: Write immediate-trigger tests**

Mock Next.js `after`. A successful event POST and admin match PUT schedule `triggerNotificationProcessing`; a rejected sports mutation does not. The trigger catches processor errors so they cannot alter the route response.

- [ ] **Step 3: Confirm RED**

Run: `npx vitest run tests/api/notification-job.test.ts tests/api/notification-trigger.test.ts`

- [ ] **Step 4: Implement immediate processing and cron fallback**

Use Next.js 16 `after()` in the two mutation routes to process a small batch after the response. Add `{ "path": "/api/jobs/notifications/process", "schedule": "*/2 * * * *" }` beside the existing health cron for retries and missed triggers. Verify the Vercel plan supports this cadence before deployment; if it does not, provision an equivalent two-minute Supabase scheduled invocation before enabling production push. The route is not public in proxy policy.

- [ ] **Step 5: Verify and commit**

Run: `npx vitest run tests/api/notification-job.test.ts tests/api/notification-trigger.test.ts tests/lib/proxy-policy.test.ts`

```bash
git add src/app/api/jobs/notifications/process/route.ts src/lib/mobile/notifications/trigger-process.ts "src/app/api/matches/[id]/events/route.ts" "src/app/api/matches/[id]/route.ts" vercel.json tests/api/notification-job.test.ts tests/api/notification-trigger.test.ts
git commit -m "feat: schedule mobile push processing"
```

### Task 9: Expo App Registration and Subscription Sync

**Files:**
- Create: `apps/mobile/src/notifications/installation-id.ts`
- Create: `apps/mobile/src/notifications/register.ts`
- Create: `apps/mobile/src/notifications/sync-subscriptions.ts`
- Create: `apps/mobile/src/notifications/listeners.ts`
- Create: `apps/mobile/src/api/installation-client.ts`
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/app/(onboarding)/notifications.tsx`
- Modify: `apps/mobile/src/hooks/useFavoriteTeams.ts`
- Modify: `apps/mobile/app.config.ts`
- Test: `apps/mobile/tests/notifications/register.test.ts`
- Test: `apps/mobile/tests/notifications/sync-subscriptions.test.ts`
- Test: `apps/mobile/tests/notifications/listeners.test.tsx`

**Interfaces:**
- Produces stable UUID installation ID in AsyncStorage.
- Produces `registerForLeagueNotifications()`.
- Produces `syncFavoriteTeamSubscriptions(ids)`.
- Produces notification response listener routing `data.path`.

- [ ] **Step 1: Test registration permission paths**

Granted gets Expo token with EAS project ID and POSTs installation. Denied returns `{ registered: false, reason: 'permission-denied' }` without error UI.

- [ ] **Step 2: Test favorite synchronization**

After a local favorite mutation, PUT the complete replacement list. Network failure preserves local favorites and schedules sync on next foreground.

- [ ] **Step 3: Test notification navigation**

Valid `/matches/m1` opens match detail. Unknown type/path opens home. Ignore data for another edition slug.

- [ ] **Step 4: Confirm RED**

Run: `npm run test --workspace @liga/mobile -- tests/notifications`

- [ ] **Step 5: Implement app integration**

Register listeners once at root, clean them on unmount, and sync after onboarding plus app foreground. Never block rendering on registration.

- [ ] **Step 6: Verify and commit**

Run: `npm run test --workspace @liga/mobile -- tests/notifications`
Run: `npm run typecheck --workspace @liga/mobile`

```bash
git add apps/mobile/src/notifications apps/mobile/src/api/installation-client.ts apps/mobile/app apps/mobile/src/hooks/useFavoriteTeams.ts apps/mobile/app.config.ts apps/mobile/tests/notifications
git commit -m "feat: connect mobile favorites to push alerts"
```

### Task 10: End-to-End Push Verification and Deployment

**Files:**
- Create: `docs/deployment/mobile-notifications.md`
- Modify: `docs/handoff/SESSION-CONTEXT.md` only after production deployment.

**Interfaces:**
- Produces operational env/runbook and verified pilot devices.

- [ ] **Step 1: Configure preview**

Set `EXPO_ACCESS_TOKEN` and confirm existing `CRON_SECRET`. Apply migration. Build preview app with correct EAS project ID.

- [ ] **Step 2: Verify real-device flow**

On iOS and Android: grant permission, follow one team, trigger kickoff, a team goal, opponent goal, and fulltime. Assert exactly three relevant notifications for the followed team: kickoff, its own goal, final.

- [ ] **Step 3: Verify retries and invalid tokens**

Use controlled fixtures or test tokens to confirm transient retry and invalid-token deactivation without modifying match data.

- [ ] **Step 4: Run complete verification**

Run: `npx vitest run`
Run: `npx tsc --noEmit`
Run: `npm run build`
Run: `npm run test --workspace @liga/mobile`
Run: `npm run typecheck --workspace @liga/mobile`

- [ ] **Step 5: Document operations**

Include cron URL/auth, required env, retry states, how to inspect failed outbox rows safely, and how to disable push processing without affecting match registration.

- [ ] **Step 6: Commit**

```bash
git add docs/deployment/mobile-notifications.md
git commit -m "docs: document mobile push operations"
```

### Task 11: Privacy Disclosure and Store Release

**Files:**
- Create: `src/app/privacidad/app/page.tsx`
- Modify: `src/lib/proxy-policy.ts`
- Modify: `tests/lib/proxy-policy.test.ts`
- Create: `apps/mobile/app/(tabs)/more/privacy.tsx`
- Create: `docs/deployment/mobile-store-release.md`
- Test: `tests/components/mobile-privacy-page.test.tsx`
- Test: `apps/mobile/tests/screens/privacy.test.tsx`

**Interfaces:**
- Produces a public HTTPS privacy-policy URL accepted by both stores.
- Produces an in-app privacy link and release checklist.

- [ ] **Step 1: Write privacy-content tests**

Assert the policy states: no account is required; the app stores an anonymous installation ID, favorite-team IDs, Expo push token, platform, app version, and delivery diagnostics; users can revoke notifications and deactivate the installation; sports/editorial content is public.

- [ ] **Step 2: Write public-route and app-link tests**

`/privacidad/app` is public without session. The Más screen opens the HTTPS policy and also provides the in-app summary.

- [ ] **Step 3: Confirm RED**

Run: `npx vitest run tests/components/mobile-privacy-page.test.tsx tests/lib/proxy-policy.test.ts`
Run: `npm run test --workspace @liga/mobile -- tests/screens/privacy.test.tsx`

- [ ] **Step 4: Implement policy and release runbook**

Document App Store/Google Play names, category, descriptions, screenshots, support URL, privacy URL, notification disclosure, content rating, data-safety answers, review credentials (`not applicable`), versioning, EAS submit commands, staged rollout, and rollback.

- [ ] **Step 5: Verify release candidates**

Run production EAS builds for iOS and Android. Submit first to TestFlight and Google Play internal testing, execute the full smoke suite, then use `eas submit` only after explicit production approval.

- [ ] **Step 6: Run final automated verification**

Run: `npx vitest run`
Run: `npx tsc --noEmit`
Run: `npm run build`
Run: `npm run test --workspace @liga/mobile`
Run: `npm run typecheck --workspace @liga/mobile`

- [ ] **Step 7: Commit**

```bash
git add src/app/privacidad/app/page.tsx src/lib/proxy-policy.ts tests/lib/proxy-policy.test.ts tests/components/mobile-privacy-page.test.tsx "apps/mobile/app/(tabs)/more/privacy.tsx" apps/mobile/tests/screens/privacy.test.tsx docs/deployment/mobile-store-release.md
git commit -m "feat: prepare league app store release"
```

## Plan Completion Gate

- Following teams requires no account.
- Start/goal/final notifications match the selected preference rules.
- Duplicate event paths produce one outbox and one delivery.
- Push outages do not affect score or status mutations.
- Invalid tokens are disabled.
- Deep links open the correct edition and match.
- Cron and preview/production operations are documented and tested.
- Privacy disclosure and both store release checklists are complete.
