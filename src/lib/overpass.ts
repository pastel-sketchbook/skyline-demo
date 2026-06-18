/**
 * overpass.ts
 *
 * Runtime Overpass API client for fetching real building footprints from
 * OpenStreetMap. Results are cached in-memory (1-hour TTL) so switching
 * cities or toggling basemap is instant after the first fetch.
 *
 * Falls back gracefully: if the API is unreachable or returns no data the
 * caller uses generated filler instead.
 */

import type { BuildingSpec } from '@/lib/skyline'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const CACHE_TTL = 60 * 60 * 1000
const UA = 'skyline-demo/0.1 (runtime fetcher; +https://github.com/anomalyco/skyline-demo)'

interface OsmElement {
  type: 'way' | 'relation' | 'node'
  id: number
  tags?: Record<string, string>
  center?: { lat: number; lon: number }
  lat?: number
  lon?: number
}

interface CacheEntry {
  buildings: BuildingSpec[]
  ts: number
}

const cache = new Map<string, CacheEntry>()

function buildQuery(lat: number, lng: number, radius: number): string {
  return `[out:json][timeout:15];
(
  way["building"]["height"](around:${radius},${lat},${lng});
  way["building"]["building:levels"](around:${radius},${lat},${lng});
);
out center;`
}

function encodeQuery(query: string): string {
  return encodeURIComponent(query).replace(/[()!*']/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
}

function parseHeight(tags?: Record<string, string>): number | null {
  if (!tags) return null

  const raw = tags.height ?? tags['building:height']
  if (raw) {
    const cleaned = raw.replace(/^[~≈]/, '').trim()
    const match = cleaned.match(/^([\d.]+)\s*(m|ft|feet|')?$/i)
    if (match) {
      let h = Number.parseFloat(match[1])
      if (Number.isNaN(h) || h <= 0 || h > 999) return null
      if ((match[2] ?? '').toLowerCase().startsWith('f') || match[2] === "'") h *= 0.3048
      return Math.round(h)
    }
  }

  const levels = tags['building:levels']
  if (levels) {
    const l = Number.parseFloat(levels)
    if (!Number.isNaN(l) && l > 0 && l < 200) return Math.round(l * 3.5)
  }

  return null
}

function getCenter(el: OsmElement): { lat: number; lng: number } | null {
  if (el.center) return { lat: el.center.lat, lng: el.center.lon }
  if (el.lat !== undefined && el.lon !== undefined) return { lat: el.lat, lng: el.lon }
  return null
}

function deterministicSizes(id: number): [width: number, depth: number] {
  const wSeed = ((id * 16807) % 2147483647) / 2147483647
  const dSeed = ((id * 48271) % 2147483647) / 2147483647
  return [Math.round(15 + 50 * Math.abs(wSeed)), Math.round(15 + 50 * Math.abs(dSeed))]
}

export function parseOverpassResponse(data: { elements?: OsmElement[] }): BuildingSpec[] {
  const specs: BuildingSpec[] = []
  for (const el of data.elements ?? []) {
    const center = getCenter(el)
    if (!center) continue
    const height = parseHeight(el.tags)
    if (!height) continue
    const [width, depth] = deterministicSizes(el.id)
    specs.push({
      id: `osm-${el.type}-${el.id}`,
      name: el.tags?.name ?? '',
      lat: Math.round(center.lat * 1e7) / 1e7,
      lng: Math.round(center.lng * 1e7) / 1e7,
      height,
      width,
      depth,
      landmark: false,
    })
  }
  specs.sort((a, b) => b.height - a.height)
  return specs
}

export function getCachedBuildings(key: string): BuildingSpec[] | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return entry.buildings
}

function tileKey(lat: number, lng: number, zoom = 14): string {
  const x = Math.floor(((lng + 180) / 360) * 2 ** zoom)
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** zoom,
  )
  return `${zoom}/${x}/${y}`
}

export async function fetchBuildingsForArea(
  lat: number,
  lng: number,
  radius: number,
  signal?: AbortSignal,
): Promise<BuildingSpec[]> {
  const key = tileKey(lat, lng)
  const cached = getCachedBuildings(key)
  if (cached) return cached

  const query = buildQuery(lat, lng, radius)
  const url = `${OVERPASS_URL}?data=${encodeQuery(query)}`

  const resp = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal,
  })

  if (!resp.ok) {
    if (resp.status === 429) {
      await new Promise((r) => setTimeout(r, 3000))
      return fetchBuildingsForArea(lat, lng, radius, signal)
    }
    throw new Error(`Overpass HTTP ${resp.status}`)
  }

  const buildings = parseOverpassResponse(await resp.json())
  cache.set(key, { buildings, ts: Date.now() })
  return buildings
}
