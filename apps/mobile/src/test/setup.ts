import { vi } from 'vitest'

process.env.EDITION = 'liga-invierno-kelme-puerto-varas-2026'
;(globalThis as { __DEV__?: boolean }).__DEV__ = true

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        editionKey: 'liga-invierno-kelme-puerto-varas-2026',
        leagueSlug: 'liga-invierno-kelme-puerto-varas-2026',
        apiBaseUrl: 'https://example.test',
        supabaseUrl: 'https://supabase.test',
        supabaseAnonKey: 'anon-key',
        primaryColor: '#CD212A',
        secondaryColor: '#FFFFFF',
        eas: { projectId: 'eas-project-test' },
      },
    },
  },
}))

vi.mock('react-native', async () => {
  const RN = await import('react-native-web')
  return {
    ...RN,
    AppState: {
      currentState: 'active',
      addEventListener: vi.fn(() => ({ remove: vi.fn() })),
    },
  }
})

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => undefined),
    removeItem: vi.fn(async () => undefined),
  },
}))

vi.mock('expo-notifications', () => ({
  requestPermissionsAsync: vi.fn(async () => ({ status: 'denied' })),
  getPermissionsAsync: vi.fn(async () => ({ status: 'denied' })),
  getExpoPushTokenAsync: vi.fn(async () => ({ data: 'ExpoPushToken[test]' })),
  addNotificationResponseReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
}))

vi.mock('expo-web-browser', () => ({
  openBrowserAsync: vi.fn(async () => ({ type: 'dismiss' })),
}))

vi.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useLocalSearchParams: () => ({}),
  Stack: ({ children }: { children: React.ReactNode }) => children,
  Tabs: Object.assign(({ children }: { children: React.ReactNode }) => children, {
    Screen: () => null,
  }),
}))
