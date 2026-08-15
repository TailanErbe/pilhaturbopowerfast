'use client'

import { useEffect, useRef } from 'react'
import { BEATS, CRUZAMENTO } from '@/motion/labels'
import { obterTimeline } from '@/motion/registro'
import { luzEm } from '@/lib/luz'
import { sceneState } from '@/lib/scene-state'

/**
 * O fundo do ato, numa camada só, abaixo do canvas 3D.
 *
 * ------------------------------------------------------------------
 * POR QUE ISTO EXISTE
 * ------------------------------------------------------------------
 *
 * O ato pinado ganha `position: fixed` e um `transform` do GSAP, e cada
 * um cria contexto de empilhamento. Visto de fora, o ato inteiro é UM
 * bloco, e o canvas — que é irmão dele — fica ou na frente de tudo ou
 * atrás de tudo. Não existe "atrás do texto e na frente do fundo".
 *
 * Com o fundo fora do ato, existe:
 *
 *   z-0   esta camada
 *   z-1   canvas 3D
 *   z-2   o ato, com todo o texto
 *
 * O produto passa a viver ENTRE o fundo e o texto, que é o arranjo da
 * referência e o que a página tentava fazer desde o começo. Some com ele
 * a classe de defeito que vinha sendo caçada beat a beat: texto atrás do
 * objeto.
 *
 * ------------------------------------------------------------------
 * A EXCEÇÃO DO HERÓI
 * ------------------------------------------------------------------
 *
 * Na primeira tela o produto é o assunto e não pode ficar sob nada. Ali o
 * canvas sobe para cima do ato. A troca acontece na passagem para o
 * segundo beat, onde o produto já está girando para oferecer a porta e
 * não há texto perto dele.
 *
 * ------------------------------------------------------------------
 * A COR
 * ------------------------------------------------------------------
 *
 * Uma cor por beat, interpolada na virada. Hoje os fundos vivem dentro
 * dos beats e cruzam junto com eles — só que as janelas de saída e de
 * entrada são ADJACENTES, não concorrentes: a saída roda em
 * [fim − CRUZAMENTO, fim] e a entrada em [início, início + CRUZAMENTO],
 * com fim de um igual ao início do outro. No instante da fronteira os
 * dois beats estão em opacidade 0 e o que aparece é o preto do body.
 * Existe, hoje, um piscar preto em cada uma das seis viradas — e o mais
 * visível é na entrada do painel branco do kit.
 *
 * Interpolando a cor numa camada só, o piscar some. E não há risco de
 * texto ilegível no meio da transição justamente porque o texto continua
 * apagando: ele está invisível exatamente enquanto a cor caminha.
 */

/** Uma cor por beat, na ordem de BEATS. Ver THEMES em ProductPanel */
const CORES: [number, number, number][] = [
  [0, 0, 0], // hero        — bg-surface-000
  [0, 0, 0], // usbc        — bg-surface-000
  [20, 20, 20], // cycles   — bg-surface-100
  [20, 20, 20], // chip     — bg-surface-100
  [0, 0, 0], // produto-01  — bg-surface-000 (tema dark)
  [255, 164, 0], // produto-02 — bg-brand-orange (tema orange)
  [255, 255, 255], // produto-03 — bg-brand-white (tema light)
]

/**
 * A TROCA DE CAMADA DO CANVAS SAIU DAQUI.
 *
 * Ela mora no `<SaidaDoAto />`, dentro de Scene.tsx, e a razão é o RELÓGIO.
 * Este componente lê `tl.progresso()`, que é o progresso cru do
 * ScrollTrigger; a cena lê `sceneState.progress`, escrubado com `scrub: 1`.
 * Os dois andam separados por alguns centésimos em toda rolagem rápida, e
 * com a brasa acesa nos dois lados da fronteira isso aparecia como o título
 * trocando de cor de um quadro para o outro.
 *
 * O que continua aqui é a cor de fundo e a parede, que são do mesmo relógio
 * cru e do mesmo cruzamento — e portanto continuam batendo entre si.
 */

const suave = (t: number) => t * t * (3 - 2 * t)
const entre = (t: number) => Math.max(0, Math.min(1, t))

/**
 * A cor no progresso dado.
 *
 * A transição é centrada na FRONTEIRA entre beats e usa a mesma largura
 * do cruzamento dos textos, para os dois andarem juntos.
 */
function corEm(p: number): string {
  let i = BEATS.findIndex((b) => p < b.fim)
  if (i < 0) i = BEATS.length - 1

  const a = CORES[i]
  const b = CORES[Math.min(i + 1, CORES.length - 1)]
  const fim = BEATS[i].fim
  const t = suave(entre((p - (fim - CRUZAMENTO)) / (2 * CRUZAMENTO)))

  const c = a.map((v, k) => Math.round(v + (b[k] - v) * t))
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

export function FundoDoAto() {
  const camada = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let agendado = 0
    let ultimaCor = ''
    let ultimaClara = -1
    let ultimaEscura = -1
    /** As paredes entram por import dinâmico: podem não existir ainda */
    let clara: HTMLElement | null = null
    let escura: HTMLElement | null = null

    const aplicar = () => {
      agendado = 0
      const tl = obterTimeline()
      /**
       * Sem timeline não há o que dirigir: com movimento reduzido o fundo
       * volta a ser o de cada seção (ver `noAto` em SectionBg), e no
       * intervalo entre a hidratação e o registro basta tentar de novo.
       */
      if (!tl) {
        agendar()
        return
      }

      const p = tl.progresso()

      const cor = corEm(p)
      if (cor !== ultimaCor && camada.current) {
        ultimaCor = cor
        camada.current.style.backgroundColor = cor
      }

      /**
       * A PAREDE do estúdio, acesa por beat.
       *
       * Ela mora no container do canvas e não aqui, mas quem sabe em que
       * beat estamos é este componente — e a parede tem de mudar no MESMO
       * instante que a cor de fundo, senão a costura aparece. Um dono só
       * para as duas coisas.
       *
       * Multiplicado por `(1 - saidaDoAto)`: passado o pin a cena inteira
       * sai de quadro, e uma parede acesa por trás do impacto seria luz de
       * um cenário que já não existe.
       */
      clara ??= document.querySelector<HTMLElement>('.parede-clara')
      escura ??= document.querySelector<HTMLElement>('.parede-escura')
      if (clara && escura) {
        const v = luzEm(p)
        const fora = 1 - Math.max(0, Math.min(1, sceneState.saidaDoAto))
        const c = Math.round(v.claro * fora * 1000) / 1000
        const e = Math.round(v.escuro * fora * 1000) / 1000
        const dx = `${v.paredeDx.toFixed(1)}vw`
        if (c !== ultimaClara) {
          ultimaClara = c
          clara.style.opacity = String(c)
          clara.style.setProperty('--parede-dx', dx)
        }
        if (e !== ultimaEscura) {
          ultimaEscura = e
          escura.style.opacity = String(e)
          escura.style.setProperty('--parede-dx', dx)
        }
      }

    }

    const agendar = () => {
      if (!agendado) agendado = requestAnimationFrame(aplicar)
    }

    aplicar()
    window.addEventListener('scroll', agendar, { passive: true })
    window.addEventListener('resize', agendar)

    return () => {
      cancelAnimationFrame(agendado)
      window.removeEventListener('scroll', agendar)
      window.removeEventListener('resize', agendar)
    }
  }, [])

  /**
   * `motion-reduce:hidden`: sem timeline ninguém pinta esta camada, e ela
   * ficaria preta por cima do fundo das seções — que naquele modo voltam
   * a pintar o próprio.
   */
  return (
    <div
      ref={camada}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 motion-reduce:hidden"
    />
  )
}
