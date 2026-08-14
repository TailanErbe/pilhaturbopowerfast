'use client'

import { useEffect } from 'react'
import { sceneState } from '@/lib/scene-state'

/**
 * Mede, beat a beat, onde o texto começa no retrato.
 *
 * No celular a cena 3D fica NA FRENTE do conteúdo e não existe meio-termo
 * (ver SceneMount): quem separa os dois é a diagramação. O texto encosta na
 * base (`base-do-retrato`) e o produto ocupa o que sobra em cima.
 *
 * O quanto sobra muda a cada beat. O herói tem duas linhas de título e
 * deixa meia tela livre; o painel do produto tem título, régua, destaque,
 * descrição e duas fichas, e deixa um terço. Um teto único, calibrado pelo
 * pior caso, mantinha a pilha colada no cabeçalho a viagem inteira, com um
 * vazio enorme embaixo dela justamente nos beats de texto curto.
 *
 * Medindo cada beat, o produto desce onde há espaço. A medida é relativa à
 * SEÇÃO do beat, e não ao viewport, pelo mesmo motivo do FaixaDaCena: fora
 * do trecho pinado a seção está em qualquer altura da página, e a fração
 * dentro dela é que vale sempre. Descontar assim também neutraliza o
 * deslocamento inicial que a timeline aplica nos beats inativos.
 */
export function TetosDoRetrato() {
  useEffect(() => {
    const medir = () => {
      const beats = [...document.querySelectorAll('[data-beat]')]
      if (!beats.length) return

      sceneState.tetosDoRetrato = beats.map((beat) => {
        const secao = beat.querySelector('section')
        if (!secao) return 1
        const caixa = secao.getBoundingClientRect()
        if (caixa.height <= 0) return 1

        let topo = Infinity
        secao
          .querySelectorAll('h1, h2, h3, p, li, a, button, summary')
          .forEach((el) => {
            if (!el.textContent?.trim()) return
            // Conteúdo de <details> fechado ainda reporta caixa no Chrome
            const det = el.closest('details')
            if (det && !det.open && el.tagName !== 'SUMMARY') return
            const r = el.getBoundingClientRect()
            if (r.width < 2 || r.height < 2) return
            topo = Math.min(topo, r.top)
          })

        if (!Number.isFinite(topo)) return 1
        return (topo - caixa.top) / caixa.height
      })
    }

    medir()

    /**
     * O observer pega o refluxo do texto (mudança de largura, fonte que
     * termina de carregar); o resize da janela pega a mudança do
     * denominador, que o observer não vê.
     */
    const obs = new ResizeObserver(medir)
    document.querySelectorAll('[data-beat] section').forEach((s) => obs.observe(s))
    window.addEventListener('resize', medir, { passive: true })
    // As webfonts mudam a altura de todo bloco de título quando trocam
    document.fonts?.ready.then(medir)

    return () => {
      obs.disconnect()
      window.removeEventListener('resize', medir)
      sceneState.tetosDoRetrato = null
    }
  }, [])

  return null
}
