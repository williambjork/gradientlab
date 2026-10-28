import type { GradientPreset, TransitionProfile } from './types'

export const BACKGROUND = '#0b0c0e'

const ROLL: TransitionProfile = { duration: 2, rotation: 40, shift: 220, fadeIn: 1.4, fadeOut: 1.6 }
const SOFT_ROLL: TransitionProfile = { duration: 1.8, rotation: 28, shift: 160, fadeIn: 1.26, fadeOut: 1.44 }

const ABOVE: [number, number] = [1250, 0]

// Light sources sit just outside the visible part of the virtual square, so only
// the shoulder and falloff of each ellipse are on screen.
export const presets: GradientPreset[] = [
  {
    id: 'blue',
    name: 'Blue',
    stops: [
      { position: 0, color: '#f3f1e2' },
      { position: 0.18, color: '#3c9fea' },
      { position: 0.37, color: '#2b42d2' },
      { position: 0.4789, color: '#18205c' },
      { position: 1, color: '#141519' },
    ],
    center: [1250, 2450],
    radii: [6000, 2200],
    rotation: 0,
    transition: ROLL,
  },
  {
    id: 'red',
    name: 'Red',
    stops: [
      { position: 0, color: '#ffe6c8' },
      { position: 0.16, color: '#ef6f26' },
      { position: 0.33, color: '#d3130d' },
      { position: 0.46, color: '#3d0410' },
      { position: 1, color: '#050304' },
    ],
    center: [2550, 350],
    radii: [6000, 2600],
    rotation: 55,
    transition: SOFT_ROLL,
  },
  {
    id: 'green',
    name: 'Green',
    stops: [
      { position: 0, color: '#dcfbe2' },
      { position: 0.17, color: '#e6ea8c' },
      { position: 0.34, color: '#5aab48' },
      { position: 0.48, color: '#123f1c' },
      { position: 1, color: '#030504' },
    ],
    center: [-250, 1300],
    radii: [6000, 2800],
    rotation: 90,
    transition: ROLL,
  },
  {
    id: 'violet',
    name: 'Violet',
    stops: [
      { position: 0, color: '#f8ecff' },
      { position: 0.17, color: '#c58cff' },
      { position: 0.35, color: '#7a2ee0' },
      { position: 0.48, color: '#250a52' },
      { position: 1, color: '#08060d' },
    ],
    center: ABOVE,
    radii: [6000, 2450],
    rotation: 0,
    transition: SOFT_ROLL,
  },
  {
    id: 'amber',
    name: 'Amber',
    stops: [
      { position: 0, color: '#fff6dc' },
      { position: 0.16, color: '#ffc75a' },
      { position: 0.34, color: '#f07a12' },
      { position: 0.47, color: '#4a1a04' },
      { position: 1, color: '#070504' },
    ],
    center: [2600, 2300],
    radii: [6000, 2600],
    rotation: -52,
    transition: ROLL,
  },
  {
    id: 'teal',
    name: 'Teal',
    stops: [
      { position: 0, color: '#e9fffb' },
      { position: 0.17, color: '#7eeedd' },
      { position: 0.35, color: '#0fa3a6' },
      { position: 0.48, color: '#06363f' },
      { position: 1, color: '#040708' },
    ],
    center: [2750, 1150],
    radii: [6000, 2800],
    rotation: 86,
    transition: SOFT_ROLL,
  },
]
