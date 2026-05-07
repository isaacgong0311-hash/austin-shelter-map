'use client'
import type { Shelter, FilterType } from '@/lib/types'
import { getMarkerColor, formatTimeAgo, isStale, getAvailableForType } from '@/lib/utils'

type Props = {
  shelters: Shelter[]
  filter: FilterType
  onSelect: (shelter: Shelter) => void
  selected: Shelter | null
}

const STATUS_STYLES = {
  green: { bg: 'bg-emerald-500/10 border-emerald-500/30', badge: 'bg-emerald-500', text: 'text-emerald-400', label: 'Available' },
  yellow: { bg: 'bg-amber-500/10 border-amber-500/30', badge: 'bg-amber-500', text: 'text-amber-400', label: 'Limited' },
  red: { bg: 'bg-red-500/10 border-red-500/30', badge: 'bg-red-500', text: 'text-red-400', label: 'Full' },
  gray: { bg: 'bg-gray-800/50 border-gray-700/50', badge: 'bg-gray-500', text: 'text-gray-400', label: 'Unknown' },
}

export default function ShelterList({ shelters, filter, onSelect, selected }: Props) {
  const totalAvailable = shelters.reduce((sum, s) => {
    const beds = filter === 'all' ? (s.available_beds ?? 0) : getAvailableForType(s, filter)
    return sum + beds
  }, 0)

  const totalBeds = shelters.reduce((sum, s) => sum + s.total_beds, 0)
  const activeShelters = shelters.filter(s => !isStale(s) && s.available_beds !== null).length

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Stats header */}
      <div className="px-4 py-5 border-b border-gray-800/80">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-gray-400 uppercase tracking-widest font-medium">Live</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
            <p className="text-2xl font-bold text-white">{totalAvailable}</p>
            <p className="text-xs text-gray-500 mt-0.5">beds available</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
            <p className="text-2xl font-bold text-white">{activeShelters}</p>
            <p className="text-xs text-gray-500 mt-0.5">shelters reporting</p>
          </div>
        </div>
      </div>

      {/* Shelter cards */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {shelters.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-gray-600 text-sm">
            <p>No shelters loaded.</p>
            <p className="text-xs mt-1">Check Supabase connection.</p>
          </div>
        )}
        {shelters.map((shelter) => {
          const color = getMarkerColor(shelter)
          const styles = STATUS_STYLES[color]
          const available = filter === 'all'
            ? shelter.available_beds ?? 0
            : getAvailableForType(shelter, filter)
          const pct = shelter.total_beds > 0
            ? Math.round((available / shelter.total_beds) * 100)
            : 0
          const isSelected = selected?.id === shelter.id

          return (
            <button
              key={shelter.id}
              onClick={() => onSelect(shelter)}
              className={`w-full text-left rounded-xl border p-3.5 transition-all ${styles.bg} ${
                isSelected ? 'ring-1 ring-white/20' : 'hover:brightness-125'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-semibold text-white leading-snug line-clamp-2">
                  {shelter.name}
                </p>
                <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full text-white ${styles.badge}`}>
                  {styles.label}
                </span>
              </div>

              <div className="flex items-end justify-between mb-2">
                <div>
                  <span className={`text-2xl font-bold ${styles.text}`}>{available}</span>
                  <span className="text-gray-500 text-xs ml-1">/ {shelter.total_beds} beds</span>
                </div>
                <span className="text-xs text-gray-600">{pct}%</span>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${styles.badge}`}
                  style={{ width: `${pct}%`, transition: 'width 0.5s ease' }}
                />
              </div>

              <p className="text-xs text-gray-600 mt-2">
                {isStale(shelter) ? '⚠️ ' : ''}{formatTimeAgo(shelter.updated_at)}
              </p>
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-800/80">
        <p className="text-xs text-gray-600 text-center">
          Data self-reported by shelters · always call ahead
        </p>
      </div>
    </div>
  )
}
