'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import FilterBar from '@/components/FilterBar'
import { createClient } from '@/lib/supabase/client'
import type { Shelter, FilterType } from '@/lib/types'

const Map = dynamic(() => import('@/components/Map'), { ssr: false })

export default function HomePage() {
  const [shelters, setShelters] = useState<Shelter[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    const loadShelters = async () => {
      const { data, error } = await supabase
        .from('shelter_latest')
        .select('*')

      if (error) {
        console.error('Error loading shelters:', error)
      } else {
        setShelters((data as Shelter[]) ?? [])
      }
      setLoading(false)
    }

    loadShelters()

    // Real-time subscription — reload when any bed count is submitted
    const channel = supabase
      .channel('bed_counts_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bed_counts' },
        () => { loadShelters() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 57px)' }}>
      <FilterBar active={filter} onChange={setFilter} />

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          Loading shelters...
        </div>
      ) : (
        <div className="flex-1">
          <Map shelters={shelters} filter={filter} />
        </div>
      )}

      <div className="px-4 py-2 bg-gray-900 border-t border-gray-800 text-xs text-gray-500">
        Data is self-reported by partner shelters. Always call ahead to confirm availability.
      </div>
    </div>
  )
}
