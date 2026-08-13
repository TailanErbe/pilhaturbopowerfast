'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Image from 'next/image'
import { PRODUCTS } from '@/data/products'
import { irParaPosicao } from '@/lib/lenis'
import { beatEm, scrollDoBeat } from '@/motion/labels'
import { obterTimeline } from '@/motion/registro'

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

  return (
    <div
      ref={raiz}
      className="pointer-events-none fixed inset-x-0 bottom-5 z-30 flex flex-col items-center gap-2 sm:bottom-6"
    >
      {aberto && (
        <ul
          id={painelId}
          className="pointer-events-auto grid w-[min(88vw,260px)] gap-1 rounded-2xl bg-brand-white p-2 text-brand-black shadow-lg"
        >
          {PRODUCTS.map((p, i) => {
            const selecionado = p.index === ativo
            return (
              <li
                key={p.index}
                className="item-pilula"
                style={{ '--i': i } as React.CSSProperties}
              >
                <button
                  type="button"
                  onClick={() => {
                    setAberto(false)
                    const tl = obterTimeline()
                    if (!tl) return
                    irParaPosicao(
                      scrollDoBeat(`produto-${p.index}`, tl.inicio(), tl.altura()),
                    )
                  }}
                  aria-current={selecionado ? 'true' : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-black/5 ${
                    selecionado ? 'bg-black/5' : ''
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
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls={painelId}
        className="pointer-events-auto flex items-center gap-3 rounded-full bg-brand-white py-2.5 pr-3 pl-5 text-brand-black shadow-lg transition-transform hover:scale-[1.02]"
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
