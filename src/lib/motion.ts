/**
 * Guardas de movimento.
 *
 * REGRAS.md §6.10: `prefers-reduced-motion` é obrigatório, não opcional.
 * Com a preferência ativa a página vira um documento vertical normal:
 * sem Lenis, sem scrub, sem pin.
 */

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Toque / sem hover — coreografia própria, ver REGRAS.md §6.8 */
export function isCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(hover: none), (pointer: coarse)').matches
}
