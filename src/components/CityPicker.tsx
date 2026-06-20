import {
  Building2,
  ChevronDown,
  Compass,
  Dice5,
  Eye,
  Layers,
  Map as MapIcon,
  MapPin,
  Moon,
  RotateCcw,
  RotateCw,
  Satellite,
  Search,
  Sun,
  SunDim,
  Tag,
} from 'lucide-react'

import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'

import type { City } from '@/data/cities'
import { CITIES } from '@/data/cities'
import type { BasemapMode, MapBgColor, PaletteName, SkylineBuilding, TintMode } from '@/lib/skyline'
import { BUILDING_PALETTES, HEIGHT_BANDS } from '@/lib/skyline'

const LEGEND_GRADIENT = `linear-gradient(to right, ${HEIGHT_BANDS.map(
  ([, , [r, g, b]]) => `rgb(${r}, ${g}, ${b})`,
).join(', ')})`

interface CityPickerProps {
  city: City
  pitch: number
  bearing: number
  buildingCount: number
  basemap: BasemapMode
  palette: PaletteName
  tint: TintMode
  mapBgColor: MapBgColor
  onSelectCity: (id: string) => void
  onPitchChange: (pitch: number) => void
  onBearingChange: (bearing: number) => void
  onReset: () => void
  onBasemapChange: (mode: BasemapMode) => void
  onPaletteChange: (palette: PaletteName) => void
  onTintChange: (tint: TintMode) => void
  onMapBgColorChange: (bg: MapBgColor) => void
  showSkyline: boolean
  onToggleSkyline: () => void
  heightExaggeration: number
  onHeightExaggerationChange: (value: number) => void
  orbiting: boolean
  onOrbit: () => void
  tallestLandmark: SkylineBuilding | null
  sunPosition: number
  onSunPositionChange: (value: number) => void
  searchQuery: string
  onSearchChange: (value: string) => void
  filteredCount: number
  totalCount: number
  seedOverride: number | null
  onSeedOverrideChange: (value: number | null) => void
  defaultSeed: number
  showLabels: boolean
  onToggleLabels: () => void
  dark: boolean
}

export default function CityPicker({
  city,
  pitch,
  bearing,
  buildingCount,
  basemap,
  palette,
  tint,
  mapBgColor,
  onSelectCity,
  onPitchChange,
  onBearingChange,
  onReset,
  onBasemapChange,
  onPaletteChange,
  onTintChange,
  onMapBgColorChange,
  showSkyline,
  onToggleSkyline,
  heightExaggeration,
  onHeightExaggerationChange,
  orbiting,
  onOrbit,
  tallestLandmark,
  sunPosition,
  onSunPositionChange,
  searchQuery,
  onSearchChange,
  filteredCount,
  totalCount,
  seedOverride,
  onSeedOverrideChange,
  defaultSeed,
  showLabels,
  onToggleLabels,
  dark,
}: CityPickerProps) {
  const pitchPct = (pitch / 75) * 100
  const bearingPct = ((bearing + 180) / 360) * 100
  const exhPct = ((heightExaggeration - 1) / 2) * 100
  const sunPct = (sunPosition / 24) * 100

  const [cityPickerOpen, setCityPickerOpen] = useState(false)
  const cityPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!cityPickerOpen) return
    const handler = (e: MouseEvent) => {
      if (cityPickerRef.current && !cityPickerRef.current.contains(e.target as Node)) {
        setCityPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [cityPickerOpen])

  const groupedCities = useMemo(
    () =>
      Object.entries(
        CITIES.reduce<Record<string, typeof CITIES>>((groups, c) => {
          if (!groups[c.country]) groups[c.country] = []
          groups[c.country].push(c)
          return groups
        }, {}),
      )
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([country, cities]) => [country, [...cities].sort((a, b) => a.name.localeCompare(b.name))] as const),
    [],
  )

  return (
    <div className={`${dark ? 'panel-frost-dark' : 'panel-frost'} h-full w-[27rem]`}>
      <div className="panel-scroll h-full space-y-3 overflow-y-auto p-4">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex flex-col space-y-1.5">
          <p className="font-mono text-[15px] font-bold tracking-[0.15em] text-cyan-600 uppercase">deck.gl skyline</p>
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 text-white shadow-sm shadow-cyan-500/25 ring-1 ring-white/40">
              <Building2 size={15} strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <h1
                className={`font-serif text-xl leading-snug font-bold tracking-tight ${dark ? 'text-white' : 'text-slate-800'}`}
              >
                {city.name}
              </h1>
              <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-[15px] tabular-nums text-cyan-600/80">
                <MapPin size={9} strokeWidth={2} />
                {Math.abs(city.center.lat).toFixed(3)}°{city.center.lat >= 0 ? 'N' : 'S'}{' '}
                {Math.abs(city.center.lng).toFixed(3)}°{city.center.lng >= 0 ? 'E' : 'W'}
              </p>
            </div>
          </div>
          <p className={`font-sans text-[15px] leading-snug ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
            {city.blurb}
          </p>
          {tallestLandmark && (
            <p className="inline-flex w-fit items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 font-mono text-[15px] font-medium tracking-wide text-amber-700 uppercase ring-1 ring-amber-200/50">
              ★ {tallestLandmark.name} · {tallestLandmark.height} m
            </p>
          )}
        </div>

        {/* ── Divider ─────────────────────────────────────────── */}
        <div className="divider-subtle" />

        {/* ── City selector ───────────────────────────────────── */}
        <label className="flex flex-col gap-1">
          <span
            className={`flex items-center gap-1 font-mono text-[15px] font-medium tracking-[0.15em] ${dark ? 'text-slate-400' : 'text-slate-400'} uppercase`}
          >
            <Layers size={10} strokeWidth={1.8} />
            City
          </span>
          <div className="relative" ref={cityPickerRef}>
            <button
              type="button"
              className={`flex w-full cursor-pointer items-center justify-between rounded-lg border px-2.5 py-1.5 text-base outline-none transition-all ${
                dark
                  ? 'border-slate-600 bg-slate-800/70 text-slate-200 hover:border-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25'
                  : 'border-slate-300 bg-paper-50 text-slate-600 hover:border-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25'
              }`}
              onClick={() => setCityPickerOpen((prev) => !prev)}
            >
              <span>{city.name}</span>
              <ChevronDown
                size={13}
                strokeWidth={1.8}
                className={`text-slate-400 transition-transform ${cityPickerOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {cityPickerOpen && (
              <div
                className={`absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border shadow-lg ${
                  dark ? 'border-slate-600 bg-slate-800' : 'border-slate-300 bg-white'
                }`}
              >
                <div className="relative">
                  <div
                    className="max-h-[420px] space-y-1 overflow-y-auto p-2"
                    style={{ columnCount: 2, columnGap: '0.5rem' }}
                  >
                    {groupedCities.map(([country, cities]) => (
                      <div key={country} className="mb-1.5" style={{ breakInside: 'avoid' }}>
                        <p
                          className={`mb-0.5 truncate rounded px-1.5 py-0.5 font-mono text-[12px] font-bold tracking-[0.12em] uppercase ${
                            dark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {country}
                        </p>
                        {cities.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            className={`block w-full cursor-pointer truncate rounded px-1.5 py-0.5 text-left text-[15px] font-semibold transition-all ${
                              dark ? 'hover:bg-slate-700 hover:text-cyan-400' : 'hover:bg-cyan-50 hover:text-cyan-700'
                            } ${option.id === city.id ? 'text-cyan-600' : dark ? 'text-slate-300' : 'text-slate-600'}`}
                            onClick={() => {
                              onSelectCity(option.id)
                              setCityPickerOpen(false)
                            }}
                          >
                            {option.name}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div
                    className={`pointer-events-none absolute bottom-0 left-0 right-0 flex flex-col items-center rounded-b-xl bg-gradient-to-t pb-0.5 pt-6 ${
                      dark ? 'from-slate-800 via-slate-800/90 to-transparent' : 'from-white via-white/90 to-transparent'
                    }`}
                  >
                    <ChevronDown size={12} strokeWidth={2} className="text-slate-300" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </label>

        {/* ── Divider ─────────────────────────────────────────── */}
        <div className="divider-subtle" />

        {/* ── Basemap segmented control ─────────────────────────── */}
        <div className="flex flex-col gap-1">
          <span
            className={`flex items-center gap-1 font-mono text-[15px] font-medium tracking-[0.15em] ${dark ? 'text-slate-400' : 'text-slate-400'} uppercase`}
          >
            <MapIcon size={10} strokeWidth={1.8} />
            Basemap
          </span>
          <div
            className={`flex rounded-lg border p-0.5 ${dark ? 'border-slate-600 bg-slate-800/70' : 'border-slate-300 bg-paper-50'}`}
          >
            {(['satellite', 'vector', 'dark'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-md py-1 text-sm font-medium transition-all ${
                  basemap === mode
                    ? 'bg-gradient-to-b from-cyan-400 to-cyan-500 text-white shadow-sm shadow-cyan-500/25'
                    : dark
                      ? 'text-slate-400 hover:bg-slate-700/50'
                      : 'text-slate-500 hover:bg-slate-300/20'
                }`}
                onClick={() => onBasemapChange(mode)}
              >
                {mode === 'satellite' ? (
                  <Satellite size={12} strokeWidth={1.8} />
                ) : (
                  <MapIcon size={12} strokeWidth={1.8} />
                )}
                {mode === 'satellite' ? 'Photo' : mode === 'dark' ? 'Dark' : 'Map'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Colors ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <span
            className={`flex items-center gap-1 font-mono text-[15px] font-medium tracking-[0.15em] ${dark ? 'text-slate-400' : 'text-slate-400'} uppercase`}
          >
            <Eye size={10} strokeWidth={1.8} />
            Colors
          </span>
          <div
            className={`rounded-lg border p-2.5 space-y-2.5 ${dark ? 'border-slate-600 bg-slate-800/70' : 'border-slate-300 bg-paper-50'}`}
          >
            {/* Building palette */}
            <div className="flex flex-col gap-1">
              <span
                className={`text-[15px] font-medium tracking-wide uppercase ${dark ? 'text-slate-400' : 'text-slate-400'}`}
              >
                Palette
              </span>
              <div className="flex gap-1.5">
                {(['default', 'night', 'mono'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`group flex flex-1 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition-all ${
                      palette === p
                        ? 'bg-cyan-50 ring-1 ring-cyan-300 shadow-sm shadow-cyan-500/10'
                        : dark
                          ? 'hover:bg-slate-700/50'
                          : 'hover:bg-slate-300/20'
                    }`}
                    onClick={() => onPaletteChange(p)}
                  >
                    <span
                      className="h-3 w-5 shrink-0 rounded-sm ring-1 ring-black/5"
                      style={{
                        background: `linear-gradient(to right, ${BUILDING_PALETTES[p].map(([, , c]) => `rgb(${c[0]},${c[1]},${c[2]})`).join(',')})`,
                      }}
                    />
                    <span
                      className={`text-[12px] font-medium ${palette === p ? 'text-cyan-700' : dark ? 'text-slate-400' : 'text-slate-500'}`}
                    >
                      {p === 'default' ? 'Teal' : p === 'night' ? 'Night' : 'Mono'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tint */}
            <div className="flex flex-col gap-1">
              <span
                className={`text-[15px] font-medium tracking-wide uppercase ${dark ? 'text-slate-400' : 'text-slate-400'}`}
              >
                Tint
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'none', label: 'None', color: 'bg-white ring-slate-200' },
                    { id: 'warm', label: 'Warm', color: 'bg-amber-200' },
                    { id: 'cool', label: 'Cool', color: 'bg-cyan-200' },
                    { id: 'sepia', label: 'Sepia', color: 'bg-amber-300/70' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`group flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 transition-all ${
                      tint === t.id
                        ? 'bg-cyan-50 ring-1 ring-cyan-300 shadow-sm shadow-cyan-500/10'
                        : dark
                          ? 'hover:bg-slate-700/50'
                          : 'hover:bg-slate-300/20'
                    }`}
                    onClick={() => onTintChange(t.id)}
                  >
                    <span className={`h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10 ${t.color}`} />
                    <span
                      className={`text-[12px] font-medium ${tint === t.id ? 'text-cyan-700' : dark ? 'text-slate-400' : 'text-slate-500'}`}
                    >
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Map background */}
            <div className="flex flex-col gap-1">
              <span
                className={`text-[15px] font-medium tracking-wide uppercase ${dark ? 'text-slate-400' : 'text-slate-400'}`}
              >
                Background
              </span>
              <div className="flex gap-1.5">
                {(
                  [
                    { id: 'slate', label: 'Stone', swatch: 'bg-slate-200' },
                    { id: 'charcoal', label: 'Dark', swatch: 'bg-slate-700' },
                    { id: 'white', label: 'White', swatch: 'bg-white ring-slate-200' },
                  ] as const
                ).map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    className={`group flex flex-1 cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 transition-all ${
                      mapBgColor === bg.id
                        ? 'bg-cyan-50 ring-1 ring-cyan-300 shadow-sm shadow-cyan-500/10'
                        : dark
                          ? 'hover:bg-slate-700/50'
                          : 'hover:bg-slate-300/20'
                    }`}
                    onClick={() => onMapBgColorChange(bg.id)}
                  >
                    <span className={`h-3 w-3 shrink-0 rounded-sm ring-1 ring-black/10 ${bg.swatch}`} />
                    <span
                      className={`text-[12px] font-medium ${mapBgColor === bg.id ? 'text-cyan-700' : dark ? 'text-slate-400' : 'text-slate-500'}`}
                    >
                      {bg.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Skyline toggle ────────────────────────────────────── */}
        <button
          type="button"
          className={`flex w-full cursor-pointer items-center justify-between rounded-lg border px-2.5 py-1.5 transition-all ${
            dark
              ? 'border-slate-600 bg-slate-800/70 hover:border-slate-500 hover:bg-slate-700/50'
              : 'border-slate-300 bg-paper-50 hover:border-slate-400 hover:bg-slate-300/15'
          }`}
          onClick={onToggleSkyline}
        >
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
            <Building2 size={13} strokeWidth={1.8} className={showSkyline ? 'text-cyan-600' : 'text-slate-400'} />
            <span className={dark ? 'text-slate-300' : 'text-slate-600'}>Skyline</span>
          </span>
          <span
            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
              showSkyline ? 'bg-gradient-to-r from-cyan-400 to-cyan-500' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform ${
                showSkyline ? 'translate-x-3.5' : 'translate-x-0.5'
              }`}
            />
          </span>
        </button>

        {/* ── Labels toggle ────────────────────────────────────── */}
        <button
          type="button"
          className={`flex w-full cursor-pointer items-center justify-between rounded-lg border px-2.5 py-1.5 transition-all ${
            dark
              ? 'border-slate-600 bg-slate-800/70 hover:border-slate-500 hover:bg-slate-700/50'
              : 'border-slate-300 bg-paper-50 hover:border-slate-400 hover:bg-slate-300/15'
          }`}
          onClick={onToggleLabels}
        >
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
            <Tag size={13} strokeWidth={1.8} className={showLabels ? 'text-cyan-600' : 'text-slate-400'} />
            <span className={dark ? 'text-slate-300' : 'text-slate-600'}>Labels</span>
          </span>
          <span
            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
              showLabels ? 'bg-gradient-to-r from-cyan-400 to-cyan-500' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform ${
                showLabels ? 'translate-x-3.5' : 'translate-x-0.5'
              }`}
            />
          </span>
        </button>

        {/* ── Divider ─────────────────────────────────────────── */}
        <div className="divider-subtle" />

        {/* ── Pitch slider ────────────────────────────────────── */}
        <label className="flex flex-col gap-1">
          <span
            className={`flex items-center justify-between font-mono text-[15px] font-medium tracking-[0.15em] ${dark ? 'text-slate-400' : 'text-slate-400'} uppercase`}
          >
            <span className="flex items-center gap-1">
              <Eye size={10} strokeWidth={1.8} />
              Pitch
            </span>
            <span className="font-sans text-[15px] font-medium tabular-nums text-cyan-600">{Math.round(pitch)}°</span>
          </span>
          <input
            type="range"
            className="range-sm w-full"
            style={{ '--fill': `${pitchPct}%` } as CSSProperties}
            min={0}
            max={75}
            step={1}
            value={pitch}
            onChange={(event) => onPitchChange(Number(event.target.value))}
          />
        </label>

        {/* ── Bearing slider ──────────────────────────────────── */}
        <label className="flex flex-col gap-1">
          <span
            className={`flex items-center justify-between font-mono text-[15px] font-medium tracking-[0.15em] ${dark ? 'text-slate-400' : 'text-slate-400'} uppercase`}
          >
            <span className="flex items-center gap-1">
              <Compass size={10} strokeWidth={1.8} />
              Bearing
            </span>
            <span className="font-sans text-[15px] font-medium tabular-nums text-cyan-600">{Math.round(bearing)}°</span>
          </span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              className="range-sm flex-1"
              style={{ '--fill': `${bearingPct}%` } as CSSProperties}
              min={-180}
              max={180}
              step={1}
              value={bearing}
              onChange={(event) => onBearingChange(Number(event.target.value))}
            />
            <button
              type="button"
              disabled={orbiting}
              className={`inline-flex cursor-pointer items-center justify-center rounded-lg p-1.5 transition-all ${
                orbiting
                  ? 'bg-cyan-100 text-cyan-600 animate-spin'
                  : dark
                    ? 'text-slate-400 hover:bg-slate-700/50 hover:text-cyan-400'
                    : 'text-slate-400 hover:bg-slate-300/20 hover:text-cyan-600'
              }`}
              onClick={onOrbit}
              title="Orbit 360°"
            >
              <RotateCw size={14} strokeWidth={1.8} />
            </button>
          </div>
        </label>

        {/* ── Divider ─────────────────────────────────────────── */}
        <div className="divider-subtle" />

        {/* ── Height exaggeration ─────────────────────────────── */}
        <label className="flex flex-col gap-1">
          <span
            className={`flex items-center justify-between font-mono text-[15px] font-medium tracking-[0.15em] ${dark ? 'text-slate-400' : 'text-slate-400'} uppercase`}
          >
            <span className="flex items-center gap-1">
              <Building2 size={10} strokeWidth={1.8} />
              Exaggeration
            </span>
            <span className="font-sans text-[15px] font-medium tabular-nums text-cyan-600">
              {heightExaggeration.toFixed(1)}×
            </span>
          </span>
          <input
            type="range"
            className="range-sm w-full"
            style={{ '--fill': `${exhPct}%` } as CSSProperties}
            min={100}
            max={300}
            step={10}
            value={Math.round(heightExaggeration * 100)}
            onChange={(event) => onHeightExaggerationChange(Number(event.target.value) / 100)}
          />
        </label>

        {/* ── Sun position ───────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <span
            className={`flex items-center justify-between font-mono text-[15px] font-medium tracking-[0.15em] ${dark ? 'text-slate-400' : 'text-slate-400'} uppercase`}
          >
            <span className="flex items-center gap-1">
              <Sun size={10} strokeWidth={1.8} />
              Sun
            </span>
            <span className="font-sans text-[15px] font-medium tabular-nums text-cyan-600">
              {String(Math.floor(sunPosition)).padStart(2, '0')}:{sunPosition % 1 === 0 ? '00' : '30'}
            </span>
          </span>
          <div
            className={`rounded-lg border p-2.5 space-y-2 ${dark ? 'border-slate-600 bg-slate-800/70' : 'border-slate-300 bg-paper-50'}`}
          >
            {/* Time context label */}
            <div className="flex items-center justify-between px-0.5">
              <span
                className={`flex items-center gap-1 text-[15px] font-medium ${dark ? 'text-slate-400' : 'text-slate-400'}`}
              >
                <SunDim size={9} strokeWidth={2} className="text-amber-400" />
                {sunPosition < 5
                  ? 'Night'
                  : sunPosition < 7
                    ? 'Dawn'
                    : sunPosition < 10
                      ? 'Morning'
                      : sunPosition < 14
                        ? 'Midday'
                        : sunPosition < 17
                          ? 'Afternoon'
                          : sunPosition < 19
                            ? 'Dusk'
                            : 'Night'}
              </span>
              <span
                className={`flex items-center gap-1 text-[15px] font-medium ${dark ? 'text-slate-400' : 'text-slate-400'}`}
              >
                {sunPosition < 6 || sunPosition >= 18 ? (
                  <>
                    <Moon size={9} strokeWidth={2} className="text-indigo-400" />
                    Dark mode
                  </>
                ) : (
                  <>
                    <Sun size={9} strokeWidth={2} className="text-amber-400" />
                    Day mode
                  </>
                )}
              </span>
            </div>
            {/* Slider with day/night gradient track */}
            <input
              type="range"
              className="range-sm range-sun w-full"
              style={{ '--fill': `${sunPct}%` } as CSSProperties}
              min={0}
              max={24}
              step={0.5}
              value={sunPosition}
              onChange={(event) => onSunPositionChange(Number(event.target.value))}
            />
            {/* Time tick marks */}
            <div
              className={`flex justify-between px-0.5 font-mono text-[12px] tabular-nums ${dark ? 'text-slate-500' : 'text-slate-300'}`}
            >
              <span>00</span>
              <span>06</span>
              <span>12</span>
              <span>18</span>
              <span>24</span>
            </div>
          </div>
        </div>

        {/* ── Divider ─────────────────────────────────────────── */}
        <div className="divider-subtle" />

        {/* ── Seed ────────────────────────────────────────────── */}
        <label className="flex flex-col gap-1">
          <span
            className={`flex items-center justify-between font-mono text-[15px] font-medium tracking-[0.15em] ${dark ? 'text-slate-400' : 'text-slate-400'} uppercase`}
          >
            <span className="flex items-center gap-1">
              <Dice5 size={10} strokeWidth={1.8} />
              Seed
            </span>
            <span className="font-sans text-[15px] font-medium tabular-nums text-cyan-600">
              {seedOverride ?? defaultSeed}
            </span>
          </span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              className="range-sm flex-1"
              style={{ '--fill': `${((seedOverride ?? defaultSeed) / 1000) * 100}%` } as CSSProperties}
              min={0}
              max={1000}
              step={1}
              value={seedOverride ?? defaultSeed}
              onChange={(event) => onSeedOverrideChange(Number(event.target.value))}
            />
            {seedOverride !== null && seedOverride !== defaultSeed && (
              <button
                type="button"
                className={`inline-flex cursor-pointer items-center justify-center rounded p-1 transition-all ${
                  dark
                    ? 'text-slate-400 hover:bg-slate-700/50 hover:text-cyan-400'
                    : 'text-slate-400 hover:bg-slate-300/20 hover:text-cyan-600'
                }`}
                onClick={() => onSeedOverrideChange(null)}
                title="Reset to default seed"
              >
                <RotateCcw size={12} strokeWidth={1.8} />
              </button>
            )}
          </div>
        </label>

        {/* ── Divider ─────────────────────────────────────────── */}
        <div className="divider-subtle" />

        {/* ── Height legend ───────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <span
            className={`flex items-center gap-1 font-mono text-[15px] font-medium tracking-[0.15em] ${dark ? 'text-slate-400' : 'text-slate-400'} uppercase`}
          >
            <Building2 size={10} strokeWidth={1.8} />
            Height bands
          </span>
          <div
            className={`rounded-lg border p-2.5 space-y-2 ${dark ? 'border-slate-600 bg-slate-800/70' : 'border-slate-300 bg-paper-50'}`}
          >
            {/* Gradient bar with tick marks */}
            <div className="relative">
              <div
                className="h-2.5 w-full rounded-full ring-1 ring-slate-300/60"
                style={{ background: LEGEND_GRADIENT }}
              />
              {/* Band boundary ticks */}
              <div className="absolute inset-x-0 top-0 flex h-2.5 items-center">
                {HEIGHT_BANDS.map(([lo], i) => {
                  if (i === 0) return null
                  const pct = (lo / 500) * 100
                  return <span key={lo} className="absolute h-full w-px bg-white/70" style={{ left: `${pct}%` }} />
                })}
              </div>
            </div>
            {/* Band labels */}
            <div className="grid grid-cols-3 gap-x-1 gap-y-0.5 font-mono text-[12px] tabular-nums">
              {HEIGHT_BANDS.map(([lo, hi, [r, g, b]]) => (
                <span key={lo} className="flex items-center gap-0.5">
                  <span
                    className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: `rgb(${r},${g},${b})` }}
                  />
                  <span className={`${dark ? 'text-slate-400' : 'text-slate-400'} truncate`}>
                    {lo}–{hi === Infinity ? '∞' : hi}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Divider ─────────────────────────────────────────── */}
        <div className="divider-subtle" />

        {/* ── Search ──────────────────────────────────────────── */}
        <label className="flex flex-col gap-1">
          <span
            className={`flex items-center justify-between font-mono text-[15px] font-medium tracking-[0.15em] ${dark ? 'text-slate-400' : 'text-slate-400'} uppercase`}
          >
            <span className="flex items-center gap-1">
              <Search size={10} strokeWidth={1.8} />
              Search
            </span>
            {searchQuery && (
              <span className="font-sans text-[15px] font-medium tabular-nums text-cyan-600">
                {filteredCount}/{totalCount}
              </span>
            )}
          </span>
          <input
            type="text"
            className={`w-full rounded-lg border px-2.5 py-1.5 text-base outline-none transition-all focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25 ${
              dark
                ? 'border-slate-600 bg-slate-800/70 text-slate-200 placeholder:text-slate-500'
                : 'border-slate-300 bg-paper-50 text-slate-600 placeholder:text-slate-400'
            }`}
            placeholder="Name, height (>100, <200, 50-150)"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </label>

        {/* ── Footer ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-2 font-mono text-[15px] tabular-nums ${dark ? 'text-slate-400' : 'text-slate-500'}`}
          >
            <span
              className={`flex h-2 w-9 overflow-hidden rounded-full ${dark ? 'bg-slate-600/50' : 'bg-slate-300/50'}`}
            >
              <span
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-500 transition-all duration-700 ease-out"
                style={{ width: `${Math.min(100, Math.round((searchQuery ? filteredCount : buildingCount) / 5))}%` }}
              />
            </span>
            <span className="inline-flex items-baseline gap-1">
              <span className={`font-medium ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
                {searchQuery ? filteredCount : buildingCount}
              </span>
              <span className={`text-[15px] tracking-wide uppercase ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                {searchQuery ? `of ${totalCount}` : ''} buildings
              </span>
              <span className="ml-0.5 inline-block h-1.5 w-1.5 animate-pulse-dot self-center rounded-full bg-cyan-400" />
            </span>
          </span>
          <button
            type="button"
            className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[15px] font-medium text-cyan-600 transition-all active:scale-95 ${
              dark ? 'hover:bg-slate-700/50 hover:text-cyan-400' : 'hover:bg-cyan-100 hover:text-cyan-700'
            }`}
            onClick={onReset}
          >
            <RotateCcw size={12} strokeWidth={1.8} />
            Reset
          </button>
        </div>

        {/* ── Attribution ────────────────────────────────────── */}
        <div
          className={`pt-2 text-center font-mono text-[15px] tracking-wide uppercase ${dark ? 'text-slate-500' : 'text-slate-500'}`}
        >
          Presented by Pastel Project
        </div>
      </div>
    </div>
  )
}
