import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { CRUZAMENTO, janelaDoContador, type Beat } from './labels'

gsap.registerPlugin(SplitText)

/**
 * Revelação de texto ligada ao SCRUB.
 *
 * A diferença que importa: o texto não "entra" quando aparece na tela, ele
 * ACENDE conforme a rolagem avança, caractere por caractere, e apaga na
 * mesma ordem quando se volta. Sem isso o parágrafo é só um bloco que dá
 * fade, e a página perde a sensação de que o scroll comanda tudo.
 *
 * Duas armadilhas do SplitText, ambas resolvidas aqui:
 *
 * 1. Ele reescreve o DOM em <div> por caractere. Sem `revert()` no
 *    cleanup, cada remontagem duplica a marcação e o texto vira lixo.
 * 2. A quebra de linha fica CONGELADA no momento da divisão. Redimensionar
 *    a janela deixa as linhas onde estavam, atravessando a coluna. Só
 *    refazendo a divisão o texto reflui.
 */

export type Revelacao = {
  /** Desfaz as divisões e devolve o DOM original */
  reverter: () => void
}

/** Só divide o que estiver marcado, para nenhum texto virar div por engano */
const SELETOR = '[data-revelar]'

/**
 * Distribui `n` caracteres dentro de uma janela de progresso.
 *
 * O tempo total de um stagger é `duracao + (n-1) × passo`. Fixar os dois
 * às cegas faz textos longos estourarem o beat e curtos terminarem cedo
 * demais; resolvendo para a janela, qualquer tamanho de frase acende do
 * começo ao fim do mesmo trecho de scroll.
 */
function ritmo(n: number, janela: number) {
  if (n <= 1) return { duracao: janela, passo: 0 }
  const duracao = janela * 0.3
  return { duracao, passo: (janela - duracao) / (n - 1) }
}

export function revelarTextos(
  tl: gsap.core.Timeline,
  beats: Map<string, HTMLElement>,
  lista: Beat[],
): Revelacao {
  const divisoes: SplitText[] = []

  for (const b of lista) {
    const el = beats.get(b.id)
    if (!el) continue

    for (const alvo of el.querySelectorAll<HTMLElement>(SELETOR)) {
      /**
       * `type: 'lines,words,chars'` e não só `chars`.
       *
       * Dividindo apenas em caracteres, cada um vira um elemento solto e o
       * navegador passa a poder quebrar linha no meio de qualquer palavra.
       * As linhas e palavras existem só para segurar a quebra no lugar.
       */
      /**
       * `aria: 'hidden'` e não o padrão `'auto'`.
       *
       * No modo automático o plugin escreve `aria-label` no elemento
       * dividido e marca os filhos com `aria-hidden`. Os alvos aqui são
       * `<p>`, e o papel `paragraph` tem "name from: prohibited" na
       * ARIA 1.2: o `aria-label` é inválido e ignorado, então sobra um
       * parágrafo com todo o conteúdo escondido e nenhum nome. O texto
       * simplesmente some do leitor de tela.
       *
       * Com `'hidden'` o plugin marca só os filhos e não escreve o rótulo
       * proibido; o `<p>` continua expondo o próprio texto.
       */
      const split = new SplitText(alvo, {
        type: 'lines,words,chars',
        linesClass: 'linha-revelada',
        aria: 'hidden',
      })
      divisoes.push(split)

      const janela = b.fim - CRUZAMENTO - (b.inicio + CRUZAMENTO)
      const { duracao, passo } = ritmo(split.chars.length, janela)

      tl.fromTo(
        split.chars,
        // 0,14 e não 0: o parágrafo apagado por completo deixa um buraco na
        // composição, e o olho perde a referência de onde o texto vai nascer
        { opacity: 0.14 },
        {
          opacity: 1,
          ease: 'none',
          duration: duracao,
          stagger: { each: passo, from: 'start' },
        },
        b.inicio + CRUZAMENTO,
      )
    }
  }

  return {
    reverter: () => {
      for (const s of divisoes) s.revert()
      divisoes.length = 0
    },
  }
}

/**
 * Clip-reveal: o conteúdo sobe por baixo de uma borda dura.
 *
 * Não é fade. O texto está sempre opaco; o que muda é quanto dele já saiu
 * de trás da máscara do pai (ver `mascara-clip` em globals.css). É a
 * técnica que a referência usa nos títulos de painel, e é o que faz o
 * painel parecer que monta em vez de aparecer pronto.
 *
 * Corre no COMEÇO do beat, não ao longo dele: é entrada, não leitura. O
 * escalonamento entre os elementos marcados dá a ordem de montagem —
 * primeiro o título, depois a régua, depois a frase.
 */
export function clipRevelar(
  tl: gsap.core.Timeline,
  beats: Map<string, HTMLElement>,
  lista: Beat[],
) {
  for (const b of lista) {
    const el = beats.get(b.id)
    if (!el) continue

    const alvos = el.querySelectorAll<HTMLElement>('[data-clip]')
    if (!alvos.length) continue

    const janela = (b.fim - b.inicio) * 0.42

    tl.fromTo(
      alvos,
      { yPercent: 100 },
      {
        yPercent: 0,
        ease: 'power3.out',
        duration: janela * 0.6,
        stagger: (janela * 0.4) / Math.max(1, alvos.length - 1),
      },
      b.inicio,
    )
  }
}

/**
 * Contagem ligada ao scrub.
 *
 * O número nasce no HTML já no valor final (a página precisa fazer sentido
 * sem JS, §6.11). Aqui ele volta a zero e sobe conforme a rolagem: é o
 * argumento mais forte do produto, e vê-lo CONTANDO vale mais do que
 * vê-lo escrito.
 */
export function contarNoScrub(
  tl: gsap.core.Timeline,
  beats: Map<string, HTMLElement>,
  lista: Beat[],
) {
  for (const b of lista) {
    const el = beats.get(b.id)
    if (!el) continue

    for (const alvo of el.querySelectorAll<HTMLElement>('[data-count-target]')) {
      const destino = Number(alvo.dataset.countTarget)
      if (!Number.isFinite(destino)) continue

      const estado = { valor: 0 }
      alvo.textContent = '0'

      /* A janela vem de `janelaDoContador`: a chuva de descartáveis usa o
         mesmo eixo, e duas cópias andariam fora de compasso */
      const janela = janelaDoContador(b.id)

      tl.to(
        estado,
        {
          valor: destino,
          ease: 'none',
          duration: janela.ate - janela.de,
          onUpdate: () => {
            alvo.textContent = Math.round(estado.valor).toLocaleString('pt-BR')
          },
        },
        janela.de,
      )
    }
  }
}
