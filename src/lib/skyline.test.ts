import { describe, expect, it } from 'vitest'

import {
  buildSkyline,
  DEFAULT_HIGH_COLOR,
  DEFAULT_LOW_COLOR,
  generateBuildings,
  heightToBandColor,
  heightToColor,
  mulberry32,
  rectFootprint,
  toSkylineBuilding,
} from './skyline'

const SEOUL = { lat: 37.5125, lng: 127.1025 }

describe('rectFootprint', () => {
  it('returns four [lng, lat] corners centered on the building', () => {
    const ring = rectFootprint(SEOUL, 100, 100)
    expect(ring).toHaveLength(4)
    for (const [lng, lat] of ring) {
      expect(typeof lng).toBe('number')
      expect(typeof lat).toBe('number')
    }
    // Centroid of the ring should be back at the center.
    const cLng = ring.reduce((sum, p) => sum + p[0], 0) / ring.length
    const cLat = ring.reduce((sum, p) => sum + p[1], 0) / ring.length
    expect(cLng).toBeCloseTo(SEOUL.lng, 9)
    expect(cLat).toBeCloseTo(SEOUL.lat, 9)
  })

  it('makes wider footprints span more longitude', () => {
    const narrow = rectFootprint(SEOUL, 50, 50)
    const wide = rectFootprint(SEOUL, 200, 50)
    const narrowSpan = narrow[1][0] - narrow[0][0]
    const wideSpan = wide[1][0] - wide[0][0]
    expect(wideSpan).toBeGreaterThan(narrowSpan)
  })
})

describe('heightToColor', () => {
  it('returns the low color at or below the min', () => {
    expect(heightToColor(0, 100, 500)).toEqual(DEFAULT_LOW_COLOR)
    expect(heightToColor(100, 100, 500)).toEqual(DEFAULT_LOW_COLOR)
  })

  it('returns the high color at or above the max', () => {
    expect(heightToColor(500, 100, 500)).toEqual(DEFAULT_HIGH_COLOR)
    expect(heightToColor(900, 100, 500)).toEqual(DEFAULT_HIGH_COLOR)
  })

  it('interpolates in the middle of the range', () => {
    const mid = heightToColor(300, 100, 500)
    expect(mid).not.toEqual(DEFAULT_LOW_COLOR)
    expect(mid).not.toEqual(DEFAULT_HIGH_COLOR)
    for (const channel of mid) {
      expect(channel).toBeGreaterThanOrEqual(0)
      expect(channel).toBeLessThanOrEqual(255)
    }
  })

  it('falls back to the low color for a degenerate (zero-span) domain', () => {
    expect(heightToColor(200, 200, 200)).toEqual(DEFAULT_LOW_COLOR)
  })
})

describe('heightToBandColor', () => {
  it('returns distinct colors for different height bands', () => {
    const colors = [0, 29, 30, 79, 80, 149, 150, 249, 250, 399, 400, 1000].map(heightToBandColor)
    // Each pair should share the same band color.
    expect(colors[0]).toEqual(colors[1])
    expect(colors[2]).toEqual(colors[3])
    expect(colors[4]).toEqual(colors[5])
    expect(colors[6]).toEqual(colors[7])
    expect(colors[8]).toEqual(colors[9])
    expect(colors[10]).toEqual(colors[11])
    // Adjacent bands should differ.
    expect(colors[1]).not.toEqual(colors[2])
    expect(colors[3]).not.toEqual(colors[4])
    expect(colors[5]).not.toEqual(colors[6])
    expect(colors[7]).not.toEqual(colors[8])
    expect(colors[9]).not.toEqual(colors[10])
  })
})

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(1)
    for (let i = 0; i < 100; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('generateBuildings', () => {
  it('produces the requested count', () => {
    const buildings = generateBuildings({ center: SEOUL, count: 50, seed: 7 })
    expect(buildings).toHaveLength(50)
  })

  it('is deterministic for the same seed', () => {
    const a = generateBuildings({ center: SEOUL, count: 25, seed: 7 })
    const b = generateBuildings({ center: SEOUL, count: 25, seed: 7 })
    expect(a).toEqual(b)
  })

  it('differs across seeds', () => {
    const a = generateBuildings({ center: SEOUL, count: 25, seed: 7 })
    const b = generateBuildings({ center: SEOUL, count: 25, seed: 8 })
    expect(a).not.toEqual(b)
  })

  it('keeps heights within the requested range', () => {
    const buildings = generateBuildings({
      center: SEOUL,
      count: 200,
      seed: 3,
      heightRange: [20, 260],
    })
    for (const b of buildings) {
      expect(b.height).toBeGreaterThanOrEqual(20)
      expect(b.height).toBeLessThanOrEqual(260)
    }
  })
})

describe('buildSkyline', () => {
  it('returns an empty array for no specs', () => {
    expect(buildSkyline([])).toEqual([])
  })

  it('attaches a footprint and color to every building', () => {
    const specs = generateBuildings({ center: SEOUL, count: 10, seed: 1 })
    const skyline = buildSkyline(specs)
    expect(skyline).toHaveLength(10)
    for (const b of skyline) {
      expect(b.footprint).toHaveLength(4)
      expect(b.color).toHaveLength(3)
    }
  })
})

describe('toSkylineBuilding', () => {
  it('uses rectangular footprint when no polygon is provided', () => {
    const spec = {
      id: 'test-1',
      lat: SEOUL.lat,
      lng: SEOUL.lng,
      width: 60,
      depth: 40,
      height: 100,
      name: '',
      landmark: false,
    }
    const b = toSkylineBuilding(spec)
    expect(b.footprint).toHaveLength(4)
  })

  it('uses provided polygon instead of rectangular footprint', () => {
    const polygon: Array<[number, number]> = [
      [127.1, 37.51],
      [127.101, 37.51],
      [127.101, 37.511],
      [127.1, 37.511],
      [127.1, 37.51],
    ]
    const spec = {
      id: 'test-2',
      lat: SEOUL.lat,
      lng: SEOUL.lng,
      width: 60,
      depth: 40,
      height: 100,
      name: '',
      landmark: false,
      polygon,
    }
    const b = toSkylineBuilding(spec)
    expect(b.footprint).toEqual(polygon)
  })
})
