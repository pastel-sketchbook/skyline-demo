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
    <div className="card-frost w-60 p-3 space-y-2">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-500 text-white">
          <Building2 size={13} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[9px] font-medium tracking-widest text-warm-400 uppercase">deck.gl skyline</p>
          <h1 className="font-serif text-base leading-tight font-bold text-warm-600 tracking-tight">{city.name}</h1>
        </div>
      </div>

      {/* ── City selector ───────────────────────────────────── */}
      <label className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1 font-mono text-[9px] font-medium tracking-widest text-warm-400 uppercase">
          <Layers size={10} strokeWidth={1.8} />
          City
        </span>
        <div className="relative">
          <select
            className="w-full cursor-pointer appearance-none rounded-lg border border-warm-300 bg-paper-50 py-1 pr-6 pl-2 text-xs text-warm-600 outline-none transition-colors focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
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
            size={12}
            strokeWidth={1.8}
            className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-warm-400"
          />
        </div>
      </label>

      {/* ── Basemap + Skyline ────────────────────────────────── */}
      <div className="flex gap-1.5">
        <button
          type="button"
          className={`flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border py-1 text-xs font-medium transition-colors ${
            basemap === 'satellite'
              ? 'border-cyan-400 bg-cyan-100 text-cyan-700'
              : 'border-warm-300 bg-paper-50 text-warm-500 hover:bg-warm-300/20'
          }`}
          onClick={() => onBasemapChange('satellite')}
        >
          <Satellite size={11} strokeWidth={1.8} />
          Photo
        </button>
        <button
          type="button"
          className={`flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border py-1 text-xs font-medium transition-colors ${
            basemap === 'vector'
              ? 'border-cyan-400 bg-cyan-100 text-cyan-700'
              : 'border-warm-300 bg-paper-50 text-warm-500 hover:bg-warm-300/20'
          }`}
          onClick={() => onBasemapChange('vector')}
        >
          <MapIcon size={11} strokeWidth={1.8} />
          Map
        </button>
        <button
          type="button"
          className={`flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border py-1 text-xs font-medium transition-colors ${
            showSkyline
              ? 'border-cyan-400 bg-cyan-100 text-cyan-700'
              : 'border-warm-300 bg-paper-50 text-warm-500 hover:bg-warm-300/20'
          }`}
          onClick={onToggleSkyline}
        >
          <Building2 size={11} strokeWidth={1.8} />
          {showSkyline ? 'On' : 'Off'}
        </button>
      </div>

      {/* ── Pitch slider ────────────────────────────────────── */}
      <label className="flex flex-col gap-0.5">
        <span className="flex items-center justify-between font-mono text-[9px] font-medium tracking-widest text-warm-400 uppercase">
          <span className="flex items-center gap-1">
            <Eye size={10} strokeWidth={1.8} />
            Pitch
          </span>
          <span className="font-sans text-[10px] tabular-nums text-cyan-600">{Math.round(pitch)}°</span>
        </span>
        <input
          type="range"
          className="range range-accent-orange range-xs"
          min={0}
          max={75}
          step={1}
          value={pitch}
          onChange={(event) => onPitchChange(Number(event.target.value))}
        />
      </label>

      {/* ── Bearing slider ──────────────────────────────────── */}
      <label className="flex flex-col gap-0.5">
        <span className="flex items-center justify-between font-mono text-[9px] font-medium tracking-widest text-warm-400 uppercase">
          <span className="flex items-center gap-1">
            <Compass size={10} strokeWidth={1.8} />
            Bearing
          </span>
          <span className="font-sans text-[10px] tabular-nums text-cyan-600">{Math.round(bearing)}°</span>
        </span>
        <input
          type="range"
          className="range range-accent-orange range-xs"
          min={-180}
          max={180}
          step={1}
          value={bearing}
          onChange={(event) => onBearingChange(Number(event.target.value))}
        />
      </label>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-0.5">
        <span className="font-mono text-[10px] tabular-nums text-warm-400">{buildingCount} buildings</span>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-cyan-600 transition-colors hover:bg-cyan-100 hover:text-cyan-600 active:bg-cyan-500/20"
          onClick={onReset}
        >
          <RotateCcw size={11} strokeWidth={1.8} />
          Reset
        </button>
      </div>
    </div>
  )
}
