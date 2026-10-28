import { lightFrame } from './scene'
import type { ColorStop, GradientPreset } from './types'

/** Flat CSS swatch: the saturated middle stops, running away from the light's direction. */
export function swatchGradient(preset: GradientPreset) {
  const [x, y] = lightFrame(preset).toLight
  const angle = Math.round((Math.atan2(-x, y) * 180) / Math.PI)
  const sorted = [...preset.stops].sort((a, b) => a.position - b.position)
  const colors = sorted.length > 3 ? sorted.slice(1, -1) : sorted
  return `linear-gradient(${angle}deg, ${colors.map((s) => s.color).join(', ')})`
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * Rasterises colour stops into `width` RGBA texels (0–1 floats) written at `offset` in `out`.
 * Kept unquantised so the shader's dither still has sub-8-bit detail to work with.
 */
export function rasterizeStops(stops: ColorStop[], width: number, out: Float32Array, offset: number) {
  const sorted = [...stops].sort((a, b) => a.position - b.position)
  const rgb = sorted.map((s) => hexToRgb(s.color))

  for (let x = 0; x < width; x++) {
    const t = x / (width - 1)
    let i = 0
    while (i < sorted.length - 2 && t > sorted[i + 1].position) i++
    const a = sorted[i]
    const b = sorted[Math.min(i + 1, sorted.length - 1)]
    const span = b.position - a.position
    const f = span > 0 ? Math.min(Math.max((t - a.position) / span, 0), 1) : 0
    const ca = rgb[i]
    const cb = rgb[Math.min(i + 1, rgb.length - 1)]
    const o = offset + x * 4
    out[o] = (ca[0] + (cb[0] - ca[0]) * f) / 255
    out[o + 1] = (ca[1] + (cb[1] - ca[1]) * f) / 255
    out[o + 2] = (ca[2] + (cb[2] - ca[2]) * f) / 255
    out[o + 3] = 1
  }
}
