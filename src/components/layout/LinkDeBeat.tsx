'use client'

import { irParaPosicao } from '@/lib/lenis'
import { scrollDoBeat } from '@/motion/labels'
import { obterTimeline } from '@/motion/registro'

/**
 * Âncora que funciona DENTRO do trecho pinado.
 *
 * `<a href="#produto-01">` não leva a lugar nenhum aqui, e o motivo já
 * estava documentado em lib/lenis.ts: dentro do pin os painéis não têm
 * posição própria na página, todos ocupam a mesma tela. O navegador
 * calcula a posição do elemento, encontra o mesmo ponto para os sete, e
 * o resultado é sempre o fim do pin, onde o beat visível é o painel 03.
 *
 * Aqui o clique é interceptado e convertido em posição de SCROLL pelo
 * mesmo caminho da pílula. O `href` continua no HTML: sem JS ele ainda
 * leva ao elemento, que nesse caso está desempilhado e visível (ver o
 * bloco `<noscript>` em app/layout.tsx).
 */
export function LinkDeBeat({
  beat,
  className,
  children,
  onNavegar,
  atual,
}: {
  /** Id do beat, como em motion/labels.ts. `topo` volta ao começo. */
  beat: string
  className?: string
  children: React.ReactNode
  /** Para o menu mobile fechar antes de rolar */
  onNavegar?: () => void
  /** Marca o destino em que já estamos, para o leitor de tela */
  atual?: boolean
}) {
  return (
    <a
      href={`#${beat === 'topo' ? 'topo' : beat}`}
      className={className}
      aria-current={atual ? 'true' : undefined}
      onClick={(e) => {
        /**
         * `onNavegar` corre nos DOIS caminhos, e isso importa.
         *
         * Ele é quem fecha o menu. Chamando-o só depois do `preventDefault`,
         * o caminho sem timeline — movimento reduzido — deixava o menu
         * aberto por cima da página enquanto a âncora nativa rolava.
         */
        onNavegar?.()

        const tl = obterTimeline()
        // Sem timeline (movimento reduzido, ou antes da montagem) o
        // comportamento nativo da âncora é o correto
        if (!tl) return
        e.preventDefault()
        irParaPosicao(
          beat === 'topo' ? 0 : scrollDoBeat(beat, tl.inicio(), tl.altura()),
        )
      }}
    >
      {children}
    </a>
  )
}
