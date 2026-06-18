import { describe, expect, it } from 'vitest'

import { parseOverpassResponse } from './overpass'

const MOCK_RESPONSE = JSON.parse(`{
  "elements": [
    {"type":"way","id":1001,"tags":{"height":"120","name":"Tower A"},"center":{"lat":37.51,"lon":127.1}},
    {"type":"way","id":1002,"tags":{"building:levels":"30"},"center":{"lat":37.52,"lon":127.11}},
    {"type":"way","id":1003,"tags":{"height":"55 m"},"center":{"lat":37.5,"lon":127.09}},
    {"type":"way","id":1004,"tags":{"height":"200 ft"},"center":{"lat":37.53,"lon":127.12}},
    {"type":"way","id":1005,"tags":{"height":"~80"},"center":{"lat":37.49,"lon":127.08}},
    {"type":"way","id":1006,"tags":{"building":"yes"},"center":{"lat":37.5,"lon":127.1}},
    {"type":"way","id":1007,"tags":{"height":"50"}}
  ]
}`)

describe('parseOverpassResponse', () => {
  const buildings = parseOverpassResponse(MOCK_RESPONSE)

  it('returns only elements with valid height data', () => {
    expect(buildings).toHaveLength(5)
  })

  it('parses plain height numbers', () => {
    expect(buildings.find((b) => b.id === 'osm-way-1001')?.height).toBe(120)
  })

  it('derives height from building:levels (30 * 3.5 = 105)', () => {
    expect(buildings.find((b) => b.id === 'osm-way-1002')?.height).toBe(105)
  })

  it('strips "m" suffix', () => {
    expect(buildings.find((b) => b.id === 'osm-way-1003')?.height).toBe(55)
  })

  it('converts feet to meters', () => {
    const b = buildings.find((b) => b.id === 'osm-way-1004')
    expect(b?.height).toBe(61) // 200 * 0.3048 ≈ 61
  })

  it('strips leading tilde for approximate heights', () => {
    expect(buildings.find((b) => b.id === 'osm-way-1005')?.height).toBe(80)
  })

  it('assigns deterministic width/depth from OSM id', () => {
    for (const b of buildings) {
      expect(b.width).toBeGreaterThanOrEqual(15)
      expect(b.width).toBeLessThanOrEqual(65)
      expect(b.depth).toBeGreaterThanOrEqual(15)
      expect(b.depth).toBeLessThanOrEqual(65)
    }
  })

  it('sorts results by height descending', () => {
    for (let i = 1; i < buildings.length; i++) {
      expect(buildings[i - 1].height).toBeGreaterThanOrEqual(buildings[i].height)
    }
  })

  it('returns an empty array for no elements', () => {
    expect(parseOverpassResponse({})).toEqual([])
    expect(parseOverpassResponse({ elements: [] })).toEqual([])
  })
})
