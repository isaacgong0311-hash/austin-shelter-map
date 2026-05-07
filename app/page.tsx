'use client'
import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import ShelterList from '@/components/ShelterList'
import { createClient } from '@/lib/supabase/client'
import type { Shelter, FilterType } from '@/lib/types'

const Map = dynamic(() => import('@/components/Map'), { ssr: false })

const FILTERS: { label: string; value: FilterType }[] = [
  { label: 'All', value: 'all' },
  { label: 'Men', value: 'men' },
  { label: 'Women', value: 'women' },
  { label: 'Family', value: 'family' },
]

export default function HomePage() {
  const [shelters, setShelters] = useState<Shelter[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Shelter | null>(null)

  const loadShelters = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase.from('shelter_latest').select('*')
    if (!error) setShelters((data as Shelter[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    loadShelters()

    const channel = supabase
      .channel('bed_counts_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bed_counts' }, loadShelters)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadShelters])

  return (
    <div className="flex h-full">
      {/* Left sidebar */}
      <div className="w-80 shrink-0 flex flex-col border-r border-gray-800/60 bg-gray-950">
        {/* Filter tabs */}
        <div className="flex gap-1 p-3 border-b border-gray-800/60">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f.value
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-600">
            <div className="w-6 h-6 border-2 border-gray-700 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-xs">Loading shelters...</p>
          </div>
        ) : (
          <ShelterList
            shelters={shelters}
            filter={filter}
            onSelect={setSelected}
            selected={selected}
          />
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-gray-700 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : (
          <Map shelters={shelters} filter={filter} selectedId={selected?.id ?? null} />
        )}
      </div>
    </div>
  )
}
