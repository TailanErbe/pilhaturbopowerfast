'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from '@/lib/motion'

/**
 * O gráfico do beat de impacto.
 *
 * Ele diz uma coisa só, e diz sem inventar número nenhum: as duas linhas
 * saem do MESMO ponto e o que as separa é o descarte. A dos descartáveis
 * sobe uma unidade por ciclo; a da Gshield fica deitada em uma, porque é
 * sempre a mesma pilha voltando. O vão entre elas é o argumento.
 *
 * Tudo que está aqui vem da ficha: 1.200 ciclos, uma unidade. Nada de
 * custo, que eu não tenho.
 *
 * O traço é ligado ao SCRUB, como o resto da página: as linhas se desenham
 * conforme se rola e se apagam ao voltar. Fora do trecho pinado, então
 * precisa de gatilho próprio.
 */

const EIXO = { x0: 60, y0: 300, x1: 860, yTopo: 44 }

export function GraficoImpacto() {
  const raiz = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const svg = raiz.current
    if (!svg) return

    gsap.registerPlugin(ScrollTrigger)
    const secao = svg.closest('section')
    if (!secao) return

    const ctx = gsap.context(() => {
      const linhas = gsap.utils.toArray<SVGPathElement>('[data-traco]', svg)
      const marcas = gsap.utils.toArray<SVGGElement>('[data-marca]', svg)
      const numeros = gsap.utils.toArray<HTMLElement>(
        '[data-count-target]',
        secao,
      )

      /**
       * O comprimento de cada traço é medido em tempo de execução.
       *
       * O SVG escala com o container, mas `getTotalLength` devolve o
       * comprimento no sistema do `viewBox`, que é fixo. Por isso o valor
       * serve em qualquer largura de tela e não precisa recalcular no
       * redimensionamento.
       */
      for (const l of linhas) {
        const c = l.getTotalLength()
        gsap.set(l, { strokeDasharray: c, strokeDashoffset: c })
      }
      gsap.set(marcas, { autoAlpha: 0 })

      const estados = numeros.map((el) => ({
        el,
        destino: Number(el.dataset.countTarget),
        valor: { n: 0 },
      }))
      for (const e of estados) e.el.textContent = '0'

      const tl = gsap.timeline({
        scrollTrigger: {
          // O gatilho é o PRÓPRIO gráfico, não a seção: é ele que está
          // sendo desenhado, e a seção é bem mais alta que a tela
          trigger: svg,
          /**
           * As DUAS âncoras no TOPO da seção.
           *
           * Com `end: 'bottom ...'` a janela passa a depender da altura da
           * seção, e esta é mais alta que a tela: o traço completava mais
           * de mil pixels antes de o gráfico aparecer. Ancorando as duas no
           * topo, a janela é sempre a mesma fração de tela, venha a seção
           * do tamanho que vier.
           */
          start: 'top 88%',
          end: 'bottom 55%',
          scrub: 1,
          invalidateOnRefresh: true,
        },
      })

      tl.to(linhas, { strokeDashoffset: 0, ease: 'none', duration: 1 }, 0)
      tl.to(marcas, { autoAlpha: 1, ease: 'none', duration: 0.25 }, 0.75)

      for (const e of estados) {
        tl.to(
          e.valor,
          {
            n: e.destino,
            ease: 'none',
            duration: 1,
            onUpdate: () => {
              e.el.textContent = Math.round(e.valor.n).toLocaleString('pt-BR')
            },
          },
          0,
        )
      }
    }, svg)

    return () => ctx.revert()
  }, [])

  return (
    <svg
      ref={raiz}
      viewBox="0 0 900 340"
      className="mt-14 w-full"
      role="img"
      aria-label="Ao longo de 1.200 ciclos, o uso de pilhas descartáveis acumula 1.200 unidades descartadas, enquanto a Gshield permanece em uma."
    >
      {/* Linha dos descartáveis: uma unidade por ciclo */}
      <path
        data-traco
        d={`M ${EIXO.x0} ${EIXO.y0} L ${EIXO.x1} ${EIXO.yTopo}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />

      {/* Linha da Gshield: sempre a mesma pilha voltando */}
      <path
        data-traco
        d={`M ${EIXO.x0} ${EIXO.y0} L ${EIXO.x1} ${EIXO.y0}`}
        fill="none"
        stroke="#ffa400"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <g data-marca>
        <circle cx={EIXO.x1} cy={EIXO.yTopo} r="5" fill="currentColor" />
        <text
          x={EIXO.x1 - 14}
          y={EIXO.yTopo + 6}
          textAnchor="end"
          fill="currentColor"
          fontSize="20"
          opacity="0.7"
        >
          1.200 descartáveis
        </text>
      </g>

      <g data-marca>
        <circle cx={EIXO.x1} cy={EIXO.y0} r="5" fill="#ffa400" />
        <text
          x={EIXO.x1 - 14}
          y={EIXO.y0 - 14}
          textAnchor="end"
          fill="#ffa400"
          fontSize="20"
        >
          1 Gshield
        </text>
      </g>

      <text
        x={EIXO.x0}
        y={EIXO.y0 + 30}
        fill="currentColor"
        fontSize="16"
        opacity="0.45"
      >
        1.200 ciclos de uso
      </text>
    </svg>
  )
}
