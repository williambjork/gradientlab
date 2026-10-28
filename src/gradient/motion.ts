export type Easing = (t: number) => number

export function cubicBezier(x1: number, y1: number, x2: number, y2: number): Easing {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx

  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let t = x
    for (let i = 0; i < 8; i++) {
      const error = sampleX(t) - x
      if (Math.abs(error) < 1e-6) return sampleY(t)
      const slope = slopeX(t)
      if (Math.abs(slope) < 1e-6) break
      t -= error / slope
    }
    let lo = 0
    let hi = 1
    t = x
    while (hi - lo > 1e-6) {
      if (sampleX(t) < x) lo = t
      else hi = t
      t = (lo + hi) / 2
    }
    return sampleY(t)
  }
}

export const ease = {
  out: cubicBezier(0, 0, 0.58, 1),
  inOut: cubicBezier(0.42, 0, 0.58, 1),
  sweep: cubicBezier(0.65, 0, 0.35, 1),}

export interface SpringConfig {
  stiffness: number
  damping: number
  mass: number
}

type Animation =
  | { kind: 'tween'; from: number; to: number; start: number; duration: number; easing: Easing }
  | { kind: 'spring'; to: number; config: SpringConfig }

const MAX_SPRING_STEP = 1 / 240

/** A number animated by tweens or springs, advanced explicitly via `update` from a single frame loop. */
export class MotionValue {
  value: number
  velocity = 0
  private animation: Animation | null = null

  constructor(value: number) {
    this.value = value
  }

  set(value: number) {
    this.animation = null
    this.value = value
    this.velocity = 0
  }

  stop() {
    this.animation = null
  }

  tween(to: number, duration: number, easing: Easing, now = performance.now()) {
    this.animation = { kind: 'tween', from: this.value, to, start: now, duration: duration * 1000, easing }
  }

  /** Retargets a running spring without resetting its velocity. */
  spring(to: number, config: SpringConfig) {
    if (this.animation?.kind === 'spring') {
      this.animation.to = to
      this.animation.config = config
    } else {
      this.animation = { kind: 'spring', to, config }
    }
  }

  update(now: number, dt: number) {
    const a = this.animation
    if (!a) return

    if (a.kind === 'tween') {
      const progress = Math.min(Math.max((now - a.start) / a.duration, 0), 1)
      this.value = a.from + (a.to - a.from) * a.easing(progress)
      if (progress >= 1) this.animation = null
      return
    }

    const { stiffness, damping, mass } = a.config
    const steps = Math.max(1, Math.ceil(dt / MAX_SPRING_STEP))
    const h = dt / steps
    for (let i = 0; i < steps; i++) {
      const force = -stiffness * (this.value - a.to) - damping * this.velocity
      this.velocity += (force / mass) * h
      this.value += this.velocity * h
    }
  }
}
