// Shared helpers for rendering tour data. Plain JS, used from .astro frontmatter
// (build time) and can be reused from client scripts too.

// Figma's trip-type filter uses different wording than tours.json.
// CLAUDE.md: "Tour type label: the data says 'Cultural Immersion', the mobile
// prototype filter says 'Cultural'. Follow Figma." Figma's own chip says "Culture".
export const TYPE_LABELS = {
  Trekking: 'Trekking',
  Culinary: 'Food & Wine',
  'Cultural Immersion': 'Culture',
  Nature: 'Nature',
};

// The soonest departure that hasn't started yet. Falls back to the first
// departure if every one is somehow in the past (shouldn't happen: past
// departures aren't supposed to be in tours.json).
export function nearestDeparture(tour, today = new Date()) {
  const upcoming = tour.departures.filter((d) => new Date(d.start) >= today);
  return upcoming[0] ?? tour.departures[0];
}

export function formatPrice(amount) {
  return `$${amount.toLocaleString('en-US')}`;
}

export function durationBucket(days) {
  if (days <= 5) return 'up-to-5';
  if (days <= 8) return '6-8';
  return '9-plus';
}
