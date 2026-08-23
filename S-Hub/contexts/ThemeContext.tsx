import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

type ColorScheme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  /** The resolved scheme ('light' | 'dark') actually applied right now */
  colorScheme: 'light' | 'dark';
  /** The user's stored preference ('light' | 'dark' | 'system') */
  preference: ColorScheme;
  /** True when the resolved scheme is dark */
  isDark: boolean;
  setPreference: (pref: ColorScheme) => void;
  /** Convenience toggle between light and dark (stores explicit preference) */
  toggleDark: () => void;
}

const STORAGE_KEY = 'theme_preference';

const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: 'light',
  preference: 'light',
  isDark: false,
  setPreference: () => {},
  toggleDark: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? 'dark';
  // Default to 'dark' — AdwumaGo's brand theme is dark-first; only change when user explicitly toggles
  const [preference, setPreferenceState] = useState<ColorScheme>('dark');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === 'light' || val === 'dark' || val === 'system') {
        setPreferenceState(val);
      }
      setIsLoaded(true);
    }).catch(() => {
      setIsLoaded(true);
    });
  }, []);

  const setPreference = (pref: ColorScheme) => {
    setPreferenceState(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref);
  };

  // Only resolve after storage is loaded to avoid a flash
  const colorScheme: 'light' | 'dark' = !isLoaded
    ? 'dark'
    : preference === 'system'
      ? systemScheme
      : preference;

  const isDark = colorScheme === 'dark';

  const toggleDark = () => {
    setPreference(isDark ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ colorScheme, preference, isDark, setPreference, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}

/** Returns a reactive color palette that flips between light and dark values. */
export function useThemeColors() {
  const { isDark } = useAppTheme();
  return {
    bg:          isDark ? '#120C09' : '#F5F5F0',
    card:        isDark ? '#1C130D' : '#FFFFFF',
    header:      isDark ? '#1C130D' : '#FFFFFF',
    text:        isDark ? '#F5F1EA' : '#1A1A1A',
    subText:     isDark ? '#A99C8E' : '#6B6B6B',
    border:      isDark ? '#2A2019' : '#F0F0F0',
    icon:        isDark ? '#A99C8E' : '#444444',
    inputBg:     isDark ? '#231A12' : '#F2F2F2',
    navBg:       isDark ? '#1C130D' : '#FFFFFF',
    navBorder:   isDark ? '#2A2019' : '#ECECEC',
    divider:     isDark ? '#241B14' : '#F5F5F5',
    statusBar:   (isDark ? 'light-content' : 'dark-content') as 'light-content' | 'dark-content',
  };
}

