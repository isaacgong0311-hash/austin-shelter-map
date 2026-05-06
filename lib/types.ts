export type Shelter = {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  total_beds: number
  bed_types: { men: number; women: number; family: number }
  phone: string | null
  available_beds: number | null
  available_by_type: { men: number; women: number; family: number } | null
  notes: string | null
  updated_at: string | null
}

export type BedCount = {
  id: string
  shelter_id: string
  available_beds: number
  available_by_type: { men: number; women: number; family: number }
  notes: string | null
  updated_at: string
  updated_by: string
}

export type Profile = {
  id: string
  shelter_id: string | null
  role: 'staff' | 'admin'
  full_name: string | null
}

export type FilterType = 'all' | 'men' | 'women' | 'family'
