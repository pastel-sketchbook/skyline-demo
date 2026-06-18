import type { MapViewState } from '@deck.gl/core'
import { Globe, KeyRound, Layers } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import CityPicker from '@/components/CityPicker'
import SkylineDeck from '@/components/SkylineDeck'
import type { City } from '@/data/cities'
import { DEFAULT_CITY_ID, getCity } from '@/data/cities'
import { fetchBuildings } from '@/lib/overpass'
import type { BuildingSpec } from '@/lib/skyline'
import { buildSkyline, generateBuildings } from '@/lib/skyline'

export type BasemapMode = 'satellite' | 'vector'

function makeViewState(city: City): MapViewState {
  return {
    longitude: city.center.lng,
    latitude: city.center.lat,
    zoom: city.view.zoom,
    pitch: city.view.pitch,
    bearing: city.view.bearing,
  }
}

export default function App() {
  const [cityId, setCityId] = useState(DEFAULT_CITY_ID)
  const [viewState, setViewState] = useState<MapViewState>(() => makeViewState(getCity(DEFAULT_CITY_ID)))
  const [basemap, setBasemap] = useState<BasemapMode>('vector')
  const [realBuildings, setRealBuildings] = useState<BuildingSpec[] | null>(null)

  const city = getCity(cityId)

  useEffect(() => {
    setRealBuildings(null)
    const ac = new AbortController()
    const { lat, lng } = city.districtCenter
    fetchBuildings(city.id, lat, lng, 1400, ac.signal)
      .then(setRealBuildings)
      .catch(() => {})
    return () => ac.abort()
  }, [city])

  const buildings = useMemo(() => {
    const filler =
      realBuildings ??
      generateBuildings({
        center: city.districtCenter,
        count: city.fillerCount,
        seed: city.seed,
      })
    return buildSkyline([...city.landmarks, ...filler])
  }, [city, realBuildings])

  const handleSelectCity = (id: string) => {
    setCityId(id)
    setViewState(makeViewState(getCity(id)))
  }

  return (
    <main className="relative h-full w-full overflow-hidden bg-paper">
      <SkylineDeck buildings={buildings} viewState={viewState} onViewStateChange={setViewState} basemap={basemap} />

      <div className="pointer-events-none absolute inset-0 p-4">
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
          />
        </div>
      </div>

      {/* Attribution bar */}
      <div className="pointer-events-none absolute right-4 bottom-4 flex items-center gap-3 font-mono text-[11px] text-warm-400">
        <span className="flex items-center gap-1">
          <Layers size={12} strokeWidth={1.6} className="text-cyan-500" />
          deck.gl
        </span>
        <span className="text-warm-300">·</span>
        <span className="flex items-center gap-1">
          <Globe size={12} strokeWidth={1.6} className="text-cyan-500" />
          {basemap === 'satellite' ? 'ESRI satellite' : 'CARTO vector'}
        </span>
        <span className="text-warm-300">·</span>
        <span className="flex items-center gap-1">
          <KeyRound size={12} strokeWidth={1.6} className="text-cyan-500" />
          no API key
        </span>
        <span className="text-warm-300">·</span>
        <span className="tabular-nums">{buildings.length} buildings</span>
        <span className="text-warm-300">·</span>
        <span className="tabular-nums">{realBuildings ? 'OSM live' : 'generated'}</span>
      </div>
    </main>
  )
}
