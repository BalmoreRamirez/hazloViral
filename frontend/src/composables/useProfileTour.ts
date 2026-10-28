import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import 'intro.js/introjs.css'
import '@/assets/profile-tour.css'

export interface ProfileTourStep { selector: string; title: string; intro: string }

/** Shared manual/automatic guide: it never submits or changes profile data. */
export function useProfileTour(prepare: () => void, steps: ProfileTourStep[] | (() => ProfileTourStep[]), isNeeded: () => boolean = () => true) {
  const active = ref(false)
  const error = ref('')
  let disposed = false
  let tour: ReturnType<(typeof import('intro.js'))['default']['tour']> | null = null
  let trigger: HTMLElement | null = null

  async function start() {
    if (active.value || disposed || !isNeeded()) return
    active.value = true
    error.value = ''
    trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    try {
      const { default: introJs } = await import('intro.js')
      if (disposed || !isNeeded()) { active.value = false; return }
      prepare()
      await nextTick()
      if (disposed || !isNeeded()) { active.value = false; return }
      const currentSteps = typeof steps === 'function' ? steps() : steps
      const visibleSteps = currentSteps.flatMap(step => {
        const element = document.querySelector<HTMLElement>(step.selector)
        return element?.getClientRects().length ? [{ element, title: step.title, intro: step.intro }] : []
      })
      if (!visibleSteps.length) throw new Error('No profile fields available')
      const finished = () => {
        active.value = false
        void nextTick(() => {
          if (!disposed) trigger?.focus({ preventScroll: true })
        })
      }
      tour = introJs.tour().setOptions({
        steps: visibleSteps, nextLabel: 'Siguiente', prevLabel: 'Anterior',
        doneLabel: 'Completar mi perfil', skipLabel: '×',
        showProgress: true, showBullets: false, stepNumbersOfLabel: 'de',
        exitOnEsc: true, exitOnOverlayClick: false, disableInteraction: true,
        scrollToElement: true, scrollPadding: 32, tooltipClass: 'profile-tour',
        tooltipRenderAsHtml: false,
      }).onComplete(finished).onExit(finished)
      await tour.start()
    } catch {
      active.value = false
      error.value = 'No se pudo abrir la guía. Puedes completar el formulario o volver a intentarlo.'
    }
  }
  watch(isNeeded, needed => {
    if (!needed) {
      active.value = false
      void tour?.exit(true).catch(() => {})
    }
  })
  onBeforeUnmount(() => {
    disposed = true
    active.value = false
    void tour?.exit(true).catch(() => {})
  })
  return { start, active, error }
}
