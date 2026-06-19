import {
  Building2,
  ChevronDown,
  Compass,
  Eye,
  Layers,
  Map as MapIcon,
  MapPin,
  RotateCcw,
  RotateCw,
  Satellite,
} from 'lucide-react'

import type { CSSProperties } from 'react'

import type { BasemapMode } from '@/components/SkylineDeck'
import type { City } from '@/data/cities'
import { CITIES } from '@/data/cities'
import type { SkylineBuilding } from '@/lib/skyline'
import { HEIGHT_BANDS } from '@/lib/skyline'

const LEGEND_GRADIENT = `linear-gradient(to right, ${HEIGHT_BANDS.map(
  ([, , [r, g, b]]) => `rgb(${r}, ${g}, ${b})`,
).join(', ')})`

interface CityPickerProps {
  city: City
  pitch: number
  bearing: number
  buildingCount: number
  basemap: BasemapMode
  onSelectCity: (id: string) => void
  onPitchChange: (pitch: number) => void
  onBearingChange: (bearing: number) => void
  onReset: () => void
  onBasemapChange: (mode: BasemapMode) => void
  showSkyline: boolean
  onToggleSkyline: () => void
  heightExaggeration: number
  onHeightExaggerationChange: (value: number) => void
  orbiting: boolean
  onOrbit: () => void
  tallestLandmark: SkylineBuilding | null
}

export default function CityPicker({
  city,
  pitch,
  bearing,
  buildingCount,
  basemap,
  onSelectCity,
  onPitchChange,
  onBearingChange,
  onReset,
  onBasemapChange,
  showSkyline,
  onToggleSkyline,
  heightExaggeration,
  onHeightExaggerationChange,
  orbiting,
  onOrbit,
  tallestLandmark,
}: CityPickerProps) {
  const pitchPct = (pitch / 75) * 100
  const bearingPct = ((bearing + 180) / 360) * 100
  const exhPct = ((heightExaggeration - 1) / 2) * 100

  return (
    <div className="card-frost animate-enter w-64 p-4 space-y-3">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col space-y-1.5">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 text-white shadow-sm shadow-cyan-500/25 ring-1 ring-white/40">
            <Building2 size={15} strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[9px] font-medium tracking-[0.15em] text-slate-400 uppercase">
              deck.gl skyline
            </p>
            <h1 className="font-serif text-xl leading-snug font-bold text-slate-800 tracking-tight">{city.name}</h1>
            <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-[9px] tabular-nums text-cyan-600/80">
              <MapPin size={9} strokeWidth={2} />
              {Math.abs(city.center.lat).toFixed(3)}°{city.center.lat >= 0 ? 'N' : 'S'}{' '}
              {Math.abs(city.center.lng).toFixed(3)}°{city.center.lng >= 0 ? 'E' : 'W'}
            </p>
          </div>
        </div>
        <p className="font-sans text-[11px] leading-snug text-slate-400">{city.blurb}</p>
        {tallestLandmark && (
          <p className="inline-flex w-fit items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 font-mono text-[9px] font-medium tracking-wide text-amber-700 uppercase ring-1 ring-amber-200/50">
            ★ {tallestLandmark.name} · {tallestLandmark.height} m
          </p>
        )}
      </div>

      {/* ── Divider ─────────────────────────────────────────── */}
      <div className="divider-subtle" />

      {/* ── City selector ───────────────────────────────────── */}
      <label className="flex flex-col gap-1">
        <span className="flex items-center gap-1 font-mono text-[9px] font-medium tracking-[0.15em] text-slate-400 uppercase">
          <Layers size={10} strokeWidth={1.8} />
          City
        </span>
        <div className="relative">
          <select
            className="w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-paper-50 py-1.5 pr-7 pl-2.5 text-sm text-slate-600 outline-none transition-all focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25"
            value={city.id}
            onChange={(event) => onSelectCity(event.target.value)}
          >
            {Object.entries(
              CITIES.reduce<Record<string, typeof CITIES>>((groups, c) => {
                if (!groups[c.country]) groups[c.country] = []
                groups[c.country].push(c)
                return groups
              }, {}),
            )
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([country, cities]) => (
                <optgroup key={country} label={country}>
                  {cities
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                </optgroup>
              ))}
          </select>
          <ChevronDown
            size={13}
            strokeWidth={1.8}
            className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-slate-400"
          />
        </div>
      </label>

      {/* ── Divider ─────────────────────────────────────────── */}
      <div className="divider-subtle" />

      {/* ── Basemap segmented control ─────────────────────────── */}
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1 font-mono text-[9px] font-medium tracking-[0.15em] text-slate-400 uppercase">
          <MapIcon size={10} strokeWidth={1.8} />
          Basemap
        </span>
        <div className="flex rounded-lg border border-slate-300 bg-paper-50 p-0.5">
          <button
            type="button"
            className={`flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-md py-1 text-xs font-medium transition-all ${
              basemap === 'satellite'
                ? 'bg-gradient-to-b from-cyan-400 to-cyan-500 text-white shadow-sm shadow-cyan-500/25'
                : 'text-slate-500 hover:bg-slate-300/20'
            }`}
            onClick={() => onBasemapChange('satellite')}
          >
            <Satellite size={12} strokeWidth={1.8} />
            Photo
          </button>
          <button
            type="button"
            className={`flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-md py-1 text-xs font-medium transition-all ${
              basemap === 'vector'
                ? 'bg-gradient-to-b from-cyan-400 to-cyan-500 text-white shadow-sm shadow-cyan-500/25'
                : 'text-slate-500 hover:bg-slate-300/20'
            }`}
            onClick={() => onBasemapChange('vector')}
          >
            <MapIcon size={12} strokeWidth={1.8} />
            Map
          </button>
        </div>
      </div>

      {/* ── Skyline toggle ────────────────────────────────────── */}
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-slate-300 bg-paper-50 px-2.5 py-1.5 transition-all hover:border-slate-400 hover:bg-slate-300/15"
        onClick={onToggleSkyline}
      >
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <Building2 size={13} strokeWidth={1.8} className={showSkyline ? 'text-cyan-600' : 'text-slate-400'} />
          Skyline
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

      {/* ── Divider ─────────────────────────────────────────── */}
      <div className="divider-subtle" />

      {/* ── Pitch slider ────────────────────────────────────── */}
      <label className="flex flex-col gap-1">
        <span className="flex items-center justify-between font-mono text-[9px] font-medium tracking-[0.15em] text-slate-400 uppercase">
          <span className="flex items-center gap-1">
            <Eye size={10} strokeWidth={1.8} />
            Pitch
          </span>
          <span className="font-sans text-[11px] font-medium tabular-nums text-cyan-600">{Math.round(pitch)}°</span>
        </span>
        <input
          type="range"
          className="range-sm"
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
        <span className="flex items-center justify-between font-mono text-[9px] font-medium tracking-[0.15em] text-slate-400 uppercase">
          <span className="flex items-center gap-1">
            <Compass size={10} strokeWidth={1.8} />
            Bearing
          </span>
          <span className="font-sans text-[11px] font-medium tabular-nums text-cyan-600">{Math.round(bearing)}°</span>
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
        <span className="flex items-center justify-between font-mono text-[9px] font-medium tracking-[0.15em] text-slate-400 uppercase">
          <span className="flex items-center gap-1">
            <Building2 size={10} strokeWidth={1.8} />
            Exaggeration
          </span>
          <span className="font-sans text-[11px] font-medium tabular-nums text-cyan-600">
            {heightExaggeration.toFixed(1)}×
          </span>
        </span>
        <input
          type="range"
          className="range-sm"
          style={{ '--fill': `${exhPct}%` } as CSSProperties}
          min={100}
          max={300}
          step={10}
          value={Math.round(heightExaggeration * 100)}
          onChange={(event) => onHeightExaggerationChange(Number(event.target.value) / 100)}
        />
      </label>

      {/* ── Divider ─────────────────────────────────────────── */}
      <div className="divider-subtle" />

      {/* ── Height legend ───────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1 font-mono text-[9px] font-medium tracking-[0.15em] text-slate-400 uppercase">
          <Building2 size={10} strokeWidth={1.8} />
          Height
        </span>
        <div className="h-2 w-full rounded-full ring-1 ring-slate-300/60" style={{ background: LEGEND_GRADIENT }} />
        <div className="flex justify-between font-mono text-[9px] tabular-nums text-slate-400">
          <span>0 m</span>
          <span className="normal-nums tracking-wide text-slate-300 uppercase">taller →</span>
          <span>400 m+</span>
        </div>
      </div>

      {/* ── Divider ─────────────────────────────────────────── */}
      <div className="divider-subtle" />

      {/* ── Footer ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] tabular-nums text-slate-500">
          <span className="flex h-2 w-9 overflow-hidden rounded-full bg-slate-300/50">
            <span
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-500 transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, Math.round(buildingCount / 5))}%` }}
            />
          </span>
          <span className="inline-flex items-baseline gap-1">
            <span className="font-medium text-slate-600">{buildingCount}</span>
            <span className="text-[9px] tracking-wide text-slate-400 uppercase">buildings</span>
            <span className="ml-0.5 inline-block h-1.5 w-1.5 animate-pulse-dot self-center rounded-full bg-cyan-400" />
          </span>
        </span>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-cyan-600 transition-all hover:bg-cyan-100 hover:text-cyan-700 active:scale-95"
          onClick={onReset}
        >
          <RotateCcw size={12} strokeWidth={1.8} />
          Reset
        </button>
      </div>
    </div>
  )
}
