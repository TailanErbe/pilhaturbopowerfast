'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from '@/lib/motion'
import { registrarLenis } from '@/lib/lenis'

/**
 * Scroll suave.
 *
 * A referência usa `smooth-scrollbar`, que sequestra o scroll nativo
 * (body com overflow:hidden e um wrapper transladado). Optamos por Lenis,
 * que apenas INTERPOLA o scroll nativo — por isso âncoras, teclado,
 * barra de rolagem do SO e ScrollTrigger seguem funcionando sem gambiarra.
 * Ver REGRAS.md §4.1.
 */
export function SmoothScroll() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    if (prefersReducedMotion()) {
      // Sem interpolação: o scroll nativo já é o comportamento correto.
      return
    }

    const lenis = new Lenis({
      duration: 1.15,
      // Curva de desaceleração — dá o "peso" característico da referência
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Em toque o scroll nativo é melhor: mais previsível e não briga
      // com o gesto de refresh do navegador.
      syncTouch: false,
    })

    lenis.on('scroll', ScrollTrigger.update)
    registrarLenis(lenis)

    const raf = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(raf)
      registrarLenis(null)
      lenis.destroy()
    }
  }, [])

  return null
}
