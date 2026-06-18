import { Building2, ChevronDown, Compass, Eye, Layers, RotateCcw } from 'lucide-react'

import type { City } from '@/data/cities'
import { CITIES } from '@/data/cities'

interface CityPickerProps {
  city: City
  pitch: number
  bearing: number
  buildingCount: number
  onSelectCity: (id: string) => void
  onPitchChange: (pitch: number) => void
  onBearingChange: (bearing: number) => void
  onReset: () => void
}

export default function CityPicker({
  city,
  pitch,
  bearing,
  buildingCount,
  onSelectCity,
  onPitchChange,
  onBearingChange,
  onReset,
}: CityPickerProps) {
  return (
    <div className="card-frost w-72 p-4">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500 text-white">
          <Building2 size={15} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-medium tracking-widest text-warm-400 uppercase">deck.gl skyline</p>
          <h1 className="font-serif text-xl leading-tight font-bold text-warm-600 tracking-tight">{city.name}</h1>
        </div>
      </div>

      <p className="mt-1.5 pl-[38px] text-[13px] leading-snug text-warm-400">{city.blurb}</p>

      <div className="divider-subtle my-3" />

      {/* ── City selector ───────────────────────────────────── */}
      <label className="flex flex-col gap-1">
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-medium tracking-widest text-warm-400 uppercase">
          <Layers size={12} strokeWidth={1.8} />
          City
        </span>
        <div className="relative">
          <select
            className="w-full cursor-pointer appearance-none rounded-lg border border-warm-300 bg-paper-50 py-1.5 pr-8 pl-3 text-sm text-warm-600 outline-none transition-colors focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
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
            size={14}
            strokeWidth={1.8}
            className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-warm-400"
          />
        </div>
      </label>

      <div className="divider-subtle my-3" />

      {/* ── Pitch slider ────────────────────────────────────── */}
      <label className="flex flex-col gap-1">
        <span className="flex items-center justify-between font-mono text-[10px] font-medium tracking-widest text-warm-400 uppercase">
          <span className="flex items-center gap-1.5">
            <Eye size={12} strokeWidth={1.8} />
            Pitch
          </span>
          <span className="font-sans text-[11px] tabular-nums text-cyan-600">{Math.round(pitch)}°</span>
        </span>
        <input
          type="range"
          className="range range-primary range-xs"
          min={0}
          max={75}
          step={1}
          value={pitch}
          onChange={(event) => onPitchChange(Number(event.target.value))}
        />
      </label>

      {/* ── Bearing slider ──────────────────────────────────── */}
      <label className="mt-2 flex flex-col gap-1">
        <span className="flex items-center justify-between font-mono text-[10px] font-medium tracking-widest text-warm-400 uppercase">
          <span className="flex items-center gap-1.5">
            <Compass size={12} strokeWidth={1.8} />
            Bearing
          </span>
          <span className="font-sans text-[11px] tabular-nums text-cyan-600">{Math.round(bearing)}°</span>
        </span>
        <input
          type="range"
          className="range range-primary range-xs"
          min={-180}
          max={180}
          step={1}
          value={bearing}
          onChange={(event) => onBearingChange(Number(event.target.value))}
        />
      </label>

      <div className="divider-subtle my-3" />

      {/* ── Footer ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] tabular-nums text-warm-400">{buildingCount} buildings</span>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-cyan-600 transition-colors hover:bg-cyan-100 hover:text-cyan-600 active:bg-cyan-500/20"
          onClick={onReset}
        >
          <RotateCcw size={12} strokeWidth={1.8} />
          Reset
        </button>
      </div>
    </div>
  )
}
