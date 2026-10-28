import { onBeforeUnmount, onMounted, ref } from 'vue'

/** Tracks scroll position in units of viewport-height sections. */
export function useScrollSections() {
  /** Fractional section index, e.g. 1.5 = halfway between the second and third section */
  const position = ref(0)
  let frame = 0

  const measure = () => {
    frame = 0
    position.value = window.innerHeight > 0 ? window.scrollY / window.innerHeight : 0
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(measure)
  }

  function scrollToSection(index: number) {
    window.scrollTo({ top: index * window.innerHeight, behavior: 'instant' })
  }

  onMounted(() => {
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    measure()
  })

  onBeforeUnmount(() => {
    cancelAnimationFrame(frame)
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
  })

  return { position, scrollToSection }
}
