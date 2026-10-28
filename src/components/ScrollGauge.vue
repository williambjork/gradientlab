<script setup lang="ts">
import { computed, ref } from 'vue'
import type { GradientPreset } from '../gradient/types'

const props = defineProps<{
  /** Fractional section index */
  position: number
  presets: GradientPreset[]
}>()

const emit = defineEmits<{ select: [index: number] }>()

/** Minor ticks between each pair of section marks */
const SUBDIVISIONS = 8

const pad = (n: number, width = 2) => String(n).padStart(width, '0')

const hovered = ref<number | null>(null)
const segments = computed(() => Math.max(props.presets.length - 1, 1))
const progress = computed(() => Math.min(Math.max(props.position / segments.value, 0), 1))
const activeIndex = computed(() => Math.min(Math.max(Math.round(props.position), 0), props.presets.length - 1))

const ticks = computed(() => {
  const count = segments.value * SUBDIVISIONS + 1
  return Array.from({ length: count }, (_, i) => {
    const y = i / (count - 1)
    const major = i % SUBDIVISIONS === 0
    const distance = (y - progress.value) * (count - 1)
    const proximity = Math.exp(-(distance * distance) / 10)
    return {
      y,
      major,
      section: i / SUBDIVISIONS,
      width: (major ? 16 : 7) + 18 * proximity,
      opacity: (major ? 0.45 : 0.18) + 0.5 * proximity,
      labelOpacity: 0.4 * (1 - proximity),
    }
  })
})
</script>

<template>
  <div class="pointer-events-none fixed left-6 top-1/2 z-10 h-[56vh] w-40 -translate-y-1/2 font-mono text-white">
    <!-- <div class="absolute -top-8 left-0 text-[9px] tracking-[0.35em] text-white/30">{{activeIndex}}</div> -->

    <div v-for="tick in ticks" :key="tick.y" class="absolute left-0" :style="{ top: `${tick.y * 100}%` }">
      <div
        class="h-px bg-white transition-[width,opacity] duration-300 ease-out"
        :style="{
          width: `${tick.major && hovered === tick.section ? Math.max(tick.width, 26) : tick.width}px`,
          opacity: tick.major && hovered === tick.section ? 0.95 : tick.opacity,
        }"
      />
      <button
        v-if="tick.major"
        type="button"
        :aria-label="`Go to ${presets[tick.section].name}`"
        class="pointer-events-auto absolute -left-2 top-1/2 flex h-6 w-20 -translate-y-1/2 cursor-pointer items-center pl-12 transition-opacity duration-300"
        :style="{ opacity: hovered === tick.section && tick.section !== activeIndex ? 1 : tick.labelOpacity / 0.4 }"
        @pointerenter="hovered = tick.section"
        @pointerleave="hovered = null"
        @focus="hovered = tick.section"
        @blur="hovered = null"
        @click="emit('select', tick.section)"
      >
        <span
          class="text-[9px] tracking-[0.2em] transition-colors duration-300"
          :class="hovered === tick.section ? 'text-white/90' : 'text-white/40'"
        >
          {{ pad(tick.section + 1) }}
        </span>
      </button>
    </div>

    <div class="gauge-marker absolute left-0 flex items-center gap-3" :style="{ top: `${progress * 100}%` }">
      <div class="h-px w-8 bg-white/85" />
      <div class="-translate-y-px text-[9px] leading-[1.6] tracking-[0.2em]">
        <!-- <div class="text-white/80">{{ pad(activeIndex + 1) }} · {{ presets[activeIndex]?.name.toUpperCase() }}</div> -->
        <div class="text-white/35">{{ (progress * 100).toFixed(1).padStart(5, '0') }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gauge-marker {
  transform: translateY(-45%);
  transition: top 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}
</style>
