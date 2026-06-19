import type { MapViewState } from '@deck.gl/core'
import { Globe, KeyRound, Layers } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import CityPicker from '@/components/CityPicker'
import SkylineDeck from '@/components/SkylineDeck'
import type { City } from '@/data/cities'
import { DEFAULT_CITY_ID, getCity } from '@/data/cities'
import { fetchBuildingsForArea } from '@/lib/overpass'
import type { BuildingSpec } from '@/lib/skyline'
import { buildSkyline, generateBuildings } from '@/lib/skyline'

export type BasemapMode = 'satellite' | 'vector'

const FETCH_RADIUS = 1400
const MOVE_THRESHOLD_M = 400

const R = 6_371_000

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function makeViewState(city: City): MapViewState {
  return {
    longitude: city.center.lng,
    latitude: city.center.lat,
    zoom: city.view.zoom,
    pitch: city.view.pitch,
    bearing: city.view.bearing,
  }
}

function deduplicate(buildings: BuildingSpec[]): BuildingSpec[] {
  const seen = new Set<string>()
  return buildings.filter((b) => {
    if (seen.has(b.id)) return false
    seen.add(b.id)
    return true
  })
}

async function fetchArea(
  center: { lat: number; lng: number },
  signal: AbortSignal,
  onData: (buildings: BuildingSpec[]) => void,
) {
  try {
    const fetched = await fetchBuildingsForArea(center.lat, center.lng, FETCH_RADIUS, signal)
    if (!signal.aborted) onData(fetched)
  } catch {
    // keep accumulated buildings
  }
}

export default function App() {
  const [cityId, setCityId] = useState(DEFAULT_CITY_ID)
  const [viewState, setViewState] = useState<MapViewState>(() => makeViewState(getCity(DEFAULT_CITY_ID)))
  const [basemap, setBasemap] = useState<BasemapMode>('vector')
  const [realBuildings, setRealBuildings] = useState<BuildingSpec[]>([])
  const [showSkyline, setShowSkyline] = useState(true)

  const lastFetchRef = useRef<{ lat: number; lng: number } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const city = getCity(cityId)

  // Fetch on city switch.
  useEffect(() => {
    const c = getCity(cityId)
    setRealBuildings([])
    lastFetchRef.current = null

    const center = { lat: c.center.lat, lng: c.center.lng }
    lastFetchRef.current = center
    const ac = new AbortController()
    fetchArea(center, ac.signal, (data) => setRealBuildings(data))
    return () => ac.abort()
  }, [cityId])

  const buildings = useMemo(() => {
    const c = getCity(cityId)
    const filler =
      realBuildings.length > 0
        ? realBuildings
        : generateBuildings({
            center: c.districtCenter,
            count: c.fillerCount,
            seed: c.seed,
          })
    return buildSkyline([...c.landmarks, ...filler])
  }, [cityId, realBuildings])

  const handleViewStateChange = (next: MapViewState) => {
    setViewState(next)
    const lat = next.latitude
    const lng = next.longitude
    if (lat === undefined || lng === undefined) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const last = lastFetchRef.current
      if (last && haversineMeters(last.lat, last.lng, lat, lng) < MOVE_THRESHOLD_M) return
      lastFetchRef.current = { lat, lng }

      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      fetchArea({ lat, lng }, ac.signal, (data) => setRealBuildings((prev) => deduplicate([...prev, ...data])))
    }, 400)
  }

  const handleSelectCity = (id: string) => {
    abortRef.current?.abort()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setCityId(id)
    setViewState(makeViewState(getCity(id)))
  }

  return (
    <main className="relative h-full w-full overflow-hidden bg-paper">
      <SkylineDeck
        buildings={buildings}
        viewState={viewState}
        onViewStateChange={handleViewStateChange}
        basemap={basemap}
        showSkyline={showSkyline}
      />

      <div className="pointer-events-none absolute right-4 top-4 left-auto">
        <div className="pointer-events-auto inline-block">
          <CityPicker
            city={city}
            pitch={viewState.pitch ?? 0}
            bearing={viewState.bearing ?? 0}
            buildingCount={buildings.length}
            basemap={basemap}
            onSelectCity={handleSelectCity}
            onPitchChange={(pitch) => setViewState((prev) => ({ ...prev, pitch }))}
            onBearingChange={(bearing) => setViewState((prev) => ({ ...prev, bearing }))}
            onReset={() => setViewState(makeViewState(city))}
            onBasemapChange={setBasemap}
            showSkyline={showSkyline}
            onToggleSkyline={() => setShowSkyline((prev) => !prev)}
          />
        </div>
      </div>

      {/* Attribution bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center">
        <div
          className="card-frost-inline animate-enter pointer-events-auto inline-flex items-center gap-2.5 px-4 py-2 font-mono text-[11px] text-slate-500"
          style={{ animationDelay: '0.15s', animationFillMode: 'backwards' }}
        >
          <span className="flex items-center gap-1.5">
            <Layers size={12} strokeWidth={1.6} className="text-cyan-500" />
            deck.gl
          </span>
          <span className="h-3 w-px bg-slate-300/60" />
          <span className="flex items-center gap-1.5">
            <Globe size={12} strokeWidth={1.6} className="text-cyan-500" />
            {basemap === 'satellite' ? 'ESRI satellite' : 'CARTO vector'}
          </span>
          <span className="h-3 w-px bg-slate-300/60" />
          <span className="flex items-center gap-1.5">
            <KeyRound size={12} strokeWidth={1.6} className="text-cyan-500" />
            no API key
          </span>
          <span className="h-3 w-px bg-slate-300/60" />
          <span className="tabular-nums">{buildings.length} buildings</span>
          <span className="h-3 w-px bg-slate-300/60" />
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${realBuildings.length > 0 ? 'bg-emerald-400' : 'bg-ember-400'}`}
            />
            {realBuildings.length > 0 ? 'OSM live' : 'generated'}
          </span>
        </div>
      </div>
    </main>
  )
}
