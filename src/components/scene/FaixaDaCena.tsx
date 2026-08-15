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

    /**
     * E o painel agora ROLA POR DENTRO, no retrato.
     *
     * Isso é novo: os painéis ganharam `overflow-y: auto` porque um acordeão
     * aberto não cabe na altura fixa da seção e o conteúdo se perdia. Só que
     * o canvas é `fixed` e não rola com nada — então, sem isto, arrastar a
     * ficha para ler movia o texto e deixava as oito pilhas paradas, cobrindo
     * o parágrafo que passava por baixo delas.
     *
     * Remedindo, o vão se move junto com o conteúdo e a cena o segue: as
     * pilhas sobem com o texto, como se fossem parte dele. É de graça porque
     * a medida já era relativa ao PAINEL — só faltava alguém avisar que ela
     * mudou.
     *
     * Num quadro por vez: `getBoundingClientRect` no ouvinte de scroll é
     * leitura de geometria no meio do gesto, que é exatamente o que trava
     * rolagem.
     */
    let agendado = 0
    const aoRolar = () => {
      if (agendado) return
      agendado = requestAnimationFrame(() => {
        agendado = 0
        medir()
      })
    }
    painel.addEventListener('scroll', aoRolar, { passive: true })

    return () => {
      obs.disconnect()
      window.removeEventListener('resize', medir)
      painel.removeEventListener('scroll', aoRolar)
      cancelAnimationFrame(agendado)
      sceneState.faixaDoKit = null
    }
  }, [])

  return (
    <div ref={vao} className={className}>
      {children}
    </div>
  )
}
