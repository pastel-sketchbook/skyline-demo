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
  generation, height→color, deterministic building generation) are the
  pieces with non-trivial logic — they must have tests
- Keep per-city data as typed modules under `src/data/`, one entry per city
- Optionally fetch real building footprints from OSM Overpass at build time
  via `bun run build:data` before `bun run build`
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
  the scene and tests are stable. Real building data fetched from OSM Overpass
  uses deterministic footprint sizes derived from OSM element IDs.
- Validate the demo runs with **no secrets / no API keys**
- Run `bun run check:all` (Biome lint + format + Vitest + build)

## SCOPE OF THIS REPOSITORY

Skyline Demo is a small single-page web app that demonstrates how to use
**deck.gl** to render the **3D skyline of a city** (for example, Seoul).

It:

- Loads per-city data (a map center + initial camera + a set of landmark
  buildings) from typed modules in `src/data/`
- Generates a deterministic cluster of filler buildings around each city's
  skyline district so the scene reads as a real skyline
- Converts each building (center + footprint size + height in meters) into
  an extruded deck.gl `PolygonLayer` feature
- Colors buildings by height with a configurable gradient
- Lets the user switch between cities and tweak the camera (pitch / bearing)
- Renders over a free MapLibre CARTO basemap (no API key required)

**Lineage:**
- `~/projects/react/aria-demo` — React + deck.gl reference implementation
  (extruded `PolygonLayer` buildings over a map). Skyline Demo mirrors its
  building-extrusion approach, simplified to a standalone, key-free scene.

**What this tool does NOT do:**
- Fetch live building footprints from OSM / Overpass (data is static +
  deterministically generated)
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
└── src/
    ├── main.tsx              # React bootstrap
    ├── App.tsx               # Layout: skyline scene + controls
    ├── index.css             # Tailwind + daisyUI themes
    ├── vite-env.d.ts
    ├── data/
    │   └── cities.ts         # Per-city center, camera, landmark buildings
    ├── lib/
    │   ├── skyline.ts        # Pure geometry: footprint, color, generator
    │   └── skyline.test.ts   # Unit tests for the pure helpers
    └── components/
        ├── SkylineDeck.tsx   # DeckGL + MapLibre basemap + PolygonLayer
        └── CityPicker.tsx    # City + camera controls
```

**Core Components:**

| Component | Purpose |
|---|---|
| `data/cities.ts` | Per-city center, initial camera, landmark buildings |
| `lib/skyline.ts` | Footprint generation, height→color, seeded generator |
| `SkylineDeck` | deck.gl scene: extruded `PolygonLayer` over MapLibre |
| `CityPicker` | Switch city + adjust pitch / bearing |

**Rendering Flow:**
1. Pick a city from `src/data/cities.ts` (center + camera + landmarks)
2. Generate deterministic filler buildings around the skyline district
   (seeded RNG → stable scene + stable tests)
3. Convert each building (center, width/depth, height in meters) into an
   extruded polygon: `footprint = [lng,lat] ring`, `elevation = height`
4. Color each building by height via a low→high gradient
5. Render the extruded `PolygonLayer` with deck.gl over a MapLibre CARTO
   basemap, controlled by a pitched/orbiting camera

## CORE DEVELOPMENT PRINCIPLES

- **No Surprises**: Heights extrude in meters; footprints are closed rings
  of `[lng, lat]`. Document any unit conversions inline.
- **Deterministic Data**: Filler buildings come from a seeded RNG. The same
  city always yields the same skyline. Never use `Math.random()` for scene
  geometry.
- **Data, Not Code**: Cities are *data* in `src/data/cities.ts`. Adding a
  new city = adding one typed entry.
- **Resilient Rendering**: The deck.gl layer must render even if the
  basemap fails to load. Guard WebGL/feature access.
- **Testing**: Unit tests for the pure helpers in `lib/skyline.ts`
  (footprint ring shape, height→color endpoints + clamping, generator
  determinism and count).
- **No Keys**: The demo must run with zero secrets. Never introduce a
  basemap or service that requires an API key.

## TECHNOLOGY STACK

| Concern | Tool / Pattern |
|---|---|
| UI framework | React 19 (function components + hooks) |
| 3D rendering | deck.gl 9 (`@deck.gl/react`, `@deck.gl/layers`) |
| Basemap | MapLibre GL + `react-map-gl/maplibre`, CARTO style (no key) |
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
- Does the demo run with no API keys / secrets?
- Does `bun run check:all` pass (Biome + Vitest + build)?

## OUT OF SCOPE / ANTI-PATTERNS

- Live OSM / Overpass fetching
- Keyed basemap providers (Google, Mapbox)
- Persisting scenes to a database
- `Math.random()` for scene geometry (must be a seeded RNG)
- Hard-coding generated footprints — they derive from city data + the seed

## SUMMARY MANTRA

Pick a city. Generate a deterministic skyline. Extrude in meters.
Color by height. Render with deck.gl. No keys.
