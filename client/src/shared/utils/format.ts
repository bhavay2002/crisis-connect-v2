import { formatDistanceToNow, format } from "date-fns";

/** Human-readable elapsed time — e.g. "3 minutes ago" */
export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/** Short datetime — e.g. "May 3, 03:15" */
export function shortDateTime(date: string | Date): string {
  return format(new Date(date), "MMM d, HH:mm");
}

/** Capitalize first letter */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Slug → Label — e.g. "road_accident" → "Road Accident" */
export function slugToLabel(slug: string): string {
  return slug.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

/** Clamp value between min and max */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Abbreviate large numbers — e.g. 1200 → "1.2k" */
export function abbreviate(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
