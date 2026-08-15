/**
 * Estado da cena 3D.
 *
 * REGRAS.md §6.7: a cena é dirigida por UM número. Ela não conhece seções,
 * não escuta scroll e não tem lógica de beat. A timeline mestre (Sprint 3)
 * escreve `progress` aqui; a cena só interpola rumo à pose correspondente.
 *
 * Unidades: 1 unidade = 10 mm. A AA tem 50,5 mm → 5,05 unidades.
 *
 * O import de `labels` não contradiz o parágrafo acima. Daqui saem só as
 * FRONTEIRAS dos beats, que são números num eixo; a cena continua sem
 * escutar scroll, sem consultar o DOM e sem saber que existem seções. As
 * poses sempre foram derivadas desses números, só que à mão, copiados num
 * comentário. Importar troca a cópia pela fonte.
 */

import { BEATS, beatPorId, centroDoBeat, SAIDA_DO_HEROI } from '@/motion/labels'

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
 * O mesmo limiar do `md:` do Tailwind, e não `largura < altura`.
 *
 * Os dois critérios discordam justo no tablet em pé: pela proporção ele é
 * retrato, mas se o `md:` já vale o CSS entrega o layout de duas colunas
 * com o vão central reservado ao produto. A pilha ia para o centro,
 * encolhida, enquanto a diagramação a esperava no vão. Um limiar só, e as
 * duas metades contam a mesma história.
 *
 * 1024 E NÃO 768. Este número já esteve em 768, com um comentário dizendo
 * que era "o mesmo do md: do Tailwind" — e não era: o projeto sobrescreve
 * os breakpoints no @theme, onde `sm` vale 768 e `md` vale 1024.
 *
 * O erro abria uma faixa inteira de larguras, de 768 a 1023, em que o CSS
 * empilhava o texto ocupando a largura toda (layout de retrato) enquanto a
 * cena se achava em paisagem e punha o produto no meio da tela. Resultado:
 * a pilha em cima do parágrafo, que é justamente a §6.4c. Medido em 785 de
 * largura: a descrição do painel 01 ia de x=32 a x=694 e o produto passava
 * bem no meio dela. A faixa pega notebook pequeno, tablet deitado e janela
 * dividida ao meio, que não é gente de menos.
 *
 * Mora AQUI e não na Battery porque a chuva de descartáveis precisa do
 * mesmo limiar, e digitar 768 de novo seria repetir o mesmo erro num
 * arquivo novo.
 */
export const LARGURA_RETRATO = 1024

/**
 * Qual formato está em cena.
 *
 * A troca acontece DENTRO da passagem entre os painéis 01 e 02, no meio do
 * giro de 360°: com o produto de costas para a câmera, a substituição não
 * é percebida como corte. Trocar com a face de frente entregaria o truque.
 */
/**
 * O meio exato entre as poses dos painéis 01 e 02. Com uma volta completa
 * entre elas, é ali que o produto está de costas para a câmera.
 */
const TROCA_DE_FORMATO =
  (centroDoBeat('produto-01') + centroDoBeat('produto-02')) / 2

export function variantEm(progress: number): 'AA' | 'AAA' {
  return progress < TROCA_DE_FORMATO ? 'AA' : 'AAA'
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
/**
 * A dissolução começa ANTES do painel do kit e termina na pose dele.
 *
 * O fim é o centro do beat 03, que é onde a pílula de navegação para: se
 * as oito ainda estivessem se formando ali, quem chegasse pela pílula veria
 * a cena montando em vez de montada.
 *
 * O começo entra um quarto de beat mais cedo, ainda dentro da passagem do
 * painel 02. É o que dá sobreposição entre a protagonista encolhendo e as
 * oito crescendo, e sobreposição é o que faz a troca ler como dissolução
 * em vez de corte.
 */
const KIT = (() => {
  const beat = beatPorId('produto-03')
  return {
    inicio: beat.inicio - (beat.fim - beat.inicio) * 0.25,
    fim: centroDoBeat('produto-03'),
  }
})()

export function kitPresenca(progress: number): number {
  if (progress <= KIT.inicio) return 0
  if (progress >= KIT.fim) return 1
  const t = (progress - KIT.inicio) / (KIT.fim - KIT.inicio)
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
 * Os valores VÊM de BEATS por `centroDoBeat`, e não são copiados de lá.
 * Copiados, eles já estavam certos e teriam ficado errados no dia em que
 * o beat das recargas foi alargado: sete números a corrigir à mão, cada um
 * capaz de errar em silêncio.
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

/**
 * Um ponto DENTRO do beat do chip, em fração dele.
 *
 * Aquele beat tem três âncoras de pose e nenhuma delas é o centro, então
 * `centroDoBeat` não serve. Em fração, os três pontos continuam nos mesmos
 * lugares relativos se o beat mudar de tamanho outra vez — que é
 * exatamente o que acabou de acontecer com ele.
 */
const chipEm = (f: number) => {
  const b = beatPorId('chip')
  return b.inicio + (b.fim - b.inicio) * f
}

/**
 * Onde a virada do herói para o beat do USB-C TERMINA.
 *
 * Ela terminava no centro do beat, 0,225, e era esse o defeito: a virada
 * ocupava de 0,08 a 0,225, quase três alturas de tela, com smoothstep dos
 * dois lados. Espalhado assim, o movimento fica abaixo do limiar do olho
 * em qualquer ponto — o cliente rolava, o texto sumia, e a pilha parecia
 * não ter recebido o recado.
 *
 * Concentrada até 0,16 ela acontece em 1,15 tela e se vê. E chega antes
 * do cabo, que começa a entrar em 0,19 (ver CABO): a pilha está PARADA
 * quando o plugue se aproxima, que é a condição para a aproximação ser
 * uma linha limpa em vez de herdar o movimento dela.
 *
 * O trecho de 0,16 a 0,225 não é tempo morto: é a pose montada esperando
 * o cabo, com o respiro e o parallax do ponteiro continuando.
 */
const POSE_PRONTA = 0.16

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
  /**
   * O herói tem DUAS âncoras iguais, e não uma. É um TRECHO, não um ponto.
   *
   * ------------------------------------------------------------------
   * O DEFEITO QUE ISTO CONSERTA
   * ------------------------------------------------------------------
   *
   * Havia uma âncora só, em 0,06, e duas coisas se somavam a partir dela:
   *
   *   1. `poseAt` PRENDE o valor abaixo da primeira âncora. De 0 a 0,06 o
   *      produto não recebia nada do scroll — 864 px, mais de uma tela.
   *   2. Passando de 0,06, a interpolação é smoothstep, que sai com
   *      derivada zero. O trecho seguinte também quase não se move.
   *
   * Enquanto isso a barra saía em 0,055 e o texto do herói em 0,105. O
   * cliente descreveu exatamente o resultado: as informações somem e ainda
   * faltam dois ou três giros de roda para a pilha começar a andar.
   *
   * Medido antes da correção, em 1280x800: de p=0 a p=0,10 a caixa do
   * produto na tela ficou em 564..700, um pixel em 1440 px de rolagem. O
   * que se via mexer era o RESPIRO, que tem amplitude maior que o
   * movimento do scroll naquele trecho.
   *
   * ------------------------------------------------------------------
   * POR QUE DUAS ÂNCORAS IGUAIS
   * ------------------------------------------------------------------
   *
   * Simplesmente puxar a âncora para 0 resolveria o congelamento e criaria
   * outro problema: o produto começaria a girar no primeiro pixel de
   * rolagem, e a primeira tela existe justamente para mostrá-lo DE FRENTE.
   *
   * Com duas âncoras idênticas, o trecho entre elas é uma pose constante
   * por construção, não por acidente de clamp: a pilha fica de frente
   * enquanto o herói é lido. Da segunda em diante ela anda.
   *
   * A segunda âncora é o COMEÇO da saída do herói, e não o meio dela.
   * Medido nas duas versões, a fração da virada já cumprida:
   *
   *   p        antes   pelo meio   pelo começo
   *   0,105     18%       25%          50%
   *   0,120     30%       50%          75%
   *
   * Ancorando no meio, o giro ainda nascia depois de a barra ter sumido:
   * o começo perceptível ficava em 0,096 nas duas versões, porque o
   * smoothstep sai com derivada zero e come o primeiro terço da janela.
   * Amarrado ao começo, a barra apagando e a pilha girando são o MESMO
   * gesto, e a metade da virada já aconteceu quando a barra termina de
   * sair. É isso que o cliente estava pedindo ao dizer que as informações
   * sumiam e a pilha demorava mais dois ou três giros de roda.
   */
  { at: 0, screenX: FAIXA, position: [-0.6, 0], rotation: [0.04, FACE_FRONTAL, 0.02], scale: 0.92 },
  { at: SAIDA_DO_HEROI.comeca, screenX: FAIXA, position: [-0.6, 0], rotation: [0.04, FACE_FRONTAL, 0.02], scale: 0.92 },

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
  /* A virada TERMINA aqui, antes do cabo. Ver POSE_PRONTA. */
  { at: POSE_PRONTA, screenX: FAIXA, position: [0.15, 0.5 * AFASTAMENTO], rotation: [-0.16, FACE_MARCA + 0.28, 0.02], scale: 1.03 },
  /* E fica montada até o centro do beat, esperando o plugue */
  { at: centroDoBeat('usbc'), screenX: FAIXA, position: [0.15, 0.5 * AFASTAMENTO], rotation: [-0.16, FACE_MARCA + 0.28, 0.02], scale: 1.03 },

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
  { at: centroDoBeat('cycles'), screenX: 0.57, position: [0, 0.4 * AFASTAMENTO], rotation: [0.1, FACE_MARCA - 1.3, -0.62], scale: 1.02 },

  /**
   * O BEAT DO CHIP É UMA VOLTA COMPLETA, em três âncoras.
   *
   * As seis proteções aparecem uma de cada vez enquanto o produto gira
   * 360° e volta a ficar de frente, já na pose do painel seguinte. As duas
   * coisas fecham juntas: a última proteção entra com a pilha chegando.
   *
   *   CHEGADA    ainda de três-quartos e inclinada, como veio das
   *              recargas. Nada muda no caminho até aqui.
   *   ENDIREITA  levanta e apresenta a marca de frente. É o fim do gesto
   *              anterior, não o começo da volta.
   *   A VOLTA    exatamente 2π depois, de frente outra vez.
   *
   * Uma volta INTEIRA e não meia: o eixo do cilindro é vertical, então
   * meia volta devolveria a mesma silhueta com o rótulo de trás para a
   * frente, e o olho não leria giro nenhum, leria a marca sumindo. A volta
   * fechada é a única quantidade em que o gesto se anuncia e se resolve.
   *
   * O painel 01 repete o ângulo de A VOLTA, então entre um e outro não
   * sobra rotação nenhuma: o produto chega montado, que é o que "encaixar
   * na próxima seção" quer dizer.
   */
  { at: chipEm(0.1), screenX: 0.57, position: [0, 0.3 * AFASTAMENTO], rotation: [0.06, FACE_MARCA - 3.4, -0.2], scale: 1.02 },
  { at: chipEm(0.28), screenX: 0.57, position: [0, 0.28 * AFASTAMENTO], rotation: [0.04, FACE_FRONTAL - VOLTA, 0], scale: 1.02 },
  { at: chipEm(0.92), screenX: 0.57, position: [0, 0.24 * AFASTAMENTO], rotation: [0.04, FACE_FRONTAL - VOLTA * 2, 0], scale: 1.02 },

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
  { at: centroDoBeat('produto-01'), screenX: FAIXA, position: [0, 0.2 * AFASTAMENTO], rotation: [0.04, FACE_FRONTAL - VOLTA * 2, 0], scale: 1.05 },
  { at: centroDoBeat('produto-02'), screenX: FAIXA, position: [0, 0.2 * AFASTAMENTO], rotation: [0.04, FACE_FRONTAL - VOLTA * 3, 0], scale: 1.05 },
  // O centro EXATO do beat, e não um valor arredondado perto dele: é onde
  // a pílula de navegação para, e um centésimo de diferença já deixava o
  // kit chegando 5° girado.
  { at: centroDoBeat('produto-03'), screenX: FAIXA, position: [0, 0.2 * AFASTAMENTO], rotation: [0.04, FACE_FRONTAL - VOLTA * 4, 0], scale: 1.05 },
]

/**
 * Em que progresso um beat se apresenta pronto, para quem precisa de UMA
 * foto dele.
 *
 * Existe para o modo de movimento reduzido, onde a cena é uma foto por
 * beat e alguém tem de dizer qual. Aquele código pegava `POSES[i].at` com
 * o `i` do beat, o que só funcionava enquanto havia exatamente uma pose
 * por beat — a mesma coincidência que quebrou `faixaEm`, e que morreu
 * pelo mesmo motivo: o herói ganhou duas âncoras e a virada do USB-C uma
 * terceira. Com nove poses para sete beats, as recargas recebiam a pose do
 * USB-C, o chip recebia a do fim da virada, e o painel do kit recebia a do
 * painel 01 — inclusive o FORMATO, que também sai do progresso, então o
 * beat do kit mostrava uma AA sozinha.
 *
 * O herói é exceção: o centro dele (0,075) cai dentro de SAIDA_DO_HEROI,
 * e a foto sairia com o produto no meio da virada. Ele se apresenta em
 * qualquer ponto do trecho frontal, e zero é o começo dele.
 */
export function ancoraDoBeat(id: string): number {
  /**
   * Duas exceções, e as duas pelo mesmo motivo: nesses beats o centro cai
   * no MEIO de um gesto, e foto de gesto pela metade não apresenta nada.
   *
   *   HERÓI  o centro (0,075) cai dentro de SAIDA_DO_HEROI, com o produto
   *          já virando. Qualquer ponto do trecho frontal serve, e zero é
   *          o começo dele.
   *   CHIP   o centro cai a uns 100° dentro da volta completa, ou seja com
   *          a costura do rótulo para a câmera. A foto é a CHEGADA, que é
   *          onde a volta se fecha de frente.
   */
  if (id === 'hero') return 0
  if (id === 'chip') return chipEm(0.92)
  return centroDoBeat(id)
}

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

/** Os centros dos beats, que é onde cada faixa medida vale por inteiro */
const CENTROS = BEATS.map((b) => (b.inicio + b.fim) / 2)

/**
 * A faixa livre do produto no retrato, no progresso dado.
 *
 * Interpola entre beats com a mesma suavização das poses, para o produto
 * descer e subir junto com a virada em vez de saltar.
 *
 * ------------------------------------------------------------------
 * INDEXA POR BEAT, E NÃO POR POSE
 * ------------------------------------------------------------------
 *
 * Esta função caminhava sobre POSES, e funcionava por COINCIDÊNCIA: havia
 * exatamente uma pose por beat, então o índice de uma servia para a outra.
 * `faixas` sempre teve um item por beat, vindo de TetosDoRetrato.
 *
 * A coincidência morreu no dia em que as poses deixaram de ser uma por
 * beat: o herói ganhou duas âncoras iguais para segurar a pose frontal, e
 * a virada para o USB-C ganhou uma terceira para terminar antes do cabo.
 * Nove poses contra sete faixas, e a partir da terceira cada beat passou a
 * usar a faixa de outro.
 *
 * Medido em 390x844, no painel 01: o produto foi parar em 342..513 usando
 * a faixa do painel 02, com o título do 01 começando em 379. Ou seja,
 * exatamente o defeito que a faixa existe para impedir, causado por quem
 * deveria impedi-lo.
 *
 * Caminhando sobre BEATS, os dois conjuntos voltam a ter o mesmo tamanho
 * por definição, e não por acaso.
 */
export function faixaEm(
  progress: number,
  faixas: { de: number; ate: number }[],
): { de: number; ate: number } {
  const p = Math.max(0, Math.min(1, progress))

  let i = 0
  while (i < CENTROS.length - 2 && CENTROS[i + 1] < p) i++

  const cheia = { de: 0, ate: 1 }
  const a = faixas[i] ?? cheia
  const b = faixas[i + 1] ?? a
  const span = CENTROS[i + 1] - CENTROS[i]
  // Limitado como em poseAt, e pelo mesmo motivo: antes do primeiro centro
  // o `t` fica negativo e a suavização o devolve positivo, misturando o
  // beat seguinte no trecho em que só deveria valer o primeiro
  const t = span <= 0 ? 0 : Math.max(0, Math.min(1, (p - CENTROS[i]) / span))
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
   * Carga CHEGANDO ao corpo, 0→1. Escrita pelo <Cable /> a cada quadro.
   *
   * A onda de neon já percorria o cabo em direção à pilha, mas morria na
   * porta: entrava energia e não acontecia nada. O que faltava era o
   * outro lado da frase — a pilha recebendo.
   *
   * Este valor sobe no instante em que a onda alcança o conector e cai
   * logo depois, então o halo atrás do corpo pisca a cada pulso. É o
   * mesmo halo do herói, e de propósito: ali ele diz "pilha carregada",
   * aqui diz "carregando agora". Um aspecto só para uma ideia só.
   */
  pulsoDeCarga: 0,
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
  /**
   * Inclinação do eixo do produto NA TELA, em graus, sentido horário.
   *
   * O halo de carga é uma elipse alta e precisa deitar junto com a pilha:
   * no beat do contador ela está na diagonal, e um brilho em pé atrás de um
   * objeto deitado lê como mancha, não como luz saindo dele.
   *
   * Publicado pelo mesmo laço que publica `centroNaTela`, e pelo mesmo
   * motivo: só ele sabe onde a pose, o amortecimento e o respiro deixaram o
   * objeto.
   */
  inclinacaoNaTela: 0,
  /**
   * Onde a onda de carga está DENTRO DO CORPO, de 0 (porta) a 1 (polo
   * negativo). Fora de 0..1 não há onda no corpo.
   *
   * A onda nasce no cabo e não pode morrer no conector. O cliente
   * descreveu o defeito: "o glow do led passando pelo cabo tira todo o
   * glow da pilha e parece mais um bug do que uma pilha carregando".
   * Estava certo: a energia chegava à porta e sumia, o que é o contrário
   * de carregar.
   *
   * Quem calcula é o cabo, que é o dono da fase; quem desenha é o material
   * do corpo. Passa por aqui porque são componentes irmãos.
   */
  cargaNoCorpo: -1,
  /**
   * Quanto a banda do corpo está acesa, de 0 a 1.
   *
   * Separada da posição porque os dois cortes secos do trajeto são de
   * BRILHO, não de lugar: ela nasce na porta enquanto a cabeça do cabo
   * ainda está acesa (é essa sobreposição que esconde os dois centímetros
   * opacos do plugue), e apaga ao chegar no polo negativo.
   *
   * Sem o segundo, a banda chegava ao fim da célula em brilho máximo e o
   * ciclo virava, apagando-a de uma vez. Um pop por ciclo, a cada 3,57 s.
   */
  cargaForca: 0,
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
  /**
   * Distância do plugue até a porta, ao longo do EIXO dela, em unidades.
   *
   * Eram dois campos, `recuo` e `deslize`, com a ideia de que um era a
   * casca saindo da abertura e o outro o conjunto indo embora. Só que o
   * Cable os SOMAVA na mesma direção — `avanco = recuo + deslize` — então
   * nunca foram dois movimentos: eram dois pedaços do mesmo, e nada no
   * tipo dizia isso. Foi essa separação de mentira que escondeu a trava
   * que o cliente viu (ver o comentário de `cabeSaida`).
   */
  avanco: number
  /** Queda por gravidade, depois de solto */
  queda: number
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
/**
 * O cabo chega DEPOIS que a pilha para de se mexer.
 *
 * A entrada começava em 0,115, e ali a pilha ainda está no meio da
 * virada do herói para este beat: girando 45° e mudando de altura. Como
 * o cabo é FILHO do grupo dela — precisa ser, para continuar plugado
 * quando ela gira depois —, ele herdava esse movimento inteiro.
 *
 * Medido em 390, a posição de mundo do plugue durante a aproximação:
 *
 *   p      x       y       z
 *   0,10   0,96    1,50    9,81
 *   0,13   2,46    2,39    8,79    <- desvio lateral
 *   0,16   1,46    2,73    3,15
 *   0,19   1,24    3,12    2,11
 *   0,22   1,34    3,43    2,04    <- subiu 2 unidades no caminho
 *
 * Não é linha reta: o plugue faz uma barriga para a direita e sobe.
 * Nada disso é do cabo, é da pilha — e some sozinho se ele esperar ela
 * assentar.
 *
 * A garantia deixou de ser aritmética e virou estrutural: existe uma
 * âncora de pose em POSE_PRONTA (0,16) que fixa a pose final do beat, e o
 * `entra.de` fica depois dela. A pilha está PARADA quando o cabo chega,
 * não 97% parada.
 */
/**
 * A ENTRADA ficou mais longa: 0,075 de progresso contra os 0,05 de antes.
 *
 * O cliente pediu "um pouco menos rápido". Metade disso veio de andar em
 * velocidade constante em vez de disparar e travar (ver `cabeSaida`), e a
 * outra metade vem daqui: 1080 px de rolagem no lugar de 720. A velocidade
 * média cai 1,5 vez e a de pico, que é o que se percebe como "muito
 * rápido", cai por volta de 3,3 vezes.
 *
 * Começa em 0,17 e não antes: POSE_PRONTA fixa a pose da pilha em 0,16, e
 * o cabo é filho do grupo dela.
 */
const CABO = {
  entra: { de: 0.17, ate: 0.245 },
  sai: { de: 0.29, ate: 0.345 },
}

/** Distância total que o plugue percorre até encostar na porta */
const ALCANCE = 12.1

/**
 * Quanto do caminho o plugue faz em velocidade CONSTANTE.
 *
 * O resto é a desaceleração de encostar. Um conector não bate na porta: a
 * mão que o leva alivia nos últimos milímetros. Mas isso é ENCOSTAR, não
 * "quase chegar e esperar" — por isso são 12% do trajeto e não um terço.
 */
const CONSTANTE = 0.88

/**
 * Rampa de velocidade constante com desaceleração só no fim.
 *
 * Um smoothstep desacelera nos DOIS extremos e, com trecho longo, o miolo
 * fica muito mais rápido que as pontas: é metade do "duas velocidades" que
 * o cliente apontou. Aqui a velocidade é uma só até `CONSTANTE` e daí cai
 * linearmente até zero.
 *
 * `V` compensa o que a desaceleração deixa de percorrer, para o plugue
 * ainda chegar exatamente na porta ao fim da janela: andando a V no
 * trecho reto e desacelerando no resto, o total fecha em 1.
 */
const V = 1 / (CONSTANTE + (1 - CONSTANTE) / 2)

function chegada(t: number): number {
  const x = Math.max(0, Math.min(1, t))
  if (x <= CONSTANTE) return V * x
  const s = x - CONSTANTE
  const L = 1 - CONSTANTE
  return V * (CONSTANTE + s - (s * s) / (2 * L))
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
  const fracao = (p: number, de: number, ate: number) =>
    Math.max(0, Math.min(1, (p - de) / (ate - de)))

  if (progress <= CABO.entra.de) return { fase: 1, saindo: false }
  if (progress < CABO.entra.ate) {
    /* Entrada em velocidade constante: ver `chegada` */
    return {
      fase: 1 - chegada(fracao(progress, CABO.entra.de, CABO.entra.ate)),
      saindo: false,
    }
  }
  if (progress <= CABO.sai.de) return { fase: 0, saindo: false }
  /**
   * A SAÍDA continua com smoothstep, e não é incoerência.
   *
   * Entrar é um gesto conduzido, com velocidade escolhida por quem
   * conduz. Sair é soltar: o conjunto parte do repouso, ganha velocidade e
   * some de quadro. A aceleração inicial do smoothstep é justamente isso.
   */
  return { fase: suave(fracao(progress, CABO.sai.de, CABO.sai.ate)), saindo: true }
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

  /**
   * ------------------------------------------------------------------
   * A TRAVA QUE HAVIA AQUI
   * ------------------------------------------------------------------
   *
   * O avanço vinha de dois campos somados no Cable, e cada um cobria uma
   * faixa diferente da fase:
   *
   *   fase          o que andava        avanço
   *   1,00 → 0,42   só o deslize        12,1 → 1,1
   *   0,42 → 0,34   NADA                1,1 parado
   *   0,34 → 0,00   só o recuo          1,1 → 0
   *
   * Duas coisas erradas de uma vez. Havia um vão de 0,08 de fase em que
   * nenhum dos dois se mexia, e as velocidades dos trechos vizinhos eram
   * 19 e 3,2 por unidade de fase: seis vezes mais devagar depois da
   * parada. O cliente descreveu exatamente isso — vem muito rápido, meio
   * que para, e só então conecta.
   *
   * Na saída o vão também existia, mas ali a gravidade está agindo e
   * alguma coisa continua se mexendo, então ele nunca apareceu.
   *
   * Agora o avanço é UM número, proporcional à fase. Com a fase andando em
   * velocidade constante (ver `chegada`), o plugue anda em velocidade
   * constante: sem vão, sem degrau, sem trava.
   */
  return {
    avanco: e * ALCANCE,
    /**
     * A queda é SÓ da saída.
     *
     * Aplicada também na entrada, ela punha o plugue abaixo da porta e o
     * fazia subir para encaixar — o movimento estranho que o cliente
     * apontou. Gravidade não se inverte porque a rolagem inverteu.
     */
    queda: saindo ? faixa(0.26, 1) * 2.2 : 0,
    opacidade: 1 - faixa(0.78, 1),
    /**
     * Plugado é ENCOSTADO, não "por perto".
     *
     * O limiar era 0,3 de fase, que com este alcance são 3,6 unidades: 36
     * milímetros de ar entre o plugue e a porta, com o neon já correndo
     * pelo cabo. A onda existe para dizer que há carga entrando, e ali não
     * havia. Em 0,04 o plugue está a menos de meio milímetro.
     */
    conectado: e < 0.04,
  }
}
