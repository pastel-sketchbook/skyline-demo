# 0001 — Architecture Rationale

This document explains the key architectural decisions behind Skyline
Demo: why deck.gl over alternatives, why MapLibre, why runtime Overpass
fetches, and why determinism is non-negotiable.

## Why deck.gl + MapLibre (not Mapbox, Google, Cesium)

| Option | Verdict |
|---|---|
| **Mapbox GL JS** | Requires an API key; usage-based billing; no free tier for production |
| **Google Maps** | Requires a key; billing; telemetry; heavier JS bundle |
| **CesiumJS** | Full 3D globe; overkill for a skyline demo; large bundle |
| **deck.gl + MapLibre** | Zero keys; MIT-licensed; ESRI satellite tiles are free; CARTO vector tiles are free; small bundle; strong React bindings |

deck.gl's `PolygonLayer` with `extruded: true` handles the
building-extrusion use case directly. MapLibre provides the basemap tiles
and camera controls. Together they give us a 3D city scene with no
billing, no keys, and a clean React integration via `@deck.gl/react`.

The basemap options (ESRI satellite, CARTO vector, CARTO dark) are
configured as static style objects or URLs in
[`src/components/SkylineDeck.tsx`](src/components/SkylineDeck.tsx:15)
and toggled by the `BasemapMode` state. No runtime configuration is
needed because the tile providers require no authentication.

## Why runtime Overpass fetches (not build-time only)

A build-time-only fetch (`scripts/fetch-buildings.ts`) would lock the
scene to whatever was fetched at build time. This is fine for a demo
with a fixed set of cities, but it means:

1. The scene can't respond to map panning — new viewport areas would be
   empty.
2. Updating building data requires a rebuild and redeploy.
3. Testing the Overpass client at build time doesn't prove it works in
   the browser.

Runtime fetching via [`src/lib/overpass.ts`](src/lib/overpass.ts) solves
all three:

- As the user pans, new viewport areas are fetched and accumulated.
  The 400 m haversine threshold and tile-keyed cache (zoom 14, 1 h TTL)
  prevent redundant fetches.
- The demo is a living snapshot of OSM data — no rebuild needed.
- The Overpass client is tested in unit tests
  ([`src/lib/overpass.test.ts`](src/lib/overpass.test.ts)) and exercised
  at runtime.

The critical design decision is **progressive enhancement**: the scene
always renders. When the page loads, deterministic generated filler is
shown immediately. When real Overpass data arrives, it replaces the
filler. If Overpass is unreachable, the generated skyline remains. This
means the demo is always visually complete, never blank.

## Why determinism is non-negotiable

A skyline visualization must be stable: the same city + seed must
produce the same scene every time. This matters for:

- **Tests**: `skyline.test.ts` verifies generator output, height-band
  colors, and footprint ring shapes. Non-deterministic results would
  make tests flaky.
- **Visual regression**: if the scene changes between page loads without
  user action, the demo looks broken.
- **OSM data**: even for real buildings, footprint sizes are derived
  deterministically from OSM element IDs via `deterministicSizes()`
  ([`src/lib/overpass.ts:87`](src/lib/overpass.ts:87)) so the same OSM
  query always produces the same geometry.

`Math.random()` is never used. Filler buildings use a Mulberry32 PRNG
([`src/lib/skyline.ts:161`](src/lib/skyline.ts:161)) seeded from the
city's `seed` value. Real buildings use OSM element IDs as the
deterministic source.

## Why cities are data, not code

Each city is a typed entry in [`src/data/cities.ts`](src/data/cities.ts)
containing center, camera, seed, filler count, and landmarks. Adding a
city means adding one object to the `CITIES` array — no new components,
no new route logic, no new rendering code.

This separation keeps the rendering pipeline generic. The deck.gl scene,
the Overpass client, and the filler generator are all city-agnostic.
They receive building specs and produce visual output. The city data
module is the only place that knows about Seoul vs. New York.

## Why rectangular footprints as the base shape

Real building footprints from OSM are irregular polygons. But OSM data
isn't always available (rate limits, coverage gaps, network failures).
The rectangular approximation (`rectFootprint()` in
[`src/lib/skyline.ts:58`](src/lib/skyline.ts:58)) ensures the scene
always has geometry to render.

When real polygon data is available (`polygon` field on `BuildingSpec`),
it's used directly via `toSkylineBuilding()` at
[`src/lib/skyline.ts:241`](src/lib/skyline.ts:241):

```typescript
footprint: spec.polygon ?? rectFootprint(spec, spec.width, spec.depth)
```

This is a straightforward fallback chain: real polygon > rectangular
approximation. No complex geometry repair or simplification is needed
because deck.gl handles arbitrary closed rings.

## Why height bands (not continuous color)

Discrete height bands (6 ranges from teal to brick) are easier to read
at a glance than a continuous gradient. The user can immediately tell
"this building is 300 m" without consulting a legend. Bands also make
the visual tests deterministic — the same height always maps to the same
RGB tuple.

Three palettes are available (`default`, `night`, `mono`) defined in
[`src/lib/skyline.ts:95`](src/lib/skyline.ts:95). Each is a set of
6 `[min, max, [r, g, b]]` tuples. The `heightToColorFromBands()` function
does a linear scan and returns the first matching band. This is O(n)
with n=6 — negligible overhead.

## Why the SpringFlyInterpolator

The default deck.gl `FlyToInterpolator` zooms out, pans, and zooms in
at a constant rate. The custom `SpringFlyInterpolator` in
[`src/App.tsx:58`](src/App.tsx:58) adds a quick zoom-out (first 30%)
followed by a slow, eased zoom-in (remaining 70%). This creates a more
cinematic, natural camera movement when switching cities, which matters
for a demo where first impressions count.

## Why no API keys

This is a hard constraint documented in
[AGENTS.md](AGENTS.md#core-development-principles). Every service used
must be free and key-free:

- **Basemaps**: ESRI World Imagery (raster tiles, no key), CARTO
  Voyager/Dark Matter (vector tiles, no key)
- **Buildings**: OpenStreetMap Overpass API (public endpoint, rate-limited
  but key-free)
- **Fonts**: Google Fonts via `@fontsource/*` packages (bundled at build
  time)

The demo must run with zero configuration. No `.env` files, no key
rotation, no billing alerts.

## Future considerations

- **Real polygon caching**: currently OSM polygons are cached in-memory.
  IndexedDB caching would survive page reloads.
- **Level-of-detail**: at low zoom levels, buildings could be simplified
  or clustered to reduce draw call count.
- **Night mode**: the `night` palette exists but the basemap toggle
  doesn't yet switch to a dark basemap automatically based on sun
  position.
