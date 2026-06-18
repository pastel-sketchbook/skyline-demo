import type { MapViewState, PickingInfo } from '@deck.gl/core'
import { PolygonLayer } from '@deck.gl/layers'
import { DeckGL } from '@deck.gl/react'
import type { StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useMemo } from 'react'
import { Map as MapLibreMap } from 'react-map-gl/maplibre'

import type { SkylineBuilding } from '@/lib/skyline'

export type BasemapMode = 'satellite' | 'vector'

// ESRI World Imagery satellite + reference overlay — no API key.
const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution:
        '&copy; Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxzoom: 19,
    },
    'esri-reference': {
      type: 'raster',
      tiles: [
        'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places_Alternate/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: '&copy; Esri',
      maxzoom: 19,
    },
  },
  layers: [
    { id: 'satellite', type: 'raster', source: 'esri-satellite', minzoom: 0, maxzoom: 22 },
    { id: 'reference', type: 'raster', source: 'esri-reference', minzoom: 0, maxzoom: 22 },
  ],
  glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
}

// Free CARTO light vector basemap — no API key required.
const VECTOR_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

interface SkylineDeckProps {
  buildings: SkylineBuilding[]
  viewState: MapViewState
  onViewStateChange: (viewState: MapViewState) => void
  basemap: BasemapMode
  showSkyline: boolean
}

function getTooltip({ object }: PickingInfo<SkylineBuilding>) {
  if (!object) return null
  const label = object.name && object.name !== 'Building' ? object.name : null
  const parts = [`<strong>${object.height} m</strong>`]
  if (label) parts.unshift(`<span style="color:#6b7280">${label}</span>`)
  if (object.landmark) parts.push('<span style="color:#d97706">landmark</span>')
  return {
    html: parts.join('<br/>'),
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

export default function SkylineDeck({
  buildings,
  viewState,
  onViewStateChange,
  basemap,
  showSkyline,
}: SkylineDeckProps) {
  const mapStyle = basemap === 'satellite' ? SATELLITE_STYLE : VECTOR_STYLE

  const layers = useMemo(
    () => [
      new PolygonLayer<SkylineBuilding>({
        id: 'skyline-buildings',
        data: showSkyline ? buildings : [],
        extruded: true,
        wireframe: false,
        pickable: true,
        stroked: true,
        lineWidthMinPixels: 1,
        lineWidthMaxPixels: 3,
        getPolygon: (d) => d.footprint,
        getElevation: (d) => d.height,
        getFillColor: (d) => [d.color[0], d.color[1], d.color[2], d.landmark ? 255 : 220],
        getLineColor: (d) => (d.landmark ? [120, 130, 130, 200] : [40, 40, 40, 180]),
        material: {
          ambient: 0.25,
          diffuse: 0.75,
          shininess: 32,
          specularColor: [80, 80, 80],
        },
      }),
    ],
    [buildings, showSkyline],
  )

  return (
    <DeckGL
      layers={layers}
      viewState={viewState}
      controller
      getTooltip={getTooltip}
      onViewStateChange={({ viewState: next }) => onViewStateChange(next as MapViewState)}
    >
      <MapLibreMap reuseMaps mapStyle={mapStyle} />
    </DeckGL>
  )
}
