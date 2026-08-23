import { Platform } from 'react-native';

export const COLORS = {
  // ── Primary Brand (AdwumaGo gold) ──
  primary: '#F0AE2E',  // Warm amber gold
  primaryDark: '#C4841A',  // Deeper gold for pressed states / gradients
  primaryLight: 'rgba(240,174,46,0.16)',  // Translucent gold wash for dark surfaces

  // ── Accent (Ghana green) ──
  accent: '#2FAE60',
  accentDark: '#1E8A49',
  accentLight: 'rgba(47,174,96,0.16)',

  // ── Danger / Action (Ghana red) ──
  danger: '#E1293D',
  dangerLight: 'rgba(225,41,61,0.16)',

  // ── Neutrals (warm dark) ──
  background: '#120C09',  // Warm near-black page background
  card: '#1C130D',  // Elevated warm-dark surface
  dark: '#F5F1EA',  // Warm off-white — highest-contrast foreground
  text: '#F5F1EA',  // Primary text
  muted: '#A99C8E',  // Secondary/muted text
  border: '#2A2019',  // Subtle warm-dark borders
  bgGrey: '#231A12',  // Input / subtle-surface background

  // ── Status ──
  success: '#2FAE60',  // Ghana green
  warning: '#F0AE2E',  // Gold
  error: '#E1293D',  // Ghana red

  // ── Verified badge ──
  verified: '#4DA3FF',  // Blue verified tick

  // ── Stars ──
  star: '#F0AE2E',  // Gold stars — matches primary
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