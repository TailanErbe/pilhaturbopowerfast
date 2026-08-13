/**
 * Os beats do ato pinado e onde cada um vive na timeline mestre.
 *
 * A timeline tem duração 1, então estes números SÃO o progresso — o mesmo
 * que a cena 3D lê em `sceneState.progress`. Um único eixo comanda texto,
 * fundo e produto, o que garante que tudo chegue junto.
 *
 * REGRAS.md §7 dá o orçamento de scroll: ~16 alturas de tela para o ato
 * inteiro. `ALTURAS_DO_ATO` traduz isso em pixels na hora de montar o pin.
 */

export type Beat = {
  /** Precisa bater com o `data-beat` no DOM */
  id: string
  /** Início e fim no progresso global, 0→1 */
  inicio: number
  fim: number
  /** Rótulo mostrado no painel de depuração */
  nome: string
}

/**
 * Quantas alturas de tela o ato pinado consome.
 *
 * A referência usa ~16,3 (11.762px num viewport de 720). Menos que isso e a
 * animação fica frenética; mais e o usuário desiste antes do fim.
 */
export const ALTURAS_DO_ATO = 16

export const BEATS: Beat[] = [
  { id: 'hero', nome: 'Hero', inicio: 0.0, fim: 0.15 },
  { id: 'usbc', nome: 'USB-C', inicio: 0.15, fim: 0.3 },
  { id: 'cycles', nome: '1.200 recargas', inicio: 0.3, fim: 0.45 },
  { id: 'chip', nome: 'Chip inteligente', inicio: 0.45, fim: 0.6 },
  { id: 'produto-01', nome: '01 AA', inicio: 0.6, fim: 0.74 },
  { id: 'produto-02', nome: '02 AAA', inicio: 0.74, fim: 0.88 },
  { id: 'produto-03', nome: '03 O Kit', inicio: 0.88, fim: 1.0 },
]

/** Quanto dura a passagem entre um beat e o seguinte, em progresso */
export const CRUZAMENTO = 0.045

/** Qual beat está ocupando a tela num dado progresso */
export function beatEm(progress: number): Beat {
  const p = Math.max(0, Math.min(1, progress))
  return BEATS.find((b) => p >= b.inicio && p < b.fim) ?? BEATS[BEATS.length - 1]
}

/**
 * Onde parar o scroll para cair num beat.
 *
 * A pílula "Nossas pilhas" usa isto: como o ato inteiro vive dentro de um
 * pin, os painéis não têm posição própria na página — o destino é uma
 * posição de SCROLL, calculada a partir do progresso do beat.
 */
export function scrollDoBeat(id: string, inicioDoPin: number, alturaDoPin: number) {
  const beat = BEATS.find((b) => b.id === id)
  if (!beat) return inicioDoPin

  /**
   * O destino é o CENTRO do beat, não o começo dele.
   *
   * As poses da cena estão ancoradas nos centros (ver POSES em
   * scene-state.ts): é lá que o produto termina o giro e se apresenta de
   * frente. Mirando em `inicio + CRUZAMENTO`, a pílula parava a 0,645
   * enquanto a pose de frente do painel 01 está em 0,67, e a pilha chegava
   * ainda girando, de três-quartos. O painel certo aparecia, o produto não.
   *
   * Se as faixas em BEATS mudarem, as poses mudam junto: os dois conjuntos
   * de números são o mesmo eixo.
   */
  const alvo = (beat.inicio + beat.fim) / 2
  return inicioDoPin + alturaDoPin * alvo
}
