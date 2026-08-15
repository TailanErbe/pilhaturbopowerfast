/**
 * A luz do ato, beat a beat.
 *
 * ------------------------------------------------------------------
 * POR QUE ISTO EXISTE, E O QUE ELE SUBSTITUI
 * ------------------------------------------------------------------
 *
 * A página teve, por três rodadas, um HALO de gradiente laranja atrás do
 * produto. Ele foi reprovado três vezes, e as três respostas foram mudar
 * números do mesmo gradiente: mais paradas, maior, mais opaco. O
 * levantamento fechou a questão com uma frase medida:
 *
 *   o halo cobria 90,5% da tela, o centro dele tinha luminância 0,281
 *   contra 0,070 da faixa especular mais forte do produto, e CEM POR CENTO
 *   da luz que tocava a pilha era branca e neutra. Nenhum dos quatro
 *   Lightformer declarava cor.
 *
 * Ou seja: havia uma fonte laranja do tamanho de meia tela depositando zero
 * fótons. Nenhum ajuste de desenho fecha essa frase, porque o que faltava
 * não era o gradiente, era a outra metade.
 *
 * ------------------------------------------------------------------
 * O QUE ESTAVA ERRADO NO CORPO, E NÃO ERA FALTA DE REALCE
 * ------------------------------------------------------------------
 *
 * A faixa especular ACERTA a foto: o pico renderizado ficava em 76 a 33% da
 * largura contra 68 a 28% na foto do produto. O que estava errado era a
 * FAIXA DINÂMICA, por um fator de catorze: o lado escuro parava em 16 a 22
 * de 255 onde a foto vai a 1. Razão de 4,8:1 contra 68:1.
 *
 * E o culpado foi identificado apagando uma fonte de cada vez: sem a fresta
 * direita o piso caía de 16 para 8; sem a faixa do topo, para 9; sem a
 * direcional, para 9. Somando, 78% do ângulo sólido aceso estava FORA do
 * horizonte especular e voltava só como preenchimento.
 *
 * O corpo não precisava de mais realce. Precisava que a luz PARASSE de
 * vazar no lado que deveria ser escuro. O fluxo total caiu 42%, e a queda
 * inteira aconteceu nas direções que não modelam nada.
 *
 * ------------------------------------------------------------------
 * A GEOMETRIA QUE ESCOLHE OS ÂNGULOS
 * ------------------------------------------------------------------
 *
 * Num cilindro vertical visto por lente longa, a reflexão de v=(0,0,1) é
 * r=(sen 2f, 0, cos 2f): ela nunca sai do plano horizontal. Só o que está
 * na LINHA DO HORIZONTE vira realce; tudo acima ou abaixo é preenchimento.
 *
 * Invertendo f=(1+sen(t/2))/2 para o pico de 28% medido na foto:
 *   t = 2·asin(2·0,28 − 1) = −52,2°
 *
 * É por isso que a chave mora nesse azimute, e é por isso que ela é uma
 * FITA: alta e estreita, para o realce ser um rasgo que corre o
 * comprimento inteiro do corpo.
 *
 * A contraluz mora em 180° pelo mesmo raciocínio: nas DUAS bordas da
 * silhueta a reflexão aponta para o mesmo ponto, exatamente atrás. Uma
 * fonte só rima os dois lados.
 */

import { BEATS, CRUZAMENTO } from '@/motion/labels'

/** Interpolação linear de cor em sRGB, componente a componente */
export type Cor = [number, number, number]

export type LuzDoBeat = {
  /** A contraluz retangular: o que descola a silhueta do fundo */
  parede: {
    y: number
    z: number
    largura: number
    altura: number
    cor: Cor
    intensidade: number
  }
  /** Multiplicador global do ambiente assado */
  ambiente: number
  /** Opacidade do ponto quente da parede de CSS */
  claro: number
  /** Opacidade da vinheta de CSS */
  escuro: number
  /** Deslocamento horizontal da parede, em vw */
  paredeDx: number
}

/**
 * Uma entrada por beat, na ordem de BEATS.
 *
 * A contraluz é MONTADA SEMPRE e nunca desmonta: `shadowMapEnabled` e a
 * contagem de luzes são parâmetros de PROGRAMA no three, então montar ou
 * tirar uma luz no meio da página recompila todos os shaders, no meio da
 * rolagem. O que muda por beat é posição, tamanho, cor e intensidade, que
 * são uniformes.
 */
const LUZES: LuzDoBeat[] = [
  /**
   * Herói. A contraluz é forte porque o fundo é PRETO.
   *
   * Ela é a única coisa que separa um corpo quase preto de uma página
   * quase preta, e o fio que ela desenha na borda foi medido: 156 de 255
   * em 2,0, 174 em 2,4. O alvo é 170, que é onde a borda para de precisar
   * de boa vontade do monitor para existir.
   */
  {
    parede: { y: 0, z: -5.5, largura: 7, altura: 9, cor: [255, 233, 210], intensidade: 2.4 },
    ambiente: 1.0,
    claro: 0.085,
    escuro: 0,
    paredeDx: 0,
  },
  /* USB-C */
  {
    parede: { y: 0, z: -5.5, largura: 7, altura: 9, cor: [255, 233, 210], intensidade: 2.1 },
    ambiente: 1.0,
    claro: 0.07,
    escuro: 0,
    paredeDx: 0,
  },
  /**
   * Recargas. A contraluz ESQUENTA e cresce enquanto o contador sobe.
   *
   * É ela que substitui o halo de carga: em vez de um oval laranja pintado
   * atrás do produto, a parede atrás dele fica mais quente e mais forte, e
   * o que se vê na pilha é luz de verdade batendo nela. Ver `carga` no
   * componente, que interpola entre este valor e o de destino.
   */
  {
    parede: { y: 0, z: -5.5, largura: 7, altura: 9.5, cor: [255, 192, 138], intensidade: 1.6 },
    ambiente: 1.0,
    claro: 0.055,
    escuro: 0,
    paredeDx: 7,
  },
  /* chip */
  {
    parede: { y: 0, z: -5.5, largura: 7, altura: 9, cor: [255, 233, 210], intensidade: 1.6 },
    ambiente: 1.0,
    claro: 0.055,
    escuro: 0,
    paredeDx: 7,
  },
  /* painel 01, fundo preto: mesma conta do herói */
  {
    parede: { y: 0, z: -5.5, largura: 7, altura: 9, cor: [255, 233, 210], intensidade: 2.4 },
    ambiente: 1.0,
    claro: 0.085,
    escuro: 0,
    paredeDx: 0,
  },
  /**
   * Painel 02, fundo LARANJA CHAPADO.
   *
   * Aqui clarear não resolve: sobre #FFA400 o teto matemático de contraste
   * por clareamento é 1,99:1. A separação tem de vir de ESCURECER, então a
   * contraluz cai para 0,50 e a vinheta entra. O corpo escuro precisa
   * chegar a 14/255 ou menos para dar 9,5:1; hoje ele está em 1,09:1.
   */
  {
    parede: { y: -0.6, z: -8, largura: 13, altura: 11, cor: [255, 164, 0], intensidade: 0.5 },
    ambiente: 0.92,
    claro: 0,
    escuro: 0.2,
    paredeDx: 0,
  },
  /**
   * Painel 03, fundo BRANCO, e oito corpos lado a lado.
   *
   * A contraluz recua para z=-14 e alarga: parada em -5,5 os oito corpos a
   * viam em azimutes de 135 a 166 graus, um leque de 31 graus todo para um
   * lado. Recuada, o leque cai para 17 e fica simétrico em torno de 180.
   */
  {
    parede: { y: -1.4, z: -14, largura: 18, altura: 13, cor: [255, 255, 255], intensidade: 1.1 },
    ambiente: 1.35,
    claro: 0,
    escuro: 0.24,
    paredeDx: -24.5,
  },
]

const suave = (t: number) => t * t * (3 - 2 * t)
const entre = (t: number) => Math.max(0, Math.min(1, t))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * A luz no progresso dado, cruzando na fronteira entre beats.
 *
 * A passagem é centrada na FRONTEIRA e usa a mesma largura do cruzamento
 * dos textos e do fundo, para tudo andar junto. É o mesmo cálculo de
 * `corEm` no FundoDoAto, e de propósito: luz e fundo mudam no mesmo
 * instante ou a costura aparece.
 */
export function luzEm(progress: number): LuzDoBeat {
  let i = BEATS.findIndex((b) => progress < b.fim)
  if (i < 0) i = BEATS.length - 1

  const a = LUZES[i]
  const b = LUZES[Math.min(i + 1, LUZES.length - 1)]
  const fim = BEATS[i].fim
  const t = suave(entre((progress - (fim - CRUZAMENTO)) / (2 * CRUZAMENTO)))

  return {
    parede: {
      y: lerp(a.parede.y, b.parede.y, t),
      z: lerp(a.parede.z, b.parede.z, t),
      largura: lerp(a.parede.largura, b.parede.largura, t),
      altura: lerp(a.parede.altura, b.parede.altura, t),
      cor: [
        lerp(a.parede.cor[0], b.parede.cor[0], t),
        lerp(a.parede.cor[1], b.parede.cor[1], t),
        lerp(a.parede.cor[2], b.parede.cor[2], t),
      ],
      intensidade: lerp(a.parede.intensidade, b.parede.intensidade, t),
    },
    ambiente: lerp(a.ambiente, b.ambiente, t),
    claro: lerp(a.claro, b.claro, t),
    escuro: lerp(a.escuro, b.escuro, t),
    paredeDx: lerp(a.paredeDx, b.paredeDx, t),
  }
}

/**
 * Para onde a contraluz das recargas caminha quando o contador enche.
 *
 * Não é um beat próprio: é o mesmo beat com a parede esquentando de
 * #FFC08A para o laranja da marca e subindo de 1,6 para 3,0. O que
 * substitui o halo de carga é ISTO, e a diferença é que agora existem
 * fótons: o produto fica mais quente porque está recebendo luz quente, não
 * porque alguém pintou um oval atrás dele.
 */
export const CARGA_CHEIA = { cor: [255, 164, 0] as Cor, intensidade: 3.0 }
