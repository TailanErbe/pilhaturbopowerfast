'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Image from 'next/image'
import { PRODUCTS } from '@/data/products'
import { beatEm } from '@/motion/labels'
import { obterTimeline } from '@/motion/registro'
import { useNoAto, useNoHeroi } from '@/lib/no-heroi'
import { LinkDeBeat } from './LinkDeBeat'

/**
 * Pílula fixa "Nossas pilhas" — o navegador do scrollytelling.
 *
 * Copia o padrão da referência (o pill "Our Wines"):
 *   · fica fixa no rodapé, centralizada, por cima de tudo menos do header
 *   · abre para cima com os três produtos
 *   · o rótulo troca para o produto em que você está
 *
 * A navegação NÃO teleporta: `irPara` usa `lenis.scrollTo` com duração
 * longa, então a página atravessa o caminho inteiro e todas as animações
 * de scroll rodam durante o trajeto. O percurso é a experiência.
 */
export function ProductPill() {
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState<string | null>(null)
  const painelId = useId()
  const raiz = useRef<HTMLDivElement>(null)

  /**
   * Qual painel está na tela — lido do PROGRESSO da timeline.
   *
   * `IntersectionObserver` não serve mais: dentro do pin os sete beats
   * ocupam exatamente a mesma posição, então todos "intersectam" o tempo
   * todo. Quem sabe onde estamos é a timeline.
   */
  useEffect(() => {
    const ler = () => {
      const tl = obterTimeline()
      if (!tl) return
      const beat = beatEm(tl.progresso())
      setAtivo(beat.id.startsWith('produto-') ? beat.id.replace('produto-', '') : null)
    }
    ler()
    window.addEventListener('scroll', ler, { passive: true })
    return () => window.removeEventListener('scroll', ler)
  }, [])

  // Fecha ao clicar fora ou com Escape
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', tecla)
    }
  }, [aberto])

  const produtoAtivo = PRODUCTS.find((p) => p.index === ativo)
  const rotulo = produtoAtivo ? produtoAtivo.name : 'Nossas pilhas'

  /**
   * No herói quem navega é a BARRA, não a pílula.
   *
   * As duas fazem a mesma coisa e mostrar as duas juntas seria oferecer
   * dois caminhos para o mesmo lugar na tela mais vazia da página. Elas se
   * cruzam em opacidade pelo mesmo sinal (useNoHeroi), então não existe
   * trecho com nenhuma das duas.
   */
  const noHeroi = useNoHeroi()

  /**
   * A pílula cede lugar à barra no herói, em QUALQUER largura.
   *
   * Houve aqui uma exceção para o retrato, de quando a barra era
   * `hidden md:block` e a primeira tela do celular ficava sem navegação
   * nenhuma. A barra passou a ter forma própria no retrato — uma linha
   * abaixo do produto — e a exceção deixou de fazer sentido: mantida,
   * ela mostraria as duas ao mesmo tempo, oferecendo dois caminhos para
   * o mesmo lugar na tela mais vazia da página.
   */
  /**
   * A pílula vive entre DUAS bordas, e as duas são de outra peça.
   *
   * Ela entra quando o herói entrega a tela e sai quando o ato acaba. A
   * segunda faltava: `fixed` do jeito que ela é, ela sobrevivia ao pin e
   * ficava por cima do impacto, da compra e do rodapé, com o rótulo
   * congelado em "O KIT" e sem destino nenhum na tela — os painéis já
   * tinham ficado para trás. Medido, ela cobria parte do "2.250" da seção
   * de impacto e flutuava sob a linha de copyright.
   *
   * Multiplicar em vez de escolher uma das duas: nas pontas os dois sinais
   * valem 1, e no meio quem estiver saindo manda.
   */
  const noAto = useNoAto()
  const presenca = (1 - noHeroi) * noAto
  const oculta = presenca < 0.01

  return (
    <div
      ref={raiz}
      aria-hidden={oculta}
      style={{ opacity: presenca, visibility: oculta ? 'hidden' : 'visible' }}
      className="pointer-events-none fixed inset-x-0 bottom-5 z-30 flex flex-col items-center gap-2 sm:bottom-6"
    >
      {aberto && (
        <ul
          id={painelId}
          className="superficie-clara pointer-events-auto grid w-[min(88vw,260px)] gap-1 rounded-2xl bg-brand-white p-2 text-brand-black shadow-lg"
        >
          {PRODUCTS.map((p, i) => {
            const selecionado = p.index === ativo
            return (
              <li
                key={p.index}
                className="item-pilula"
                style={{ '--i': i } as React.CSSProperties}
              >
                {/**
                 * ÂNCORA, e não botão. Este item já foi um `<button>` cujo
                 * clique fazia `if (!tl) return`.
                 *
                 * Com `prefers-reduced-motion` — que no Windows muita gente
                 * liga por DESEMPENHO, sem nenhuma intenção de acessibilidade
                 * — o PinnedAct não monta a timeline, `obterTimeline()`
                 * devolve nulo para sempre, e o resultado era o pior tipo de
                 * defeito: a pílula ficava visível a página inteira, bem
                 * grande e branca, com os três itens INERTES. Clicar não
                 * fazia nada, e nada explicava por quê.
                 *
                 * O <LinkDeBeat /> resolve porque o `href` continua no HTML:
                 * havendo timeline ele intercepta e rola pela cena; não
                 * havendo, a âncora nativa leva ao painel — que naquele modo
                 * está desempilhado e visível.
                 */}
                {/**
                 * O ATIVO não pode usar a mesma tinta do HOVER.
                   *
                   * Os dois eram `bg-black/5`, o mesmo literal. Com o mouse
                   * sobre o item 01 enquanto o ativo é o 02, os dois ficavam
                   * exatamente `rgb(242,242,242)` — o menu passava a informar
                   * errado onde a pessoa está, que é a única coisa que ele
                   * tem de fazer além de navegar. Conferido no navegador: os
                   * três itens carregam `hover:bg-black/5` e o ativo carrega
                   * `bg-black/5` por cima.
                   *
                   * O ativo ganha um anel interno. Preto a 50% sobre o branco
                   * do painel dá cerca de 3,9:1, acima dos 3:1 que a WCAG 2.2
                   * pede para elemento de interface (SC 1.4.11) — o fundo a
                   * 5% sozinho dá 1,12:1 e nunca cumpriu esse papel.
                   *
                 * E o `hover:` sai de dentro do ramo do selecionado de
                 * propósito: enquanto os dois estiverem na mesma declaração,
                 * um continua virando o outro.
                 */}
                <LinkDeBeat
                  beat={`produto-${p.index}`}
                  onNavegar={() => setAberto(false)}
                  atual={selecionado}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    selecionado
                      ? 'bg-black/5 ring-1 ring-black/50 ring-inset'
                      : 'hover:bg-black/5'
                  }`}
                >
                  {/**
                   * Foto do produto no lugar do círculo numerado.
                   *
                   * O numeral não some: vira uma marca pequena no canto da
                   * foto. Ele é a âncora de navegação da página inteira
                   * (o painel se chama "01 AA"), e trocá-lo por imagem
                   * quebraria a correspondência entre o menu e o destino.
                   */}
                  <span
                    aria-hidden
                    className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-black/5"
                  >
                    <Image
                      src={p.miniatura.src}
                      alt=""
                      width={44}
                      height={44}
                      sizes="44px"
                      quality={92}
                      className="size-9 object-contain"
                    />
                    <span className="absolute -top-1 -left-1 grid h-5 w-5 place-items-center rounded-full bg-brand-orange font-display text-[11px] text-brand-black">
                      {p.index}
                    </span>
                  </span>
                  <span className="flex items-baseline gap-2">
                    <span className="font-display text-lg">{p.name}</span>
                    {p.subtitle && (
                      <span className="text-xs text-black/50">{p.subtitle}</span>
                    )}
                  </span>
                </LinkDeBeat>
              </li>
            )
          })}
        </ul>
      )}

      {/**
       * O FOCO DESTE BOTÃO ERA BRANCO SOBRE BRANCO, e por duas razões que se
       * somam. Ele é o controle mais permanente da página, então valia achar.
       *
       * 1. A regra base é `:focus-visible { outline: #fff 2px; box-shadow:
       *    #000 0 0 0 2px, #fff 0 0 0 6px }` — quem dá contraste em fundo
       *    claro é o box-shadow, não o contorno. Só que `shadow-lg` é
       *    utilitário e utilitário vence base na ordem de camadas do
       *    Tailwind v4: o par preto-branco é sobrescrito e sobra o contorno
       *    BRANCO, numa pílula branca, sobre o painel 03 que é branco.
       *
       * 2. A correção que existe para superfícies claras,
       *    `.superficie-clara :focus-visible`, é seletor de DESCENDENTE. Este
       *    botão CARREGA a classe, não é filho de quem a carrega — conferido
       *    no navegador: `classList.contains` verdadeiro e `closest` no pai
       *    falso. Ela nunca o alcançou.
       *
       * Por isso o par entra aqui como `focus-visible:`, que é utilitário e
       * empata a disputa no mesmo nível.
       *
       * O `ring-1 ring-black/10` é outro assunto e vale sempre: em repouso a
       * pílula branca sobre o painel branco do kit tem contorno de ~1,1:1, ou
       * seja nenhum.
       */}
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls={painelId}
        className="superficie-clara pointer-events-auto flex items-center gap-3 rounded-full bg-brand-white py-2.5 pr-3 pl-5 text-brand-black shadow-lg ring-1 ring-black/10 transition-transform hover:scale-[1.02] focus-visible:outline-black focus-visible:[box-shadow:0_0_0_2px_#fff,0_0_0_6px_#000]"
      >
        <span className="font-display text-lg whitespace-nowrap">{rotulo}</span>
        <span
          aria-hidden
          className={`grid h-7 w-7 place-items-center rounded-full bg-black/5 transition-transform ${
            aberto ? 'rotate-180' : ''
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3.5 5.25L7 8.75L10.5 5.25"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
    </div>
  )
}
