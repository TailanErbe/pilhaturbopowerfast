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
/** Beat sem texto medível: o produto pode usar a tela toda */
const CHEIA = { de: 0, ate: 1 }

export function TetosDoRetrato() {
  useEffect(() => {
    const medir = () => {
      const beats = [...document.querySelectorAll('[data-beat]')]
      if (!beats.length) return

      sceneState.faixasDoRetrato = beats.map((beat) => {
        const secao = beat.querySelector('section')
        if (!secao) return CHEIA
        const caixa = secao.getBoundingClientRect()
        if (caixa.height <= 0) return CHEIA

        /**
         * O MAIOR VÃO entre os blocos de texto, e não "acima" nem "abaixo".
         *
         * Duas versões anteriores erraram por presumir de que lado o texto
         * mora. A primeira publicava um teto, presumindo texto sempre
         * ABAIXO — e o herói novo pôs o nome do produto em cima. A segunda
         * escolhia um lado pelo centro do bloco — e o herói tem texto nas
         * DUAS pontas: título no topo, disponibilidade e chamada de
         * rolagem no pé. O centro caía no meio da tela, o lado escolhido
         * era o errado, e a pilha voltava a cobrir o título.
         *
         * Procurando o maior vão, não há o que presumir: o produto ocupa
         * o buraco, esteja ele onde estiver. Um beat com texto só embaixo
         * dá o vão em cima; só em cima, o vão embaixo; nas duas pontas, o
         * vão do meio. É o mesmo cálculo para os três casos.
         */
        const blocos: [number, number][] = []
        secao
          .querySelectorAll('h1, h2, h3, p, li, a, button, summary')
          .forEach((el) => {
            if (!el.textContent?.trim()) return
            // Conteúdo de <details> fechado ainda reporta caixa no Chrome
            const det = el.closest('details')
            if (det && !det.open && el.tagName !== 'SUMMARY') return
            const r = el.getBoundingClientRect()
            if (r.width < 2 || r.height < 2) return
            blocos.push([
              (r.top - caixa.top) / caixa.height,
              (r.bottom - caixa.top) / caixa.height,
            ])
          })

        if (!blocos.length) return CHEIA

        blocos.sort((a, b) => a[0] - b[0])
        /**
         * Começa VAZIA, não cheia.
         *
         * Iniciando em `CHEIA` (altura 1), nenhum vão jamais a superava e
         * todo beat devolvia a tela inteira como livre — o produto passava
         * a ignorar o texto por completo. O acumulador de máximo precisa
         * começar no mínimo, não no máximo.
         */
        let melhor = { de: 0, ate: 0 }
        let fim = 0
        for (const [de, ate] of blocos) {
          if (de - fim > melhor.ate - melhor.de) melhor = { de: fim, ate: de }
          fim = Math.max(fim, ate)
        }
        if (1 - fim > melhor.ate - melhor.de) melhor = { de: fim, ate: 1 }
        return melhor
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
      sceneState.faixasDoRetrato = null
    }
  }, [])

  return null
}
