'use client'

import { useEffect } from 'react'
import { BEATS } from '@/motion/labels'
import { obterTimeline } from '@/motion/registro'
import { poseAt } from '@/lib/scene-state'

/**
 * O halo de carga que sobe atrás da pilha, no beat do contador.
 *
 * O argumento daquele beat é um número que cresce, e o número sozinho é
 * abstrato: mil e duzentas recargas não têm imagem. O halo dá a imagem —
 * a pilha enchendo — sem desenhar medidor nenhum.
 *
 * DE PROPÓSITO NÃO É UMA BARRA. Barra de carga é interface de aparelho, e
 * a página não é um aparelho: ela mostra um objeto. Uma barra também
 * mentiria, porque sugere um estado atual de bateria, quando o que se
 * conta ali é quantas vezes ela pode ser recarregada na vida inteira. O
 * halo cresce sem afirmar nada disso.
 *
 * ------------------------------------------------------------------
 * POR QUE EM CSS, E NÃO NA CENA
 * ------------------------------------------------------------------
 *
 * O canvas é `alpha: true`, então um fundo pintado no container APARECE
 * ATRÁS do produto sem nenhum objeto novo em cena. Isso resolve três
 * coisas de uma vez:
 *
 *   custo      é um gradiente do compositor, não pixels de fragment
 *              shader. A cena é limitada por preenchimento por causa do
 *              Bloom, e um plano emissivo atrás do produto pagaria a
 *              conta inteira mais uma vez.
 *   Bloom      o limiar está em 0,95 justamente para a tampa laranja não
 *              florescer. Um halo dentro da cena passaria por ele e
 *              espalharia névoa âmbar na página toda.
 *   ordem      atrás do produto, sempre, sem disputa de profundidade.
 *
 * As variáveis são escritas no elemento, não em estado do React: isto
 * acompanha o scroll e re-renderizar a árvore nesse ritmo seria
 * desperdício (mesma razão de `sceneState`).
 */

/** O beat do contador, de onde sai a faixa de crescimento */
const CONTADOR = BEATS.find((b) => b.id === 'cycles')!

/**
 * O halo acompanha o contador e se apaga junto com ele.
 *
 * `nasce` e `enche` cobrem a subida do número; `apaga` é a saída, que
 * termina antes do beat seguinte para o chip não herdar um brilho que
 * não é dele.
 */
const FAIXA = {
  nasce: CONTADOR.inicio,
  enche: CONTADOR.fim - 0.02,
  apaga: CONTADOR.fim + 0.03,
}

/** Altura do halo, em vh, do fio de luz inicial até envolver o corpo */
const ALTURA = { minima: 6, maxima: 62 }
/** Opacidade máxima. Acima disto o preto do corpo começa a lavar */
const FORCA = 0.5

/**
 * O halo do herói: ambiente, não narrativa.
 *
 * Ele não conta nada — só devolve o contorno de um produto quase preto
 * sobre uma página preta. Por isso é mais fraco que o da carga e se apaga
 * na mesma passagem em que a barra do herói vira pílula, para não sobrar
 * um brilho sem dono no beat seguinte.
 */
const HALO = { forca: 0.34, some: { de: 0.055, ate: 0.105 } }

const suave = (t: number) => t * t * (3 - 2 * t)
const entre = (t: number) => Math.max(0, Math.min(1, t))

export function BrilhoDeCarga() {
  useEffect(() => {
    let agendado = 0
    /** Último valor escrito, para não sujar o estilo a cada evento */
    let ultimo = -1
    /** Guardado depois de achado; ver o comentário abaixo */
    let alvo: HTMLElement | null = null

    const aplicar = () => {
      agendado = 0
      /**
       * O elemento é procurado A CADA aplicação, não uma vez na montagem.
       *
       * `[data-cena]` pertence ao <Scene />, que entra por import dinâmico
       * sem SSR: quando este efeito roda, ele ainda não existe no DOM.
       * Buscando só na montagem, a referência saía nula e o halo nunca
       * acendia — sem erro nenhum, que é o pior tipo de falha.
       */
      alvo ??= document.querySelector<HTMLElement>('[data-cena]')
      const tl = obterTimeline()
      /**
       * Nem o elemento nem a timeline existem no primeiro quadro: o
       * <Scene /> entra por import dinâmico e a timeline se registra
       * depois da montagem do ato. Desistindo aqui, o halo do herói só
       * acendia no primeiro scroll — e quem abre a página e fica parado
       * via o produto sem contorno nenhum.
       */
      if (!alvo || !tl) {
        agendar()
        return
      }
      const p = tl.progresso()

      const carga = suave(entre((p - FAIXA.nasce) / (FAIXA.enche - FAIXA.nasce)))
      const saindo = suave(entre((p - FAIXA.enche) / (FAIXA.apaga - FAIXA.enche)))
      const presenca = carga * (1 - saindo)

      const arredondado = Math.round(presenca * 100) / 100
      if (arredondado === ultimo) return
      ultimo = arredondado

      /**
       * O halo segue a COLUNA do produto.
       *
       * `screenX` da pose é fração da tela e muda entre beats — no
       * contador o produto sai do centro para 0,57, justamente para não
       * cobrir o texto. Um halo fixo no meio ficaria ao lado dele.
       */
      const x = poseAt(p).screenX * 100

      alvo.style.setProperty('--carga-x', `${x.toFixed(1)}%`)
      alvo.style.setProperty('--carga-a', String(FORCA * arredondado))
      alvo.style.setProperty(
        '--carga-h',
        `${(ALTURA.minima + (ALTURA.maxima - ALTURA.minima) * carga).toFixed(1)}vh`,
      )

      /**
       * O halo do HERÓI é outro assunto, e por isso outras variáveis.
       *
       * Este não conta nada: só devolve o contorno de um produto quase
       * preto sobre página preta. Fica aceso na primeira tela e se apaga
       * junto com ela, na mesma passagem em que a barra vira pílula.
       */
      const noHeroi = 1 - suave(entre((p - HALO.some.de) / (HALO.some.ate - HALO.some.de)))
      alvo.style.setProperty('--halo-a', (HALO.forca * noHeroi).toFixed(3))
    }

    /**
     * O scroll só AGENDA; quem escreve é o quadro seguinte. Escrever
     * dentro do ouvinte mexeria no estilo no meio da rolagem, que é
     * exatamente o que trava a rolagem.
     */
    const agendar = () => {
      if (!agendado) agendado = requestAnimationFrame(aplicar)
    }

    aplicar()
    window.addEventListener('scroll', agendar, { passive: true })
    window.addEventListener('resize', agendar)

    return () => {
      cancelAnimationFrame(agendado)
      window.removeEventListener('scroll', agendar)
      window.removeEventListener('resize', agendar)
      alvo?.style.removeProperty('--carga-a')
      alvo?.style.removeProperty('--carga-h')
      alvo?.style.removeProperty('--carga-x')
    }
  }, [])

  return null
}
