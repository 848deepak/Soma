import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Platform, useColorScheme } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#9B7E8C',     // somaMauve — active icon/label
        tabBarInactiveTintColor: isDark ? 'rgba(242,242,242,0.4)' : '#C4B5BB',
        tabBarStyle: {
          // Glassmorphic bottom nav matching Figma BottomNav.tsx
          backgroundColor: isDark ? 'rgba(15,17,21,0.95)' : 'rgba(255,253,251,0.95)',
          borderTopWidth: 1,
          borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(221,167,165,0.15)',
          // Soft shadow above nav bar
          ...Platform.select({
            ios: {
              shadowColor: isDark ? '#000000' : '#DDA7A5',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: isDark ? 0.3 : 0.08,
              shadowRadius: 24,
            },
            android: {
              elevation: 16,
            },
          }),
          // Generous height matching Figma's 80px bottom nav area
          height: 80,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'System',
          fontSize: 11,
          fontWeight: '400',
          letterSpacing: 0,
          marginTop: 2,
        },
        // Active tab pill background — subtle rose circle behind active icon
        tabBarItemStyle: {
          borderRadius: 22,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'house.fill', android: 'home', web: 'home' }}
              tintColor={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
              tintColor={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'chart.bar.xaxis', android: 'bar_chart', web: 'bar_chart' }}
              tintColor={color}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'person.crop.circle', android: 'person', web: 'person' }}
              tintColor={color}
              size={22}
            />
          ),
        }}
      />
    </Tabs>
  );
}
