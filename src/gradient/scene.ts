import { MotionValue, ease, type SpringConfig } from './motion'
import type { GradientPreset, TransitionProfile } from './types'

export const VIRTUAL_SIZE = 2500
/** Magnification of the virtual square around its centre */
const ZOOM = 1.2

const POINTER_SPRING: SpringConfig = { stiffness: 60, damping: 20, mass: 1 }
const INTERACTION_SPRING: SpringConfig = { stiffness: 30, damping: 14, mass: 1 }
const FIELD_SPRING: SpringConfig = { stiffness: 25, damping: 16, mass: 1 }

const INTERACTION = {
  idle: { pull: 0, radius: 260 },
  hover: { pull: 0.3, radius: 320 },
  press: { pull: 0.65, radius: 440 },
}

/** Whole-field drift in virtual units when the pointer is at the viewport edge */
const FIELD_DRIFT = 70
/** Incoming lights start slightly enlarged and settle as they turn into place */
const INCOMING_SCALE = 1.08
/** Outgoing lights pull back slightly as they turn away */
const OUTGOING_SCALE = 0.97
/** Below this opacity an incoming layer is reset to its starting pose */
const RESET_OPACITY = 0.05

export interface Layer {
  preset: GradientPreset
  opacity: MotionValue
  /** Degrees, relative to the preset's resting rotation */
  rotation: MotionValue
  scale: MotionValue
  /** Offset of the light source along `tangent`, in virtual units */
  shift: MotionValue
  tangent: [number, number]
}

/**
 * Unit vector from the view centre towards a preset's light, and the tangent a light
 * rolls along (perpendicular to it, so every light rolls around the edge it sits on).
 */
export function lightFrame(preset: GradientPreset) {
  const dx = preset.center[0] - VIRTUAL_SIZE / 2
  const dy = preset.center[1] - VIRTUAL_SIZE / 2
  const length = Math.hypot(dx, dy) || 1
  const toLight: [number, number] = [dx / length, dy / length]
  const tangent: [number, number] = [toLight[1], -toLight[0]]
  return { toLight, tangent }
}

function normalizeAngle(deg: number) {
  const wrapped = ((((deg + 180) % 360) + 360) % 360) - 180
  return wrapped === -180 ? 180 : wrapped
}

function gentler(a: TransitionProfile, b: TransitionProfile) {
  return a.rotation <= b.rotation ? a : b
}

/** Animation and interaction state for the light fields. Knows nothing about WebGL. */
export class GradientScene {
  readonly layers: Layer[]
  activeId: string

  readonly pointerX = new MotionValue(VIRTUAL_SIZE / 2)
  readonly pointerY = new MotionValue(VIRTUAL_SIZE / 4)
  readonly pull = new MotionValue(INTERACTION.idle.pull)
  readonly pullRadius = new MotionValue(INTERACTION.idle.radius)
  /** -1..1 across the viewport */
  readonly fieldX = new MotionValue(0)
  readonly fieldY = new MotionValue(0)

  /** Maps CSS pixels into the virtual square, cover-fit and centred */
  readonly view = { scale: 1, originX: 0, originY: 0, spanX: VIRTUAL_SIZE, spanY: VIRTUAL_SIZE }

  private readonly values: MotionValue[]
  private hovering = false
  private pressed = false

  constructor(presets: GradientPreset[], activeId: string) {
    this.activeId = activeId
    this.layers = presets.map((preset) => ({
      preset,
      opacity: new MotionValue(preset.id === activeId ? 1 : 0),
      rotation: new MotionValue(0),
      scale: new MotionValue(1),
      shift: new MotionValue(0),
      tangent: lightFrame(preset).tangent,
    }))
    this.values = [
      ...this.layers.flatMap((l) => [l.opacity, l.rotation, l.scale, l.shift]),
      this.pointerX,
      this.pointerY,
      this.pull,
      this.pullRadius,
      this.fieldX,
      this.fieldY,
    ]
  }

  get fieldDrift(): [number, number] {
    return [this.fieldX.value * FIELD_DRIFT, this.fieldY.value * FIELD_DRIFT]
  }

  setViewport(width: number, height: number) {
    const scale = VIRTUAL_SIZE / Math.max(width, height, 1) / ZOOM
    this.view.scale = scale
    this.view.spanX = width * scale
    this.view.spanY = height * scale
    this.view.originX = VIRTUAL_SIZE / 2 - this.view.spanX / 2
    this.view.originY = VIRTUAL_SIZE / 2 - this.view.spanY / 2
  }

  setActive(id: string, now = performance.now()) {
    if (id === this.activeId) return
    const prev = this.layers.find((l) => l.preset.id === this.activeId)
    const next = this.layers.find((l) => l.preset.id === id)
    if (!next) return
    const t = prev ? gentler(prev.preset.transition, next.preset.transition) : next.preset.transition
    // Lights roll in from the side of the newly chosen theme and out the opposite side.
    const direction = prev && this.layers.indexOf(next) < this.layers.indexOf(prev) ? -1 : 1
    this.activeId = id

    for (const layer of this.layers) {
      if (layer !== next && layer.opacity.value <= 0) continue

      // Shifting along the tangent with a matching rotation reads as rolling. Flip it for lights
      // whose tangent points left so on-screen travel still follows the menu direction.
      const roll = direction * (layer.tangent[0] < -0.01 ? -1 : 1)

      layer.opacity.stop()
      layer.rotation.stop()
      layer.scale.stop()
      layer.shift.stop()
      layer.rotation.set(normalizeAngle(layer.rotation.value))

      if (layer === next) {
        if (layer.opacity.value < RESET_OPACITY) {
          layer.rotation.set(-roll * t.rotation)
          layer.shift.set(-roll * t.shift)
          layer.scale.set(INCOMING_SCALE)
        }
        layer.rotation.tween(0, t.duration, ease.sweep, now)
        layer.shift.tween(0, t.duration, ease.sweep, now)
        layer.scale.tween(1, t.duration, ease.sweep, now)
        layer.opacity.tween(1, t.fadeIn, ease.out, now)
      } else {
        layer.rotation.tween(roll * t.rotation, t.duration, ease.sweep, now)
        layer.shift.tween(roll * t.shift, t.duration, ease.sweep, now)
        layer.scale.tween(OUTGOING_SCALE, t.duration, ease.sweep, now)
        layer.opacity.tween(0, t.fadeOut, ease.inOut, now)
      }
    }
  }

  pointerMove(x: number, y: number) {
    const vx = this.view.originX + x * this.view.scale
    const vy = this.view.originY + y * this.view.scale
    if (!this.hovering && this.pull.value < 0.01) {
      this.pointerX.set(vx)
      this.pointerY.set(vy)
    } else {
      this.pointerX.spring(vx, POINTER_SPRING)
      this.pointerY.spring(vy, POINTER_SPRING)
    }
    const nx = (x * this.view.scale) / this.view.spanX
    const ny = (y * this.view.scale) / this.view.spanY
    this.fieldX.spring(nx * 2 - 1, FIELD_SPRING)
    this.fieldY.spring(ny * 2 - 1, FIELD_SPRING)
    if (!this.hovering) {
      this.hovering = true
      this.applyInteraction()
    }
  }

  pointerDown() {
    this.pressed = true
    this.applyInteraction()
  }

  pointerUp() {
    this.pressed = false
    this.applyInteraction()
  }

  pointerLeave() {
    this.hovering = false
    this.pressed = false
    this.fieldX.spring(0, FIELD_SPRING)
    this.fieldY.spring(0, FIELD_SPRING)
    this.applyInteraction()
  }

  update(now: number, dt: number) {
    for (const v of this.values) v.update(now, dt)
  }

  private applyInteraction() {
    const target = this.pressed ? INTERACTION.press : this.hovering ? INTERACTION.hover : INTERACTION.idle
    this.pull.spring(target.pull, INTERACTION_SPRING)
    this.pullRadius.spring(target.radius, INTERACTION_SPRING)
  }
}
