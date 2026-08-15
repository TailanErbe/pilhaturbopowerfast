'use client'

import { useEffect } from 'react'
import { BEATS } from '@/motion/labels'
import { obterTimeline } from '@/motion/registro'
import { sceneState } from '@/lib/scene-state'

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
 * O halo do herói: a pilha ENERGIZADA.
 *
 * Começou fraco, como contorno para o produto não sumir contra a página
 * preta. O pedido do cliente é outro e é melhor: que a primeira tela
 * mostre uma pilha carregada, com a luz saindo dela e alcançando a
 * página. Então ele é forte e largo, e se apaga na mesma passagem em que
 * a barra do herói vira pílula, para não sobrar brilho sem dono no beat
 * seguinte.
 */
const HALO = { forca: 0.72, some: { de: 0.055, ate: 0.105 } }

const suave = (t: number) => t * t * (3 - 2 * t)
const entre = (t: number) => Math.max(0, Math.min(1, t))

export function BrilhoDeCarga() {
  useEffect(() => {
    let agendado = 0
    /** Um acumulador por brilho: ver o comentário no corpo de `aplicar` */
    let ultimaCarga = -1
    let ultimoHalo = -1
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

      /**
       * O CENTRO vem da cena, não de uma conta paralela.
       *
       * A posição final do produto é o resultado de pose, amortecimento,
       * respiro, faixa do retrato e escala. Recalcular aqui seria manter
       * duas versões da mesma verdade — e foi exatamente o que produziu,
       * no celular, um produto no alto com o brilho parado no pé da tela.
       */
      const centro = sceneState.centroNaTela
      const cx = `${(centro.x * 100).toFixed(1)}%`
      const cy = `${(centro.y * 100).toFixed(1)}%`

      /* ------------------------------------------------ halo do herói */
      const noHeroi = 1 - suave(entre((p - HALO.some.de) / (HALO.some.ate - HALO.some.de)))
      const halo = Math.round(HALO.forca * noHeroi * 1000) / 1000
      /**
       * Cada brilho tem o SEU guarda de escrita.
       *
       * Havia um só, comparado com o valor da CARGA — e como a carga vale
       * zero no herói, a função saía antes de escrever o halo. Ele ficava
       * congelado no que estivesse, que na prática era zero: o herói
       * abria sem brilho nenhum. Um acumulador por variável.
       */
      if (halo !== ultimoHalo) {
        ultimoHalo = halo
        alvo.style.setProperty('--halo-a', halo.toFixed(3))
        alvo.style.setProperty('--halo-x', cx)
        alvo.style.setProperty('--halo-y', cy)
      } else if (halo > 0) {
        // Aceso e parado: a posição ainda acompanha o respiro do produto
        alvo.style.setProperty('--halo-x', cx)
        alvo.style.setProperty('--halo-y', cy)
      }

      /* ------------------------------------------------ halo de carga */
      const carga = suave(entre((p - FAIXA.nasce) / (FAIXA.enche - FAIXA.nasce)))
      const saindo = suave(entre((p - FAIXA.enche) / (FAIXA.apaga - FAIXA.enche)))
      const presenca = Math.round(carga * (1 - saindo) * 100) / 100

      if (presenca !== ultimaCarga || presenca > 0) {
        ultimaCarga = presenca
        alvo.style.setProperty('--carga-x', cx)
        alvo.style.setProperty('--carga-y', cy)
        alvo.style.setProperty('--carga-a', String(FORCA * presenca))
        alvo.style.setProperty(
          '--carga-h',
          `${(ALTURA.minima + (ALTURA.maxima - ALTURA.minima) * carga).toFixed(1)}vh`,
        )
      }
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
