# Skyline Demo

A small [deck.gl](https://deck.gl) demo that renders **3D city skylines**
(for example, **Seoul**) in the browser — with **no API key required**.

Extruded buildings are drawn with a deck.gl `PolygonLayer` over a free
MapLibre + CARTO basemap. Each city contributes a handful of hand-curated
landmark towers plus a deterministically generated cluster of filler
buildings, so the scene reads as a real downtown core.

## Stack

- React 19 + TypeScript + Vite
- deck.gl 9 (`@deck.gl/react`, `@deck.gl/layers`)
- MapLibre GL via `react-map-gl/maplibre` (CARTO dark basemap, no key)
- Tailwind CSS 4 + daisyUI 5
- Biome (lint + format), Vitest (unit tests)
- **bun** as package manager + task runner

## Getting started

```bash
bun install
bun run dev        # or: task web:dev
```

Open the printed local URL. Switch cities and drag/scroll to orbit the
skyline; use the pitch / bearing sliders to frame the shot.

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
2. Generate deterministic filler buildings around the district center with
   a seeded RNG ([`src/lib/skyline.ts`](src/lib/skyline.ts)).
3. Convert each building (center + footprint size + height in meters) into
   an extruded polygon and color it by height.
4. Render with deck.gl over the CARTO basemap
   ([`src/components/SkylineDeck.tsx`](src/components/SkylineDeck.tsx)).

Adding a new city is one typed entry in `src/data/cities.ts`.
