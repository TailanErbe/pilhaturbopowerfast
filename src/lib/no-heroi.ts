'use client'

import { useEffect, useState } from 'react'
import { obterTimeline } from '@/motion/registro'
import { prefersReducedMotion } from '@/lib/motion'
import { SAIDA_DO_HEROI } from '@/motion/labels'
import { sceneState } from '@/lib/scene-state'

/**
 * Quanto o herói ainda ocupa a tela, de 1 a 0.
 *
 * Duas peças precisam saber disso e precisam concordar: a barra do herói,
 * que só existe na primeira tela, e a pílula de navegação, que assume dali
 * em diante. Se cada uma decidisse por conta, haveria um trecho com as
 * duas visíveis (ou nenhuma), que é o tipo de defeito que só aparece
 * rolando devagar.
 *
 * Devolve uma FRAÇÃO, não um booleano, para as duas poderem se cruzar em
 * opacidade em vez de piscar.
 */

/**
 * A troca acontece bem antes do fim do beat, longe do texto e do produto.
 *
 * Os números moram em motion/labels: o mesmo instante manda no halo, na
 * camada do canvas e no momento em que o produto larga a pose frontal.
 */
const TROCA = SAIDA_DO_HEROI

const suave = (t: number) => t * t * (3 - 2 * t)

/**
 * Quanto o ATO ainda ocupa a tela, de 1 a 0.
 *
 * O ato termina, mas a pílula de navegação não sabia disso: ela é `fixed` e
 * continuava por cima do impacto, da compra e do rodapé, com o rótulo
 * congelado em "O KIT". Ali ela não tem destino nenhum — os painéis ficaram
 * para trás — e ainda cobria parte do número "2.250" da seção de impacto e
 * flutuava sob a linha de copyright.
 *
 * O sinal é o mesmo que apaga a cena: `saidaDoAto`, escrito pelo
 * ScrollTrigger que roda meia tela depois do fim do pin. Assim a navegação
 * do ato e o produto do ato saem juntos, que é o que eles são.
 *
 * Lê de `sceneState` e não da timeline porque este valor não é o progresso:
 * é um segundo gatilho, e só ele sabe onde o pin acabou.
 */
export function useNoAto(): number {
  const [presenca, setPresenca] = useState(1)

  useEffect(() => {
    let agendado = 0

    const medir = () => {
      agendado = 0
      const v = 1 - Math.max(0, Math.min(1, sceneState.saidaDoAto))
      setPresenca((antes) => (Math.abs(antes - v) < 0.01 ? antes : v))
    }

    const agendar = () => {
      if (!agendado) agendado = requestAnimationFrame(medir)
    }

    medir()
    window.addEventListener('scroll', agendar, { passive: true })
    return () => {
      cancelAnimationFrame(agendado)
      window.removeEventListener('scroll', agendar)
    }
  }, [])

  return presenca
}

export function useNoHeroi(): number {
  /**
   * Começa em 1 e não em 0.
   *
   * A página abre no herói, e a barra é conteúdo da primeira tela. Se o
   * valor inicial fosse 0, a barra entraria com um fade logo depois da
   * hidratação — um movimento que ninguém pediu, no exato momento em que
   * a página deveria estar parada e legível.
   */
  const [presenca, setPresenca] = useState(1)

  useEffect(() => {
    let agendado = 0

    const medir = () => {
      agendado = 0
      const tl = obterTimeline()

      /**
       * "Sem timeline" tem DUAS causas, e confundi-las custou caro.
       *
       * Uma é movimento reduzido, em que ela nunca é montada: ali o herói
       * é uma seção comum, a barra não faz sentido e quem navega é a
       * pílula. A outra é o instante entre a hidratação e o registro da
       * timeline, que acontece em toda carga normal.
       *
       * Tratando as duas igual, a barra nascia escondida e a pílula
       * aparecia por cima dela no herói — exatamente o contrário. Quem
       * separa é a consulta à mídia, não a ausência do objeto.
       */
      if (!tl) {
        if (prefersReducedMotion()) return setPresenca(0)
        // Ainda registrando: mantém o valor inicial e tenta no quadro seguinte
        agendar()
        return
      }

      const p = tl.progresso()
      const t = (p - TROCA.comeca) / (TROCA.termina - TROCA.comeca)
      const v = 1 - suave(Math.max(0, Math.min(1, t)))
      setPresenca((antes) => (Math.abs(antes - v) < 0.01 ? antes : v))
    }

    const agendar = () => {
      if (!agendado) agendado = requestAnimationFrame(medir)
    }

    medir()
    window.addEventListener('scroll', agendar, { passive: true })
    return () => {
      cancelAnimationFrame(agendado)
      window.removeEventListener('scroll', agendar)
    }
  }, [])

  return presenca
}
