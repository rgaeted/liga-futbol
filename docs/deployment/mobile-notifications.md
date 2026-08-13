# Mobile Push Notifications — Operations

## Overview

Anonymous app installations receive Expo push alerts for favorite teams: match start, goals, and full time. Sports writes enqueue durable rows in `NotificationOutbox`; a protected cron job claims pending rows, resolves recipients, and sends via Expo Push API.

## Required environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `CRON_SECRET` | Vercel (server) | Bearer token for `/api/jobs/notifications/process` |
| `EXPO_ACCESS_TOKEN` | Vercel (server) | Authenticated Expo Push API calls |
| `EAS_PROJECT_ID` | EAS build / `app.config.ts` extra | Expo push token registration in the app |
| `DATABASE_URL` | Vercel (server) | Outbox, installations, deliveries |

Confirm `CRON_SECRET` is already set for the existing database health cron.

## Database migration

Apply before enabling push in production:

```bash
npx prisma migrate deploy
```

Migration: `20260812160000_mobile_notifications`

## Cron job

| Setting | Value |
|---------|-------|
| Path | `/api/jobs/notifications/process` |
| Schedule | `*/2 * * * *` (every 2 minutes) |
| Auth | `Authorization: Bearer $CRON_SECRET` |

Configured in `vercel.json`. Requires a Vercel plan that supports sub-hourly crons. If unavailable, use Supabase pg_cron or an external scheduler hitting the same URL with the same Bearer token.

Match mutations also trigger a small background batch (`limit: 5`) via Next.js `after()` for lower latency after kickoff/goals.

## Retry and delivery states

### Outbox (`NotificationOutbox.status`)

| Status | Meaning |
|--------|---------|
| `PENDING` | Waiting to be claimed |
| `SENT` | All deliveries resolved (including zero recipients) |
| `FAILED` | Transient error; will retry until 8 attempts |

Retry delay: exponential backoff starting at 30s, capped at 1 hour (`computeOutboxRetryDelayMs`).

### Delivery (`NotificationDelivery.status`)

| Status | Meaning |
|--------|---------|
| `PENDING` | Created, not yet sent |
| `SENT` | Expo ticket OK |
| `FAILED` | Transient ticket error; outbox may retry |
| `INVALID_TOKEN` | `DeviceNotRegistered` — installation set to `INACTIVE` |

### Installation (`MobileInstallation.status`)

| Status | Meaning |
|--------|---------|
| `ACTIVE` | Receives notifications |
| `INACTIVE` | Invalid/expired token or explicit `DELETE` from app |

## Inspecting failures safely (read-only)

Use Supabase SQL editor or `psql` against a **read replica** or with read-only credentials when possible:

```sql
-- Failed outbox rows still retrying
SELECT id, kind, match_id, attempts, last_error, next_retry_at, created_at
FROM "NotificationOutbox"
WHERE status = 'FAILED'
ORDER BY next_retry_at NULLS LAST
LIMIT 20;

-- Deliveries with invalid tokens (recent)
SELECT d.id, d.installation_id, d.last_error, d.updated_at
FROM "NotificationDelivery" d
WHERE d.status = 'INVALID_TOKEN'
ORDER BY d.updated_at DESC
LIMIT 20;
```

Do not modify match or event data when debugging push delivery.

## Disable push processing without blocking match registration

1. **Pause cron:** remove or disable the `/api/jobs/notifications/process` entry in Vercel crons (or stop the external scheduler).
2. **Optional:** unset `EXPO_ACCESS_TOKEN` — enqueue still works; processor fails gracefully with 503 on manual trigger.
3. Match events and mobile installation API remain available; only delivery stops.

Re-enable by restoring cron and `EXPO_ACCESS_TOKEN`.

## Preview / pilot checklist

1. Set `EXPO_ACCESS_TOKEN` and confirm `CRON_SECRET` in Preview.
2. Apply migration on Preview database.
3. Build preview app with correct `EAS_PROJECT_ID` and `EDITION` slug.
4. On iOS and Android device:
   - Grant notification permission during onboarding.
   - Follow one team.
   - Trigger kickoff, own-team goal, opponent goal, and full time.
   - Expect **three** notifications for the followed team: kickoff, its goal, final (opponent goal should not notify that subscriber for goals preference on the other team).
5. Verify invalid token: use a controlled test installation; confirm `INACTIVE` status without altering match rows.

## Smoke test (automated)

```bash
npx vitest run
npx tsc --noEmit
npm run test --workspace @liga/mobile
npm run typecheck --workspace @liga/mobile
```

`npm run build` may require database env vars for prerender (pre-existing constraint).

## Rollback

1. Disable cron (see above).
2. Revert app deploy if installation API or enqueue hooks cause errors.
3. DB migration rollback is optional; inactive installations and outbox rows are harmless if cron is off.
