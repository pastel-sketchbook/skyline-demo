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

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value))
}

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

/** Height bands with distinct colors. Each band is [min, max, color]. */
const HEIGHT_BANDS: [number, number, Rgb][] = [
  [0, 30, [235, 210, 180]],
  [30, 80, [240, 185, 120]],
  [80, 150, [235, 155, 80]],
  [150, 250, [220, 120, 55]],
  [250, 400, [200, 80, 45]],
  [400, Infinity, [170, 60, 40]],
]

/**
 * Map a height to a color from discrete height bands.
 * Each band has a fixed color — short buildings are light/warm,
 * tall buildings dark/rich, creating a visible height hierarchy.
 */
export function heightToBandColor(height: number): Rgb {
  for (const [lo, hi, color] of HEIGHT_BANDS) {
    if (height >= lo && height < hi) return color
  }
  return HEIGHT_BANDS[HEIGHT_BANDS.length - 1][2]
}

/** Default low → high gradient (light peach → deep orange). */
export const DEFAULT_LOW_COLOR: Rgb = [255, 200, 150]
export const DEFAULT_HIGH_COLOR: Rgb = [220, 110, 50]

/**
 * Map a height to a color along a low→high gradient. Heights at or below
 * `min` get `low`; at or above `max` get `high`; values between interpolate.
 */
export function heightToColor(
  height: number,
  min: number,
  max: number,
  low: Rgb = DEFAULT_LOW_COLOR,
  high: Rgb = DEFAULT_HIGH_COLOR,
): Rgb {
  const span = max - min
  const t = span <= 0 ? 0 : clamp((height - min) / span, 0, 1)
  return [lerpChannel(low[0], high[0], t), lerpChannel(low[1], high[1], t), lerpChannel(low[2], high[2], t)]
}

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
    footprint: rectFootprint(spec, spec.width, spec.depth),
    color: heightToBandColor(spec.height),
  }
}

/** Build the full set of deck.gl features from raw specs. */
export function buildSkyline(specs: BuildingSpec[]): SkylineBuilding[] {
  return specs.map(toSkylineBuilding)
}
