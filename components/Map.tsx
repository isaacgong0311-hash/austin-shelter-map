'use client'
import { useEffect, useRef } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import type { Shelter, FilterType } from '@/lib/types'
import { getMarkerColor, isStale, formatTimeAgo, getAvailableForType } from '@/lib/utils'

const COLORS = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  gray: '#6b7280',
}

type Props = {
  shelters: Shelter[]
  filter: FilterType
}

export default function Map({ shelters, filter }: Props) {
  const mapRef = useRef<LeafletMap | null>(null)
  const containerId = 'shelter-map'

  useEffect(() => {
    if (typeof window === 'undefined') return

    const initMap = async () => {
      const L = (await import('leaflet')).default

      if (!mapRef.current) {
        mapRef.current = L.map(containerId).setView([30.2672, -97.7431], 13)

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap contributors © CARTO',
          subdomains: 'abcd',
          maxZoom: 19,
        }).addTo(mapRef.current)
      }

      const map = mapRef.current

      // Remove existing markers
      map.eachLayer((layer) => {
        if ((layer as unknown as { _isMarker?: boolean })._isMarker) map.removeLayer(layer)
      })

      shelters.forEach((shelter) => {
        const color = COLORS[getMarkerColor(shelter)]
        const stale = isStale(shelter)

        const available =
          filter === 'all'
            ? shelter.available_beds ?? 0
            : getAvailableForType(shelter, filter)

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width: 28px; height: 28px;
            background: ${color};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          "></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        })

        const marker = L.marker([shelter.lat, shelter.lng], { icon })
        ;(marker as unknown as { _isMarker: boolean })._isMarker = true

        const timeText = stale
          ? `⚠️ ${formatTimeAgo(shelter.updated_at)} — may be outdated`
          : formatTimeAgo(shelter.updated_at)

        marker.bindPopup(`
          <div style="font-family: sans-serif; min-width: 180px;">
            <strong style="font-size: 14px;">${shelter.name}</strong><br/>
            <span style="color: #555; font-size: 12px;">${shelter.address}</span><br/>
            <br/>
            <span style="font-size: 20px; font-weight: bold; color: ${color};">
              ${available}
            </span>
            <span style="color: #555;"> beds available</span><br/>
            <span style="font-size: 11px; color: #888;">${timeText}</span><br/>
            ${shelter.phone ? `<br/><a href="tel:${shelter.phone}" style="color: #3b82f6;">${shelter.phone}</a>` : ''}
          </div>
        `)

        marker.addTo(map)
      })
    }

    initMap()
  }, [shelters, filter])

  return <div id={containerId} style={{ width: '100%', height: '100%' }} />
}
