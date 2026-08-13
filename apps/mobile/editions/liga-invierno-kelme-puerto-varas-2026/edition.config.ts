const edition = {
  key: 'liga-invierno-kelme-puerto-varas-2026',
  slug: 'liga-invierno-kelme-puerto-varas-2026',
  displayName: 'Liga de Invierno Kelme Puerto Varas 2026',
  shortName: 'Kelme PV 2026',
  urlScheme: 'kelmeinvierno2026',
  iosBundleIdentifier: 'cl.kelme.ligainvierno.puertovaras2026',
  androidPackage: 'cl.kelme.ligainvierno.puertovaras2026',
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://torneos-kelme.vercel.app',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  primaryColor: '#CD212A',
  secondaryColor: '#FFFFFF',
  assetsDir: 'editions/liga-invierno-kelme-puerto-varas-2026',
} as const

export default edition
