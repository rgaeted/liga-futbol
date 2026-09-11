import type { ExpoConfig } from 'expo/config'
import path from 'path'

// Valores espejo de editions/*/edition.config.ts (Expo config no resuelve imports TS anidados).
const EDITIONS = {
  'liga-invierno-kelme-puerto-varas-2026': {
    key: 'liga-invierno-kelme-puerto-varas-2026',
    slug: 'liga-invierno-kelme-puerto-varas-2026',
    displayName: 'Liga de Invierno Kelme Puerto Varas 2026',
    shortName: 'Kelme PV 2026',
    urlScheme: 'kelmeinvierno2026',
    iosBundleIdentifier: 'cl.kelme.ligainvierno.puertovaras2026',
    androidPackage: 'cl.kelme.ligainvierno.puertovaras2026',
    apiBaseUrl: 'https://torneos-kelme.vercel.app',
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    primaryColor: '#CD212A',
    secondaryColor: '#FFFFFF',
    assetsDir: 'editions/liga-invierno-kelme-puerto-varas-2026',
  },
  'kelme-cup-los-lagos-2026': {
    key: 'kelme-cup-los-lagos-2026',
    slug: 'kelme-cup-los-lagos-2026',
    displayName: 'Kelme Cup Los Lagos 2026',
    shortName: 'Kelme Cup',
    urlScheme: 'kelmecuploslagos2026',
    iosBundleIdentifier: 'cl.admintorneo.kelme.kelmecuploslagos2026',
    androidPackage: 'cl.admintorneo.kelme.kelmecuploslagos2026',
    apiBaseUrl: 'https://ligalab.cl',
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    primaryColor: '#1A7AE8',
    secondaryColor: '#0B3D8F',
    assetsDir: 'editions/kelme-cup-los-lagos-2026',
  },
} as const

const EAS_PROJECT_IDS = {
  'liga-invierno-kelme-puerto-varas-2026': '82b41e84-1be0-4d1d-b7e3-99296e490606',
  'kelme-cup-los-lagos-2026': 'b7f611ea-4cc1-49fe-868a-ab3e5b28d1c2',
} as const

function resolveEditionKey(): string {
  const editionKey = process.env.EDITION ?? process.env.EXPO_PUBLIC_EDITION
  if (!editionKey) {
    throw new Error('Debes definir la variable EDITION para compilar la app móvil')
  }
  if (!(editionKey in EDITIONS)) {
    throw new Error(`Edición desconocida: ${editionKey}`)
  }
  return editionKey
}

const edition = EDITIONS[resolveEditionKey() as keyof typeof EDITIONS]
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? edition.apiBaseUrl
const assetsDir = path.join(__dirname, edition.assetsDir, 'assets')

const config: ExpoConfig = {
  owner: 'rgaete',
  name: edition.displayName,
  slug: edition.slug,
  version: '1.0.0',
  orientation: 'portrait',
  icon: path.join(assetsDir, 'icon.png'),
  scheme: edition.urlScheme,
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: edition.iosBundleIdentifier,
    infoPlist: {
      NSUserNotificationsUsageDescription:
        'Te avisaremos cuando empiece un partido en vivo o cuando tu equipo juegue.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: edition.androidPackage,
    adaptiveIcon: {
      foregroundImage: path.join(assetsDir, 'adaptive-icon.png'),
      backgroundColor: edition.primaryColor,
    },
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: path.join(assetsDir, 'splash.png'),
        resizeMode: 'contain',
        backgroundColor: edition.primaryColor,
      },
    ],
    [
      'expo-notifications',
      {
        icon: path.join(assetsDir, 'icon.png'),
        color: edition.primaryColor,
      },
    ],
  ],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    editionKey: edition.key,
    leagueSlug: edition.slug,
    apiBaseUrl,
    supabaseUrl: edition.supabaseUrl,
    supabaseAnonKey: edition.supabaseAnonKey,
    primaryColor: edition.primaryColor,
    secondaryColor: edition.secondaryColor,
    eas: {
      projectId:
        process.env.EAS_PROJECT_ID ?? EAS_PROJECT_IDS[edition.key],
    },
  },
}

export default config
