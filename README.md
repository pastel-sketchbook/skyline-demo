# Skyline Demo

A small [deck.gl](https://deck.gl) demo that renders **3D city skylines**
(for example, **Seoul**, **New York**, **Dubai**) in the browser — with
**no API key required**.

Extruded buildings are drawn with a deck.gl `PolygonLayer` over a free
MapLibre basemap (ESRI satellite or CARTO vector, toggleable). On app
load, the demo fetches **real building footprints from OpenStreetMap**
via the Overpass API. If Overpass is unreachable, it falls back to a
deterministic generated skyline — the scene always renders.

Buildings are colored by height band (6 discrete bands from teal →
brick) so skyline structure is readable at a glance.

## Stack

- React 19 + TypeScript + Vite
- deck.gl 9 (`@deck.gl/react`, `@deck.gl/layers`)
- MapLibre GL via `react-map-gl/maplibre` (ESRI satellite or CARTO vector, no key)
- Tailwind CSS 4 + daisyUI 5
- Biome (lint + format), Vitest (unit tests)
- **bun** as package manager + task runner

## Getting started

```bash
bun install
bun run dev        # or: task web:dev
```

Open the printed local URL. Switch cities and drag/scroll to orbit the
skyline; use the pitch / bearing sliders to frame the shot. Toggle
between Photo (satellite) and Map (vector) basemap.

## Common tasks

```bash
task web:dev       # Vite dev server
task web:build     # production build
task test          # Vitest
task check:all     # Biome + Vitest + type-check + build
```

(Or run the underlying `bun run <script>` directly.)

## How it works

1. Pick a city from [`src/data/cities.ts`](src/data/cities.ts)
   (center + camera + landmark buildings).
2. On city select, kick off a runtime Overpass fetch for real building
   footprints with height data ([`src/lib/overpass.ts`](src/lib/overpass.ts)).
   While fetching, render deterministic generated filler as a placeholder.
3. When real data arrives, swap filler for real OSM buildings. Footprint
   sizes are deterministic (derived from OSM element IDs).
4. Assign each building its height-band color and extrude it in meters.
5. Render with deck.gl over a MapLibre basemap
   ([`src/components/SkylineDeck.tsx`](src/components/SkylineDeck.tsx)).

Adding a new city is one typed entry in `src/data/cities.ts`.
