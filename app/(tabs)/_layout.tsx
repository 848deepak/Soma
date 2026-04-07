import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Platform, View } from 'react-native';

import { useAppTheme } from '@/src/context/ThemeContext';

export default function TabLayout() {
  const { theme, isDark } = useAppTheme();

  const activeTintByTheme = {
    cream: '#9B7E8C',
    midnight: '#A78BFA',
    lavender: '#C084FC',
  } as const;

  const inactiveTintByTheme = {
    cream: '#C4B5BB',
    midnight: 'rgba(242,242,242,0.4)',
    lavender: 'rgba(46,16,101,0.4)',
  } as const;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeTintByTheme[theme],
        tabBarInactiveTintColor: inactiveTintByTheme[theme],
        tabBarStyle: {
          // Glassmorphic bottom nav matching Figma BottomNav.tsx
          backgroundColor: isDark
            ? 'rgba(15,17,21,0.95)'
            : theme === 'lavender'
              ? 'rgba(243,240,255,0.96)'
              : 'rgba(255,253,251,0.96)',
          borderTopWidth: 1,
          borderTopColor: isDark
            ? 'rgba(255,255,255,0.08)'
            : theme === 'lavender'
              ? 'rgba(192,132,252,0.2)'
              : 'rgba(221,167,165,0.12)',
          // Soft shadow above nav bar
          ...Platform.select({
            ios: {
              shadowColor: isDark
                ? '#000000'
                : theme === 'lavender'
                  ? '#C084FC'
                  : '#DDA7A5',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: isDark ? 0.3 : 0.1,
              shadowRadius: 24,
            },
            android: {
              elevation: 16,
            },
          }),
          // Generous height matching Figma's 80px bottom nav area
          height: 86,
          paddingBottom: 18,
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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused
                  ? isDark
                    ? 'rgba(167,139,250,0.24)'
                    : theme === 'lavender'
                      ? 'rgba(129,140,248,0.3)'
                      : 'rgba(255, 218, 185, 0.5)'
                  : 'transparent',
              }}
            >
              <SymbolView
                name={{ ios: 'house.fill', android: 'home', web: 'home' }}
                tintColor={color}
                size={22}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused
                  ? isDark
                    ? 'rgba(167,139,250,0.24)'
                    : theme === 'lavender'
                      ? 'rgba(129,140,248,0.3)'
                      : 'rgba(255, 218, 185, 0.5)'
                  : 'transparent',
              }}
            >
              <SymbolView
                name={{
                  ios: 'calendar',
                  android: 'calendar_month',
                  web: 'calendar_month',
                }}
                tintColor={color}
                size={22}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused
                  ? isDark
                    ? 'rgba(167,139,250,0.24)'
                    : theme === 'lavender'
                      ? 'rgba(129,140,248,0.3)'
                      : 'rgba(255, 218, 185, 0.5)'
                  : 'transparent',
              }}
            >
              <SymbolView
                name={{
                  ios: 'chart.bar.xaxis',
                  android: 'bar_chart',
                  web: 'bar_chart',
                }}
                tintColor={color}
                size={22}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused
                  ? isDark
                    ? 'rgba(167,139,250,0.24)'
                    : theme === 'lavender'
                      ? 'rgba(129,140,248,0.3)'
                      : 'rgba(255, 218, 185, 0.5)'
                  : 'transparent',
              }}
            >
              <SymbolView
                name={{
                  ios: 'person.crop.circle',
                  android: 'person',
                  web: 'person',
                }}
                tintColor={color}
                size={22}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
