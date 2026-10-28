<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{ position: number; section?: number }>(), { section: 1 })

const canvas = ref<HTMLCanvasElement>()
/** 1 while the section fills the view, fading out across the neighbouring section */
const presence = ref(0)

watch(
  () => props.position,
  (p) => {
    const distance = Math.abs(p - props.section)
    presence.value = distance >= 1 ? 0 : distance > 0.5 ? (1 - distance) / 0.5 : 1
  },
  { immediate: true },
)

const COUNT = 96

interface Mote {
  x: number
  y: number
  /** px/s, negative rises */
  vy: number
  drift: number
  size: number
  sway: number
  freq: number
  phase: number
  alpha: number
  twinkle: number
}

let motes: Mote[] = []
let sprite: HTMLCanvasElement
let raf = 0
let last = 0
let width = 0
let height = 0
let resizeObserver: ResizeObserver | undefined

function roll(m: Mote, enterFromEdge = false) {
  const depth = Math.random()
  const rising = Math.random() < 0.82
  m.size = 1.4 + depth * depth * 20
  m.vy = (rising ? -1 : 0.35) * (5 + (1 - depth) * 24)
  m.drift = (Math.random() - 0.5) * 8
  m.sway = 10 + depth * 26
  m.freq = 0.12 + Math.random() * 0.35
  m.phase = Math.random() * Math.PI * 2
  m.alpha = 0.1 + (1 - depth) * 0.5
  m.twinkle = Math.random() * Math.PI * 2
  m.x = Math.random() * width
  m.y = enterFromEdge ? (rising ? height + m.size : -m.size) : Math.random() * height
}

function resize() {
  const c = canvas.value
  if (!c) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = c.clientWidth
  height = c.clientHeight
  c.width = Math.max(1, Math.floor(width * dpr))
  c.height = Math.max(1, Math.floor(height * dpr))
  c.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function frame(now: number) {
  raf = requestAnimationFrame(frame)
  const dt = last ? Math.min((now - last) / 1000, 0.05) : 0
  last = now
  const amount = presence.value
  if (amount <= 0 || width === 0) return

  const ctx = canvas.value!.getContext('2d')!
  ctx.clearRect(0, 0, width, height)
  ctx.globalCompositeOperation = 'lighter'

  const t = now / 1000
  for (const m of motes) {
    m.y += m.vy * dt
    m.x += m.drift * dt
    if (m.vy < 0 && m.y < -m.size) roll(m, true)
    if (m.vy > 0 && m.y > height + m.size) roll(m, true)
    if (m.x < -60) m.x = width + 30
    if (m.x > width + 60) m.x = -30

    const flicker = 0.72 + 0.28 * Math.sin(t * 0.6 + m.twinkle)
    const drawX = m.x + Math.sin(t * m.freq + m.phase) * m.sway
    ctx.globalAlpha = m.alpha * flicker * amount
    ctx.drawImage(sprite, drawX - m.size, m.y - m.size, m.size * 2, m.size * 2)
  }
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

onMounted(() => {
  sprite = document.createElement('canvas')
  sprite.width = sprite.height = 64
  const g = sprite.getContext('2d')!
  const glow = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  glow.addColorStop(0, 'rgba(255,255,255,1)')
  glow.addColorStop(0.16, 'rgba(255,247,232,0.5)')
  glow.addColorStop(0.42, 'rgba(255,232,206,0.1)')
  glow.addColorStop(1, 'rgba(255,232,206,0)')
  g.fillStyle = glow
  g.fillRect(0, 0, 64, 64)

  resize()
  motes = Array.from({ length: COUNT }, () => {
    const mote = {} as Mote
    roll(mote)
    return mote
  })
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas.value!)
  raf = requestAnimationFrame(frame)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  resizeObserver?.disconnect()
})
</script>

<template>
  <canvas ref="canvas" class="pointer-events-none fixed inset-0 z-[1] h-full w-full" />
</template>
