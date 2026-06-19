/**
 * cities.ts
 *
 * Per-city skyline data. Each city contributes:
 *  - a map center + initial camera (pitch / bearing / zoom)
 *  - a "district center" the generated filler cluster scatters around
 *  - a set of hand-curated landmark buildings
 *
 * Heights are in meters and are deliberate approximations of real-world
 * structures — good enough for a recognizable skyline, not survey-grade.
 *
 * Adding a new city = adding one entry to the CITIES array.
 */

import type { BuildingSpec } from '@/lib/skyline'

export interface City {
  id: string
  name: string
  blurb: string
  center: { lat: number; lng: number }
  /** Where the generated filler cluster is centered. */
  districtCenter: { lat: number; lng: number }
  /** Initial deck.gl camera. */
  view: { zoom: number; pitch: number; bearing: number }
  /** Seed for deterministic filler generation. */
  seed: number
  /** Number of generated filler buildings. */
  fillerCount: number
  landmarks: BuildingSpec[]
}

function landmark(
  id: string,
  name: string,
  lat: number,
  lng: number,
  height: number,
  width: number,
  depth: number,
): BuildingSpec {
  return { id, name, lat, lng, height, width, depth, landmark: true }
}

export const CITIES: City[] = [
  {
    id: 'seoul',
    name: 'Seoul',
    blurb: 'Lotte World Tower anchors the Jamsil skyline along the Han River.',
    center: { lat: 37.5125, lng: 127.0982 },
    districtCenter: { lat: 37.5125, lng: 127.1005 },
    view: { zoom: 14.2, pitch: 55, bearing: 20 },
    seed: 19880,
    fillerCount: 240,
    landmarks: [
      landmark('seoul-lotte-world-tower', 'Lotte World Tower', 37.5125, 127.1025, 555, 72, 72),
      landmark('seoul-parc1-tower', 'Parc1 Tower', 37.5255, 126.927, 333, 60, 60),
      landmark('seoul-three-ifc', 'Three IFC', 37.5252, 126.9255, 284, 55, 55),
      landmark('seoul-63-building', '63 Building', 37.5198, 126.9405, 249, 60, 40),
      landmark('seoul-n-tower', 'N Seoul Tower', 37.5512, 126.9882, 236, 40, 40),
    ],
  },
  {
    id: 'new-york',
    name: 'New York',
    blurb: 'Midtown Manhattan, from the Empire State Building to supertalls.',
    center: { lat: 40.7549, lng: -73.984 },
    districtCenter: { lat: 40.7549, lng: -73.984 },
    view: { zoom: 14, pitch: 55, bearing: -20 },
    seed: 21001,
    fillerCount: 260,
    landmarks: [
      landmark('nyc-central-park-tower', 'Central Park Tower', 40.7663, -73.981, 472, 56, 56),
      landmark('nyc-empire-state', 'Empire State Building', 40.7484, -73.9857, 443, 130, 60),
      landmark('nyc-432-park', '432 Park Avenue', 40.7616, -73.9719, 426, 28, 28),
      landmark('nyc-one-wtc', 'One World Trade Center', 40.7127, -74.0134, 541, 60, 60),
      landmark('nyc-chrysler', 'Chrysler Building', 40.7516, -73.9755, 319, 56, 56),
    ],
  },
  {
    id: 'dubai',
    name: 'Dubai',
    blurb: 'Downtown Dubai, dominated by the 828 m Burj Khalifa.',
    center: { lat: 25.195, lng: 55.275 },
    districtCenter: { lat: 25.195, lng: 55.275 },
    view: { zoom: 13.8, pitch: 58, bearing: 30 },
    seed: 30055,
    fillerCount: 240,
    landmarks: [
      landmark('dubai-burj-khalifa', 'Burj Khalifa', 25.1972, 55.2744, 828, 70, 70),
      landmark('dubai-address-blvd', 'Address Boulevard', 25.193, 55.279, 370, 45, 45),
      landmark('dubai-burj-al-arab', 'Burj Al Arab', 25.1413, 55.1853, 321, 60, 60),
      landmark('dubai-marina-101', 'Marina 101', 25.0805, 55.1403, 425, 50, 50),
      landmark('dubai-princess-tower', 'Princess Tower', 25.0875, 55.1454, 414, 50, 50),
    ],
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    blurb: 'Minato skyline, from Tokyo Tower to the new Azabudai Hills.',
    center: { lat: 35.66, lng: 139.745 },
    districtCenter: { lat: 35.66, lng: 139.745 },
    view: { zoom: 14, pitch: 55, bearing: 10 },
    seed: 42073,
    fillerCount: 260,
    landmarks: [
      landmark('tokyo-skytree', 'Tokyo Skytree', 35.7101, 139.8107, 634, 50, 50),
      landmark('tokyo-azabudai-hills', 'Azabudai Hills', 35.6605, 139.7403, 325, 54, 54),
      landmark('tokyo-tower', 'Tokyo Tower', 35.6586, 139.7454, 333, 45, 45),
      landmark('tokyo-midtown', 'Midtown Tower', 35.6655, 139.7314, 248, 45, 45),
      landmark('tokyo-toranomon-hills', 'Toranomon Hills', 35.6671, 139.7492, 255, 42, 42),
    ],
  },
  {
    id: 'shanghai',
    name: 'Shanghai',
    blurb: 'Pudong\u2019s futuristic towers line the Huangpu River.',
    center: { lat: 31.236, lng: 121.501 },
    districtCenter: { lat: 31.236, lng: 121.501 },
    view: { zoom: 14, pitch: 55, bearing: -15 },
    seed: 53017,
    fillerCount: 250,
    landmarks: [
      landmark('shanghai-tower', 'Shanghai Tower', 31.2355, 121.5015, 632, 60, 60),
      landmark('shanghai-wfc', 'SWFC', 31.236, 121.501, 492, 55, 55),
      landmark('shanghai-jin-mao', 'Jin Mao Tower', 31.238, 121.501, 421, 50, 50),
      landmark('shanghai-oriental-pearl', 'Oriental Pearl', 31.2417, 121.5004, 468, 40, 40),
      landmark('shanghai-shimao', 'Shimao Plaza', 31.2325, 121.472, 333, 45, 45),
    ],
  },
  {
    id: 'hong-kong',
    name: 'Hong Kong',
    blurb: 'Victoria Harbour\u2019s dense forest of towering supertalls.',
    center: { lat: 22.285, lng: 114.158 },
    districtCenter: { lat: 22.285, lng: 114.158 },
    view: { zoom: 13.8, pitch: 55, bearing: -30 },
    seed: 64019,
    fillerCount: 220,
    landmarks: [
      landmark('hk-icc', 'International Commerce Centre', 22.303, 114.16, 484, 55, 55),
      landmark('hk-two-ifc', 'Two International Finance Centre', 22.285, 114.159, 412, 50, 50),
      landmark('hk-central-plaza', 'Central Plaza', 22.279, 114.173, 374, 45, 45),
      landmark('hk-boc-tower', 'Bank of China Tower', 22.279, 114.162, 367, 45, 45),
      landmark('hk-the-center', 'The Center', 22.284, 114.153, 346, 42, 42),
    ],
  },
  {
    id: 'chicago',
    name: 'Chicago',
    blurb: 'The Windy City\u2019s lakefront skyline, anchored by the Sears Tower.',
    center: { lat: 41.882, lng: -87.628 },
    districtCenter: { lat: 41.882, lng: -87.628 },
    view: { zoom: 13.8, pitch: 55, bearing: 15 },
    seed: 75043,
    fillerCount: 250,
    landmarks: [
      landmark('chi-willis-tower', 'Willis Tower', 41.8789, -87.6358, 442, 68, 68),
      landmark('chi-trump-tower', 'Trump Tower', 41.8885, -87.6265, 423, 40, 40),
      landmark('chi-aon-center', 'Aon Center', 41.8854, -87.6213, 346, 50, 50),
      landmark('chi-hancock-center', '875 N Michigan', 41.8989, -87.6231, 344, 43, 43),
      landmark('chi-former-hancock', '360 Chicago', 41.8989, -87.6228, 250, 40, 40),
    ],
  },
]

export const DEFAULT_CITY_ID = 'seoul'

export function getCity(id: string): City {
  return CITIES.find((city) => city.id === id) ?? CITIES[0]
}
