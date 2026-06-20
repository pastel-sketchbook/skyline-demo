/**
 * skyline.ts
 *
 * Pure, framework-free helpers for turning city building data into
 * deck.gl-friendly extruded geometry.
 *
 * Conventions:
 *  - Coordinates are [lng, lat] (deck.gl / GeoJSON order).
 *  - Footprint sizes are in meters.
 *  - Heights are in meters and extrude directly as deck.gl elevation.
 *
 * Everything here is deterministic: the same inputs (including the RNG seed)
 * always produce the same skyline, which keeps both the scene and the tests
 * stable.
 */

export type Rgb = [number, number, number]

export type BasemapMode = 'satellite' | 'vector' | 'dark'

/** A single building described by its center, footprint size, and height. */
export interface BuildingSpec {
  id: string
  /** Center latitude (degrees). */
  lat: number
  /** Center longitude (degrees). */
  lng: number
  /** Footprint width, east-west, in meters. */
  width: number
  /** Footprint depth, north-south, in meters. */
  depth: number
  /** Building height in meters (extruded as deck.gl elevation). */
  height: number
  name: string
  /** True for hand-curated landmarks, false for generated filler. */
  landmark: boolean
  /** Real polygon footprint from OSM (closed [lng, lat] ring). When present,
   *  this is used instead of the rectangular approximation. */
  polygon?: Array<[number, number]>
}

/** A building ready to hand to a deck.gl PolygonLayer. */
export interface SkylineBuilding extends BuildingSpec {
  /** Closed-on-render ring of [lng, lat] pairs. */
  footprint: Array<[number, number]>
  /** Fill color derived from height. */
  color: Rgb
}

const METERS_PER_DEG_LAT = 111_320

function metersPerDegLng(lat: number): number {
  return METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180)
}

/**
 * Build a rectangular footprint (4 points, [lng, lat]) centered on the
 * building. deck.gl's PolygonLayer closes the ring automatically.
 */
export function rectFootprint(
  center: { lat: number; lng: number },
  widthMeters: number,
  depthMeters: number,
): Array<[number, number]> {
  const halfWidth = Math.max(0, widthMeters) / 2
  const halfDepth = Math.max(0, depthMeters) / 2
  const dLng = halfWidth / metersPerDegLng(center.lat)
  const dLat = halfDepth / METERS_PER_DEG_LAT
  return [
    [center.lng - dLng, center.lat - dLat],
    [center.lng + dLng, center.lat - dLat],
    [center.lng + dLng, center.lat + dLat],
    [center.lng - dLng, center.lat + dLat],
  ]
}

/** Height bands with distinct colors. Teal → sand → amber → ember. */
export const HEIGHT_BANDS: [number, number, Rgb][] = [
  [0, 30, [186, 224, 222]], // pale teal
  [30, 80, [96, 197, 205]], // brand teal (--color-cyan-400)
  [80, 150, [215, 200, 170]], // sand
  [150, 250, [236, 184, 122]], // amber
  [250, 400, [232, 146, 111]], // ember (--color-ember-400)
  [400, Infinity, [224, 113, 74]], // deep ember (--color-ember-500)
]

export type PaletteName = 'default' | 'night' | 'mono'

export const BUILDING_PALETTES: Record<PaletteName, [number, number, Rgb][]> = {
  default: HEIGHT_BANDS,
  night: [
    [0, 30, [180, 195, 210]],
    [30, 80, [120, 145, 175]],
    [80, 150, [80, 105, 145]],
    [150, 250, [55, 75, 120]],
    [250, 400, [40, 52, 90]],
    [400, Infinity, [25, 30, 55]],
  ],
  mono: [
    [0, 30, [220, 220, 220]],
    [30, 80, [190, 190, 190]],
    [80, 150, [160, 160, 160]],
    [150, 250, [130, 130, 130]],
    [250, 400, [100, 100, 100]],
    [400, Infinity, [70, 70, 70]],
  ],
}

/**
 * Map a height to a color from a given set of discrete height bands.
 * Each band has a fixed color — short buildings light, tall buildings dark.
 */
export function heightToColorFromBands(height: number, bands: [number, number, Rgb][]): Rgb {
  for (const [lo, hi, color] of bands) {
    if (height >= lo && height < hi) return color
  }
  return bands[bands.length - 1][2]
}

/**
 * Map a height to a color from the default height bands.
 */
export function heightToBandColor(height: number): Rgb {
  return heightToColorFromBands(height, HEIGHT_BANDS)
}

export type TintMode = 'none' | 'warm' | 'cool' | 'sepia'

export type MapBgColor = 'slate' | 'charcoal' | 'white'

/**
 * Mulberry32 — a tiny, fast, deterministic PRNG. Returns a function that
 * yields floats in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface GenerateBuildingsOptions {
  /** District center the cluster is scattered around. */
  center: { lat: number; lng: number }
  /** Number of filler buildings to generate. */
  count: number
  /** Seed for deterministic output. */
  seed: number
  /** Half-extent of the cluster, in meters (default 1400). */
  spreadMeters?: number
  /** Min/max footprint side length in meters (default 30–90). */
  footprintRange?: [number, number]
  /** Min/max building height in meters (default 20–260). */
  heightRange?: [number, number]
}

/**
 * Deterministically scatter filler buildings around a district center.
 * Heights are biased toward the center so the cluster reads as a downtown
 * core fading out to lower-rise edges.
 */
export function generateBuildings({
  center,
  count,
  seed,
  spreadMeters = 1400,
  footprintRange = [30, 90],
  heightRange = [20, 260],
}: GenerateBuildingsOptions): BuildingSpec[] {
  const rng = mulberry32(seed)
  const [minSide, maxSide] = footprintRange
  const [minHeight, maxHeight] = heightRange
  const buildings: BuildingSpec[] = []

  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2
    const radius = Math.sqrt(rng()) * spreadMeters
    const offsetEast = Math.cos(angle) * radius
    const offsetNorth = Math.sin(angle) * radius

    const lat = center.lat + offsetNorth / METERS_PER_DEG_LAT
    const lng = center.lng + offsetEast / metersPerDegLng(center.lat)

    // Closer to the center → taller (downtown core effect).
    const centrality = 1 - radius / spreadMeters
    const heightBias = centrality * centrality
    const height = Math.round(minHeight + (maxHeight - minHeight) * (0.25 * rng() + 0.75 * heightBias))

    const width = Math.round(minSide + (maxSide - minSide) * rng())
    const depth = Math.round(minSide + (maxSide - minSide) * rng())

    buildings.push({
      id: `gen-${seed}-${i}`,
      lat,
      lng,
      width,
      depth,
      height,
      name: 'Building',
      landmark: false,
    })
  }

  return buildings
}

/** Convert a building spec into a deck.gl-ready feature with footprint + color. */
export function toSkylineBuilding(spec: BuildingSpec): SkylineBuilding {
  return {
    ...spec,
    footprint: spec.polygon ?? rectFootprint(spec, spec.width, spec.depth),
    color: heightToBandColor(spec.height),
  }
}

/** Build the full set of deck.gl features from raw specs. */
export function buildSkyline(specs: BuildingSpec[]): SkylineBuilding[] {
  return specs.map(toSkylineBuilding)
}
