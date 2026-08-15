import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ALTURAS_DO_ATO, BEATS, CRUZAMENTO } from './labels'
import { clipRevelar, contarNoScrub, revelarEmSerie, revelarTextos } from './texto'
import { sceneState } from '@/lib/scene-state'

/**
 * A TIMELINE MESTRE. Fonte única da verdade sobre "onde estamos".
 *
 * REGRAS.md §6.1: um ScrollTrigger só, com `pin` e `scrub`. Os beats são
 * LABELS dentro desta timeline, não gatilhos independentes. É isso que
 * mantém a pilha 3D contínua — ela nunca corta, porque nunca há troca de
 * cena, só avanço de um número.
 *
 * A timeline tem duração 1 de propósito: assim a posição de cada tween É o
 * progresso, o mesmo que a cena lê. Texto, fundo e produto compartilham um
 * eixo só e chegam sempre juntos.
 */

export type Timeline = {
  destruir: () => void
  /** Início do pin em pixels de scroll — a pílula precisa disto */
  inicio: () => number
  /** Altura total do pin em pixels */
  altura: () => number
  progresso: () => number
}

export function montarTimeline(raiz: HTMLElement): Timeline {
  gsap.registerPlugin(ScrollTrigger)

  const beats = new Map<string, HTMLElement>()
  raiz.querySelectorAll<HTMLElement>('[data-beat]').forEach((el) => {
    beats.set(el.dataset.beat!, el)
  })

  // Estado inicial: só o primeiro beat visível. Feito fora da timeline para
  // a página não piscar todos os beats antes do primeiro quadro.
  BEATS.forEach((b, i) => {
    const el = beats.get(b.id)
    if (!el) return
    gsap.set(el, { autoAlpha: i === 0 ? 1 : 0, y: i === 0 ? 0 : 30 })
  })

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: raiz,
      start: 'top top',
      // Função e não valor fixo: `invalidateOnRefresh` recalcula ao
      // redimensionar, e sem isso o pin fica com a altura da carga inicial.
      end: () => `+=${window.innerHeight * ALTURAS_DO_ATO}`,
      pin: true,
      pinSpacing: true,
      scrub: 1,
      invalidateOnRefresh: true,
      anticipatePin: 1,
      /**
       * Este pin refresca ANTES de todo o resto.
       *
       * Ele insere quase dezesseis alturas de tela de espaçamento, então
       * tudo que vem depois muda de lugar. Qualquer gatilho criado antes
       * dele mediu a página sem esse espaço: o gráfico do impacto nasceu
       * com início em 450 quando o elemento está em 12.941, e completava o
       * traço muito antes de aparecer.
       */
      refreshPriority: 1,
    },
  })

  // A cena 3D: um único tween linear de 0 a 1. Toda a coreografia do
  // produto sai daqui (ver POSES em scene-state.ts).
  tl.to(sceneState, { progress: 1, duration: 1, ease: 'none' }, 0)

  // Entrada e saída de cada beat, ancoradas nos labels
  BEATS.forEach((b, i) => {
    const el = beats.get(b.id)
    if (!el) return
    tl.addLabel(b.id, b.inicio)

    if (i > 0) {
      tl.fromTo(
        el,
        { autoAlpha: 0, y: 30 },
        { autoAlpha: 1, y: 0, duration: CRUZAMENTO, ease: 'power2.out' },
        b.inicio,
      )
    }

    // O último não sai: ele entrega o ato ao conteúdo pós-pin
    if (i < BEATS.length - 1) {
      tl.to(
        el,
        { autoAlpha: 0, y: -30, duration: CRUZAMENTO, ease: 'power2.in' },
        b.fim - CRUZAMENTO,
      )
    }
  })

  /**
   * Texto e número entram na MESMA timeline dos beats.
   *
   * Poderiam ser gatilhos próprios, mas aí teriam eixo próprio e chegariam
   * fora de compasso com o produto. Um eixo só (§6.1) é o que faz cena,
   * fundo e texto andarem juntos.
   */
  const revelacao = revelarTextos(tl, beats, BEATS)
  clipRevelar(tl, beats, BEATS)
  revelarEmSerie(tl, beats, BEATS)
  contarNoScrub(tl, beats, BEATS)

  /**
   * A CENA NÃO RECUA MAIS. O produto fica aceso do começo ao fim.
   *
   * Havia aqui uma atenuação: nos beats das recargas e do chip a cena
   * caía para 45% de opacidade, com o argumento de que ali quem carrega a
   * página é o texto e a pilha é cenário.
   *
   * O argumento estava errado, e o cliente viu antes de mim: a pilha é o
   * PRODUTO. Ela não é cenário em beat nenhum, e apagá-la para o texto
   * respirar troca a coisa mais valiosa da tela pela mais barata. Ainda
   * por cima o fundo daqueles dois beats é `#141414`, quase o preto do
   * corpo, então 45% não deixava o produto discreto: deixava um vulto.
   *
   * Se o texto precisar de mais leitura ali, o caminho é composição —
   * tamanho, contraste, onde o bloco mora na tela —, nunca escurecer o
   * objeto que a página existe para vender.
   */

  const gatilho = tl.scrollTrigger!

  /**
   * A cena sai de cena quando o ato acaba.
   *
   * O canvas é `fixed inset-0` e vive da primeira à última seção, então o
   * fim do pin não o tira da tela por si só: o kit ficava pendurado por
   * cima do impacto, da compra e do rodapé. E `progress` não serve de
   * aviso, porque satura em 1 e permanece lá enquanto a página rola.
   *
   * Este segundo gatilho começa exatamente onde o pin termina e corre por
   * meia altura de tela. É curto de propósito: o produto sai junto com o
   * painel que ele ilustra, não depois. Ligado ao scrub, subir de volta
   * traz a cena junto, sem corte.
   */
  const saida = ScrollTrigger.create({
    start: () => gatilho.end,
    end: () => gatilho.end + window.innerHeight * 0.5,
    scrub: true,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      sceneState.saidaDoAto = self.progress
    },
    /**
     * Saltar a faixa inteira de uma vez (âncora, teclado, `scrollTo`) não
     * dispara `onUpdate`, então os dois extremos são fixados à mão.
     *
     * `onEnterBack` NÃO entra aqui: ele dispara ao voltar para dentro da
     * faixa vindo de baixo, e fixar 1 ali travava a cena apagada enquanto
     * o scrub já estava trazendo ela de volta.
     */
    onLeave: () => {
      sceneState.saidaDoAto = 1
    },
    onLeaveBack: () => {
      sceneState.saidaDoAto = 0
    },
  })

  /**
   * Recalcula todo mundo agora que o pin existe.
   *
   * `refreshPriority` só ordena os refreshes que acontecerem daqui em
   * diante; os gatilhos das seções pós-pin já haviam sido criados e
   * medidos antes. Sem esta chamada, eles ficam com as posições de uma
   * página que não tem o espaçador do pin.
   */
  ScrollTrigger.refresh()

  return {
    destruir: () => {
      saida.kill()
      sceneState.saidaDoAto = 0
      gatilho.kill(true)
      tl.kill()
      // Depois de matar a timeline: reverter antes deixaria tweens
      // apontando para elementos que já não existem
      revelacao.reverter()
    },
    inicio: () => gatilho.start,
    altura: () => gatilho.end - gatilho.start,
    progresso: () => gatilho.progress,
  }
}
