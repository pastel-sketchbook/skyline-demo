/**
 * Capture the "Orbit 360°" rotation as an mp4 (and optional gif) clip.
 *
 * Usage:
 *   bun run scripts/capture-orbit.ts [--url <url>] [--out <path.mp4>] [--gif]
 *                                    [--width 1280] [--height 720]
 *
 * Requires the dev server to be running (bun run dev) or a built preview.
 */
import { chromium } from 'playwright'

const ORBIT_MS = 10_000

function arg(name: string, fallback: string): string {
  const flag = `--${name}`
  for (let i = 0; i < Bun.argv.length; i++) {
    if (Bun.argv[i] === flag && Bun.argv[i + 1] !== undefined) {
      return Bun.argv[i + 1]
    }
  }
  return fallback
}

const hasFlag = (name: string) => Bun.argv.includes(`--${name}`)

function resolvePath(raw: string): string {
  const home = Bun.env.HOME ?? '/tmp'
  const expanded = raw.replace(/^~/, home)
  return expanded
}

const url = arg('url', 'http://localhost:5173/?city=seoul&pitch=45&bearing=20&zoom=15.9')
const width = Number(arg('width', '1280'))
const height = Number(arg('height', '720'))
const outMp4 = resolvePath(arg('out', '~/Desktop/orbit-seoul.mp4'))
const wantGif = hasFlag('gif')

function ensureDir(dirPath: string): void {
  Bun.spawnSync(['mkdir', '-p', dirPath])
}

function ffmpeg(args: string[]): void {
  const result = Bun.spawnSync(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', ...args], {
    stdio: ['ignore', 'inherit', 'inherit'],
  })
  if (result.exitCode !== 0) {
    throw new Error(`ffmpeg failed: ${args.join(' ')}`)
  }
}

const tmpDir = `${Bun.env.TMPDIR ?? '/tmp'}/orbit-${Date.now()}`
ensureDir(tmpDir)

console.log(`▶ opening ${url}`)
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: 1,
  recordVideo: { dir: tmpDir, size: { width, height } },
})
const page = await context.newPage()
await page.goto(url, { waitUntil: 'networkidle' })

// Wait until the scene visually settles (tiles + OSM buildings)
const canvas = page.locator('canvas.maplibregl-canvas')
const fingerprint = async (): Promise<number> => {
  const buf = await canvas.screenshot()
  let h = 0
  for (let i = 0; i < buf.length; i += 211) h = (h + buf[i] * (i % 251)) >>> 0
  return h
}
let prev = -1
let stable = 0
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(500)
  const fp = await fingerprint()
  if (fp === prev) {
    if (++stable >= 3) break
  } else {
    stable = 0
  }
  prev = fp
}
console.log('▶ scene settled — starting orbit')

// Click, then hold for exactly the orbit + a short tail.
const tailMs = 700
await page.locator('[title="Orbit 360°"]').click()
await page.waitForTimeout(ORBIT_MS + tailMs)

await context.close()
await browser.close()

const rawFile = [...new Bun.Glob('*.webm').scanSync({ cwd: tmpDir })][0]
if (!rawFile) throw new Error('no video produced')
const raw = `${tmpDir}/${rawFile}`

// The webm covers the whole session; the last (ORBIT_MS + tail) seconds is
// exactly the orbit, so trim from the end with -sseof.
const keepSec = (ORBIT_MS + tailMs) / 1000

const outDir = outMp4.substring(0, outMp4.lastIndexOf('/'))
ensureDir(outDir)

ffmpeg([
  '-sseof',
  `-${keepSec}`,
  '-i',
  raw,
  '-vf',
  'scale=trunc(iw/2)*2:trunc(ih/2)*2',
  '-c:v',
  'libx264',
  '-pix_fmt',
  'yuv420p',
  '-movflags',
  '+faststart',
  outMp4,
])
console.log(`✔ mp4  → ${outMp4}`)

if (wantGif) {
  const outGif = outMp4.replace(/\.mp4$/, '.gif')
  const palette = `${tmpDir}/palette.png`
  ffmpeg(['-sseof', `-${keepSec}`, '-i', raw, '-vf', 'fps=15,scale=720:-1:flags=lanczos,palettegen', palette])
  ffmpeg([
    '-sseof',
    `-${keepSec}`,
    '-i',
    raw,
    '-i',
    palette,
    '-lavfi',
    'fps=15,scale=720:-1:flags=lanczos[x];[x][1:v]paletteuse',
    outGif,
  ])
  console.log(`✔ gif  → ${outGif}`)
}

try {
  Bun.spawnSync(['rm', '-rf', tmpDir])
} catch {
  // best-effort cleanup
}