import type { MapViewState, PickingInfo } from '@deck.gl/core'
import { PolygonLayer } from '@deck.gl/layers'
import { DeckGL } from '@deck.gl/react'
import type { StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useMemo } from 'react'
import { Map as MapLibreMap } from 'react-map-gl/maplibre'

import type { PaletteName, SkylineBuilding } from '@/lib/skyline'
import { BUILDING_PALETTES, heightToColorFromBands } from '@/lib/skyline'

export type BasemapMode = 'satellite' | 'vector' | 'dark'

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

// Free CARTO Voyager vector basemap — more vibrant colors, no API key required.
const VECTOR_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'

// Free CARTO Dark Matter vector basemap — dark monochrome, no API key required.
const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

interface SkylineDeckProps {
  buildings: SkylineBuilding[]
  viewState: MapViewState
  onViewStateChange: (viewState: MapViewState) => void
  basemap: BasemapMode
  showSkyline: boolean
  heightExaggeration: number
  palette: PaletteName
  onBuildingClick: (building: SkylineBuilding) => void
  sunPosition: number
}

function getTooltip({ object }: PickingInfo<SkylineBuilding>) {
  if (!object) return null
  const label = object.name && object.name !== 'Building' ? object.name : null
  const parts: string[] = []
  if (label) parts.push(`<span style="color:#78706a;font-size:11px">${label}</span>`)
  parts.push(
    `<span style="font-weight:600">${object.height}<span style="font-weight:400;font-size:11px"> m</span></span>`,
  )
  if (object.landmark) {
    parts.push(
      '<span style="display:inline-flex;align-items:center;gap:3px;margin-top:3px;font-size:9px;font-weight:500;letter-spacing:0.05em;text-transform:uppercase;color:#b8860b;background:rgba(184,134,11,0.10);border:1px solid rgba(184,134,11,0.20);border-radius:4px;padding:1px 5px">&#9733; Landmark</span>',
    )
  }
  return {
    html: parts.join('<br/>'),
    style: {
      background: 'rgba(255, 255, 255, 0.92)',
      color: '#2c4a4e',
      fontSize: '13px',
      padding: '8px 10px',
      borderRadius: '8px',
      border: '1px solid rgba(196,188,180,0.3)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
      backdropFilter: 'blur(8px)',
    },
  }
}

const BASEMAP_STYLES: Record<BasemapMode, StyleSpecification | string> = {
  satellite: SATELLITE_STYLE,
  vector: VECTOR_STYLE,
  dark: DARK_STYLE,
}

export default function SkylineDeck({
  buildings,
  viewState,
  onViewStateChange,
  basemap,
  showSkyline,
  heightExaggeration,
  palette,
  onBuildingClick,
  sunPosition,
}: SkylineDeckProps) {
  const mapStyle = BASEMAP_STYLES[basemap]
  const bands = BUILDING_PALETTES[palette]

  // Calculate lighting from sun position (0-24 hours)
  const material = useMemo(() => {
    // Sun angle: 0h = midnight (no light), 6h = dawn, 12h = noon, 18h = dusk
    const sunAngle = ((sunPosition - 6) / 12) * Math.PI
    const sunAltitude = Math.sin(sunAngle)
    const sunHorizon = Math.cos(sunAngle)

    // Ambient: higher at noon (0.35), lower at dawn/dusk (0.15), lowest at night (0.05)
    const ambient = sunAltitude > 0 ? 0.15 + 0.2 * sunAltitude : 0.05
    // Diffuse: peaks at dawn/dusk for dramatic lighting, lower at noon
    const diffuse = sunAltitude > 0 ? 0.5 + 0.3 * Math.abs(sunHorizon) : 0.2

    return {
      ambient,
      diffuse,
      shininess: 32,
      specularColor: [80 * (1 + sunHorizon * 0.3), 80 * (1 + sunHorizon * 0.3), 80 * (1 + sunHorizon * 0.3)] as [
        number,
        number,
        number,
      ],
    }
  }, [sunPosition])

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
        getElevation: (d) => d.height * heightExaggeration,
        getFillColor: (d) => {
          const [r, g, b] = heightToColorFromBands(d.height, bands)
          return [r, g, b, d.landmark ? 255 : 220]
        },
        getLineColor: (d) => (d.landmark ? [120, 130, 130, 200] : [40, 40, 40, 180]),
        material,
        onClick: (info) => {
          if (info.object) onBuildingClick(info.object)
        },
      }),
    ],
    [buildings, showSkyline, heightExaggeration, bands, onBuildingClick, material],
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
