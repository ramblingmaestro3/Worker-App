export const COLORS = {
  // ── Primary Brand ──
  primary: '#006B3F',  // Ghana green
  primaryDark: '#004D2C',  // Darker green for pressed states
  primaryLight: '#E6F4EE',  // Light green for backgrounds

  // ── Accent ──
  accent: '#FCD116',  // Ghana gold
  accentDark: '#D4A900',  // Darker gold
  accentLight: '#FFFBEA',  // Light gold for backgrounds

  // ── Danger / Action ──
  danger: '#CE1126',  // Ghana red
  dangerLight: '#FDECEA',  // Light red for backgrounds

  // ── Neutrals ──
  background: '#FAFAF5',  // Cream white
  card: '#FFFFFF',  // Pure white cards
  dark: '#1A1A1A',  // Near black
  text: '#1A1A1A',  // Primary text
  muted: '#6B6B6B',  // Secondary text
  border: '#E8E8E0',  // Borders
  bgGrey: '#F2F2EC',  // Input backgrounds

  // ── Status ──
  success: '#006B3F',  // Same as primary
  warning: '#FCD116',  // Same as accent
  error: '#CE1126',  // Same as danger

  // ── Verified badge ──
  verified: '#1D9BF0',  // Blue verified tick

  // ── Stars ──
  star: '#FCD116',  // Gold stars — matches accent
};

export const FONTS = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  black: '800',
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
};

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: COLORS.text,
    background: COLORS.background,
    tint: COLORS.primary,
    icon: COLORS.muted,
    tabIconDefault: COLORS.muted,
    tabIconSelected: COLORS.primary,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#fff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
}) as {
  sans: string;
  serif: string;
  rounded: string;
  mono: string;
};