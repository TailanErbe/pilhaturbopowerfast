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

import { BEATS, CRUZAMENTO, janelaDoContador } from '@/motion/labels'

/** Interpolação linear de cor em sRGB, componente a componente */
export type Cor = [number, number, number]

/**
 * Luminância LINEAR de um triplete 0..255.
 *
 * Vale para a CONTRALUZ e só para ela. `Color.setRGB` usa o espaço de
 * TRABALHO por padrão, ou seja o triplete entra como linear e não passa por
 * decodificação nenhuma. Para hex, ver `gelDeAmbiente`.
 */
export const lumLinear = (c: Cor) =>
  (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255

/**
 * Uma entrada declara FLUXO, não intensidade.
 *
 * Esta é a regra que torna o tom quente seguro: **cor troca, fluxo não.**
 * Trocar a cor de uma fonte sem dividir pela luminância nova é a forma
 * silenciosa de mexer em toda medida do produto — só por gelatinar a
 * contraluz, o fio de borda cairia de 174 para 151 de 255 sem ninguém pedir.
 *
 * Declarando o FLUXO, que é a grandeza que foi medida, a intensidade sai da
 * divisão e a próxima troca de cor não tem como errar.
 */
const gel = (cor: Cor, fluxo: number) => ({ cor, intensidade: fluxo / lumLinear(cor) })

const sRGBinv = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)

/**
 * O mesmo, para os `Lightformer`, que recebem HEX.
 *
 * E hex é outro caminho: `Color.setStyle` DECODIFICA de sRGB. Aplicar a
 * fórmula linear num hex dá 0,9627 onde o valor real é 0,9179 — 5% de erro
 * silencioso em cima da fonte que responde por 63% do fluxo da cena.
 */
export function gelDeAmbiente(hex: string, fluxo: number) {
  const n = parseInt(hex.slice(1), 16)
  const r = sRGBinv(((n >> 16) & 255) / 255)
  const g = sRGBinv(((n >> 8) & 255) / 255)
  const b = sRGBinv((n & 255) / 255)
  return { color: hex, intensity: fluxo / (0.2126 * r + 0.7152 * g + 0.0722 * b) }
}

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
  /**
   * Pico da BRASA — a fonte âmbar visível atrás do produto —, em luminância
   * LINEAR escrita no framebuffer.
   *
   * Grandeza de SAÍDA, e não radiância de cena: a brasa não passa por tone
   * mapping. O ACES esmaga o pé da curva por 5× (linear 0,006 sairia em
   * 3,5/255 em vez de 17,9/255) e a saia inteira simplesmente não existiria.
   *
   * TETO 0,12. Acima disso o vermelho satura antes do verde, o núcleo vira
   * amarelo chapado, e o contraste do título precisa ser refeito do zero.
   */
  brasaPico: number
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
   *
   * A COR ESQUENTOU e a intensidade subiu junto — porque o fluxo é o mesmo.
   * 2,4 × L[255,233,210] = 2,2213; para manter esse fluxo em [255,190,120],
   * cuja luminância é 0,77947, a intensidade tem de ir a 2,850. Sem essa
   * divisão, esquentar a luz teria escurecido o fio em 13% em silêncio.
   *
   * `claro` cai de 0,085 para 0,045: quem conta a história do calor agora é
   * a brasa, que entrega nove vezes isso na cor certa. Duas fontes contando
   * a mesma coisa, e a de CSS era quase branca.
   */
  {
    parede: { y: 0, z: -5.5, largura: 7, altura: 9, ...gel([255, 190, 120], 2.2213) },
    ambiente: 1.0,
    claro: 0.045,
    escuro: 0,
    paredeDx: 0,
    brasaPico: 0.05,
  },
  /* USB-C */
  {
    parede: { y: 0, z: -5.5, largura: 7, altura: 9, ...gel([255, 190, 120], 1.9437) },
    ambiente: 1.0,
    claro: 0.04,
    escuro: 0,
    paredeDx: 0,
    brasaPico: 0.04,
  },
  /**
   * Recargas. A contraluz ESQUENTA MAIS AINDA enquanto o contador sobe.
   *
   * É ela que substitui o halo de carga: em vez de um oval laranja pintado
   * atrás do produto, a parede atrás dele fica mais quente e mais forte, e
   * o que se vê na pilha é luz de verdade batendo nela. Ver `misturaDaCarga`,
   * que interpola entre este valor e `CARGA_CHEIA`.
   *
   * A altura era 9,5 aqui, contra 9 nos vizinhos. Ficou 9: era o único beat
   * fora do padrão, e o meio ponto não aparecia em medida nenhuma.
   */
  {
    parede: { y: 0, z: -5.5, largura: 7, altura: 9, ...gel([255, 190, 120], 1.2643) },
    ambiente: 1.0,
    claro: 0.032,
    escuro: 0,
    paredeDx: 7,
    brasaPico: 0.052,
  },
  /* chip */
  {
    parede: { y: 0, z: -5.5, largura: 7, altura: 9, ...gel([255, 190, 120], 1.4809) },
    ambiente: 1.0,
    claro: 0.032,
    escuro: 0,
    paredeDx: 7,
    brasaPico: 0.04,
  },
  /* painel 01, fundo preto: mesma conta do herói */
  {
    parede: { y: 0, z: -5.5, largura: 7, altura: 9, ...gel([255, 190, 120], 2.2213) },
    ambiente: 1.0,
    claro: 0.045,
    escuro: 0,
    paredeDx: 0,
    brasaPico: 0.045,
  },
  /**
   * Painel 02, fundo LARANJA CHAPADO.
   *
   * Aqui clarear não resolve: sobre #FFA400 o teto matemático de contraste
   * por clareamento é 1,99:1. A separação tem de vir de ESCURECER, então a
   * contraluz cai para 0,50 e a vinheta entra. O corpo escuro precisa
   * chegar a 14/255 ou menos para dar 9,5:1; hoje ele está em 1,09:1.
   */
  /**
   * A contraluz daqui NÃO é gelatinada: ela já é o laranja da marca, e é a
   * única da tabela cuja cor foi escolhida pelo painel e não pelo tom da
   * casa. E `brasaPico` é ZERO — somar âmbar sobre `#FFA400` leva o painel a
   * `#FFCF00`, que é outra cor de marca. Aqui o calor vem do gel do
   * Environment, que é global, e mais nada.
   */
  {
    parede: { y: -0.6, z: -8, largura: 13, altura: 11, ...gel([255, 164, 0], 0.3363) },
    ambiente: 0.92,
    claro: 0,
    escuro: 0.2,
    paredeDx: 0,
    brasaPico: 0,
  },
  /**
   * Painel 03, fundo BRANCO, e oito corpos lado a lado.
   *
   * A contraluz recua para z=-14 e alarga: parada em -5,5 os oito corpos a
   * viam em azimutes de 135 a 166 graus, um leque de 31 graus todo para um
   * lado. Recuada, o leque cai para 17 e fica simétrico em torno de 180.
   */
  /**
   * A contraluz era BRANCA aqui, e é a que mais se vê: são oito corpos, e o
   * fio de borda de cada um vem dela. Esquentada para [255,214,166] — um
   * âmbar bem mais claro que o dos beats escuros, porque sobre painel branco
   * um âmbar cheio suja o fundo em vez de aquecer o objeto.
   *
   * `brasaPico` é ZERO pelo mesmo motivo do painel 02: somar âmbar sobre
   * branco dá rgb(255,227,184), um branco encardido, e ainda mexeria no
   * 15,2:1 do texto preto.
   */
  {
    parede: { y: -1.4, z: -14, largura: 18, altura: 13, ...gel([255, 214, 166], 1.1) },
    ambiente: 1.35,
    claro: 0,
    escuro: 0.24,
    paredeDx: -24.5,
    brasaPico: 0,
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
    /* Mesmo cruzamento de tudo o mais: a brasa acende e apaga junto com o
       beat, de graça, e some sozinha na fronteira 0,8 para o painel 02 */
    brasaPico: lerp(a.brasaPico, b.brasaPico, t),
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
export const CARGA_CHEIA = { ...gel([255, 164, 0], 2.0177), brasa: 0.07 }

/**
 * A janela do contador, com UM dono.
 *
 * A contraluz e a brasa precisam esquentar EXATAMENTE juntas — são a mesma
 * fonte, uma invisível e outra visível. Com a conta duplicada nos dois
 * componentes, bastava alguém ajustar um lado para a luz que bate na pilha
 * deixar de casar com a luz que se vê atrás dela, e o sintoma seria daqueles
 * que ninguém sabe nomear.
 */
export function misturaDaCarga(progress: number): number {
  const j = janelaDoContador('cycles')
  const t = entre((progress - j.de) / (j.ate - j.de))
  return progress > j.de && progress < BEATS[3].inicio ? suave(t) : 0
}
