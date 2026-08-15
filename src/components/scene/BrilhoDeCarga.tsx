'use client'

import { useEffect } from 'react'
import { BEATS, SAIDA_DO_HEROI } from '@/motion/labels'
import { obterTimeline } from '@/motion/registro'
import { cabeSaida, sceneState } from '@/lib/scene-state'

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
const HALO = {
  forca: 0.72,
  /* O mesmo instante da troca da barra pela pílula: ver SAIDA_DO_HEROI */
  some: { de: SAIDA_DO_HEROI.comeca, ate: SAIDA_DO_HEROI.termina },
  forcaDoPulso: 0.4,
}

const suave = (t: number) => t * t * (3 - 2 * t)
const entre = (t: number) => Math.max(0, Math.min(1, t))

export function BrilhoDeCarga() {
  useEffect(() => {
    let agendado = 0
    /** Um acumulador por brilho: ver o comentário no corpo de `aplicar` */
    let ultimaCarga = -1
    let ultimoHalo = -1
    /** Guardados depois de achados; ver o comentário abaixo */
    let heroi: HTMLElement | null = null
    let carga: HTMLElement | null = null

    const aplicar = () => {
      agendado = 0
      /**
       * Os elementos são procurados A CADA aplicação, não uma vez na
       * montagem.
       *
       * Eles pertencem ao <Scene />, que entra por import dinâmico sem
       * SSR: quando este efeito roda, ainda não existem no DOM. Buscando
       * só na montagem, a referência saía nula e o halo nunca acendia —
       * sem erro nenhum, que é o pior tipo de falha.
       */
      heroi ??= document.querySelector<HTMLElement>('.halo-do-heroi')
      carga ??= document.querySelector<HTMLElement>('.halo-de-carga')
      const tl = obterTimeline()
      /**
       * Nem os elementos nem a timeline existem no primeiro quadro: o
       * <Scene /> entra por import dinâmico e a timeline se registra
       * depois da montagem do ato. Desistindo aqui, o halo do herói só
       * acendia no primeiro scroll — e quem abre a página e fica parado
       * via o produto sem contorno nenhum.
       */
      if (!heroi || !carga || !tl) {
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
       *
       * Vira DESLOCAMENTO em pixels, e não posição em porcentagem: o
       * gradiente é fixo no elemento e quem se move é o elemento, por
       * `transform`. Foi essa troca que tirou a rasterização do caminho.
       */
      const centro = sceneState.centroNaTela
      const dx = `${Math.round((centro.x - 0.5) * window.innerWidth)}px`
      const dy = `${Math.round((centro.y - 0.5) * window.innerHeight)}px`

      /* ------------------------------------------------ halo do herói */
      const noHeroi = 1 - suave(entre((p - HALO.some.de) / (HALO.some.ate - HALO.some.de)))

      /**
       * O MESMO halo serve ao pulso da recarga.
       *
       * No herói ele diz "pilha carregada"; no beat do cabo, batendo a
       * cada onda que chega, diz "carregando agora". Dar um brilho novo
       * ao segundo caso seria inventar um segundo vocabulário para a
       * mesma ideia — e o leitor teria de aprender os dois.
       *
       * O pulso é mais fraco que o do herói: lá o brilho é o assunto da
       * tela, aqui ele é a consequência de uma coisa que está
       * acontecendo no cabo, que é para onde o olho deve ir.
       */
      const pulso = sceneState.pulsoDeCarga * HALO.forcaDoPulso
      const halo = Math.round(Math.max(HALO.forca * noHeroi, pulso) * 1000) / 1000
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
        heroi.style.setProperty('--halo-a', halo.toFixed(3))
        heroi.style.setProperty('--halo-dx', dx)
        heroi.style.setProperty('--halo-dy', dy)
      } else if (halo > 0) {
        // Aceso e parado: a posição ainda acompanha o respiro do produto
        heroi.style.setProperty('--halo-dx', dx)
        heroi.style.setProperty('--halo-dy', dy)
      }

      /* ------------------------------------------------ halo de carga */
      const enchendo = suave(entre((p - FAIXA.nasce) / (FAIXA.enche - FAIXA.nasce)))
      const saindo = suave(entre((p - FAIXA.enche) / (FAIXA.apaga - FAIXA.enche)))
      const presenca = Math.round(enchendo * (1 - saindo) * 100) / 100

      if (presenca !== ultimaCarga || presenca > 0) {
        ultimaCarga = presenca
        carga.style.setProperty('--carga-dx', dx)
        carga.style.setProperty('--carga-dy', dy)
        /**
         * O halo DEITA junto com a pilha.
         *
         * Ele é uma elipse alta e vivia sempre em pé, mas neste beat o
         * produto está na diagonal: o brilho corria numa direção e o objeto
         * noutra, e o que deveria ser luz saindo da pilha lia como uma
         * mancha vertical atrás dela — a mesma "mancha oval" que já tinha
         * sido reprovada no herói.
         */
        carga.style.setProperty(
          '--carga-rot',
          `${sceneState.inclinacaoNaTela.toFixed(1)}deg`,
        )
        carga.style.setProperty('--carga-a', String(FORCA * presenca))
        /**
         * A altura vira ESCALA da altura cheia, desenhada no CSS.
         *
         * Esticar o elemento verticalmente faz com a camada pronta o que
         * aumentar o raio vertical da elipse fazia redesenhando-a.
         */
        const alturaVh = ALTURA.minima + (ALTURA.maxima - ALTURA.minima) * enchendo
        carga.style.setProperty(
          '--carga-escala',
          (alturaVh / ALTURA.maxima).toFixed(3),
        )
      }

      /**
       * ACESO, ele persegue o produto QUADRO A QUADRO.
       *
       * O resto desta função é disparado por scroll, e para a cor e a
       * intensidade isso basta — as duas só mudam com o progresso. A
       * POSIÇÃO não: o produto continua se movendo depois que a rolagem
       * parou, porque o amortecimento leva alguns quadros para chegar à
       * pose e o respiro nunca para.
       *
       * Escrevendo só no scroll, o brilho ficava onde o produto ESTAVA no
       * instante do último evento. Quem abrisse a página e não rolasse
       * via o halo no lugar em que a pilha começou, não onde ela parou —
       * que no retrato é meia tela de distância.
       *
       * O laço só existe enquanto há brilho na tela; apagado, ninguém
       * agenda nada.
       */
      /**
       * O laço também roda com o cabo PLUGADO, mesmo com tudo apagado.
       *
       * Sem esta condição ele parava assim que os dois brilhos zeravam —
       * e o pulso da recarga nasce justamente de um valor que estava em
       * zero. Ninguém estaria olhando para vê-lo subir: a função só
       * voltaria a rodar no próximo evento de scroll, e o pulso inteiro
       * teria acontecido no escuro.
       */
      if (halo > 0 || presenca > 0 || cabeSaida(p).conectado) agendar()
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
      heroi?.removeAttribute('style')
      carga?.removeAttribute('style')
    }
  }, [])

  return null
}
