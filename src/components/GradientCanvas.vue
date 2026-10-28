<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { GradientRenderer } from '../gradient/renderer'
import { GradientScene } from '../gradient/scene'
import type { GradientPreset } from '../gradient/types'

const props = withDefaults(
  defineProps<{
    presets: GradientPreset[]
    activeId: string
    background: string
    grain?: number
  }>(),
  { grain: 0.22 },
)

const grainTexture = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>` +
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/>` +
    `<feColorMatrix type='saturate' values='0'/></filter>` +
    `<rect width='100%' height='100%' filter='url(#n)'/></svg>`,
)}")`

const canvas = ref<HTMLCanvasElement>()
let scene: GradientScene | undefined
let renderer: GradientRenderer | undefined

function onPointerMove(e: PointerEvent) {
  const rect = canvas.value!.getBoundingClientRect()
  scene?.pointerMove(e.clientX - rect.left, e.clientY - rect.top)
}
const onPointerDown = () => scene?.pointerDown()
const onPointerUp = () => scene?.pointerUp()
const onPointerLeave = () => scene?.pointerLeave()

onMounted(() => {
  scene = new GradientScene(props.presets, props.activeId)
  renderer = new GradientRenderer(canvas.value!, scene, props.background)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
  document.documentElement.addEventListener('pointerleave', onPointerLeave)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  document.documentElement.removeEventListener('pointerleave', onPointerLeave)
  renderer?.destroy()
})

watch(
  () => props.activeId,
  (id) => scene?.setActive(id),
)
</script>

<template>
  <div>
    <canvas ref="canvas" class="absolute inset-0 block h-full w-full" />
    <div
      class="pointer-events-none absolute inset-0 mix-blend-overlay"
      :style="{ backgroundImage: grainTexture, opacity: grain }"
    />
  </div>
</template>
