'use client'

import { useEffect, useRef } from 'react'
import { montarTimeline, type Timeline } from '@/motion/timeline'
import { registrarTimeline } from '@/motion/registro'
import { prefersReducedMotion } from '@/lib/motion'

/**
 * O ato pinado: hero, USB-C, recargas, chip e os três painéis.
 *
 * REGRAS.md §2.3 — na referência, 85,6% da página inteira é UMA seção
 * pinada. Os beats não rolam empilhados: eles ficam sobrepostos, todos em
 * `absolute inset-0`, e a timeline revela um de cada vez enquanto a tela
 * permanece travada.
 *
 * É isso que dá a continuidade do objeto 3D. Se cada beat fosse uma seção
 * rolando com seu próprio gatilho, a pilha "cortaria" a cada transição.
 *
 * Com `prefers-reduced-motion` nada disso é montado: os beats viram um
 * documento vertical comum, todos visíveis, na ordem do HTML (§6.10).
 */
export function PinnedAct({ children }: { children: React.ReactNode }) {
  const raiz = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const el = raiz.current
    if (!el) return

    let tl: Timeline | null = null
    const montar = () => {
      tl = montarTimeline(el)
      registrarTimeline(tl)
    }
    // Espera o layout assentar: fontes e imagens mudam a altura e o pin
    // precisa medir depois disso, senão o `end` nasce errado.
    let id = requestAnimationFrame(montar)

    /**
     * Remonta quando a LARGURA muda.
     *
     * O SplitText congela a quebra de linha no instante em que divide: sem
     * refazer, o texto continua quebrando onde quebrava antes e atravessa a
     * coluna nova. Refazer é mais simples e mais seguro que tentar
     * re-dividir no lugar, porque a timeline inteira aponta para os
     * elementos antigos.
     *
     * Só largura: no celular, rolar faz a barra do navegador aparecer e
     * sumir, e isso dispara `resize` de ALTURA o tempo todo. Remontar ali
     * derrubaria o pin no meio da leitura.
     */
    let largura = window.innerWidth
    let espera = 0
    const aoRedimensionar = () => {
      if (window.innerWidth === largura) return
      largura = window.innerWidth
      window.clearTimeout(espera)
      espera = window.setTimeout(() => {
        registrarTimeline(null)
        tl?.destruir()
        tl = null
        id = requestAnimationFrame(montar)
      }, 220)
    }
    window.addEventListener('resize', aoRedimensionar)

    return () => {
      cancelAnimationFrame(id)
      window.clearTimeout(espera)
      window.removeEventListener('resize', aoRedimensionar)
      registrarTimeline(null)
      tl?.destruir()
    }
  }, [])

  return (
    <div
      ref={raiz}
      data-ato
      className="relative h-dvh overflow-hidden [&>[data-beat]]:absolute [&>[data-beat]]:inset-0 motion-reduce:h-auto motion-reduce:overflow-visible motion-reduce:[&>[data-beat]]:static"
    >
      {children}
    </div>
  )
}
