'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Logo } from './Logo'
import { LinkDeBeat } from './LinkDeBeat'
import { CONTENT, PRODUCTS } from '@/data/products'

/**
 * Menu mobile.
 *
 * Segue o padrão da referência: botão de 4 pontos no topo esquerdo e um
 * painel arredondado que cobre a tela. Aqui em cores Gshield — painel
 * branco com conteúdo preto, então usa a marca POSITIVA.
 *
 * Acessibilidade: foco preso no painel, Escape fecha, foco volta ao botão.
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
        return
      }
      if (e.key !== 'Tab') return

      // Prende o foco dentro do painel
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      )
      if (!focusables?.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    panelRef.current?.querySelector<HTMLElement>('a[href]')?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Abrir menu"
        className="grid h-8 w-8 grid-cols-2 grid-rows-2 place-content-center gap-1 rounded-full sm:hidden"
      >
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-1 w-1 rounded-full bg-brand-white" />
        ))}
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="superficie-clara fixed inset-x-5 top-5 z-40 grid gap-8 rounded-2xl bg-brand-white p-6 text-brand-black sm:hidden"
        >
          <div className="flex items-start justify-between">
            <Logo variant="positiva" width={44} />
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                buttonRef.current?.focus()
              }}
              aria-label="Fechar menu"
              className="grid h-8 w-8 place-items-center rounded-full text-2xl leading-none"
            >
              <span aria-hidden>×</span>
            </button>
          </div>

          <nav aria-label="Modelos">
            <ul className="grid gap-2">
              {PRODUCTS.map((p) => (
                <li key={p.index}>
                  <LinkDeBeat
                    beat={`produto-${p.index}`}
                    onNavegar={() => setOpen(false)}
                    className="font-display text-3xl"
                  >
                    {p.name}
                  </LinkDeBeat>
                </li>
              ))}
            </ul>
          </nav>

          <a
            href={CONTENT.buy.href}
            onClick={() => setOpen(false)}
            className="bg-brand-orange px-6 py-3 text-center font-display text-xl text-brand-black"
          >
            {CONTENT.buy.cta}
          </a>
        </div>
      )}
    </>
  )
}
