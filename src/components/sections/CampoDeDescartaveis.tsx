'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from '@/lib/motion'

/**
 * O campo das 1.200, no beat de impacto.
 *
 * ------------------------------------------------------------------
 * POR QUE ISTO DEIXOU DE SER UM GRÁFICO DE LINHA
 * ------------------------------------------------------------------
 *
 * Havia aqui duas retas saindo do mesmo ponto: a dos descartáveis subindo
 * e a da Gshield deitada. O vão entre elas era, no papel, o argumento.
 *
 * O problema é que aquilo codificava dois valores, 1.200 e 1, numa única
 * variável visual: a inclinação. E a inclinação não vinha do dado, vinha
 * da CAIXA. O eixo era `{x0:60, y0:300, x1:860, yTopo:44}` num viewBox de
 * 900x340, ou seja 256/800 de subida — troque o viewBox para 900x600 e o
 * "argumento" fica mais íngreme sem um único número mudar. Forma que muda
 * de força quando se muda o quadro não é medida, é decoração.
 *
 * Havia um segundo sinal, e ele estava no próprio arquivo: o `aria-label`
 * dizia a frase inteira. Quando a alternativa textual substitui o desenho
 * por completo, o desenho não está informando nada.
 *
 * Aqui 1.200 é CONTADO. Doze linhas de cem marcas, conferíveis, e uma
 * marca laranja do mesmo tamanho ao lado do rótulo "uma Gshield". A
 * proporção não é escolhida: a marca solitária tem 1% da largura do campo,
 * que tem cem marcas por linha, então ela É uma marca.
 *
 * ------------------------------------------------------------------
 * O QUE NÃO PODE VOLTAR
 * ------------------------------------------------------------------
 *
 * O defeito que motivou a revisão foi o RÓTULO CHEGANDO TARDE: as legendas
 * do gráfico antigo só apareciam a 75% do traço, então na maior parte do
 * tempo em que a peça estava na tela ela era um desenho mudo. Aqui nada de
 * texto anima: escala, rótulo e legenda estão em opacidade cheia desde o
 * primeiro quadro, e são HTML, não <text> dentro do SVG (respondem a zoom
 * de texto e não escalam com o viewBox).
 */

/** Doze linhas de cem marcas. O produto é 1.200, e é conferível. */
const LINHAS = 12
const MARCAS = 100
/** Passo entre marcas, em unidades do viewBox */
const PASSO = 12

/**
 * O `d` de UMA linha, reusado nas doze.
 *
 * Primeira marca centrada em x=6 e última em x=1194: sobra margem
 * simétrica de 4 unidades para a tampa redonda de raio 2 não ser cortada
 * pela borda do viewBox.
 */
const D = Array.from({ length: MARCAS }, (_, i) => `M${6 + PASSO * i} 6v8`).join('')

/**
 * A escala, LITERAL.
 *
 * Sem `toLocaleString`: formatar número em módulo compartilhado entre
 * servidor e cliente é fonte clássica de divergência de hidratação, e o
 * ganho aqui seria um ponto.
 */
const ESCALA = [
  { k: 3, t: '300' },
  { k: 6, t: '600' },
  { k: 9, t: '900' },
  { k: 12, t: '1.200' },
]

export function CampoDeDescartaveis({ children }: { children: ReactNode }) {
  /** Onde os contadores são procurados: figura e números moram aqui */
  const raiz = useRef<HTMLDivElement>(null)
  /** O gatilho é a FIGURA, que é o que está sendo desenhado */
  const figura = useRef<HTMLElement>(null)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const alvo = raiz.current
    const gatilho = figura.current
    if (!alvo || !gatilho) return

    gsap.registerPlugin(ScrollTrigger)

    const ctx = gsap.context(() => {
      const linhas = gsap.utils.toArray<SVGSVGElement>('[data-linha]', alvo)
      const numeros = gsap.utils.toArray<HTMLElement>('[data-count-target]', alvo)

      const estados = numeros.map((el) => ({
        el,
        destino: Number(el.dataset.countTarget),
        valor: { n: 0 },
      }))
      for (const e of estados) e.el.textContent = '0'

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: gatilho,
          /**
           * As DUAS âncoras no TOPO.
           *
           * O arquivo anterior já trazia este comentário e o código logo
           * abaixo o desobedecia, usando `end: 'bottom 55%'`. Com a âncora
           * no fundo, a janela passa a depender da altura da seção, e esta
           * é mais alta que a tela: o desenho completava antes de aparecer.
           * No topo, a janela é sempre a mesma fração de tela.
           */
          start: 'top 90%',
          end: 'top 20%',
          scrub: 1,
          invalidateOnRefresh: true,
        },
      })

      /**
       * Uma linha por doze avos, SEM sobreposição.
       *
       * Duração igual ao passo faz a linha `i` ocupar exatamente
       * [i/12, (i+1)/12], e o total fecha em 1. A consequência é o ponto
       * inteiro da peça: como os contadores correm em duração 1 a partir
       * de zero, quando a linha `i` termina o número marca
       * 1.200 x (i+1)/12 = 100(i+1). Uma linha acesa vale cem, doze valem
       * mil e duzentas, e o campo e o número dizem a mesma coisa no mesmo
       * instante.
       *
       * NÃO usar a sobreposição de 1,6 de `revelarEmSerie`: fica mais
       * macio e quebra essa igualdade, que é o que a peça tem de honesto.
       */
      gsap.set(linhas, { opacity: 0.14 })
      tl.to(
        linhas,
        {
          opacity: 1,
          ease: 'none',
          duration: 1 / LINHAS,
          stagger: { each: 1 / LINHAS },
        },
        0,
      )

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
    }, alvo)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={raiz}>
      <figure ref={figura} className="mt-14">
        {/**
         * POSICIONAMENTO EXPLÍCITO na grade.
         *
         * Sem `col-start`/`row-start` a colocação automática joga o campo
         * na célula (1,2), que está livre, e a escala perde o alinhamento
         * com as linhas.
         */}
        <div className="grid max-w-[1100px] grid-cols-[minmax(0,1fr)_3.25rem] gap-x-3 gap-y-6">
          {/**
           * A UNIDADE, e ela é literalmente uma marca do campo.
           *
           * `w-[1%]` resolve contra a coluna do campo, que tem cem marcas
           * por linha: este traço tem, por construção, o mesmo tamanho e o
           * mesmo centro horizontal da primeira marca de cada linha. E
           * continua tendo se alguém mexer no `max-width`, porque não há
           * número copiado, há uma fração.
           */}
          <div className="col-start-1 row-start-1 flex items-center gap-3">
            <svg
              aria-hidden
              viewBox="0 0 12 20"
              className="block w-[1%] min-h-[8px] shrink-0"
            >
              <path
                d="M6 6v8"
                fill="none"
                stroke="#ffa400"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
            <span className="texto-nota text-white">uma Gshield</span>
          </div>

          {/**
           * O CAMPO. Doze linhas, cem marcas cada.
           *
           * NADA de padding, border ou gap entre as linhas, e nada de
           * `preserveAspectRatio`: o vão vertical mora DENTRO do viewBox
           * (as marcas ocupam y de 4 a 16 de 20). É isso que faz o fim da
           * linha `k` cair exatamente em k/12 da altura do campo, que é a
           * condição para a escala ao lado ser exata sem número digitado.
           *
           * `min-h-[8px]` é o piso do celular: acima de uns 640px de
           * janela ele é inerte; abaixo, o SVG passa a encaixotar o
           * conteúdo centrado, sem aumentar a marca, e as linhas param de
           * se colar umas nas outras.
           */}
          <div className="col-start-1 row-start-2 text-white/45" aria-hidden>
            {Array.from({ length: LINHAS }, (_, i) => (
              <svg
                key={i}
                data-linha
                viewBox={`0 0 ${PASSO * MARCAS} 20`}
                className="block min-h-[8px] w-full"
              >
                <path
                  d={D}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            ))}
          </div>

          {/**
           * A ESCALA, e é ela que tira o campo de "monte de grão".
           *
           * Sem ela, no meio da rolagem o leitor vê seis linhas acesas e
           * nenhum sinal de que faltam seis: o campo diria "600 é o total".
           * Com os numerais impressos no vazio adiante, ele diz "600 de
           * 1.200".
           *
           * A porcentagem resolve contra a altura do campo, porque a
           * célula estica na linha da grade. `leading-none` é necessário:
           * com a entrelinha do `texto-nota` o numeral ganha caixa alta e
           * a marca de 25% deixa de coincidir com o fim da linha 3.
           */}
          <div className="relative col-start-2 row-start-2" aria-hidden>
            {ESCALA.map(({ k, t }) => (
              <span
                key={t}
                className="texto-nota absolute right-0 -translate-y-1/2 leading-none tabular-nums text-white/60"
                style={{ top: `${(k / LINHAS) * 100}%` }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/**
         * A legenda diz o total e DE ONDE ele vem, sem jargão.
         *
         * Ela dizia "o limite de ciclos de recarga da ficha". "A ficha" é
         * vocabulário interno: existe um accordion chamado Ficha técnica
         * nos painéis de produto, e a legenda apontava para ele sem dizer
         * isso. O cliente leu e perguntou "que ficha?", que é a pergunta
         * certa — quem chega na página não tem esse contexto.
         *
         * O `aria-label` do desenho antigo também sumiu junto: ele
         * substituía a figura inteira por uma frase, e alternativa
         * escondida que alguém precisa lembrar de atualizar é dívida.
         */}
        {/**
         * "ATÉ 1.200", e o "até" não é preciosismo jurídico.
         *
         * Esta legenda era o ÚNICO lugar da página que prometia o número
         * cheio: ela dizia "São 1.200, que é quantas vezes uma Gshield pode
         * ser recarregada". A ficha técnica diz "Até 1.200"
         * (products.ts:118), o beat 2 diz "Recarrega até 1.200 vezes", e o
         * próprio endereço da loja termina em `ate-1200-recargas`. O rótulo
         * oficial não traz número de ciclos nenhum, ou seja não existe
         * segunda fonte para o absoluto.
         *
         * E a estrutura do campo também entrou na frase. No celular as cem
         * marcas de uma linha ficam com passo de 2,8 px, e contar deixa de
         * ser possível — que era justamente a razão de ser da peça. Dizendo
         * "doze linhas de cem", o desenho fica conferível sem contar traço.
         */}
        <figcaption className="texto-nota mt-[18px] text-white/60">
          Cada traço é uma descartável: doze linhas de cem. São até 1.200, o
          máximo de recargas de uma Gshield.
        </figcaption>
      </figure>

      {children}
    </div>
  )
}
