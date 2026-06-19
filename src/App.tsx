import type { MapViewState } from '@deck.gl/core'
import { FlyToInterpolator, WebMercatorViewport } from '@deck.gl/core'
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Crosshair,
  ExternalLink,
  Globe,
  KeyRound,
  Layers,
  Pause,
  Play,
  Share2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import CityPicker from '@/components/CityPicker'
import SkylineDeck from '@/components/SkylineDeck'
import type { City } from '@/data/cities'
import { CITIES, DEFAULT_CITY_ID, getCity } from '@/data/cities'
import { fetchBuildingsForArea } from '@/lib/overpass'
import type { BuildingSpec, MapBgColor, PaletteName, SkylineBuilding, TintMode } from '@/lib/skyline'
import { buildSkyline, generateBuildings } from '@/lib/skyline'

export type BasemapMode = 'satellite' | 'vector' | 'dark'

const TINT_STYLES: Record<TintMode, string | null> = {
  none: null,
  warm: 'rgba(232, 146, 111, 0.12)',
  cool: 'rgba(96, 197, 205, 0.12)',
  sepia: 'rgba(160, 120, 60, 0.15)',
}

const MAP_BG_CLASSES: Record<MapBgColor, string> = {
  slate: 'bg-paper',
  charcoal: 'bg-slate-800',
  white: 'bg-white',
}

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

class SpringFlyInterpolator extends FlyToInterpolator {
  // biome-ignore lint/suspicious/noExplicitAny: deck.gl types are loose here
  interpolateProps(startProps: any, endProps: any, t: number) {
    // biome-ignore lint/suspicious/noExplicitAny: super returns untyped result
    const result = super.interpolateProps(startProps, endProps, t) as any
    // Quick zoom-out (first 30% of time), slow zoom-in (remaining 70%)
    const dip = Math.min(startProps.zoom, endProps.zoom) - 2
    const zoomOutEnd = 0.3
    result.zoom =
      t <= zoomOutEnd
        ? startProps.zoom + (dip - startProps.zoom) * (t / zoomOutEnd)
        : dip + (endProps.zoom - dip) * (1 - (1 - (t - zoomOutEnd) / (1 - zoomOutEnd)) ** 2)
    return result
  }
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
  const [cityId, setCityId] = useState(() => {
    const params = new URLSearchParams(location.search)
    const id = params.get('city') ?? DEFAULT_CITY_ID
    return getCity(id)?.id ?? DEFAULT_CITY_ID
  })
  const [viewState, setViewState] = useState<MapViewState>(() => {
    const params = new URLSearchParams(location.search)
    const id = params.get('city') ?? DEFAULT_CITY_ID
    const c = getCity(id)
    return {
      longitude: c.center.lng,
      latitude: c.center.lat,
      zoom: Number(params.get('zoom')) || c.view.zoom,
      pitch: Number(params.get('pitch')) || c.view.pitch,
      bearing: Number(params.get('bearing')) || c.view.bearing,
    }
  })
  const [basemap, setBasemap] = useState<BasemapMode>('vector')
  const [realBuildings, setRealBuildings] = useState<BuildingSpec[]>([])
  const [showSkyline, setShowSkyline] = useState(true)
  const [heightExaggeration, setHeightExaggeration] = useState(1)
  const [palette, setPalette] = useState<PaletteName>('default')
  const [tint, setTint] = useState<TintMode>('none')
  const [mapBgColor, setMapBgColor] = useState<MapBgColor>('slate')
  const [orbiting, setOrbiting] = useState(false)
  const [touring, setTouring] = useState(false)
  const [selectedBuilding, setSelectedBuilding] = useState<SkylineBuilding | null>(null)
  const [sunPosition, setSunPosition] = useState(12)
  const [searchQuery, setSearchQuery] = useState('')
  const [seedOverride, setSeedOverride] = useState<number | null>(null)

  const lastFetchRef = useRef<{ lat: number; lng: number } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const orbitRafRef = useRef<number | undefined>(undefined)
  const pendingOrbitRef = useRef(false)
  const wasTransitioningRef = useRef(false)

  const city = getCity(cityId)

  // Fetch on city switch.
  useEffect(() => {
    const c = getCity(cityId)
    setRealBuildings([])
    setSelectedBuilding(null)
    setSeedOverride(null)
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
            seed: seedOverride ?? c.seed,
          })
    return buildSkyline([...c.landmarks, ...filler])
  }, [cityId, realBuildings, seedOverride])

  const filteredBuildings = useMemo(() => {
    if (!searchQuery.trim()) return buildings
    const q = searchQuery.toLowerCase()
    // Support height range queries like "100-200" or ">100" or "<200"
    const rangeMatch = q.match(/^([<>])?\s*(\d+)(?:\s*[-–]\s*(\d+))?$/)
    if (rangeMatch) {
      const op = rangeMatch[1]
      const min = Number(rangeMatch[2])
      const max = rangeMatch[3] ? Number(rangeMatch[3]) : undefined
      return buildings.filter((b) => {
        if (op === '>') return b.height > min
        if (op === '<') return b.height < min
        if (max !== undefined) return b.height >= min && b.height <= max
        return b.height >= min
      })
    }
    return buildings.filter(
      (b) => b.name.toLowerCase().includes(q) || b.id.toLowerCase().includes(q) || String(b.height).includes(q),
    )
  }, [buildings, searchQuery])

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
      const bearing = startBearing + ease * 360

      setViewState((prev) => ({ ...prev, bearing }))

      if (t < 1) {
        orbitRafRef.current = requestAnimationFrame(animate)
      } else {
        setOrbiting(false)
        setViewState((prev) => ({ ...prev, bearing: startBearing }))
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
    pendingOrbitRef.current = false
    setViewState((prev) => ({ ...prev, bearing }))
  }, [])

  const handleViewStateChange = (next: MapViewState) => {
    setViewState(next)
    // Skip fetch logic during fly-to transitions.
    if ('transitionDuration' in next) {
      wasTransitioningRef.current = true
      return
    }
    const lat = next.latitude
    const lng = next.longitude
    if (lat === undefined || lng === undefined) return

    // Fly-to just completed — auto-start orbit if we're at the destination.
    if (wasTransitioningRef.current) {
      wasTransitioningRef.current = false
      if (pendingOrbitRef.current) {
        pendingOrbitRef.current = false
        const dest = getCity(cityId)
        const dist = haversineMeters(lat, lng, dest.center.lat, dest.center.lng)
        if (dist < 200) requestAnimationFrame(() => setOrbiting(true))
      }
    }

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

  const handleSelectCity = useCallback((id: string) => {
    abortRef.current?.abort()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setOrbiting(false)
    setSelectedBuilding(null)
    setCityId(id)
    // Anchor fetch to destination immediately to suppress intermediate fetches during flight.
    const c = getCity(id)
    lastFetchRef.current = { lat: c.center.lat, lng: c.center.lng }
    pendingOrbitRef.current = true
    setViewState({
      ...makeViewState(c),
      transitionDuration: 3000,
      transitionInterpolator: new SpringFlyInterpolator(),
    })
  }, [])

  // Refs pointing to latest values for async callbacks.
  const selectCityRef = useRef<((id: string) => void) | null>(null)
  const cityIdRef = useRef(cityId)
  useEffect(() => {
    cityIdRef.current = cityId
  }, [cityId])
  useEffect(() => {
    selectCityRef.current = handleSelectCity
  }, [handleSelectCity])

  const handleReset = () => {
    setOrbiting(false)
    setViewState(makeViewState(city))
  }

  const handleBuildingClick = useCallback((building: SkylineBuilding) => {
    setSelectedBuilding(building)
  }, [])

  const handleZoomToBuilding = useCallback((building: SkylineBuilding) => {
    setViewState((prev) => ({
      ...prev,
      longitude: building.lng,
      latitude: building.lat,
      zoom: Math.max(prev.zoom ?? 15, 16),
      transitionDuration: 800,
      transitionInterpolator: new SpringFlyInterpolator(),
    }))
  }, [])

  const handlePrevCity = useCallback(() => {
    setTouring(false)
    const idx = CITIES.findIndex((c) => c.id === cityId)
    handleSelectCity(CITIES[(idx - 1 + CITIES.length) % CITIES.length].id)
  }, [cityId, handleSelectCity])

  const handleNextCity = useCallback(() => {
    setTouring(false)
    const idx = CITIES.findIndex((c) => c.id === cityId)
    handleSelectCity(CITIES[(idx + 1) % CITIES.length].id)
  }, [cityId, handleSelectCity])

  const [copiedUrl, setCopiedUrl] = useState(false)
  const [exporting, setExporting] = useState(false)
  const handleCopyUrl = useCallback(async () => {
    await navigator.clipboard.writeText(location.href)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }, [])

  const handleExportImage = useCallback(() => {
    setExporting(true)
    requestAnimationFrame(() => {
      const canvas = document.querySelector('.deckgl-overlay canvas') as HTMLCanvasElement | null
      if (canvas) {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `skyline-${cityId}-${Date.now()}.png`
            a.click()
            URL.revokeObjectURL(url)
          }
          setExporting(false)
        }, 'image/png')
      } else {
        setExporting(false)
      }
    })
  }, [cityId])

  // ── Tour mode ─────────────────────────────────────────────────
  useEffect(() => {
    if (!touring) return
    const id = setInterval(() => {
      const currentIdx = CITIES.findIndex((c) => c.id === cityIdRef.current)
      if (currentIdx === -1) return
      selectCityRef.current?.(CITIES[(currentIdx + 1) % CITIES.length].id)
    }, 8000)
    return () => clearInterval(id)
  }, [touring])

  // ── Keyboard shortcuts ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      switch (e.key) {
        case ' ':
          e.preventDefault()
          setOrbiting((prev) => !prev)
          break
        case 'ArrowLeft': {
          e.preventDefault()
          setTouring(false)
          const idx = CITIES.findIndex((c) => c.id === cityIdRef.current)
          if (idx === -1) break
          selectCityRef.current?.(CITIES[(idx - 1 + CITIES.length) % CITIES.length].id)
          break
        }
        case 'ArrowRight': {
          e.preventDefault()
          setTouring(false)
          const idx = CITIES.findIndex((c) => c.id === cityIdRef.current)
          if (idx === -1) break
          selectCityRef.current?.(CITIES[(idx + 1) % CITIES.length].id)
          break
        }
        case 't':
        case 'T':
          e.preventDefault()
          setTouring((prev) => !prev)
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── URL sync ──────────────────────────────────────────────────
  useEffect(() => {
    if (orbiting) return
    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      params.set('city', cityId)
      params.set('pitch', String(Math.round(viewState.pitch ?? 45)))
      params.set('bearing', String(Math.round(viewState.bearing ?? 0)))
      params.set('zoom', String((viewState.zoom ?? 15).toFixed(1)))
      history.replaceState(null, '', `?${params.toString()}`)
    }, 500)
    return () => clearTimeout(timer)
  }, [cityId, viewState.pitch, viewState.bearing, viewState.zoom, orbiting])

  return (
    <main className={`relative h-full w-full overflow-hidden ${MAP_BG_CLASSES[mapBgColor]}`}>
      <SkylineDeck
        buildings={filteredBuildings}
        viewState={viewState}
        onViewStateChange={handleViewStateChange}
        basemap={basemap}
        showSkyline={showSkyline}
        heightExaggeration={heightExaggeration}
        palette={palette}
        onBuildingClick={handleBuildingClick}
        sunPosition={sunPosition}
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

      {/* ── Tint overlay ─────────────────────────────────────────── */}
      {TINT_STYLES[tint] && (
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{ backgroundColor: TINT_STYLES[tint], mixBlendMode: 'multiply' }}
        />
      )}

      {/* ── Detail panel ──────────────────────────────────────── */}
      {selectedBuilding && (
        <div className="pointer-events-none absolute left-4 bottom-4 z-20">
          <div className="card-frost pointer-events-auto w-64 p-3 space-y-2 animate-enter">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] font-medium tracking-[0.15em] text-slate-400 uppercase">
                {selectedBuilding.landmark ? 'Landmark' : 'Building'}
              </span>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center justify-center rounded p-0.5 text-slate-400 transition-all hover:bg-slate-300/20 hover:text-slate-600"
                onClick={() => setSelectedBuilding(null)}
              >
                <X size={12} strokeWidth={1.8} />
              </button>
            </div>
            <p className="text-sm font-medium text-slate-800 leading-snug">
              {selectedBuilding.name || 'Unnamed building'}
            </p>
            <div className="space-y-1 font-mono text-[11px] tabular-nums text-slate-500">
              <div className="flex justify-between">
                <span className="text-slate-400">Height</span>
                <span className="font-medium text-slate-700">
                  {selectedBuilding.height} m
                  <span className="text-slate-400 ml-1">(~{Math.round(selectedBuilding.height / 3.5)} fl)</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Footprint</span>
                <span className="font-medium text-slate-700">
                  {selectedBuilding.width}×{selectedBuilding.depth} m
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Source</span>
                <span className="font-medium text-slate-700">
                  {selectedBuilding.id.startsWith('osm-') ? 'OpenStreetMap' : 'Generated'}
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
            <div className="flex items-center gap-1.5 pt-0.5">
              {selectedBuilding.landmark && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 font-mono text-[9px] font-medium tracking-wide text-amber-700 uppercase ring-1 ring-amber-200/50">
                  ★ Landmark
                </span>
              )}
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-medium tracking-wide text-slate-600 transition-all hover:bg-slate-200"
                onClick={() => handleZoomToBuilding(selectedBuilding)}
                title="Zoom to building"
              >
                <Crosshair size={9} strokeWidth={2} />
                Zoom
              </button>
              {selectedBuilding.id.startsWith('osm-') && (
                <a
                  href={`https://www.openstreetmap.org/way/${selectedBuilding.id.replace('osm-way-', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-medium tracking-wide text-slate-600 transition-all hover:bg-slate-200"
                  title="View on OpenStreetMap"
                >
                  <ExternalLink size={9} strokeWidth={2} />
                  OSM
                </a>
              )}
            </div>
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
            palette={palette}
            tint={tint}
            mapBgColor={mapBgColor}
            onSelectCity={handleSelectCity}
            onPitchChange={(pitch) => setViewState((prev) => ({ ...prev, pitch }))}
            onBearingChange={handleBearingChange}
            onReset={handleReset}
            onBasemapChange={setBasemap}
            onPaletteChange={setPalette}
            onTintChange={setTint}
            onMapBgColorChange={setMapBgColor}
            showSkyline={showSkyline}
            onToggleSkyline={() => setShowSkyline((prev) => !prev)}
            heightExaggeration={heightExaggeration}
            onHeightExaggerationChange={setHeightExaggeration}
            orbiting={orbiting}
            onOrbit={() => setOrbiting((prev) => !prev)}
            tallestLandmark={tallestLandmark}
            sunPosition={sunPosition}
            onSunPositionChange={setSunPosition}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filteredCount={filteredBuildings.length}
            totalCount={buildings.length}
            seedOverride={seedOverride}
            onSeedOverrideChange={setSeedOverride}
            defaultSeed={city.seed}
          />
        </div>
      </div>

      {/* ── Bottom bar ─────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center">
        <div
          className="card-frost-inline animate-enter pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] text-slate-500"
          style={{ animationDelay: '0.15s', animationFillMode: 'backwards' }}
        >
          {/* ── City nav ───────────────────────────────────── */}
          <button
            type="button"
            className="inline-flex cursor-pointer items-center justify-center rounded p-1 text-slate-400 outline-none transition-all hover:bg-slate-300/20 hover:text-cyan-600 focus:ring-2 focus:ring-cyan-400/25 active:scale-90"
            onClick={handlePrevCity}
            title="Previous city (←)"
          >
            <ArrowLeft size={13} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className="inline-flex cursor-pointer items-center justify-center rounded p-1 text-slate-400 outline-none transition-all hover:bg-slate-300/20 hover:text-cyan-600 focus:ring-2 focus:ring-cyan-400/25 active:scale-90"
            onClick={handleNextCity}
            title="Next city (→)"
          >
            <ArrowRight size={13} strokeWidth={1.8} />
          </button>
          <span className="h-3 w-px bg-slate-300/60" />

          {/* ── Tour toggle ─────────────────────────────────── */}
          <button
            type="button"
            className={`inline-flex cursor-pointer items-center justify-center rounded p-1 outline-none transition-all focus:ring-2 focus:ring-cyan-400/25 active:scale-90 ${
              touring
                ? 'bg-cyan-100 text-cyan-600 animate-pulse'
                : 'text-slate-400 hover:bg-slate-300/20 hover:text-cyan-600'
            }`}
            onClick={() => setTouring((prev) => !prev)}
            title={touring ? 'Stop tour (T)' : 'Start tour (T)'}
          >
            {touring ? <Pause size={13} strokeWidth={1.8} /> : <Play size={13} strokeWidth={1.8} />}
          </button>
          <span className="h-3 w-px bg-slate-300/60" />

          {/* ── Share URL ───────────────────────────────────── */}
          <button
            type="button"
            className={`inline-flex cursor-pointer items-center justify-center rounded p-1 outline-none transition-all focus:ring-2 focus:ring-cyan-400/25 active:scale-90 ${
              copiedUrl ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400 hover:bg-slate-300/20 hover:text-cyan-600'
            }`}
            onClick={handleCopyUrl}
            title="Copy shareable URL"
          >
            <Share2 size={13} strokeWidth={1.8} />
          </button>
          {/* ── Export image ─────────────────────────────────── */}
          <button
            type="button"
            className={`inline-flex cursor-pointer items-center justify-center rounded p-1 outline-none transition-all focus:ring-2 focus:ring-cyan-400/25 active:scale-90 ${
              exporting
                ? 'bg-cyan-100 text-cyan-600 animate-pulse'
                : 'text-slate-400 hover:bg-slate-300/20 hover:text-cyan-600'
            }`}
            onClick={handleExportImage}
            title="Export as PNG"
            disabled={exporting}
          >
            <Camera size={13} strokeWidth={1.8} />
          </button>
          <span className="h-3 w-px bg-slate-300/60" />

          {/* ── Attribution ─────────────────────────────────── */}
          <span className="flex items-center gap-1.5">
            <Layers size={12} strokeWidth={1.6} className="text-cyan-500" />
            deck.gl
          </span>
          <span className="h-3 w-px bg-slate-300/60" />
          <span className="flex items-center gap-1.5">
            <Globe size={12} strokeWidth={1.6} className="text-cyan-500" />
            {basemap === 'satellite' ? 'ESRI satellite' : basemap === 'dark' ? 'CARTO dark' : 'CARTO vector'}
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
