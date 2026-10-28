export type Vec2 = [number, number]

export interface ColorStop {
  /** 0–1, distance from the light core in ellipse-normalised units */
  position: number
  color: string
}

export interface TransitionProfile {
  /** Rotation/scale duration in seconds */
  duration: number
  /** Degrees the incoming layer rolls in from, and the outgoing layer rolls out to */
  rotation: number
  /** Horizontal travel in virtual units as a light rolls in or out */
  shift: number
  /** Incoming opacity duration in seconds */
  fadeIn: number
  /** Outgoing opacity duration in seconds */
  fadeOut: number
}

/** Plain, serialisable description of one light field. Coordinates live in the 2500-unit virtual square. */
export interface GradientPreset {
  id: string
  name: string
  stops: ColorStop[]
  /** Light source position; also the rotation pivot */
  center: Vec2
  /** Ellipse radii before rotation */
  radii: Vec2
  /** Resting rotation in degrees */
  rotation: number
  transition: TransitionProfile
}
