# Skyline Demo

**[Live Demo →](https://pastel-sketchbook.github.io/skyline-demo/)**

A **deck.gl** city-skyline visualizer that renders 3D buildings over a
free basemap — no API key required.

Pick a city, orbit the skyline, and watch real OpenStreetMap footprints
replace generated filler in real time. Buildings are colored by height
band (teal → brick) and extruded in meters.

## Cities

35+ cities: Seoul, New York, Dubai, Tokyo, Shanghai, Hong Kong, Chicago,
Houston, London, Paris, Singapore, Kuala Lumpur, Bangkok, Mumbai,
Sydney, Melbourne, Toronto, Vancouver, Sao Paulo, Mexico City, Buenos
Aires, Berlin, Madrid, Moscow, Istanbul, Taipei, Jakarta, Manila,
Kuwait City, Doha, Riyadh, Abu Dhabi, San Francisco, Los Angeles,
Miami, Seattle.

Adding a new city is one typed entry in
[`src/data/cities.ts`](src/data/cities.ts).

## Stack

| Layer | Tool |
|---|---|
| UI | React 19 |
| 3D rendering | deck.gl 9 (`PolygonLayer`, extruded) |
| Basemap | MapLibre GL — ESRI satellite, CARTO vector, or CARTO dark |
| Styling | Tailwind CSS 4 + daisyUI 5 |
| Build | Vite 8 |
| Lint/format | Biome |
| Test | Vitest + happy-dom |
| Package manager | **bun** |

## Getting started

```bash
bun install
bun run dev          # or: task web:dev
```

Open the printed local URL. Switch cities, drag/scroll to orbit, and
use the pitch/bearing sliders to frame the shot. Toggle between Photo
(satellite), Map (vector), and Dark basemaps.

## Tasks

```bash
task web:dev         # Vite dev server
task web:build       # production build
task test            # Vitest once
task test:watch      # Vitest in watch mode
task check:all       # Biome + Vitest + type-check + build
task build:data      # Fetch real OSM building data
task gen:mp4         # Capture orbit as mp4 (dev server must be running)
task deploy:gh       # Build for GitHub Pages
```

Or run the underlying `bun run <script>` directly (see `package.json`).

## How it works

1. A city is selected from [`src/data/cities.ts`](src/data/cities.ts)
   — center, camera, seed, and hand-curated landmarks.
2. On load the app fetches **real building footprints** from OpenStreetMap
   via the Overpass API ([`src/lib/overpass.ts`](src/lib/overpass.ts)).
   While fetching, deterministic generated filler renders immediately.
3. When real data arrives, filler is replaced by OSM buildings. Footprint
   sizes are derived deterministically from OSM element IDs.
4. As you pan, new viewport areas are fetched and accumulated (400 m
   haversine threshold, deduped by OSM ID). A tile-keyed cache (zoom 14,
   1 h TTL) avoids re-fetching.
5. Each building is colored by height band and extruded in meters via an
   extruded deck.gl `PolygonLayer` over a MapLibre basemap
   ([`src/components/SkylineDeck.tsx`](src/components/SkylineDeck.tsx)).

## Design rationale

See [`docs/rationale/`](docs/rationale/) for architectural decisions
and trade-offs.

## License

[MIT](LICENSE) — see [LICENSE](LICENSE) for full text.
