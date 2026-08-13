import type { Timeline } from './timeline'

/**
 * Registro da timeline mestre, para quem precisa navegar por ela.
 *
 * A pílula "Nossas pilhas" não pode mais usar `scrollIntoView`: dentro de
 * um pin os painéis não têm posição própria na página — todos ocupam a
 * mesma tela. O destino tem que ser calculado a partir do PROGRESSO do
 * beat, e só a timeline sabe onde o pin começa e quanto ele mede.
 */
let atual: Timeline | null = null

export function registrarTimeline(tl: Timeline | null) {
  atual = tl
}

export function obterTimeline() {
  return atual
}
