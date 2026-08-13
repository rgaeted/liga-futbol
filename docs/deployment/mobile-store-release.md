# Mobile Store Release — Kelme Invierno 2026 (pilot)

Checklist for publishing one league edition app to App Store and Google Play.

## App identity

| Field | Value |
|-------|-------|
| Display name | Liga de Invierno Kelme Puerto Varas 2026 |
| Short name | Kelme Invierno 2026 |
| Category | Sports |
| iOS bundle ID | `cl.torneoskelme.ligainvierno2026` |
| Android package | `cl.torneoskelme.ligainvierno2026` |
| URL scheme | `kelmeinvierno2026` |
| Privacy policy URL | https://torneos-kelme.vercel.app/privacidad/app |
| Support URL | https://torneos-kelme.vercel.app/ayuda |

## Store copy (draft)

**Subtitle (iOS):** Resultados y alertas de tu liga  
**Short description (Android):** Sigue la liga de invierno Kelme: tabla, partidos en vivo y alertas de tus equipos favoritos.

**Full description:** App oficial de la edición. Consulta fixture, tabla, estadísticas, noticias y recibe notificaciones cuando empieza un partido, hay gol o termina el encuentro de los equipos que sigues. No requiere cuenta.

## Notifications disclosure

- Used for match start, goals, and full-time alerts for favorite teams only.
- Permission requested after onboarding explanation.
- Users can revoke in OS settings; app marks installation inactive on token invalidation.

## Data safety / App Privacy

| Data | Collected | Linked to user | Purpose |
|------|-----------|----------------|---------|
| Installation UUID | Yes | No | Push delivery |
| Favorite team IDs | Yes | No | Notification targeting |
| Expo push token | Yes | No | Push delivery |
| Platform / app version | Yes | No | Diagnostics |
| Delivery logs | Yes | No | Operations |

No account, email, or precise location.

## Review credentials

`not applicable` — anonymous public app; provide demo league slug and note that push requires physical device with permission granted.

## Screenshots (required)

Capture on phone for: Home, Partidos, Tabla, Detalle de partido, Más (with Privacidad link). Use production API with published season.

## EAS build and submit

```bash
cd apps/mobile
export EDITION=liga-invierno-kelme-puerto-varas-2026
export EAS_PROJECT_ID=<project-id>

# Preview / internal
eas build --platform all --profile preview
eas submit --platform ios --latest
eas submit --platform android --latest
```

Use `production` profile only after TestFlight and Google Play internal testing smoke pass.

## Smoke suite before production submit

1. Onboarding: favorites + notifications (denied path must not block).
2. Home loads league config and sponsors.
3. Live match updates via Realtime.
4. Push: kickoff, own goal, final for one followed team (see `docs/deployment/mobile-notifications.md`).
5. Privacy link opens HTTPS policy.

## Staged rollout

1. TestFlight + Play internal (1–2 weeks).
2. Production submit with phased release (Play 20% → 100%; App Store manual ramp).
3. Monitor outbox failures and `INVALID_TOKEN` rate.

## Rollback

- Halt store rollout in console.
- Disable notification cron (see mobile-notifications.md).
- Previous binary remains installable; API is backward compatible.
