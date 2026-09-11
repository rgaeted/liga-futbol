// seasonId: copa-kelme-los-lagos organizationSlug: kelme
const edition = {
  key: 'kelme-cup-los-lagos-2026',
  slug: 'kelme-cup-los-lagos-2026',
  displayName: 'Kelme Cup Los Lagos 2026',
  shortName: 'Kelme Cup',
  urlScheme: 'kelmecuploslagos2026',
  iosBundleIdentifier: 'cl.admintorneo.kelme.kelmecuploslagos2026',
  androidPackage: 'cl.admintorneo.kelme.kelmecuploslagos2026',
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://ligalab.cl',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  primaryColor: '#1A7AE8',
  secondaryColor: '#0B3D8F',
  assetsDir: 'editions/kelme-cup-los-lagos-2026',
} as const

export default edition
