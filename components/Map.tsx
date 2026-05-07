'use client'
import { useEffect, useRef } from 'react'
import type { Map as LeafletMap, Marker } from 'leaflet'
import type { Shelter, FilterType } from '@/lib/types'
import { getMarkerColor, isStale, formatTimeAgo, getAvailableForType } from '@/lib/utils'

const COLORS = {
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#ef4444',
  gray: '#4b5563',
}

const GLOW = {
  green: 'rgba(16,185,129,0.35)',
  yellow: 'rgba(245,158,11,0.35)',
  red: 'rgba(239,68,68,0.35)',
  gray: 'rgba(75,85,99,0.2)',
}

type Props = {
  shelters: Shelter[]
  filter: FilterType
  selectedId: string | null
}

export default function Map({ shelters, filter, selectedId }: Props) {
  const mapRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<Record<string, Marker>>({})
  const containerId = 'shelter-map'

  useEffect(() => {
    if (typeof window === 'undefined') return

    const initMap = async () => {
      const L = (await import('leaflet')).default

      if (!mapRef.current) {
        mapRef.current = L.map(containerId, { zoomControl: false }).setView([30.2672, -97.7431], 14)

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap contributors © CARTO',
          subdomains: 'abcd',
          maxZoom: 19,
        }).addTo(mapRef.current)

        // Zoom control bottom-right
        L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current)
      }

      const map = mapRef.current

      // Remove old markers
      Object.values(markersRef.current).forEach(m => m.remove())
      markersRef.current = {}

      shelters.forEach((shelter) => {
        const color = getMarkerColor(shelter)
        const hex = COLORS[color]
        const glow = GLOW[color]
        const stale = isStale(shelter)

        const available = filter === 'all'
          ? shelter.available_beds ?? 0
          : getAvailableForType(shelter, filter)

        const isSelected = shelter.id === selectedId

        const icon = L.divIcon({
          className: '',
          html: `
            <div style="position:relative; display:flex; align-items:center; justify-content:center;">
              <div style="
                position:absolute;
                width:${isSelected ? 52 : 40}px;
                height:${isSelected ? 52 : 40}px;
                border-radius:50%;
                background:${glow};
                animation: pulse 2s infinite;
              "></div>
              <div style="
                position:relative;
                width:${isSelected ? 36 : 28}px;
                height:${isSelected ? 36 : 28}px;
                border-radius:50%;
                background:${hex};
                border: ${isSelected ? '3px' : '2px'} solid rgba(255,255,255,${isSelected ? 0.9 : 0.6});
                box-shadow: 0 0 ${isSelected ? 20 : 10}px ${glow};
                display:flex; align-items:center; justify-content:center;
                font-size:${isSelected ? 11 : 9}px;
                font-weight:700;
                color:white;
                font-family:sans-serif;
              ">${available}</div>
            </div>
          `,
          iconSize: [52, 52],
          iconAnchor: [26, 26],
        })

        const timeText = stale
          ? `⚠️ ${formatTimeAgo(shelter.updated_at)}`
          : formatTimeAgo(shelter.updated_at)

        const marker = L.marker([shelter.lat, shelter.lng], { icon })

        marker.bindPopup(`
          <div style="font-family:-apple-system,sans-serif; min-width:200px; padding:4px 0;">
            <p style="font-weight:700; font-size:13px; margin:0 0 4px; color:#111;">${shelter.name}</p>
            <p style="font-size:11px; color:#888; margin:0 0 10px;">${shelter.address}</p>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
              <span style="font-size:28px; font-weight:800; color:${hex};">${available}</span>
              <div>
                <p style="margin:0; font-size:11px; color:#555;">beds available</p>
                <p style="margin:0; font-size:11px; color:#999;">of ${shelter.total_beds} total</p>
              </div>
            </div>
            <p style="font-size:10px; color:#aaa; margin:0 0 6px;">${timeText}</p>
            ${shelter.phone ? `<a href="tel:${shelter.phone}" style="font-size:11px; color:#3b82f6; text-decoration:none;">📞 ${shelter.phone}</a>` : ''}
          </div>
        `, { maxWidth: 240 })

        marker.addTo(map)
        markersRef.current[shelter.id] = marker

        if (isSelected) {
          marker.openPopup()
          map.panTo([shelter.lat, shelter.lng], { animate: true })
        }
      })
    }

    initMap()
  }, [shelters, filter, selectedId])

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.4); opacity: 0.3; }
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2) !important;
        }
        .leaflet-popup-tip { display: none; }
      `}</style>
      <div id={containerId} style={{ width: '100%', height: '100%' }} />
    </>
  )
}
