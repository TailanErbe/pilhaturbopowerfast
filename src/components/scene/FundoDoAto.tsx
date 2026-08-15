'use client'

import { useEffect, useRef } from 'react'
import { BEATS, beatPorId, CRUZAMENTO } from '@/motion/labels'
import { obterTimeline } from '@/motion/registro'

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
 * Enquanto o herói manda, o canvas fica ACIMA do ato.
 *
 * A troca de camada acontece no FIM do beat do herói, e não no meio da
 * saída dele.
 *
 * Ela estava em `SAIDA_DO_HEROI.meio`, ou seja 0,08. Só que o título do
 * herói não some ali: ele apaga entre 0,105 e 0,15, junto com o beat. Com
 * a troca em 0,08, havia sete centésimos de progresso em que o canvas já
 * estava embaixo e o texto ainda estava na tela — e o resultado era o
 * "TURBO POWERFAST" desenhado POR CIMA da tampa da pilha, que é o oposto
 * da regra da casa: no herói o produto é o assunto e não fica sob nada.
 *
 * 0,15 é a única janela limpa que existe. A saída do herói roda em
 * [0,105 ; 0,15] e a entrada do USB-C em [0,15 ; 0,195], então exatamente
 * ali os dois textos estão em opacidade zero: dá para trocar a ordem de
 * pintura sem que haja um pixel de texto para trocar de lado.
 */
const TROCA_DE_CAMADA = beatPorId('hero').fim

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
    let ultimoZ = ''
    /** O canvas entra por import dinâmico: pode não existir ainda */
    let cena: HTMLElement | null = null

    const aplicar = () => {
      agendado = 0
      const tl = obterTimeline()
      cena ??= document.querySelector<HTMLElement>('[data-cena]')
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
       * O z do canvas, dirigido pelo progresso.
       *
       * Escrito como string e comparado antes: mudar z-index a cada
       * quadro forçaria o compositor a refazer as camadas sem necessidade.
       */
      const z = p < TROCA_DE_CAMADA ? '3' : '1'
      if (z !== ultimoZ && cena) {
        ultimoZ = z
        cena.style.zIndex = z
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
      if (cena) cena.style.zIndex = ''
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
