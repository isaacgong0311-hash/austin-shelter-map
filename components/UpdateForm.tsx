'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Toast from './Toast'
import type { Shelter, BedCount } from '@/lib/types'

type Props = {
  shelter: Shelter
  userId: string
  recentUpdates: BedCount[]
  onUpdate: () => void
}

export default function UpdateForm({ shelter, userId, recentUpdates, onUpdate }: Props) {
  const [available, setAvailable] = useState(shelter.available_beds ?? 0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const change = (delta: number) => {
    setAvailable((v) => Math.max(0, Math.min(shelter.total_beds, v + delta)))
  }

  const handleSubmit = async () => {
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.from('bed_counts').insert({
      shelter_id: shelter.id,
      available_beds: available,
      notes: notes || null,
      updated_by: userId,
    })

    if (error) {
      setToast({ message: 'Error saving. Try again.', type: 'error' })
    } else {
      setToast({ message: '✓ Updated successfully!', type: 'success' })
      setNotes('')
      onUpdate()
    }
    setLoading(false)
  }

  return (
    <div className="max-w-sm mx-auto p-4">
      <h1 className="text-2xl font-bold mb-1">{shelter.name}</h1>
      <p className="text-gray-400 text-sm mb-6">{shelter.address}</p>

      <div className="bg-gray-900 rounded-2xl p-6 mb-4">
        <p className="text-gray-400 text-sm mb-4 text-center">Available beds right now</p>
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => change(-1)}
            className="w-16 h-16 rounded-full bg-gray-800 text-3xl font-bold hover:bg-gray-700 active:scale-95 transition-all"
          >
            −
          </button>
          <span className="text-6xl font-bold w-20 text-center">{available}</span>
          <button
            onClick={() => change(1)}
            className="w-16 h-16 rounded-full bg-gray-800 text-3xl font-bold hover:bg-gray-700 active:scale-95 transition-all"
          >
            +
          </button>
        </div>
        <p className="text-center text-gray-500 text-sm mt-3">of {shelter.total_beds} total beds</p>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional note (e.g. 'Lobby full, overflow available')"
        className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none text-sm mb-4"
        rows={2}
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-bold text-lg transition-colors"
      >
        {loading ? 'Saving...' : 'Update Count'}
      </button>

      {recentUpdates.length > 0 && (
        <div className="mt-6">
          <p className="text-gray-500 text-xs mb-2">Recent updates</p>
          {recentUpdates.map((u) => (
            <div key={u.id} className="flex justify-between text-sm py-1 border-b border-gray-800">
              <span className="font-medium">{u.available_beds} beds</span>
              <span className="text-gray-500">
                {new Date(u.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}
