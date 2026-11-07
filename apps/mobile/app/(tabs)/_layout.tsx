import { Tabs } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MOBILE_TAB_TITLES } from '@/src/navigation/tab-config'
import { theme } from '@/src/theme'

export default function TabLayout() {
  const insets = useSafeAreaInsets()
  const bottomPadding = Math.max(insets.bottom, 12)
  const screens = [
    { name: 'index', title: MOBILE_TAB_TITLES[0], icon: 'home-outline', activeIcon: 'home' },
    { name: 'matches', title: MOBILE_TAB_TITLES[1], icon: 'football-outline', activeIcon: 'football' },
    { name: 'standings', title: MOBILE_TAB_TITLES[2], icon: 'trophy-outline', activeIcon: 'trophy' },
    { name: 'stats', title: MOBILE_TAB_TITLES[3], icon: 'stats-chart-outline', activeIcon: 'stats-chart' },
    { name: 'more', title: MOBILE_TAB_TITLES[4], icon: 'grid-outline', activeIcon: 'grid' },
  ] as const

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#78C8FF',
        tabBarInactiveTintColor: '#D5E3F2',
        tabBarStyle: {
          backgroundColor: '#071E38',
          borderTopColor: '#244463',
          borderTopWidth: 1,
          height: 70 + bottomPadding,
          paddingTop: 8,
          paddingBottom: bottomPadding,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 3 },
        tabBarItemStyle: { minHeight: 54 },
        sceneStyle: { backgroundColor: theme.background },
        headerShown: false,
      }}>
      {screens.map((screen) => (
        <Tabs.Screen key={screen.name} name={screen.name} options={{
          title: screen.title,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? screen.activeIcon : screen.icon} size={24} color={color} />
          ),
        }} />
      ))}
    </Tabs>
  )
}
