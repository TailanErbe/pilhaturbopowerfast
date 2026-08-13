'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { BatteryFill } from './BatteryFill'
import { Logo } from '@/components/layout/Logo'
import { runPreload } from '@/lib/preload'
import { prefersReducedMotion } from '@/lib/motion'

/**
 * Beat 0 — preloader.
 *
 * Renderizado no servidor para não piscar. O <noscript> no layout esconde
 * este bloco quando não há JS, senão o overlay travaria a página inteira
 * para quem navega sem script (REGRAS.md §6.11).
 *
 * O nível da carga é escrito DIRETO no DOM a cada quadro. Passar isso por
 * estado do React faria a árvore inteira re-renderizar 60 vezes por segundo
 * à toa. Só o número inteiro do `%` vira estado — muda 100 vezes, não 60/s.
 */
export function Preloader() {
  const [percent, setPercent] = useState(0)
  const [gone, setGone] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<SVGRectElement>(null)

  useEffect(() => {
    let alive = true
    document.documentElement.style.overflow = 'hidden'

    runPreload((v) => {
      if (!alive) return
      if (fillRef.current) {
        fillRef.current.style.transform = `scaleY(${v})`
      }
      setPercent(Math.round(v * 100))
    }).then(() => {
      if (!alive) return
      const root = rootRef.current
      if (!root) return

      document.documentElement.style.removeProperty('overflow')

      // Sem quadros não há o que animar (aba em segundo plano), e sem
      // quadros o `onComplete` do GSAP nunca dispararia — deixando um
      // overlay opaco cobrindo a página inteira.
      if (prefersReducedMotion() || document.hidden) {
        setGone(true)
        return
      }

      gsap.to(root, {
        opacity: 0,
        duration: 0.7,
        ease: 'power2.inOut',
        onComplete: () => setGone(true),
      })
    })

    return () => {
      alive = false
      document.documentElement.style.removeProperty('overflow')
    }
  }, [])

  if (gone) return null

  return (
    <div
      ref={rootRef}
      data-preloader
      role="status"
      aria-live="polite"
      aria-label={`Carregando ${percent}%`}
      className="fixed inset-0 z-[1000] grid min-h-dvh grid-rows-[auto_1fr_auto] justify-items-center bg-surface-000 px-[var(--spacing-gutter)] py-6"
    >
      <Logo variant="negativa" width={150} priority />

      {/* Mesma escala da taça da referência: 42px / 48px */}
      <div className="grid content-center justify-items-center gap-5">
        <BatteryFill
          fillRef={fillRef}
          className="w-[42px] text-brand-white md:w-[48px]"
        />
        <span className="min-w-[4ch] text-center text-sm tabular-nums text-white/70">
          {percent}%
        </span>
      </div>

      <span className="text-center text-xs tracking-wide text-white/40">
        Pilha Recarregável Turbo PowerFast
      </span>
    </div>
  )
}
