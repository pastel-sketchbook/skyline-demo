import type { MapViewState } from '@deck.gl/core'
import { WebMercatorViewport } from '@deck.gl/core'
import { Globe, KeyRound, Layers, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import CityPicker from '@/components/CityPicker'
import SkylineDeck from '@/components/SkylineDeck'
import type { City } from '@/data/cities'
import { DEFAULT_CITY_ID, getCity } from '@/data/cities'
import { fetchBuildingsForArea } from '@/lib/overpass'
import type { BuildingSpec, SkylineBuilding } from '@/lib/skyline'
import { buildSkyline, generateBuildings } from '@/lib/skyline'

export type BasemapMode = 'satellite' | 'vector'

const FETCH_RADIUS = 1400
const MOVE_THRESHOLD_M = 400
const ORBIT_DURATION = 10_000

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
  const [heightExaggeration, setHeightExaggeration] = useState(1)
  const [orbiting, setOrbiting] = useState(false)
  const [selectedBuilding, setSelectedBuilding] = useState<SkylineBuilding | null>(null)

  const lastFetchRef = useRef<{ lat: number; lng: number } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const orbitRafRef = useRef<number | undefined>(undefined)

  const city = getCity(cityId)

  // Fetch on city switch.
  useEffect(() => {
    const c = getCity(cityId)
    setRealBuildings([])
    setSelectedBuilding(null)
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

  const tallestLandmark = useMemo(() => {
    if (buildings.length === 0) return null
    const vs = viewState
    const viewport = new WebMercatorViewport({
      longitude: vs.longitude ?? 0,
      latitude: vs.latitude ?? 0,
      zoom: vs.zoom ?? 14,
      pitch: vs.pitch ?? 0,
      bearing: vs.bearing ?? 0,
      width: window.innerWidth,
      height: window.innerHeight,
    })
    const [west, north] = viewport.unproject([0, 0])
    const [east, south] = viewport.unproject([window.innerWidth, window.innerHeight])
    const landmarks = buildings.filter(
      (b) => b.landmark && b.lng >= west && b.lng <= east && b.lat >= south && b.lat <= north,
    )
    if (landmarks.length === 0) return null
    return landmarks.reduce((a, b) => (a.height > b.height ? a : b))
  }, [viewState, buildings])

  // ── Orbit animation ──────────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: capture bearing at orbit start
  useEffect(() => {
    if (!orbiting) return

    const startBearing = viewState.bearing ?? 0
    const startTime = performance.now()

    function animate(time: number) {
      const elapsed = time - startTime
      const t = Math.min(elapsed / ORBIT_DURATION, 1)
      const ease = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
      const bearing = (startBearing + ease * 360) % 360

      setViewState((prev) => ({ ...prev, bearing }))

      if (t < 1) {
        orbitRafRef.current = requestAnimationFrame(animate)
      } else {
        setOrbiting(false)
      }
    }

    orbitRafRef.current = requestAnimationFrame(animate)
    return () => {
      if (orbitRafRef.current) cancelAnimationFrame(orbitRafRef.current)
    }
  }, [orbiting])

  // Cancel orbit on city switch or manual bearing interaction.
  const handleBearingChange = useCallback((bearing: number) => {
    setOrbiting(false)
    setViewState((prev) => ({ ...prev, bearing }))
  }, [])

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
    setOrbiting(false)
    setSelectedBuilding(null)
    setCityId(id)
    setViewState(makeViewState(getCity(id)))
  }

  const handleReset = () => {
    setOrbiting(false)
    setViewState(makeViewState(city))
  }

  const handleBuildingClick = useCallback((building: SkylineBuilding) => {
    setSelectedBuilding(building)
  }, [])

  return (
    <main className="relative h-full w-full overflow-hidden bg-paper">
      <SkylineDeck
        buildings={buildings}
        viewState={viewState}
        onViewStateChange={handleViewStateChange}
        basemap={basemap}
        showSkyline={showSkyline}
        heightExaggeration={heightExaggeration}
        onBuildingClick={handleBuildingClick}
      />

      {/* ── Sky gradient overlay ──────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10"
        style={{
          height: '35%',
          background:
            'linear-gradient(to bottom, rgba(232,146,111,0.10) 0%, rgba(252,237,217,0.05) 30%, transparent 100%)',
        }}
      />

      {/* ── Detail panel ──────────────────────────────────────── */}
      {selectedBuilding && (
        <div className="pointer-events-none absolute left-4 bottom-4 z-20">
          <div className="card-frost pointer-events-auto w-56 p-3 space-y-1.5 animate-enter">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] font-medium tracking-[0.15em] text-slate-400 uppercase">
                Building
              </span>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center justify-center rounded p-0.5 text-slate-400 transition-all hover:bg-slate-300/20 hover:text-slate-600"
                onClick={() => setSelectedBuilding(null)}
              >
                <X size={12} strokeWidth={1.8} />
              </button>
            </div>
            <p className="text-sm font-medium text-slate-800 leading-snug">{selectedBuilding.name}</p>
            <div className="space-y-0.5 font-mono text-[11px] tabular-nums text-slate-500">
              <div className="flex justify-between">
                <span className="text-slate-400">Height</span>
                <span className="font-medium text-slate-700">{selectedBuilding.height} m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Footprint</span>
                <span className="font-medium text-slate-700">
                  {selectedBuilding.width}×{selectedBuilding.depth} m
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ID</span>
                <span
                  className="max-w-[8rem] truncate text-right font-medium text-slate-700"
                  title={selectedBuilding.id}
                >
                  {selectedBuilding.id}
                </span>
              </div>
            </div>
            {selectedBuilding.landmark && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 font-mono text-[9px] font-medium tracking-wide text-amber-700 uppercase ring-1 ring-amber-200/50">
                ★ Landmark
              </span>
            )}
          </div>
        </div>
      )}

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
            onBearingChange={handleBearingChange}
            onReset={handleReset}
            onBasemapChange={setBasemap}
            showSkyline={showSkyline}
            onToggleSkyline={() => setShowSkyline((prev) => !prev)}
            heightExaggeration={heightExaggeration}
            onHeightExaggerationChange={setHeightExaggeration}
            orbiting={orbiting}
            onOrbit={() => setOrbiting((prev) => !prev)}
            tallestLandmark={tallestLandmark}
          />
        </div>
      </div>

      {/* ── Attribution bar ────────────────────────────────────── */}
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
