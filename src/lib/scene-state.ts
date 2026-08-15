/**
 * Estado da cena 3D.
 *
 * REGRAS.md §6.7: a cena é dirigida por UM número. Ela não conhece seções,
 * não escuta scroll e não tem lógica de beat. A timeline mestre (Sprint 3)
 * escreve `progress` aqui; a cena só interpola rumo à pose correspondente.
 *
 * Unidades: 1 unidade = 10 mm. A AA tem 50,5 mm → 5,05 unidades.
 */

export type Pose = {
  /** Posição no progresso global, 0→1 */
  at: number
  /**
   * Posição horizontal como FRAÇÃO da largura da tela (0 = esquerda,
   * 1 = direita), não em unidades de mundo.
   *
   * Coordenada de mundo fixa não acompanha layout responsivo: o mesmo x cai
   * em pontos diferentes da tela conforme a largura do viewport muda, e a
   * pilha invade a coluna de texto em telas largas. A conversão para mundo
   * é feita no Battery, que conhece a câmera e o aspecto.
   */
  screenX: number
  /** Altura e profundidade seguem em unidades de mundo */
  position: [number, number]
  /** Radianos */
  rotation: [number, number, number]
  scale: number
}

/**
 * Ângulo que traz a face da MARCA para a frente.
 *
 * O UV do CylinderGeometry tem u=0 em +Z (voltado para a câmera), e o
 * rótulo foi montado com a face da marca em u=0,29. Girar -0,29 de volta
 * apresenta o logo. Sem isso, rotação zero mostra a costura — a face lisa,
 * sem grafismo nenhum. Foi o que aconteceu na primeira versão: o produto
 * aparecia sem identidade.
 */
/**
 * Três-quartos, não de frente.
 *
 * A porta USB-C fica na MESMA face do logo. Apresentando a marca de frente,
 * o plugue aponta direto para a câmera: visto de topo ele vira um bloco
 * preto achatado, sem leitura de forma, cobrindo a tampa.
 *
 * O desvio de 0,5 rad (29°) mantém o logo perfeitamente legível e coloca o
 * conector de perfil, onde a silhueta dele se entende. É o mesmo motivo
 * pelo qual fotografia de produto nunca enquadra conector de frente.
 */
const DESVIO_TRES_QUARTOS = 0.5

/**
 * Marca de frente, sem desvio nenhum.
 *
 * É a pose de foto de cartela: logo centralizado e a porta USB-C lida como
 * oval na face da frente. O kit usa esta, não a de três-quartos: ali são
 * quatro pilhas paradas lado a lado, e qualquer desvio faria uma parecer
 * torta em relação às outras.
 */
export const FACE_FRONTAL = -0.29 * Math.PI * 2
export const FACE_MARCA = FACE_FRONTAL + DESVIO_TRES_QUARTOS
const VOLTA = Math.PI * 2

/**
 * Poses dos beats. Os `at` acompanham o storyboard (REGRAS.md §7) dentro do
 * trecho pinado.
 *
 * A rotação em Y só cresce em um sentido: a pilha dá uma volta completa ao
 * longo da página, apresentando a marca no hero e de novo no painel 01.
 * Rotação que vai e volta parece indecisa.
 */
/**
 * O produto fica CENTRALIZADO.
 *
 * É o padrão da referência: a garrafa no eixo da tela e o texto distribuído
 * pelas bordas — headline à esquerda, apoio embaixo, navegação nos cantos.
 * Onde texto e produto se cruzam, o produto passa na frente (desktop).
 *
 * Uma tentativa anterior empurrou a pilha para a faixa direita e reservou a
 * esquerda ao texto. Funcionava, mas descaracterizava a composição: o
 * produto deixava de ser o eixo da página.
 */
const FAIXA = 0.5

/**
 * Qual formato está em cena.
 *
 * A troca acontece DENTRO da passagem entre os painéis 01 e 02, no meio do
 * giro de 360°: com o produto de costas para a câmera, a substituição não
 * é percebida como corte. Trocar com a face de frente entregaria o truque.
 */
export function variantEm(progress: number): 'AA' | 'AAA' {
  // 0,74 é o meio exato entre as poses dos painéis 01 (0,67) e 02 (0,81).
  // Com uma volta completa entre eles, é ali que o produto está de costas.
  return progress < 0.74 ? 'AA' : 'AAA'
}

/**
 * Presença do kit, 0→1.
 *
 * No último painel a cena deixa de mostrar UMA pilha e passa a mostrar as
 * oito do kit: quatro AA de um lado, quatro palito do outro.
 *
 * A protagonista encolhe enquanto as oito crescem, com sobreposição — a
 * troca é uma dissolução, não um corte. Assim a regra §6.3 (o produto
 * nunca desmonta) continua valendo em espírito: o que muda é a
 * composição, não a cena.
 */
export function kitPresenca(progress: number): number {
  // Formado ao chegar em 0,94, que é o centro do painel 03 e o ponto onde
  // a pílula de navegação para
  const inicio = 0.85
  const fim = 0.94
  if (progress <= inicio) return 0
  if (progress >= fim) return 1
  const t = (progress - inicio) / (fim - inicio)
  return t * t * (3 - 2 * t)
}

/**
 * As poses são ancoradas no CENTRO de cada beat, não em valores soltos.
 *
 * Antes a pose de frente do painel 01 estava em 0,56 enquanto o beat só
 * começava em 0,60: o produto se apresentava durante a transição escura e
 * chegava ao painel já girado. Ancorar no meio garante que a pose de
 * destino aconteça com o painel inteiro na tela.
 *
 * Se BEATS mudar em motion/labels.ts, estes valores mudam junto.
 */
/**
 * O afastamento em z acompanha a distância da câmera.
 *
 * A cena passou de 32° a 14 para 20° a 22,6 (ver Scene.tsx). O mesmo z de
 * antes daria uma aproximação bem mais fraca, porque o objeto passaria a
 * cobrir uma fração muito menor do caminho até a lente. Multiplicando pela
 * razão das distâncias, a sensação de aproximação fica igual à aprovada.
 */
const AFASTAMENTO = 22.6 / 14

export const POSES: Pose[] = [
  /**
   * Beat 1 — herói: em pé, de FRENTE, sozinha.
   *
   * O desvio de três-quartos (FACE_MARCA) não é gosto, é conserto: com o
   * produto de frente, o PLUGUE apontava para a câmera e virava um bloco
   * preto achatado cobrindo a tampa. Girar um pouco resolvia.
   *
   * Só que agora o herói não tem cabo — ele chega no beat seguinte — e
   * sem plugue não há o que esconder. O motivo do desvio desapareceu
   * junto, e o que sobrava era um produto de esguelha na única tela em
   * que ele está sozinho e deveria se apresentar inteiro.
   *
   * O giro até FACE_MARCA + 0,28 passa a acontecer NA CHEGADA do cabo,
   * que é quando ele volta a fazer falta.
   */
  /**
   * A pose desce e encolhe um pouco para o TÍTULO caber acima dela.
   *
   * No herói o produto fica por cima de tudo — é o assunto da tela e não
   * pode ficar sob nada. Justamente por isso quem sai do caminho é a
   * composição: medido em 1280x820, o produto ocupava de 88 a 632 px e o
   * nome do produto vive entre 176 e 245. Ele cobria o título inteiro.
   *
   * Descendo 0,9 unidade e encolhendo para 0,92, ele passa a morar entre o
   * título e as duas linhas do rodapé, que ficam em 756.
   */
  { at: 0.06, screenX: FAIXA, position: [-0.6, 0], rotation: [0.04, FACE_FRONTAL, 0.02], scale: 0.92 },

  /**
   * Beat 2 — USB-C (centro do beat: 0,22): inclina o suficiente para expor
   * a porta, e nada além disso.
   *
   * Aqui havia um mergulho: z ia a 2,6 e voltava a 0,4 no beat seguinte, com
   * a pilha caindo 0,4 e tombando meio radiano. O objeto avançava, recuava e
   * só então o cabo saía, quando o ACONTECIMENTO deste beat é a retirada do
   * cabo (0,09 a 0,24) — o movimento da pilha estava abafando justamente o
   * que se queria mostrar. No celular, com o produto menor, o vaivém não
   * lia como aproximação: lia como travada.
   *
   * Agora o z quase não muda entre o herói (0), este beat e o próximo
   * (0,4), então o produto só respira para a frente enquanto gira um
   * pouco. Quem se move é o cabo.
   */
  { at: 0.22, screenX: FAIXA, position: [0.15, 0.5 * AFASTAMENTO], rotation: [-0.16, FACE_MARCA + 0.28, 0.02], scale: 1.03 },

  /**
   * Beats 3 e 4 — recargas (0,37) e chip (0,52): saem do centro.
   *
   * Nestes dois o texto ocupa SÓ a coluna da esquerda, e a pilha deitada
   * na diagonal é a pose mais larga de todas: medida em 1280, a coluna de
   * texto termina em x=498 e o produto chegava a x=431. Eram 67 px de
   * texto atrás do objeto, contra a §6.4c.
   *
   * O defeito é antigo e estava ESCONDIDO: havia uma atenuação que
   * derrubava a cena para 45% justamente nestes dois beats, e o parágrafo
   * era lido através do vulto. Tirada a atenuação, a sobreposição
   * apareceu — o que é uma boa notícia, porque agora se resolve onde
   * deveria, na composição.
   *
   * 0,57 desloca o produto o suficiente para a folga ficar em ~24 px na
   * pose mais larga. É fração da tela, não pixel, então acompanha a
   * coluna de texto, que também é percentual. Os painéis voltam a 0,5,
   * porque lá o texto mora nas DUAS bordas e o vão central é do produto.
   */
  { at: 0.37, screenX: 0.57, position: [0, 0.4 * AFASTAMENTO], rotation: [0.1, FACE_MARCA - 1.3, -0.62], scale: 1.02 },
  { at: 0.52, screenX: 0.57, position: [0, 0.3 * AFASTAMENTO], rotation: [0.06, FACE_MARCA - 3.4, -0.2], scale: 1.02 },

  /**
   * Painéis 01, 02 e 03, nos centros 0,67 / 0,81 / 0,95.
   *
   * Aqui a face é FRONTAL, não de três-quartos.
   *
   * O desvio de três-quartos existe por causa do PLUGUE: com o conector
   * apontado para a câmera, ele vira um bloco preto achatado cobrindo a
   * tampa. Mas o cabo se desconecta lá em 0,24 e nestes painéis não há
   * plugue nenhum, só a porta desenhada no rótulo. Mantido o desvio, o
   * produto chegava torto ao painel sem nenhum motivo, e a pílula de
   * navegação entregava justamente essa pose.
   *
   * Entre um painel e outro a pilha dá uma volta completa. Somando
   * exatamente uma VOLTA por passagem, os três terminam no mesmo ângulo: o
   * giro acontece no caminho, nunca no destino. É no meio de cada passagem,
   * com o produto de costas, que o formato troca de AA para AAA sem que a
   * substituição apareça.
   */
  { at: 0.67, screenX: FAIXA, position: [0, 0.2 * AFASTAMENTO], rotation: [0.04, FACE_FRONTAL - VOLTA, 0], scale: 1.05 },
  { at: 0.81, screenX: FAIXA, position: [0, 0.2 * AFASTAMENTO], rotation: [0.04, FACE_FRONTAL - VOLTA * 2, 0], scale: 1.05 },
  // 0,94 e não 0,95: é o centro exato do beat produto-03, que é onde a
  // pílula de navegação para. Um centésimo de diferença já deixava o kit
  // chegando 5° girado.
  { at: 0.94, screenX: FAIXA, position: [0, 0.2 * AFASTAMENTO], rotation: [0.04, FACE_FRONTAL - VOLTA * 3, 0], scale: 1.05 },
]

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Pose interpolada para um progresso 0→1 */
export function poseAt(progress: number): Omit<Pose, 'at'> {
  const p = Math.max(0, Math.min(1, progress))

  let i = 0
  while (i < POSES.length - 2 && POSES[i + 1].at < p) i++

  const a = POSES[i]
  const b = POSES[i + 1] ?? a
  const span = b.at - a.at
  /**
   * O `t` é LIMITADO a 0..1, e isso não é zelo: sem limitar, a
   * interpolação EXTRAPOLA fora das poses.
   *
   * A primeira pose mora em 0,06, mas a página começa em 0. Ali t valia
   * −0,375, e como a suavização t²(3−2t) devolve +0,53 para esse valor, o
   * produto abria com metade do giro do beat 2 já aplicado: 24,6° fora do
   * frontal, justamente na tela em que ele está sozinho e deveria se
   * apresentar inteiro. O mesmo acontecia depois da última pose.
   *
   * Limitando, o trecho antes da primeira pose e depois da última fica
   * exatamente na pose, que é o que "primeira" e "última" querem dizer.
   */
  const t = span <= 0 ? 0 : Math.max(0, Math.min(1, (p - a.at) / span))
  // suaviza a passagem entre poses sem tirar a ligação com o scroll
  const e = t * t * (3 - 2 * t)

  return {
    screenX: lerp(a.screenX, b.screenX, e),
    position: [
      lerp(a.position[0], b.position[0], e),
      lerp(a.position[1], b.position[1], e),
    ],
    rotation: [
      lerp(a.rotation[0], b.rotation[0], e),
      lerp(a.rotation[1], b.rotation[1], e),
      lerp(a.rotation[2], b.rotation[2], e),
    ],
    scale: lerp(a.scale, b.scale, e),
  }
}

/**
 * A faixa livre do produto no retrato, no progresso dado.
 *
 * Interpola entre beats como `poseAt`, com a mesma suavização, para o
 * produto descer e subir junto com a virada em vez de saltar.
 */
export function faixaEm(
  progress: number,
  faixas: { de: number; ate: number }[],
): { de: number; ate: number } {
  const p = Math.max(0, Math.min(1, progress))

  let i = 0
  while (i < POSES.length - 2 && POSES[i + 1].at < p) i++

  const cheia = { de: 0, ate: 1 }
  const a = faixas[i] ?? cheia
  const b = faixas[i + 1] ?? a
  const span = POSES[i + 1].at - POSES[i].at
  // Limitado como em poseAt, e pelo mesmo motivo: antes da primeira pose
  // o `t` fica negativo e a suavização o devolve positivo, misturando o
  // beat seguinte no trecho em que só deveria valer o primeiro
  const t = span <= 0 ? 0 : Math.max(0, Math.min(1, (p - POSES[i].at) / span))
  const e = t * t * (3 - 2 * t)

  return { de: lerp(a.de, b.de, e), ate: lerp(a.ate, b.ate, e) }
}

/**
 * Fonte única do progresso. Um objeto mutável simples em vez de estado do
 * React: a timeline escreve a 60 fps e re-renderizar a árvore nesse ritmo
 * seria desperdício.
 */
export const sceneState = {
  progress: 0,
  variant: 'AA' as 'AA' | 'AAA',
  /**
   * Retângulo livre que o painel do kit reserva para a cena, em fração da
   * tela. Escrito pelo <FaixaDaCena />, lido pelo <Kit />.
   *
   * Os quatro lados importam: a cena do kit não mora mais no vão central,
   * e sim dentro da coluna esquerda do painel. Sem os limites horizontais
   * as oito pilhas atravessariam para a coluna dos cabos.
   *
   * Nulo até o painel montar; a cena usa um palpite conservador enquanto
   * isso, para nunca aparecer grande demais no primeiro quadro.
   */
  faixaDoKit: null as {
    esquerda: number
    direita: number
    topo: number
    base: number
  } | null,
  /**
   * A faixa LIVRE de cada beat no retrato, em fração da altura da tela.
   * Escrita pelo <TetosDoRetrato />, lida pela <Battery /> só no retrato.
   *
   * Uma faixa por beat, na ordem de POSES. É o que separa "a pilha nunca
   * cobre o texto" de "a pilha fica sempre no alto": o beat mais apertado
   * pede quase toda a tela, mas o herói tem duas linhas e sobra o resto.
   *
   * FAIXA, e não um teto. A primeira versão publicava só o teto e presumia
   * que o texto mora sempre abaixo do produto — verdade em todos os beats
   * até o herói novo, em que o nome do produto vai para CIMA. Com a
   * presunção, a conta se invertia e a pilha subia por cima do título.
   *
   * Nulo até medir; enquanto isso vale o palpite conservador do pior caso.
   */
  faixasDoRetrato: null as { de: number; ate: number }[] | null,
  /**
   * Onde o produto está NA TELA, em fração, escrito pela <Battery /> a
   * cada quadro. Lido pelo <BrilhoDeCarga /> para o halo nascer atrás
   * dele.
   *
   * Publicar em vez de recalcular: a posição final do produto é o
   * resultado de pose, amortecimento, respiro, faixa do retrato e escala
   * — refazer essa conta do lado do CSS seria manter duas versões da
   * mesma verdade, e elas divergiriam na primeira mudança. Foi o que
   * aconteceu com o halo fixo em 56%: no retrato o produto subiu para a
   * faixa livre e o brilho ficou no pé da tela, sozinho.
   */
  centroNaTela: { x: 0.5, y: 0.5 },
  /**
   * Saída do ato, 0→1. Escrita pela timeline logo depois que o pin solta.
   *
   * O canvas é `fixed inset-0` e nunca desmonta, então sem isto o kit
   * continuava por cima do impacto, da compra e do rodapé: o produto ficava
   * pendurado na tela pelo resto da página. O pin termina, mas a cena não
   * sabia disso, porque `progress` satura em 1 e fica lá.
   */
  saidaDoAto: 0,
  /**
   * Ponteiro normalizado (-1 a 1) para o parallax do cabo.
   * Na referência o galho reage ao mouse mesmo sem scroll — é o que impede
   * a cena de parecer uma imagem estática enquanto o usuário decide se rola.
   */
  pointer: { x: 0, y: 0 },
}

/**
 * Presença do cabo, 0→1.
 *
 * O cabo é o equivalente ao galho de videira da referência: cenário do
 * hero que some assim que a narrativa começa. Aqui ele acumula uma segunda
 * função — mostrar o produto sendo carregado — então vale ainda mais que
 * ele saia de cena antes do beat do USB-C, senão rouba a atenção da porta.
 *
 * SPRINT 3 — isto ainda é só opacidade, e opacidade entrega o resultado
 * sem entregar a AÇÃO. O correto é encenar a desconexão: o plugue recua
 * pelo eixo da porta, o cabo cede pela gravidade e o conjunto desliza para
 * fora de quadro; só então a opacidade cai. A onda de neon precisa parar
 * no instante em que desconecta — não há mais carga entrando.
 * Ver REGRAS.md, Sprint 3.
 */
export type SaidaDoCabo = {
  /** Recuo ao longo do eixo da porta: a casca metálica saindo da abertura */
  recuo: number
  /** Queda por gravidade, depois de solto */
  queda: number
  /** Deslize para fora de quadro */
  deslize: number
  /** Só cai no fim, quando o conjunto já saiu */
  opacidade: number
  /** Enquanto plugado, a onda de neon corre. Desconectado, para. */
  conectado: boolean
}

/**
 * Quando o cabo entra e quando sai.
 *
 * O HERÓI NÃO TEM CABO. Antes ele nascia plugado e a única coisa que
 * acontecia no beat do USB-C era ele ir embora — o que punha dois
 * assuntos na primeira tela (a pilha e um acessório) e deixava o segundo
 * beat com um acontecimento negativo: tirar algo que já estava lá.
 *
 * Invertido, cada tela ganha um assunto só. O herói mostra o produto
 * sozinho; no beat da recarga o cabo CHEGA, encaixa e carrega; e sai
 * antes do beat das recargas, para não disputar com o contador.
 */
const CABO = {
  entra: { de: 0.115, ate: 0.2 },
  sai: { de: 0.275, ate: 0.35 },
}

/**
 * Fase do cabo: 1 é longe e invisível, 0 é encaixado. `saindo` diz qual
 * dos dois movimentos está em curso.
 *
 * A fase é a mesma nos dois sentidos, mas a COREOGRAFIA não pode ser.
 * Entrar não é sair de trás para a frente, e essa suposição produziu um
 * movimento que o cliente pegou na hora: o plugue aparecia abaixo da
 * porta, subia, e só então encaixava.
 *
 * O motivo é físico. Na SAÍDA a ordem tem causa: o plugue recua, perde o
 * apoio e só ENTÃO cede à gravidade — a queda é consequência de ter
 * soltado. Rodando o mesmo filme ao contrário, a entrada começa com o
 * cabo caído e o faz subir sozinho, como se a gravidade se invertesse.
 * Ninguém leva um plugue a uma tomada por baixo: leva pelo eixo dela.
 */
function faseDoCabo(progress: number): { fase: number; saindo: boolean } {
  const suave = (t: number) => t * t * (3 - 2 * t)
  const rampa = (p: number, de: number, ate: number) =>
    suave(Math.max(0, Math.min(1, (p - de) / (ate - de))))

  if (progress <= CABO.entra.de) return { fase: 1, saindo: false }
  if (progress < CABO.entra.ate) {
    return { fase: 1 - rampa(progress, CABO.entra.de, CABO.entra.ate), saindo: false }
  }
  if (progress <= CABO.sai.de) return { fase: 0, saindo: false }
  return { fase: rampa(progress, CABO.sai.de, CABO.sai.ate), saindo: true }
}

/**
 * O cabo, encenado.
 *
 * Opacidade sozinha entrega o RESULTADO sem entregar a AÇÃO: o cabo
 * simplesmente aparecia ou sumia.
 *
 * ENTRADA, em dois tempos: o conjunto vem de fora de quadro deslizando
 * PELO EIXO da porta, e o plugue completa o encaixe. Sem queda nenhuma —
 * quem leva um plugue à tomada o leva em linha reta.
 *
 * SAÍDA, em três: o plugue recua e a casca deixa a abertura; já solto, o
 * conjunto cede à gravidade e cai; então desliza para fora e a opacidade
 * baixa. Aqui a queda tem causa, e por isso só existe deste lado.
 *
 * A onda de neon só corre PLUGADO: fora da porta não há carga entrando,
 * e mantê-la acesa contaria uma mentira.
 */
export function cabeSaida(progress: number): SaidaDoCabo {
  const { fase: e, saindo } = faseDoCabo(progress)

  const faixa = (de: number, ate: number) =>
    Math.max(0, Math.min(1, (e - de) / (ate - de)))

  return {
    recuo: faixa(0, 0.34) * 1.1,
    /**
     * A queda é SÓ da saída.
     *
     * Aplicada também na entrada, ela punha o plugue abaixo da porta e o
     * fazia subir para encaixar — o movimento estranho que o cliente
     * apontou. Gravidade não se inverte porque a rolagem inverteu.
     */
    queda: saindo ? faixa(0.26, 1) * 2.2 : 0,
    deslize: faixa(0.42, 1) * 11,
    opacidade: 1 - faixa(0.78, 1),
    conectado: e < 0.3,
  }
}
