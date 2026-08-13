'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { sceneState } from '@/lib/scene-state'

/**
 * A faixa que o painel reserva para a cena 3D.
 *
 * O kit é a composição mais larga e mais alta da página, e é a única que
 * disputa espaço vertical com o texto: título e régua em cima, descrição e
 * fichas embaixo. Ajustar a escala das oito pilhas por um número fixo de
 * viewport não resolve — o cabeçalho ocupa uma FRAÇÃO diferente conforme a
 * janela muda de altura, e o que sobra folgado em 1080 encosta na régua em
 * 700.
 *
 * Então o próprio vão se mede e publica no estado da cena. A cena passa a
 * caber no espaço real que o layout deixou, em qualquer proporção de tela,
 * inclusive durante o redimensionamento. É a §6.4c resolvida na origem, em
 * vez de por tentativa.
 */
export function FaixaDaCena({
  className,
  children,
}: {
  className?: string
  children?: ReactNode
}) {
  const vao = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = vao.current
    if (!el) return

    /**
     * A medida é relativa ao PAINEL, não ao viewport.
     *
     * Contra o viewport, o retângulo dependeria da rolagem: fora do trecho
     * pinado o painel está em qualquer altura da página, e o ResizeObserver
     * não dispara com scroll, então a cena herdaria uma medida de quando o
     * painel estava noutro lugar. Já dentro do pin o painel cobre a tela
     * inteira, e a fração dentro dele É a fração da tela. Assim o número
     * vale sempre, medido a qualquer momento.
     */
    const painel = el.closest('section')
    if (!painel) return

    const medir = () => {
      const r = el.getBoundingClientRect()
      const p = painel.getBoundingClientRect()
      if (p.width <= 0 || p.height <= 0 || r.width <= 0 || r.height <= 0) return
      sceneState.faixaDoKit = {
        esquerda: (r.left - p.left) / p.width,
        direita: (r.right - p.left) / p.width,
        topo: (r.top - p.top) / p.height,
        base: (r.bottom - p.top) / p.height,
      }
    }

    medir()

    // ResizeObserver pega a mudança de altura do vão (que é flex-1, então
    // muda quando o texto reflui); o resize da janela pega a mudança do
    // denominador, que o observer não vê.
    const obs = new ResizeObserver(medir)
    obs.observe(el)
    obs.observe(painel)
    window.addEventListener('resize', medir, { passive: true })

    return () => {
      obs.disconnect()
      window.removeEventListener('resize', medir)
      sceneState.faixaDoKit = null
    }
  }, [])

  return (
    <div ref={vao} className={className}>
      {children}
    </div>
  )
}
