import { Building2, ChevronDown, Compass, Eye, Layers, Map as MapIcon, RotateCcw, Satellite } from 'lucide-react'

import type { BasemapMode } from '@/components/SkylineDeck'
import type { City } from '@/data/cities'
import { CITIES } from '@/data/cities'

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
}: CityPickerProps) {
  return (
    <div className="card-frost animate-enter w-64 p-4 space-y-3">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start gap-2.5">
        <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 text-white shadow-sm shadow-cyan-500/20">
          <Building2 size={14} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[9px] font-medium tracking-[0.15em] text-slate-400 uppercase">deck.gl skyline</p>
          <h1 className="font-serif text-xl leading-snug font-bold text-slate-800 tracking-tight">{city.name}</h1>
          <p className="mt-0.5 font-sans text-[11px] leading-snug text-slate-400">{city.blurb}</p>
        </div>
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
            {CITIES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
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

      {/* ── Basemap + Skyline ────────────────────────────────── */}
      <div className="flex gap-1.5">
        <button
          type="button"
          className={`flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border py-1.5 text-xs font-medium transition-all ${
            basemap === 'satellite'
              ? 'border-cyan-400 bg-gradient-to-b from-cyan-100 to-cyan-50 text-cyan-700 shadow-sm'
              : 'border-slate-300 bg-paper-50 text-slate-500 hover:border-slate-400 hover:bg-slate-300/15'
          }`}
          onClick={() => onBasemapChange('satellite')}
        >
          <Satellite size={12} strokeWidth={1.8} />
          Photo
        </button>
        <button
          type="button"
          className={`flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border py-1.5 text-xs font-medium transition-all ${
            basemap === 'vector'
              ? 'border-cyan-400 bg-gradient-to-b from-cyan-100 to-cyan-50 text-cyan-700 shadow-sm'
              : 'border-slate-300 bg-paper-50 text-slate-500 hover:border-slate-400 hover:bg-slate-300/15'
          }`}
          onClick={() => onBasemapChange('vector')}
        >
          <MapIcon size={12} strokeWidth={1.8} />
          Map
        </button>
        <button
          type="button"
          className={`flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border py-1.5 text-xs font-medium transition-all ${
            showSkyline
              ? 'border-cyan-400 bg-gradient-to-b from-cyan-100 to-cyan-50 text-cyan-700 shadow-sm'
              : 'border-slate-300 bg-paper-50 text-slate-500 hover:border-slate-400 hover:bg-slate-300/15'
          }`}
          onClick={onToggleSkyline}
        >
          <Building2 size={12} strokeWidth={1.8} />
          {showSkyline ? 'On' : 'Off'}
        </button>
      </div>

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
        <input
          type="range"
          className="range-sm"
          min={-180}
          max={180}
          step={1}
          value={bearing}
          onChange={(event) => onBearingChange(Number(event.target.value))}
        />
      </label>

      {/* ── Divider ─────────────────────────────────────────── */}
      <div className="divider-subtle" />

      {/* ── Footer ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] tabular-nums text-slate-500">
          <span className="flex h-2 w-10 overflow-hidden rounded-full bg-slate-300/50">
            <span
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-500 transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, Math.round(buildingCount / 5))}%` }}
            />
          </span>
          <span className="inline-flex items-center gap-1.5">
            {buildingCount}
            <span className="inline-block h-1.5 w-1.5 animate-pulse-dot rounded-full bg-cyan-400" />
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
