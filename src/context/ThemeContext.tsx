import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    DarkTheme,
    DefaultTheme,
    type Theme as NavigationTheme,
} from "@react-navigation/native";
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import { THEME_PREFERENCE_KEY } from "@/src/constants/storage";
import {
    isDarkThemeType,
    themeByType,
    type ThemeType,
} from "@/src/theme/tokens";

type ThemeContextValue = {
  theme: ThemeType;
  isDark: boolean;
  colors: (typeof themeByType)[ThemeType];
  isHydrated: boolean;
  setTheme: (theme: ThemeType) => void;
  navigationTheme: NavigationTheme;
};

const defaultThemeColors = themeByType.cream;
const defaultNavigationTheme: NavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: defaultThemeColors.primary,
    background: defaultThemeColors.background,
    card: defaultThemeColors.surface,
    border: defaultThemeColors.border,
    text: defaultThemeColors.textPrimary,
    notification: defaultThemeColors.accent,
  },
};

const defaultThemeContextValue: ThemeContextValue = {
  theme: "cream",
  isDark: false,
  colors: defaultThemeColors,
  isHydrated: true,
  setTheme: () => {
    return;
  },
  navigationTheme: defaultNavigationTheme,
};

const ThemeContext = createContext<ThemeContextValue>(defaultThemeContextValue);

const VALID_THEMES: ThemeType[] = ["cream", "midnight", "lavender"];

function isThemeType(value: string | null): value is ThemeType {
  return Boolean(value && VALID_THEMES.includes(value as ThemeType));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>("cream");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function hydrateTheme() {
      try {
        const persisted = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
        if (isMounted && isThemeType(persisted)) {
          setThemeState(persisted);
        }
      } catch {
        // Keep default theme when persistence fails.
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    }

    void hydrateTheme();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    void AsyncStorage.setItem(THEME_PREFERENCE_KEY, theme);
  }, [theme, isHydrated]);

  const value = useMemo<ThemeContextValue>(() => {
    const isDark = isDarkThemeType(theme);
    const colors = themeByType[theme];

    const baseNavigationTheme = isDark ? DarkTheme : DefaultTheme;
    const navigationTheme: NavigationTheme = {
      ...baseNavigationTheme,
      colors: {
        ...baseNavigationTheme.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        border: colors.border,
        text: colors.textPrimary,
        notification: colors.accent,
      },
    };

    return {
      theme,
      isDark,
      colors,
      isHydrated,
      setTheme: setThemeState,
      navigationTheme,
    };
  }, [theme, isHydrated]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
