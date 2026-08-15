'use client'

import Image from 'next/image'
import { CONTENT, PRODUCTS } from '@/data/products'
import { irParaPosicao } from '@/lib/lenis'
import { scrollDoBeat } from '@/motion/labels'
import { obterTimeline } from '@/motion/registro'
import { useNoHeroi } from '@/lib/no-heroi'

/**
 * A barra da primeira tela: AA, AAA, o kit e onde comprar.
 *
 * No rascunho ela é uma coluna à direita, aberta. Aqui ela existe SÓ no
 * herói e se recolhe na pílula ao entrar no segundo beat, e a razão é de
 * composição: o herói tem largura de sobra, os beats seguintes não. Os
 * painéis de produto são 38% de texto, um vão central para o objeto e mais
 * 38% de texto — uma barra permanente à direita ou invadiria a coluna ou a
 * estreitaria. E no retrato ela não caberia de jeito nenhum, o que
 * obrigaria a manter duas navegações diferentes.
 *
 * O carrinho do rascunho virou "onde comprar". A página não tem carrinho:
 * a compra acontece na loja, em outro domínio. Um ícone de carrinho que
 * abre outro site promete o que não entrega, e cobra essa conta no exato
 * momento em que a pessoa decidiu comprar.
 */
export function BarraDoHeroi() {
  const presenca = useNoHeroi()

  /**
   * Some do DOM quando invisível, e não só da tela.
   *
   * `opacity: 0` deixaria a barra clicável e no caminho do TAB, com o
   * teclado parando em três links que ninguém vê. `visibility` resolve os
   * dois de uma vez e ainda permite a transição de opacidade.
   */
  const oculta = presenca < 0.01

  const irPara = (id: string) => {
    const tl = obterTimeline()
    if (!tl) return
    irParaPosicao(scrollDoBeat(id, tl.inicio(), tl.altura()))
  }

  return (
    <div
      aria-hidden={oculta}
      style={{ opacity: presenca, visibility: oculta ? 'hidden' : 'visible' }}
      className="pointer-events-none fixed top-1/2 right-0 z-30 hidden -translate-y-1/2 pr-[var(--spacing-gutter)] md:block"
    >
      <nav aria-label="Nossas pilhas" className="pointer-events-auto flex flex-col items-start gap-1">
        <p className="mb-3 text-xs tracking-[0.22em] text-white/50 uppercase">
          Nossas pilhas
        </p>

        {PRODUCTS.map((p) => (
          <button
            key={p.index}
            type="button"
            onClick={() => irPara(`produto-${p.index}`)}
            className="group flex items-center gap-3 rounded-xl py-1.5 pr-3 pl-1.5 text-left transition-colors hover:bg-white/5"
          >
            {/* A foto vem do mesmo lugar da pílula: é o mesmo destino, e o
                numeral no canto é a âncora de navegação da página inteira */}
            <span
              aria-hidden
              className="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/5"
            >
              <Image
                src={p.miniatura.src}
                alt=""
                width={40}
                height={40}
                sizes="40px"
                quality={92}
                className="size-8 object-contain"
              />
              <span className="font-display absolute -top-1 -left-1 grid h-4 w-4 place-items-center rounded-full bg-brand-orange text-[10px] text-brand-black">
                {p.index}
              </span>
            </span>
            <span className="font-display text-lg whitespace-nowrap">{p.name}</span>
          </button>
        ))}

        <a
          href={CONTENT.buy.href}
          className="mt-3 text-sm whitespace-nowrap text-white/60 transition-colors hover:text-white"
        >
          {CONTENT.buy.cta}
        </a>
      </nav>
    </div>
  )
}
