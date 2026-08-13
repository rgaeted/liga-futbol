import { Tabs } from 'expo-router'
import { MOBILE_TAB_TITLES } from '@/src/navigation/tab-config'
import { theme } from '@/src/theme'

export default function TabLayout() {
  const screens = [
    { name: 'index', title: MOBILE_TAB_TITLES[0] },
    { name: 'matches/index', title: MOBILE_TAB_TITLES[1] },
    { name: 'standings', title: MOBILE_TAB_TITLES[2] },
    { name: 'stats', title: MOBILE_TAB_TITLES[3] },
    { name: 'more', title: MOBILE_TAB_TITLES[4] },
  ] as const

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        headerShown: false,
      }}>
      {screens.map((screen) => (
        <Tabs.Screen key={screen.name} name={screen.name} options={{ title: screen.title }} />
      ))}
      <Tabs.Screen name="matches/[matchId]" options={{ href: null }} />
    </Tabs>
  )
}
