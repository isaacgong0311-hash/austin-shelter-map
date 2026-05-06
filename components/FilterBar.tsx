'use client'
import type { FilterType } from '@/lib/types'

const filters: { label: string; value: FilterType }[] = [
  { label: 'All Beds', value: 'all' },
  { label: 'Men', value: 'men' },
  { label: 'Women', value: 'women' },
  { label: 'Family', value: 'family' },
]

type Props = {
  active: FilterType
  onChange: (filter: FilterType) => void
}

export default function FilterBar({ active, onChange }: Props) {
  return (
    <div className="flex gap-2 p-3 bg-gray-900 border-b border-gray-800">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            active === f.value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
