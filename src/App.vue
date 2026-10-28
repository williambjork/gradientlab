<script setup lang="ts">
import { computed, ref } from 'vue'
import GradientCanvas from './components/GradientCanvas.vue'
import SectionMotes from './components/SectionMotes.vue'
import ScrollGauge from './components/ScrollGauge.vue'
import ThemeMenu from './components/ThemeMenu.vue'
import { useScrollSections } from './composables/useScrollSections'
import { BACKGROUND, presets } from './gradient/presets'

const { position, scrollToSection } = useScrollSections()
const activeIndex = computed(() => Math.min(Math.max(Math.round(position.value), 0), presets.length - 1))
const activeId = computed(() => presets[activeIndex.value].id)
const grain = ref(0.22)
</script>

<template>
  <GradientCanvas
    class="fixed inset-0"
    :presets="presets"
    :active-id="activeId"
    :background="BACKGROUND"
    :grain="grain"
  />
  <SectionMotes :position="position" />

  <main class="relative">
    <section v-for="preset in presets" :key="preset.id" :aria-label="preset.name" class="h-dvh snap-start" />
  </main>

  <ScrollGauge :position="position" :presets="presets" @select="scrollToSection" />
  <ThemeMenu v-model:grain="grain" :presets="presets" :active-id="activeId" @select="scrollToSection" />
</template>
