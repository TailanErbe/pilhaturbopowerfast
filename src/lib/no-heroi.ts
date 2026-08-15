'use client'

import { useEffect, useState } from 'react'
import { obterTimeline } from '@/motion/registro'
import { prefersReducedMotion } from '@/lib/motion'

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

/** A troca acontece bem antes do fim do beat, longe do texto e do produto */
const TROCA = { comeca: 0.055, termina: 0.105 }

const suave = (t: number) => t * t * (3 - 2 * t)

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
