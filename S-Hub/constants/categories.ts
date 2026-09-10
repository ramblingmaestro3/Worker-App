/**
 * The single canonical list of service categories.
 *
 * The `key` is the slug stored in the DB (`service_requests.category`,
 * `worker_profiles.skills`) and returned by the `ai-analyze` edge function, so
 * it must never change loosely. Everything that shows a category — PostAJob
 * (client picks a job), BecomeWorker (worker picks skills), the CATEGORY_ICON
 * lookups on JobDetail / Chat / JobPosting / AiAssistant, and the plain
 * capitalised labels elsewhere — reads from here. Add a category once and it
 * appears everywhere.
 *
 * The `ai-analyze` edge function keeps its own copy of the same slugs (it's a
 * separate Deno bundle and can't import this) — keep them in sync.
 */
import { COLORS } from './theme';

export type ServiceCategory = {
  /** DB slug — stable. */
  key: string;
  label: string;
  /** Ionicons name. */
  icon: string;
  /** Emoji + tint for the BecomeWorker skill chips. */
  emoji: string;
  color: string;
};

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  { key: 'plumbing',   label: 'Plumbing',      icon: 'water-outline',         emoji: '🔧', color: COLORS.accent },
  { key: 'electrical', label: 'Electrical',    icon: 'flash-outline',         emoji: '⚡', color: '#F59E0B' },
  { key: 'carpentry',  label: 'Carpentry',     icon: 'hammer-outline',        emoji: '🪚', color: '#92400E' },
  { key: 'painting',   label: 'Painting',      icon: 'color-palette-outline', emoji: '🖌️', color: '#3B82F6' },
  { key: 'cleaning',   label: 'Cleaning',      icon: 'sparkles-outline',      emoji: '🧹', color: '#8B5CF6' },
  { key: 'mechanic',   label: 'Mechanic',      icon: 'car-outline',           emoji: '🚗', color: '#0F766E' },
  { key: 'masonry',    label: 'Masonry',       icon: 'cube-outline',          emoji: '🧱', color: '#DC2626' },
  { key: 'welding',    label: 'Welding',       icon: 'flame-outline',         emoji: '🔩', color: '#64748B' },
  { key: 'ac',         label: 'AC & Cooling',  icon: 'snow-outline',          emoji: '❄️', color: '#0891B2' },
  { key: 'tiling',     label: 'Tiling',        icon: 'grid-outline',          emoji: '🧩', color: '#D97706' },
  { key: 'roofing',    label: 'Roofing',       icon: 'home-outline',          emoji: '🏠', color: '#BE185D' },
  { key: 'security',   label: 'Security/CCTV', icon: 'videocam-outline',      emoji: '📷', color: '#374151' },
  { key: 'other',      label: 'Other',         icon: 'construct-outline',     emoji: '🛠️', color: '#6B7280' },
];

const BY_KEY = new Map(SERVICE_CATEGORIES.map((c) => [c.key, c]));

/** Human label for a stored slug — falls back to capitalising the slug. */
export function categoryLabel(key: string | null | undefined): string {
  if (!key) return 'Job';
  return BY_KEY.get(key)?.label ?? key.charAt(0).toUpperCase() + key.slice(1);
}

/** Ionicons name for a stored slug — falls back to a generic briefcase. */
export function categoryIcon(key: string | null | undefined): string {
  return (key && BY_KEY.get(key)?.icon) || 'briefcase-outline';
}
