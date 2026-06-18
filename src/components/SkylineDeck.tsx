import type { MapViewState, PickingInfo } from '@deck.gl/core'
import { PolygonLayer } from '@deck.gl/layers'
import { DeckGL } from '@deck.gl/react'
import { useMemo } from 'react'
import { Map as MapLibreMap } from 'react-map-gl/maplibre'

import type { SkylineBuilding } from '@/lib/skyline'
import 'maplibre-gl/dist/maplibre-gl.css'

// Free CARTO light basemap — no API key required.
const BASEMAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

interface SkylineDeckProps {
  buildings: SkylineBuilding[]
  viewState: MapViewState
  onViewStateChange: (viewState: MapViewState) => void
}

function getTooltip({ object }: PickingInfo<SkylineBuilding>) {
  if (!object) return null
  return {
    html: `<strong>${object.name}</strong><br/>${object.height} m${object.landmark ? ' · landmark' : ''}`,
    style: {
      background: 'rgba(255, 255, 255, 0.88)',
      color: '#2c4a4e',
      fontSize: '12px',
      padding: '6px 8px',
      borderRadius: '6px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      backdropFilter: 'blur(6px)',
    },
  }
}

export default function SkylineDeck({ buildings, viewState, onViewStateChange }: SkylineDeckProps) {
  const layers = useMemo(
    () => [
      new PolygonLayer<SkylineBuilding>({
        id: 'skyline-buildings',
        data: buildings,
        extruded: true,
        wireframe: false,
        pickable: true,
        stroked: true,
        lineWidthMinPixels: 1,
        getPolygon: (d) => d.footprint,
        getElevation: (d) => d.height,
        getFillColor: (d) => [d.color[0], d.color[1], d.color[2], d.landmark ? 255 : 220],
        getLineColor: (d) => (d.landmark ? [80, 160, 170, 180] : [170, 210, 215, 120]),
        material: {
          ambient: 0.35,
          diffuse: 0.65,
          shininess: 22,
          specularColor: [200, 195, 185],
        },
      }),
    ],
    [buildings],
  )

  return (
    <DeckGL
      layers={layers}
      viewState={viewState}
      controller
      getTooltip={getTooltip}
      onViewStateChange={({ viewState: next }) => onViewStateChange(next as MapViewState)}
    >
      <MapLibreMap reuseMaps mapStyle={BASEMAP_STYLE} />
    </DeckGL>
  )
}
