/**
 * A chuva de pilhas descartáveis do beat das recargas.
 *
 * ------------------------------------------------------------------
 * O QUE ELA DIZ
 * ------------------------------------------------------------------
 *
 * O contador sobe até 1.200 e 1.200 é um número abstrato. A chuva é a
 * imagem dele: cada carcaça que cai é uma descartável que a Turbo
 * substituiu. Por isso são CARCAÇAS — sem rótulo, sem porta, sem verniz —
 * e por isso elas caem, que é o que lixo faz.
 *
 * A conta de verdade continua sendo do contador. Não são 1.200 carcaças em
 * quadro e nem poderiam ser: com 71 vivas de cada vez, entregar 1.200 na
 * janela exigiria cada uma atravessar a tela em 96 px de rolagem, andando
 * 117 px por quadro. O que apareceria seria um risco, não uma pilha.
 *
 * ------------------------------------------------------------------
 * POR QUE ISTO É MATEMÁTICA PURA, SEM THREE E SEM REACT
 * ------------------------------------------------------------------
 *
 * Pelo mesmo motivo de `scene-state.ts` morar em `lib`: dá para verificar
 * por medida, sem montar canvas nenhum. E porque a propriedade que segura
 * este beat inteiro é uma propriedade DESTAS FUNÇÕES, não do componente:
 *
 *   A POSIÇÃO DE CADA CARCAÇA É FUNÇÃO PURA DO PROGRESSO.
 *
 * Nada aqui lê relógio, delta ou acumulador. O beat é dirigido por scrub, e
 * scrub significa que rolar para trás DESFAZ. Uma chuva com velocidade
 * integrada não desfaz: ela continua caindo enquanto o contador desconta, e
 * vira o único elemento da página andando contra a rolagem.
 *
 * A tentação, quando o campo congela com a rolagem parada, é somar uma
 * deriva de relógio "só para não parecer travado". Não faça: o campo
 * congela junto com o contador, o texto e a pose do produto, e quem
 * continua se mexendo é o respiro da pilha, que já existe. Uma deriva
 * quebra o teste de igualdade bit a bit, e a reversibilidade deixa de ser
 * verificável para virar alegação.
 */

import { janelaDoContador } from '@/motion/labels'

/** O eixo do tempo da chuva é o MESMO do contador. Nunca copie os números. */
export const JANELA = janelaDoContador('cycles')

/**
 * A laje de profundidade onde as carcaças vivem, em distância da câmera.
 *
 * Não é `z`: é distância, que é o que decide o tamanho na tela. O produto
 * neste beat está a 21,95 da câmera; a carcaça mais próxima, a 125. Nenhuma
 * passa na frente dele nunca, e isso é um número só no código em vez de uma
 * regra de ordenação a manter.
 *
 * No retrato a laje afasta: a tela é estreita e alta, e na mesma distância
 * as carcaças ocupariam largura demais.
 */
export const LAJE_PAISAGEM = { perto: 125, longe: 245 }
export const LAJE_RETRATO = { perto: 185, longe: 360 }

export type Laje = typeof LAJE_PAISAGEM

/**
 * Margem, em fração de tela, acima e abaixo do trajeto visível.
 *
 * O embrulho de u=1 para u=0 tem de acontecer com a peça INTEIRA fora de
 * quadro, senão ela reaparece no meio da tela. 0,062 contra uma meia
 * extensão sob tombo de 0,0596 na pior profundidade: sobram 0,0024 de
 * folga, e o teste 3 prova isso projetando os oito cantos da caixa.
 */
export const MARGEM = 0.062

/**
 * A carcaça ENTRA em quadro já em movimento.
 *
 * A queda é livre, ou seja aceleração constante, e uma queda livre que
 * começa exatamente na borda de cima entra com velocidade zero: a peça fica
 * praticamente parada logo acima da borda por vários quadros. É o único
 * jeito de um quadro congelado denunciar que a coisa é falsa.
 *
 * `T0` desloca a origem do tempo para trás: a peça já caiu um trecho antes
 * de aparecer. Entra a 52% da velocidade de saída e acelera 2,82x ao
 * atravessar, que é queda de verdade vista pela janela.
 */
export const T0 = 0.55

/** Quedas por unidade de tau na instância mais próxima */
export const TAXA_REF = 4.87

/** Instâncias alocadas. Sempre desenhadas; as mortas ficam estacionadas. */
export const N_MAX = 96

/** Teto de cobertura de tela, em fração. Ver o comentário de `pesoEm`. */
export const COBERTURA = { paisagem: 0.06, retrato: 0.075 }

/**
 * Perfil de queda: fração do trajeto percorrida em `u` de 0 a 1.
 *
 * s(u) = ((u+T0)² − T0²) / ((1+T0)² − T0²)
 *
 * É aceleração constante com origem deslocada, normalizada para s(0)=0 e
 * s(1)=1. Expandido, o denominador vale 2,10 com T0=0,55.
 */
export function perfilDeQueda(u: number): number {
  const den = (1 + T0) * (1 + T0) - T0 * T0
  return (u * u + 2 * T0 * u) / den
}

export type Carcaca = {
  /** Em que tau esta peça começa a cair. Permutação estratificada. */
  nasce: number
  /** Sorteio independente que decide se ela está LIGADA nesta tela */
  mascara: number
  /** Coluna de nascimento, fração da largura */
  fx0: number
  /** Posição na laje, 0 = perto, 1 = fundo. Independente da laje. */
  ud: number
  /** Distância da câmera, derivada de `ud` e da laje atual */
  d: number
  /** Quedas por unidade de tau. Mais fundo cai mais devagar na tela. */
  taxa: number
  /** Eixo do tombo, unitário */
  eixo: [number, number, number]
  /** Voltas de tombo por queda, com sinal */
  voltasTombo: number
  /** Voltas em torno do próprio eixo por queda */
  voltasGiro: number
  faseGiro: number
  faseFlutter: number
  /** Escurecimento por profundidade, escrito em instanceColor */
  tom: number
}

/**
 * Gerador com SEMENTE FIXA.
 *
 * O campo tem de ser o mesmo em toda carga da página e em toda tela. Um
 * `Math.random` aqui faria a composição mudar a cada visita, e faria o
 * teste de igualdade bit a bit deixar de existir.
 */
function mulberry32(semente: number) {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Permutação estratificada de [0,1): cobre o intervalo sem aglomerar */
function estratos(n: number, rnd: () => number): number[] {
  const v = Array.from({ length: n }, (_, j) => (j + 0.5) / n)
  for (let i = n - 1; i > 0; i--) {
    const k = Math.floor(rnd() * (i + 1))
    ;[v[i], v[k]] = [v[k], v[i]]
  }
  return v
}

/**
 * O pool inteiro, e NADA aqui depende do viewport.
 *
 * Este é o ponto que derrubou dois dos três projetos avaliados. Se a fase
 * de nascimento ou a coluna saíssem de uma conta que envolve a tela, todo
 * redimensionamento deslizaria a fase de todas as instâncias e o campo
 * TELEPORTARIA no meio do beat. No celular a barra do navegador aparece e
 * some o tempo todo, então isso não é hipótese.
 *
 * Só `d`, `taxa` e `tom` mudam quando a laje troca, e nenhum dos três move
 * a peça de lugar no eixo do tempo.
 *
 * A ordenação por profundidade usa `ud`, que é sorteado uma vez: assim a
 * ordem é a mesma nas duas lajes.
 */
export function gerarPool(laje: Laje): Carcaca[] {
  const rnd = mulberry32(0x9e3779b9)
  const nasce = estratos(N_MAX, rnd)
  const mascara = estratos(N_MAX, rnd)

  const pool: Carcaca[] = []
  for (let j = 0; j < N_MAX; j++) {
    const ud = rnd()
    /* Eixo do tombo: no plano XZ, inclinado até 25 graus para cima */
    const azimute = rnd() * Math.PI * 2
    const inclina = (rnd() * 25 * Math.PI) / 180
    const cx = Math.cos(inclina)
    pool.push({
      nasce: nasce[j],
      mascara: mascara[j],
      fx0: rnd(),
      ud,
      d: 0,
      taxa: 0,
      eixo: [Math.cos(azimute) * cx, Math.sin(inclina), Math.sin(azimute) * cx],
      voltasTombo: (0.7 + rnd() * 1.5) * (rnd() < 0.5 ? -1 : 1),
      voltasGiro: 0.2 + rnd() * 0.4,
      faseGiro: rnd(),
      faseFlutter: rnd(),
      tom: 0,
    })
  }

  pool.sort((a, b) => a.ud - b.ud)
  aplicarLaje(pool, laje)
  return pool
}

/**
 * Reprojeta o pool numa laje. Muda tamanho e ritmo, nunca a fase.
 *
 * O jitter do tom é derivado de `faseGiro`, e não sorteado de novo: um
 * sorteio aqui mudaria a cor das peças a cada redimensionamento.
 */
export function aplicarLaje(pool: Carcaca[], laje: Laje) {
  const vao = laje.longe - laje.perto
  for (const c of pool) {
    c.d = laje.perto + c.ud * vao
    /* Mais fundo, menos quedas por unidade de tau: a mesma velocidade de
       mundo atravessa um quadro maior, então demora mais para cruzar */
    c.taxa = TAXA_REF * (laje.perto / c.d)
    const base = 1 - 0.45 * c.ud
    c.tom = base * (0.88 + 0.24 * c.faseGiro)
  }
}

/**
 * Onde a carcaça está no ciclo dela, para um tau dado.
 *
 * `tau` é limitado por baixo em 0 e NÃO por cima. É isso que faz a chuva
 * parar de repor no fim da janela e o campo esvaziar sozinho, com cada peça
 * terminando a queda que já tinha começado.
 *
 * Com `tau` limitado em 1 acontecia o contrário: cerca de 110 carcaças
 * ficavam PENDURADAS imóveis por quase 480 px de rolagem. Corpo em queda
 * que trava no ar é a mesma classe de defeito que a aproximação do cabo
 * levou duas rodadas para perder.
 */
export function estadoEm(c: Carcaca, tau: number): { viva: boolean; u: number; q: number } {
  const q = (tau - c.nasce) * c.taxa
  const ciclo = Math.floor(q)
  const ultimo = Math.floor((1 - c.nasce) * c.taxa)
  return { viva: q >= 0 && ciclo <= ultimo, u: q - ciclo, q }
}

/**
 * Fração de tela que UMA carcaça viva cobre, em média.
 *
 * A área projetada média de um cilindro é S/4 pela fórmula de Cauchy, e não
 * a área de perfil: usar o perfil superestima em 11% e o orçamento inteiro
 * sai apertado demais.
 *
 * `E[1/d²] = 1/(perto·longe)` para `d` uniforme na laje.
 *
 * O fator final é a fração média do ciclo em que a peça tem área em quadro,
 * calculada no pior caso (a mais próxima).
 */
export function areaPorInstancia(laje: Laje, fov: number, aspecto: number): number {
  const AREA_CAUCHY = 6.58
  const t = Math.tan((fov * Math.PI) / 360)
  const inv = 1 / (laje.perto * laje.longe)
  return (AREA_CAUCHY * inv) / (4 * t * t) / aspecto * 0.874
}

/**
 * Peso de densidade por coluna da tela.
 *
 * Dois vales, e cada um tem dono:
 *
 *   COLUNA   onde o parágrafo mora, a chuva rarefaz. Não some: 0,45 e não
 *            zero, porque coluna vazia lê como defeito, não como
 *            composição. O texto acende caractere a caractere e precisa de
 *            contraste, e o teste do contraste é o portão.
 *   PRODUTO  um vale estreito em torno do eixo do produto, para a pilha
 *            continuar sendo o assunto.
 *
 * O vale do produto NÃO protege o halo de carga: carcaça escura
 * atravessando a luz quente é a melhor imagem do conjunto e fica.
 *
 * No retrato não há coluna lateral (o texto ocupa a largura toda e mora na
 * base), então só o vale do produto vale.
 */
export function pesoEm(
  fx: number,
  borda: number,
  foco: number,
  retrato: boolean,
): number {
  const suave = (t: number) => {
    const x = Math.max(0, Math.min(1, t))
    return x * x * (3 - 2 * x)
  }
  const coluna = retrato
    ? 1
    : 0.45 + 0.55 * suave((fx - (borda - 0.03)) / 0.13)
  const dist = (fx - foco) / 0.085
  const produto = 1 - 0.3 * Math.exp(-dist * dist)
  return coluna * produto
}

/**
 * Resolve a fração de ativação para atingir o número de vivas desejado.
 *
 * O peso entra na ATIVAÇÃO e não no sorteio de `fx0`. Sortear a coluna pelo
 * peso obrigaria a regerar o pool quando a borda do texto fosse medida — e
 * a medida chega depois do primeiro quadro, então o campo teleportaria na
 * frente do usuário.
 *
 * Bissecção porque a soma é monótona em `fracao` e satura em N_MAX: não há
 * fórmula fechada com o `min(1, ...)` no meio.
 */
export function fracaoDeAtivacao(pesos: number[], alvo: number): number {
  const soma = (f: number) => pesos.reduce((s, w) => s + Math.min(1, f * w), 0)
  if (soma(1) <= alvo) return 1e9
  let lo = 0
  let hi = 1
  while (soma(hi) < alvo && hi < 1e6) hi *= 2
  for (let i = 0; i < 60; i++) {
    const meio = (lo + hi) / 2
    if (soma(meio) < alvo) lo = meio
    else hi = meio
  }
  return (lo + hi) / 2
}
