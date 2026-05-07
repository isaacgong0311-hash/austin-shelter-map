import type { Shelter } from './types'

// Returns Leaflet marker color based on availability percentage
export function getMarkerColor(shelter: Shelter): 'green' | 'yellow' | 'red' | 'gray' {
  if (isStale(shelter)) return 'gray'
  if (shelter.available_beds === null) return 'gray'
  if (shelter.total_beds === 0) return 'gray'

  const pct = shelter.available_beds / shelter.total_beds
  if (pct > 0.2) return 'green'
  if (pct > 0.05) return 'yellow'
  return 'red'
}

// Returns true if shelter hasn't been updated in 4+ hours
export function isStale(shelter: Shelter): boolean {
  if (!shelter.updated_at) return true
  const updatedAt = new Date(shelter.updated_at)
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000)
  return updatedAt < fourHoursAgo
}

// Returns human-readable "2 hours ago" string
export function formatTimeAgo(isoString: string | null): string {
  if (!isoString) return 'Never updated'
  const date = new Date(isoString)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// Returns available beds for a specific filter type
export function getAvailableForType(
  shelter: Shelter,
  filter: 'men' | 'women' | 'family'
): number {
  if (!shelter.available_by_type) return 0
  return shelter.available_by_type[filter] ?? 0
}
