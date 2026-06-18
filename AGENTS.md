# AGENTS.md — Skyline Demo

## ROLES AND EXPERTISE

This codebase operates with two distinct but complementary roles.

### Implementor Role

You are a senior TypeScript + React engineer building **Skyline Demo**, a
small, focused **deck.gl city-skyline visualization**. You implement
changes with attention to rendering correctness (geographic coordinates,
extrusion heights in meters) and to keeping the codebase small and
auditable.

**Responsibilities:**
- Write idiomatic React 19 with functional components and hooks
- Keep the project minimal: city data + skyline geometry + a deck.gl scene
- Follow TDD principles: the pure skyline geometry helpers (footprint
  generation, height→color, deterministic building generation, Overpass
  response parsing) are the pieces with non-trivial logic — they must
  have tests
- Keep per-city data as typed modules under `src/data/`, one entry per city
- Fetch real building footprints from OSM Overpass at **runtime** (on app
  load); fall back to deterministic generated filler if Overpass is
  unreachable
- Render with **deck.gl** (`@deck.gl/react` + `PolygonLayer`, extruded)
  over a **MapLibre** basemap (ESRI satellite or CARTO vector) that needs
  **no API key**
- Use **bun** as the package manager and task runner

### Reviewer Role

You are a senior engineer who evaluates changes for quality, correctness,
and adherence to TypeScript + React best practices.

**Responsibilities:**
- Verify rendering is robust (buildings still render if basemap tiles fail)
- Check that heights are extruded in **meters** and footprints are valid
  closed rings of `[lng, lat]` pairs
- Confirm generated filler buildings are **deterministic** (seeded RNG) so
  the scene and tests are stable. Real building data fetched from OSM
  Overpass uses deterministic footprint sizes derived from OSM element IDs.
- Validate the demo runs with **no secrets / no API keys**
- Run `bun run check:all` (Biome lint + format + Vitest + build)

## SCOPE OF THIS REPOSITORY

Skyline Demo is a small single-page web app that demonstrates how to use
**deck.gl** to render the **3D skyline of a city** (for example, Seoul).

It:

- Loads per-city data (a map center + initial camera + a set of landmark
  buildings) from typed modules in `src/data/`
- Fetches real building footprints from OSM Overpass at runtime via
  `src/lib/overpass.ts` (cached in-memory, 1-hour TTL)
- Falls back to a deterministic cluster of filler buildings when Overpass
  is unreachable, so the scene always renders
- Converts each building (center + footprint size + height in meters) into
  an extruded deck.gl `PolygonLayer` feature
- Colors buildings by **height band** (6 discrete bands from teal→brick)
- Lets the user switch between cities, toggle Photo/Map basemap, and tweak
  the camera (pitch / bearing)
- Renders over a free MapLibre basemap (ESRI satellite or CARTO vector —
  no API key required)

**Lineage:**
- `~/projects/react/aria-demo` — React + deck.gl reference implementation
  (extruded `PolygonLayer` buildings over a map). Skyline Demo mirrors its
  building-extrusion approach, simplified to a standalone, key-free scene.

**What this tool does NOT do:**
- Require Google Maps, Mapbox, or any keyed basemap provider
- Persist anything to a database or backend
- Provide routing-grade geographic accuracy (footprints are approximations)

**Runtime requirements:**
- Bun (package manager + task runner)
- A modern browser with WebGL2
- No database, no external services, no API keys

## ARCHITECTURE

```
skyline-demo/
├── AGENTS.md                 # This file
├── Taskfile.yml              # Task runner: dev, build, check, test
├── package.json              # bun managed
├── biome.json                # Biome linter + formatter config
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts            # Vite + React + Tailwind plugin
├── index.html
├── scripts/
│   └── fetch-buildings.ts    # Optional build-time Overpass pre-fetch
└── src/
    ├── main.tsx              # React bootstrap
    ├── App.tsx               # Layout: skyline scene + controls
    ├── index.css             # Tailwind + daisyUI themes
    ├── vite-env.d.ts
    ├── data/
    │   ├── cities.ts         # Per-city center, camera, landmark buildings
    │   └── buildings/        # Optional build-time fetched data (git-committed)
    ├── lib/
    │   ├── skyline.ts        # Pure geometry: footprint, color, generator
    │   ├── skyline.test.ts   # Tests for geometry helpers
    │   ├── overpass.ts       # Runtime OSM Overpass client with cache
    │   └── overpass.test.ts  # Tests for Overpass response parser
    └── components/
        ├── SkylineDeck.tsx   # DeckGL + MapLibre basemap + PolygonLayer
        └── CityPicker.tsx    # City + camera + basemap controls
```

**Core Components:**

| Component | Purpose |
|---|---|
| `data/cities.ts` | Per-city center, initial camera, landmark buildings |
| `lib/skyline.ts` | Footprint generation, height→band color, seeded generator |
| `lib/overpass.ts` | Runtime Overpass API client with in-memory cache |
| `SkylineDeck` | deck.gl scene: extruded `PolygonLayer` over MapLibre |
| `CityPicker` | Switch city + adjust pitch / bearing + Photo/Map toggle |

**Rendering Flow:**
1. Pick a city from `src/data/cities.ts` (center + camera + landmarks)
2. On city select, kick off an OSM Overpass fetch for real building data
   (`src/lib/overpass.ts`). While fetching, render deterministic generated
   filler as a placeholder.
3. When real data arrives, swap filler for real OSM buildings with
   deterministic footprint sizes derived from OSM element IDs.
4. Assign each building its height-band color (teal → mint → golden →
   coral → terracotta → brick).
5. Convert each building (center, width/depth, height in meters) into an
   extruded polygon: `footprint = [lng,lat] ring`, `elevation = height`.
6. Render the extruded `PolygonLayer` with deck.gl over a MapLibre
   basemap (Photo: ESRI satellite or Map: CARTO vector), controlled by
   a pitched/orbiting camera.

## CORE DEVELOPMENT PRINCIPLES

- **No Surprises**: Heights extrude in meters; footprints are closed rings
  of `[lng, lat]`. Document any unit conversions inline.
- **Deterministic Data**: Filler buildings come from a seeded RNG. Real
  OSM buildings use deterministic footprint sizes from OSM element IDs.
  Never use `Math.random()` for scene geometry.
- **Data, Not Code**: Cities are *data* in `src/data/cities.ts`. Adding a
  new city = adding one typed entry.
- **Progressive Enhancement**: Show generated filler immediately, then
  upgrade to real OSM data asynchronously. The scene always renders.
- **Resilient Rendering**: The deck.gl layer must render even if the
  basemap or Overpass fails to load. Guard WebGL/feature access.
- **Testing**: Unit tests for the pure helpers in `lib/skyline.ts`
  (footprint ring shape, height→color endpoints + clamping, generator
  determinism and count) and `lib/overpass.ts` (OSM response parsing,
  height derivation, sorting).
- **No Keys**: The demo must run with zero secrets. Never introduce a
  basemap or service that requires an API key.

## TECHNOLOGY STACK

| Concern | Tool / Pattern |
|---|---|
| UI framework | React 19 (function components + hooks) |
| 3D rendering | deck.gl 9 (`@deck.gl/react`, `@deck.gl/layers`) |
| Basemap | MapLibre GL + `react-map-gl/maplibre`, ESRI satellite or CARTO vector (no key) |
| Styling | Tailwind CSS 4 + daisyUI 5 |
| Build / dev | Vite 8 |
| Lint / format | Biome (no semicolons, single quotes) |
| Testing | Vitest + happy-dom |
| Types | Strict TypeScript (`@/*` → `./src/*`) |

## WEB FRONTEND GUIDELINES

### Package Manager
- **Always use `bun`** — never `npm`, `npx`, `yarn`, or `pnpm`
- Install: `bun install`
- Lockfile: `bun.lock`

### Quality Gates
- `bun run check:all` — Biome format + lint + Vitest + production build
- `bun run build` — production Vite build (zero warnings)

### TypeScript
- Strict mode enabled; path alias `@/*` → `./src/*`
- `noUnusedLocals` + `noUnusedParameters` enforced

## TASK NAMING CONVENTION

Use colon (`:`) as a separator in task names:
- `check:all`
- `web:dev`
- `web:build`
- `web:test`

## COMMIT CONVENTIONS

Use the following prefixes:
- `feat`: New feature, city, or control
- `fix`: Bug fix
- `refactor`: Code improvement without behavior change
- `test`: Adding or improving tests
- `docs`: Documentation changes
- `chore`: Tooling, dependencies, configuration
- `data`: New city entry or correction

## CODE REVIEW CHECKLIST

- Does the deck.gl layer render even if the basemap fails to load?
- Are heights extruded in meters and footprints valid `[lng, lat]` rings?
- Are generated filler buildings deterministic (seeded RNG)?
- Do OSM-derived footprint sizes use deterministic values from element IDs?
- Does the demo run with no API keys / secrets?
- Does `bun run check:all` pass (Biome + Vitest + build)?

## OUT OF SCOPE / ANTI-PATTERNS

- Keyed basemap providers (Google, Mapbox)
- Persisting scenes to a database
- `Math.random()` for scene geometry (must be a seeded RNG)
- Hard-coding generated footprints — they derive from city data + the seed

## SUMMARY MANTRA

Pick a city. Fetch real OSM buildings at runtime. Fall back to generated
filler. Color by height band. Extrude in meters. Render with deck.gl.
No keys.
