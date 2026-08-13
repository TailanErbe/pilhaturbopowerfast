import type Lenis from 'lenis'

/**
 * Instância única do Lenis, para quem precisa comandar o scroll.
 *
 * A pílula "Nossas pilhas" navega até um beat com scroll ACELERADO, não com
 * salto: o usuário atravessa as animações no caminho, como na referência.
 * `lenis.scrollTo` faz exatamente isso — interpola a posição, então todo o
 * scrollytelling roda durante o trajeto.
 */
let instancia: Lenis | null = null

export function registrarLenis(l: Lenis | null) {
  instancia = l
}

/**
 * Rola até uma POSIÇÃO em pixels, passando pelas animações.
 *
 * Antes isto recebia um seletor e usava `scrollIntoView`. Não serve mais:
 * dentro do pin os painéis não têm posição própria na página — todos
 * ocupam a mesma tela. O destino agora é calculado a partir do progresso
 * do beat (ver motion/labels.ts) e chega aqui já em pixels.
 */
export function irParaPosicao(y: number) {
  if (instancia) {
    // Duração generosa: o trajeto É a experiência, não um custo a minimizar
    instancia.scrollTo(y, { duration: 2.2 })
    return
  }
  window.scrollTo({ top: y, behavior: 'auto' })
}
