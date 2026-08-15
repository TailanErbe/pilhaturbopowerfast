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
 *
 * Subiu de 16 para 18 junto com o alargamento do beat das recargas, e para
 * 19 quando o chip virou uma sequência: lá são oito coisas aparecendo uma
 * de cada vez, mais uma volta completa do produto.
 */
export const ALTURAS_DO_ATO = 19

/**
 * OS DOIS BEATS QUE ACONTECEM são os mais longos, e de propósito.
 *
 * Recargas e chip são os únicos em que algo se desenrola no tempo, e cada
 * um leva 0,20:
 *
 *   RECARGAS   o contador sobe até 1.200 enquanto chove descartável, e as
 *              duas coisas precisam ser lidas como uma só. Nos 0,15 de
 *              antes o número chegava ao fim antes de a ideia assentar.
 *   CHIP       oito coisas aparecem uma de cada vez (rótulo, título e as
 *              seis proteções) enquanto o produto dá uma volta completa e
 *              volta a ficar de frente para o painel seguinte.
 *
 * Os painéis de produto são o oposto: composições PARADAS, que se leem de
 * uma olhada. Eles cederam o tempo, e é o tempo que sobrava neles.
 *
 * Em alturas de tela, com ALTURAS_DO_ATO = 19:
 *
 *   hero   2,85   usbc  2,85   cycles 3,80   chip  3,80
 *   01     1,90   02    1,90   03     1,90
 *
 * Herói e USB-C ficaram nos mesmos 0,15 de fração de propósito: as janelas
 * do cabo, da troca da barra pela pílula e da luz do beat são escritas
 * neste mesmo eixo, e mexer nas fronteiras desses dois obrigaria a
 * re-derivar todas elas. O tempo deles vem da altura total, não de uma
 * mudança de proporção.
 */
export const BEATS: Beat[] = [
  { id: 'hero', nome: 'Hero', inicio: 0.0, fim: 0.15 },
  { id: 'usbc', nome: 'USB-C', inicio: 0.15, fim: 0.3 },
  { id: 'cycles', nome: '1.200 recargas', inicio: 0.3, fim: 0.5 },
  { id: 'chip', nome: 'Chip inteligente', inicio: 0.5, fim: 0.7 },
  { id: 'produto-01', nome: '01 AA', inicio: 0.7, fim: 0.8 },
  { id: 'produto-02', nome: '02 AAA', inicio: 0.8, fim: 0.9 },
  { id: 'produto-03', nome: '03 O Kit', inicio: 0.9, fim: 1.0 },
]

/** Quanto dura a passagem entre um beat e o seguinte, em progresso */
export const CRUZAMENTO = 0.045

/**
 * A janela em que o herói ENTREGA a tela.
 *
 * Três peças precisam concordar sobre este instante e, até agora, cada
 * uma trazia a sua cópia dos mesmos dois números:
 *
 *   a barra do herói sai e a pílula entra   (lib/no-heroi)
 *   o canvas desce de cima do ato para trás (scene/FundoDoAto)
 *   o produto larga a pose frontal e gira   (lib/scene-state)
 *
 * Três cópias do mesmo instante é três chances de uma delas ficar
 * para trás numa edição, e o sintoma seria dos mais difíceis: nada quebra,
 * a primeira tela só passa a parecer desconjuntada.
 *
 * `meio` é onde a troca já aconteceu para o olho, e é por isso que o
 * canvas troca de camada ali: no meio da dissolução ninguém percebe a
 * mudança de ordem de pintura.
 */
export const SAIDA_DO_HEROI = {
  comeca: 0.055,
  termina: 0.105,
  get meio() {
    return (this.comeca + this.termina) / 2
  },
}

/** Qual beat está ocupando a tela num dado progresso */
export function beatEm(progress: number): Beat {
  const p = Math.max(0, Math.min(1, progress))
  return BEATS.find((b) => p >= b.inicio && p < b.fim) ?? BEATS[BEATS.length - 1]
}

/**
 * A janela em que o CONTADOR sobe, descontados os cruzamentos.
 *
 * O número não começa a subir no primeiro pixel do beat nem chega ao fim
 * dele: os cruzamentos das pontas são passagem, com o texto ainda entrando
 * ou já saindo. Contar ali seria contar no escuro.
 *
 * Isto existe porque a conta passou a ter mais de um dono. Era só do
 * `contarNoScrub`, que a escrevia inline duas vezes; agora a chuva de
 * descartáveis precisa do MESMO eixo, e as duas andando separadas seriam
 * duas fontes para a mesma verdade — com o sintoma pior possível: a chuva
 * engrossando fora de compasso com o número que ela ilustra.
 */
export function janelaDoContador(id: string): { de: number; ate: number } {
  const b = beatPorId(id)
  return { de: b.inicio + CRUZAMENTO, ate: b.fim - CRUZAMENTO }
}

/** O beat pelo id. Estoura se o id não existir: é erro de programação. */
export function beatPorId(id: string): Beat {
  const b = BEATS.find((x) => x.id === id)
  if (!b) throw new Error(`beat inexistente: ${id}`)
  return b
}

/**
 * O CENTRO de um beat, que é onde a pose do produto é ancorada.
 *
 * Isto existe para as poses da cena PARAREM de repetir os números daqui.
 *
 * O comentário de `scrollDoBeat` já avisava que os dois conjuntos são o
 * mesmo eixo e que mudar um obriga a mudar o outro. Um aviso não impede
 * nada: alargar o beat das recargas exigiu mexer em cinco valores em
 * scene-state.ts, e cada um deles é um lugar onde dá para errar em
 * silêncio — a pose chega girada e ninguém sabe dizer por quê.
 *
 * Derivando, o eixo tem uma fonte só.
 */
export function centroDoBeat(id: string): number {
  const b = beatPorId(id)
  return (b.inicio + b.fim) / 2
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
