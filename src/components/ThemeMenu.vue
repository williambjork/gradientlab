<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { swatchGradient } from '../gradient/palette'
import type { GradientPreset } from '../gradient/types'

defineProps<{
  presets: GradientPreset[]
  activeId: string
}>()

const emit = defineEmits<{ select: [index: number] }>()
const grain = defineModel<number>('grain', { required: true })

const open = ref(false)
const root = ref<HTMLElement>()

const pad = (n: number) => String(n).padStart(2, '0')

function choose(index: number) {
  emit('select', index)
  open.value = false
}

function onPointerDown(e: PointerEvent) {
  if (open.value && !root.value?.contains(e.target as Node)) open.value = false
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <div ref="root" class="fixed right-6 top-6 z-20 flex flex-col items-end">
    <button
      type="button"
      aria-label="Themes"
      :aria-expanded="open"
      class="relative flex size-11 items-center justify-center rounded-full border border-white/10 bg-black/20 backdrop-blur-md transition-colors duration-300 hover:bg-black/35"
      @click="open = !open"
    >
      <span class="burger-line" :class="open ? 'rotate-45' : '-translate-y-[3px]'" />
      <span class="burger-line" :class="open ? '-rotate-45' : 'translate-y-[3px]'" />
    </button>

    <Transition name="menu-panel">
      <div
        v-if="open"
        class="relative mt-3 w-56 overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-1.5 backdrop-blur-md"
      >
        <span class="menu-scan" aria-hidden="true" />
        <div class="flex justify-between px-3 pb-1.5 pt-2 font-mono text-[9px] tracking-[0.35em] text-white/30">
          <span>THEME</span>
          <span>{{ pad(presets.length) }}</span>
        </div>
        <ul>
          <li v-for="(preset, i) in presets" :key="preset.id" class="menu-item" :style="{ '--i': i }">
            <button
              type="button"
              class="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors duration-300 hover:bg-white/5"
              @click="choose(i)"
            >
              <span class="size-3 shrink-0 rounded-full" :style="{ backgroundImage: swatchGradient(preset) }" />
              <span class="font-mono text-[10px] tracking-[0.2em] text-white/35">{{ pad(i + 1) }}</span>
              <span
                class="font-mono text-[11px] uppercase tracking-[0.2em] transition-colors duration-300"
                :class="activeId === preset.id ? 'text-white' : 'text-white/55 group-hover:text-white/85'"
              >
                {{ preset.name }}
              </span>
              <span
                class="ml-auto h-px bg-white/70 transition-[width] duration-500 ease-out"
                :class="activeId === preset.id ? 'w-4' : 'w-0 group-hover:w-2'"
              />
            </button>
          </li>
        </ul>
        <label
          class="menu-item mt-1.5 flex items-center gap-3 border-t border-white/10 px-3 pb-2 pt-3.5 font-mono text-[9px] tracking-[0.35em] text-white/30"
          :style="{ '--i': presets.length }"
        >
          GRAIN
          <input v-model.number="grain" type="range" min="0" max="0.6" step="0.01" class="grain-range min-w-0 flex-1" />
          <span class="w-7 text-right tracking-[0.15em] text-white/50">{{ Math.round(grain * 100) }}</span>
        </label>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.burger-line {
  position: absolute;
  height: 1px;
  width: 16px;
  background: white;
  transition: transform 0.55s cubic-bezier(0.65, 0, 0.35, 1);
}

.menu-panel-enter-active {
  transition:
    clip-path 0.65s cubic-bezier(0.65, 0, 0.35, 1),
    opacity 0.3s ease-out;
}
.menu-panel-leave-active {
  transition:
    clip-path 0.45s cubic-bezier(0.65, 0, 0.35, 1),
    opacity 0.45s ease-in;
}
.menu-panel-enter-from,
.menu-panel-leave-to {
  clip-path: inset(0 0 100% 100% round 16px);
  opacity: 0;
}
.menu-panel-enter-to,
.menu-panel-leave-from {
  clip-path: inset(0 0 0 0 round 16px);
  opacity: 1;
}

.menu-item {
  animation: menu-item-in 0.75s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(140ms + var(--i) * 45ms);
}

@keyframes menu-item-in {
  from {
    opacity: 0;
    transform: translateX(14px);
    filter: blur(6px);
  }
  to {
    opacity: 1;
    transform: none;
    filter: none;
  }
}

.menu-scan {
  position: absolute;
  inset-inline: 0;
  top: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.5), transparent);
  animation: menu-scan 0.9s cubic-bezier(0.65, 0, 0.35, 1) 0.1s both;
  pointer-events: none;
}

@keyframes menu-scan {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(var(--scan-distance, 320px));
    opacity: 0;
  }
}
</style>
