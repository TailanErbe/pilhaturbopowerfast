import { asset } from '@/lib/site'

/**
 * Conteúdo da landing — fonte única da verdade.
 *
 * Os caminhos de imagem passam por `asset()`. Com `images.unoptimized`,
 * que é obrigatório no export estático, o `<Image>` do Next NÃO aplica o
 * `basePath` no `src`: ele só o aplicava na URL do otimizador, que deixa
 * de existir. Publicado num subcaminho, toda foto dava 404, e isso só
 * aparece servindo o export de verdade.
 *
 * O sufixo `-v2` nas fotos não é enfeite: elas foram recortadas de novo,
 * e trocar o CONTEÚDO mantendo o caminho deixa o navegador servindo a
 * versão velha por tempo indeterminado. Foi o que aconteceu com o halo
 * do recorte anterior, que continuou aparecendo depois de corrigido.
 * Conteúdo novo, caminho novo (§4j).
 *
 * Regra de ouro (REGRAS.md §7): cada beat do scroll carrega UMA ideia.
 * A copy de e-commerce é longa por natureza; aqui ela vira frases curtas.
 * Texto longo só sobrevive dentro dos accordions, onde o usuário para de rolar.
 *
 * Fonte: descrição comercial Gshield + manual de identidade visual.
 */

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type SpecRow = { label: string; value: string }

/**
 * Dimensões reais, em milímetros.
 *
 * ATENÇÃO para o Sprint 2: a AAA **não é** a AA reduzida uniformemente.
 *   diâmetro  10,5 / 14,5 = 0,724
 *   comprimento 44,5 / 50,5 = 0,881
 * A AAA é proporcionalmente mais esguia (1:4,24 contra 1:3,48). Na transição
 * do beat 5 o modelo precisa escalar de forma NÃO uniforme — X/Z por 0,724 e
 * Y por 0,881. Escala uniforme deixaria a AAA gorda.
 */
export const DIMENSIONS = {
  AA: { length: 50.5, diameter: 14.5 },
  AAA: { length: 44.5, diameter: 10.5 },
} as const

/** Fatores de escala AA → AAA para o modelo 3D */
export const AAA_SCALE = {
  radial: DIMENSIONS.AAA.diameter / DIMENSIONS.AA.diameter, // 0.724
  axial: DIMENSIONS.AAA.length / DIMENSIONS.AA.length, // 0.881
} as const

export type Product = {
  /** Numeral exibido no painel: "01", "02", "03" */
  index: string
  /** Nome curto em Bebas, caixa alta */
  name: string
  /** Complemento comercial: "Palito" na AAA, "4 unidades" no kit */
  subtitle?: string
  /**
   * Linha de meta: aparece na régua sob o título.
   *
   * O RÓTULO vem junto com o dado, e não fixo na diagramação. Ele era fixo:
   * o componente escrevia `<dt class="sr-only">Formato</dt>`, `Capacidade` e
   * `Tensão`, nesta ordem, para os três valores. Nos painéis 01 e 02 isso
   * batia; no do kit, que usa os mesmos três lugares para outra coisa, o
   * leitor de tela ouvia "Capacidade: Um formato por kit" e "Tensão: Cabo
   * incluso".
   *
   * São dois a três itens: o primeiro grupo fica junto à esquerda e o
   * último vai para a direita da régua (ver ProductPanel).
   */
  meta: { rotulo: string; valor: string }[]
  /** Medidas reais em mm — usadas pela cena 3D. Ausente no painel do kit. */
  dimensions?: { length: number; diameter: number }
  /** Frase de destaque — máx. 2 linhas na tela. É a única copy grande do painel. */
  highlight: string
  /**
   * Marca o painel como uma ESCOLHA entre duas opções, não um conjunto.
   *
   * Só o kit usa. Sem isso, as oito pilhas em cena leem como um pacote único
   * de oito unidades, que não é o produto vendido.
   */
  escolha?: 'ou'
  /** As duas opções, nomeadas. Cada uma fica sob a sua ilha de pilhas. */
  kits?: { nome: string; detalhe: string }[]
  /** Os cabos que acompanham as cartelas, um por número de pontas */
  cabos?: { pontas: string; imagem: string; alt: string }[]
  /** Foto do produto usada na pílula de navegação */
  miniatura: { src: string; alt: string }
  /**
   * Vídeo oficial do formato. LINK, e não player embutido.
   *
   * Três razões, e as três já custaram caro nesta página:
   *
   *   · o painel vive dentro do trecho pinado, e qualquer coisa que capture
   *     gesto ali disputa com a rolagem — foi assim que a ficha técnica
   *     aberta virou conteúdo perdido e que o `data-lenis-prevent` matou a
   *     rolagem do beat 01 em diante;
   *   · um `<iframe>` do YouTube traz centenas de kB de terceiro e cookies,
   *     numa página que é export estático de 4,9 MB e cuja mediana de quadro
   *     é 0,3 ms;
   *   · são SHORTS, ou seja vertical, e não há onde encaixar 9:16 num painel
   *     que já está cheio no celular.
   *
   * O kit não tem: os vídeos são por formato.
   */
  video?: string
  /** Parágrafo abaixo do produto. Máx. 4 linhas. */
  description: string
  /** Accordion 1 */
  technicalSheet: SpecRow[]
  /** Accordion 2 */
  compatibility: string[]
  /** Regime tonal do painel — ver REGRAS.md §5.1 */
  theme: 'dark' | 'orange' | 'light'
}

// ---------------------------------------------------------------------------
// Ficha técnica compartilhada
// ---------------------------------------------------------------------------

/**
 * As seis proteções do chip inteligente.
 * Fonte: peça de marketing do produto. A ficha técnica original listava
 * só três (sobrecarga, superaquecimento, curto-circuito) — estas seis são
 * um argumento de venda mais forte e merecem seção própria.
 */
/**
 * O `icone` é uma CHAVE, não um desenho.
 *
 * O SVG mora no componente que sabe desenhar (sections/Chip.tsx); aqui
 * fica só o nome do símbolo. Assim este arquivo continua sendo conteúdo
 * puro, legível por quem escreve texto e não código, e o dado serve
 * igualmente ao resumo de acessibilidade e ao JSON-LD, que não desenham
 * nada.
 */
export const PROTECTIONS = [
  { nome: 'Sobrecarga', icone: 'sobrecarga' },
  { nome: 'Sobretensão', icone: 'sobretensao' },
  { nome: 'Curto-circuito', icone: 'curto' },
  { nome: 'Sobrepotência', icone: 'sobrepotencia' },
  { nome: 'Sobrecorrente', icone: 'sobrecorrente' },
  { nome: 'Superaquecimento', icone: 'superaquecimento' },
] as const

const SHARED_SPECS: SpecRow[] = [
  { label: 'Tensão nominal', value: '1,5 V' },
  { label: 'Ciclos de recarga', value: 'Até 1.200' },
  /**
   * A QUÍMICA, que estava faltando na página inteira.
   *
   * Esta linha dizia "Turbo PowerFast", ou seja repetia a marca — que já
   * está no título do herói, no `<title>` e na descrição dos dois painéis —
   * e era o único item da ficha que não informava nada.
   *
   * Enquanto isso, `lítio` não aparecia uma única vez em todo o dado da
   * página, e a embalagem oficial o diz TRÊS vezes: no selo da frente
   * ("1.5V LÍTIO"), na faixa do blister ("BATERIA DE LÍTIO RECARREGÁVEL VIA
   * TIPO-C") e no rótulo impresso da própria pilha.
   *
   * É a linha que separa este produto de uma NiMH comum: célula de lítio de
   * 1,5 V entrega tensão regulada até o fim, em vez de cair para 1,2 V.
   */
  { label: 'Tecnologia', value: 'Íons de lítio, 1,5 V constantes' },
  { label: 'Recarga', value: 'USB-C direto na pilha' },
  { label: 'Chip inteligente', value: `${PROTECTIONS.length} proteções integradas` },
  { label: 'Acabamento', value: 'Fosco' },
  { label: 'Garantia', value: '3 meses contra defeitos de fabricação' },
]

/**
 * A LISTA VEM DA EMBALAGEM, e não de suposição.
 *
 * A anterior tinha dois problemas e uma oportunidade perdida:
 *
 *   · "Câmeras digitais" era corrupção de "câmeras FLASH", que é o que a
 *     caixa diz. São coisas diferentes, e a segunda é o argumento melhor —
 *     flash é carga de pico, exatamente onde pilha fraca falha.
 *   · "Lanternas" não consta em lugar nenhum da embalagem. Saiu.
 *   · A caixa lista casos que ninguém tinha aproveitado, e são os mais
 *     persuasivos: fechadura inteligente e esfigmomanômetro ficam anos em
 *     espera, que é o caso em que trocar descartável mais incomoda.
 *
 * Texto de referência, no verso: "adequada para todos os dispositivos
 * eletrônicos de 1,5V, como brinquedos, controles remotos, câmeras flash,
 * instrumentos de beleza, mouse Bluetooth, teclado Bluetooth, barbeadores,
 * fechaduras inteligentes, esfigmomanômetros, microfones, entre outros".
 *
 * Ordenada por reconhecimento: o que todo mundo tem primeiro, o caso que
 * convence por último.
 */
const COMPATIBILITY = [
  'Controles remotos',
  'Brinquedos',
  'Mouse e teclado Bluetooth',
  'Câmeras flash',
  'Microfones',
  'Barbeadores',
  'Fechaduras inteligentes',
  'Esfigmomanômetros',
]

// ---------------------------------------------------------------------------
// Painéis de produto (beats 4, 5, 6)
// ---------------------------------------------------------------------------

export const PRODUCTS: Product[] = [
  {
    index: '01',
    name: 'AA',
    meta: [
      { rotulo: 'Formato', valor: 'Pilha recarregável' },
      { rotulo: 'Capacidade', valor: '3400 mWh' },
      { rotulo: 'Tensão nominal', valor: '1,5 V' },
    ],
    dimensions: DIMENSIONS.AA,
    /* Oficiais, entregues pelo cliente. Normalizados para www: o segundo
       veio sem, e host inconsistente é redirecionamento a mais no clique */
    video: 'https://www.youtube.com/shorts/YtXkbF7TFsQ',
    /**
     * A miniatura é um RENDER da cena, não uma foto de cartela.
     *
     * As três eram fotos de blister exibidas em 32 px, e duas delas eram o
     * MESMO arquivo: a da AAA mostrava duas AA. As duas escolhas mais
     * importantes da primeira tela ficavam idênticas, e uma mostrava o
     * produto errado. Em 32 px uma cartela inteira também não tem o que
     * mostrar: vira um borrão escuro.
     *
     * Saindo do modelo 3D, cada uma mostra o seu formato, de frente, com a
     * diferença real de diâmetro e comprimento entre AA e palito. Ver
     * `producao/miniaturas/` para o procedimento e para quando regerar.
     */
    miniatura: { src: asset('/produto/mini-aa.png'), alt: 'Pilha recarregável AA' },
    highlight: 'Energia firme mesmo nos aparelhos que bebem mais.',
    description:
      'A AA entrega 3400 mWh de carga estável para dispositivos de alto consumo. ' +
      'Recarrega direto pela porta USB-C, sem dock e sem carregador dedicado.',
    technicalSheet: [
      { label: 'Capacidade', value: '3400 mWh' },
      { label: 'Cartela', value: '2 ou 4 unidades' },
      ...SHARED_SPECS,
    ],
    compatibility: COMPATIBILITY,
    theme: 'dark',
  },
  {
    index: '02',
    // "Palito" é como o formato é vendido no varejo brasileiro
    name: 'AAA',
    subtitle: 'Palito',
    meta: [
      { rotulo: 'Formato', valor: 'Pilha recarregável' },
      { rotulo: 'Capacidade', valor: '1100 mWh' },
      { rotulo: 'Tensão nominal', valor: '1,5 V' },
    ],
    dimensions: DIMENSIONS.AAA,
    video: 'https://www.youtube.com/shorts/pg-YnIDmYqg',
    miniatura: { src: asset('/produto/mini-aaa.png'), alt: 'Pilha recarregável AAA, formato palito' },
    highlight: 'O mesmo padrão, no formato que cabe em tudo.',
    description:
      'A AAA, o palito, leva 1100 mWh e a mesma tecnologia Turbo PowerFast ' +
      'da irmã maior. Mesma porta USB-C, mesmas proteções, mesmos 1.200 ciclos.',
    technicalSheet: [
      { label: 'Capacidade', value: '1100 mWh' },
      { label: 'Cartela', value: '2 ou 4 unidades' },
      ...SHARED_SPECS,
    ],
    compatibility: COMPATIBILITY,
    theme: 'orange',
  },
  {
    index: '03',
    name: 'O KIT',
    subtitle: 'AA ou AAA',
    /* Os mesmos três lugares da régua, com o significado REAL deste painel:
       antes o leitor de tela ouvia "Capacidade: Um formato por kit" */
    meta: [
      { rotulo: 'Conteúdo', valor: 'Cartela de 4' },
      { rotulo: 'Formato', valor: 'Um formato por kit' },
      { rotulo: 'Acompanha', valor: 'Cabo incluso' },
    ],
    /**
     * QUATRO pilhas, de um formato só.
     *
     * A foto que estava aqui mostra as oito, os dois formatos juntos com um
     * cabo, e é justamente o que o kit NÃO é: são dois kits, cada um com
     * quatro pilhas de um formato mais o cabo. O painel 3D se dá ao
     * trabalho de separar em duas ilhas com um "OU" no meio, e a miniatura
     * ao lado desmentia isso.
     */
    miniatura: { src: asset('/produto/mini-kit.png'), alt: 'Kit com quatro pilhas recarregáveis' },
    highlight: 'Quatro pilhas e um cabo. Todas carregando juntas.',
    /**
     * IMPORTANTE: o kit NÃO traz os dois formatos juntos.
     *
     * São dois kits distintos, cada um com quatro pilhas de UM formato mais
     * o cabo. Mostrar oito pilhas lado a lado sem essa separação sugeria um
     * pacote que não existe, e isso é informação errada de produto.
     */
    escolha: 'ou',
    // Curto de propósito: a linha vive numa meia coluna, que no retrato
    // tem pouco mais de 150 px. A capacidade já está na ficha técnica.
    kits: [
      // As duas linhas são PARES: mesma estrutura, mesmo comprimento, só o
      // formato muda. "Quatro palito" faltava o plural e quebrava o par;
      // "palito" segue vivo no subtítulo do painel e na ficha, que é onde
      // ele é apelido e não unidade contada.
      { nome: 'Kit AA', detalhe: 'Quatro AA e o cabo.' },
      { nome: 'Kit AAA', detalhe: 'Quatro AAA e o cabo.' },
    ],
    /**
     * Dois cabos, não um. O de duas pontas acompanha a cartela de 2, o de
     * quatro acompanha a de 4: cada cabo recarrega a cartela inteira de uma
     * vez, então o número de pontas segue o número de pilhas.
     */
    cabos: [
      {
        pontas: '2 pontas Tipo-C',
        imagem: asset('/produto/cabo-2-pontas-v2.png'),
        alt: 'Cabo de recarga USB-A com duas pontas Tipo-C.',
      },
      {
        pontas: '4 pontas Tipo-C',
        // O nome do arquivo carrega o "tipoc" de propósito: a foto anterior
        // tinha ponta Lightning e micro-USB, e trocar o CONTEÚDO de um
        // caminho já visitado deixa o navegador servindo a versão velha.
        // Caminho novo, cache novo.
        imagem: asset('/produto/cabo-4-pontas-tipoc-v2.png'),
        alt: 'Cabo de recarga USB-A com quatro pontas Tipo-C.',
      },
    ],
    /**
     * Fica sob as fotos dos cabos, e diz por escrito o que elas mostram.
     *
     * Em tela muito baixa as fotos saem do painel por falta de espaço; o
     * texto precisa carregar sozinho a informação de que são dois cabos,
     * de duas e de quatro pontas.
     */
    description:
      'USB-A de um lado, pontas Tipo-C do outro: duas pontas na cartela de 2, ' +
      'quatro na de 4. Cada cabo recarrega a cartela inteira de uma vez, ligado ' +
      'em adaptador de tomada, notebook ou powerbank.',
    technicalSheet: [
      { label: 'Kit AA', value: '4 pilhas AA · 3400 mWh cada' },
      { label: 'Kit AAA (palito)', value: '4 pilhas AAA · 1100 mWh cada' },
      { label: 'Os dois formatos', value: 'Vendidos separadamente' },
      { label: 'Cabo', value: 'USB-A com 4 conectores Tipo-C' },
      { label: 'Recarga simultânea', value: 'As 4 de uma vez' },
      { label: 'Fontes compatíveis', value: 'Adaptador, notebook ou powerbank' },
      { label: 'Também disponível', value: 'Cartela de 2 unidades, nos dois formatos' },
      { label: 'Embalagem', value: 'Blister com instruções no verso' },
    ],
    compatibility: [
      'Adaptadores de tomada',
      'Notebooks',
      'Powerbanks',
      'Carregadores Gshield',
    ],
    /**
     * Os quatro SKUs de venda — AA e AAA, em cartelas de 2 ou 4 — cabem
     * nestes três painéis: 01 e 02 tratam do formato, 03 trata do kit nos
     * dois formatos. Nenhum SKU fica de fora e nenhum ganha painel extra.
     */
    theme: 'light',
  },
]

// ---------------------------------------------------------------------------
// Beats narrativos (0 a 3, 7 a 9)
// ---------------------------------------------------------------------------

export const CONTENT = {
  /** Beat 0 — loader */
  loader: {
    caption: 'Carregando',
  },

  /**
   * Beat 1 — hero.
   * Duas linhas curtas, caixa alta, Bebas Neue.
   * Ver REGRAS.md §9.6 — três opções para escolher.
   */
  hero: {
    /**
     * O herói passa a anunciar o PRODUTO, não uma promessa.
     *
     * Era "RECARREGA / ATÉ 1.200 VEZES", que é o argumento — e o argumento
     * agora tem beat próprio, com o contador subindo. Repetido na abertura,
     * ele gastava a novidade antes da hora e deixava a primeira tela sem
     * dizer o que a pessoa está vendo.
     */
    /**
     * Caixa NORMAL no dado; as maiúsculas são da fonte e do CSS.
     *
     * Era 'TURBO POWERFAST'. Renderiza igual — a Bebas Neue não tem
     * minúsculas e o h1 ainda aplica `text-transform: uppercase` —, mas o
     * dado é lido por mais gente que a tela: ele vira o nome acessível do
     * h1, e leitor de tela costuma soletrar cadeia toda em caixa alta. Em
     * caixa normal a string também passa a bater, letra por letra, com o
     * `<title>` e com o `name` do JSON-LD.
     */
    headline: ['Turbo PowerFast'],
    kicker: 'Pilha Recarregável',
    cta: 'Nossos modelos',
  },

  /**
   * Beat 2 — revelação do USB-C. A rotação é o argumento.
   *
   * NADA de texto atrás do produto. Na referência a garrafa está na
   * DIAGONAL e só a ponta dela cruza o parágrafo, então sobra texto legível
   * dos dois lados. A nossa pilha fica em pé e tapa o miolo inteiro: por
   * mais longo que fosse o bloco, o meio de toda linha sumiria.
   *
   * Por isso o conteúdo vem partido em dois blocos curtos, um em cada lado
   * da pilha, em alturas diferentes. Ver REGRAS.md §6.13.
   */
  /**
   * O TEXTO AQUI É CURTO DE PROPÓSITO.
   *
   * Este beat tinha dois títulos com um parágrafo de três linhas cada, e
   * era a única tela da página com dois blocos completos. Enquanto isso o
   * ACONTECIMENTO da cena — o cabo chegando, encaixando e carregando — é
   * o argumento de verdade, e ninguém olha para ele com seis linhas de
   * texto pedindo leitura ao lado.
   *
   * Uma linha por lado. Quem explica é a cena.
   */
  usbc: {
    apoio: 'Recarga Turbo PowerFast',
    esquerda: {
      titulo: 'A porta é na pilha',
      texto: 'Liga o cabo direto nela, como no celular.',
    },
    direita: {
      titulo: 'Recarrega até 1.200 vezes',
      texto: 'Sem dock, sem berço, sem carregador dedicado.',
    },
  },

  /**
   * Beat 3 — o número. Contagem ligada ao scrub.
   *
   * O PARÁGRAFO NÃO REPETE O NÚMERO, e isso é decisão, não esquecimento.
   *
   * Ele dizia "até 1.200 vezes" e fechava com "repetido mil e duzentas
   * vezes", numa tela em que o contador ao lado já mostra 1.200 subindo e
   * as descartáveis caem atrás. Três vezes o mesmo número em três lugares
   * é o texto disputando com a imagem em vez de completá-la, e quem lê
   * duas vezes a mesma informação para de ler a terceira.
   *
   * O número é do CONTADOR. O parágrafo fica com o que o número não diz:
   * o que acontece com uma descartável depois do primeiro uso, e o que
   * cada volta economiza.
   */
  cycles: {
    number: 1200,
    unit: 'recargas',
    paragraph:
      'Cada pilha descartável vira lixo depois de um uso só. Esta volta para ' +
      'a tomada e recomeça, e cada volta é uma descartável que ninguém ' +
      'precisou comprar nem jogar fora.',
  },

  /** Beat 7 — impacto */
  impact: {
    title: 'Uma pilha no lugar de 1.200',
    /**
     * SAIU UMA AFIRMAÇÃO QUE A FICHA NÃO SUSTENTA.
     *
     * O texto anterior era "Trocar descartáveis por recarregáveis reduz
     * resíduo e custo ao mesmo tempo. A conta fecha já no médio prazo." A
     * segunda frase afirma PRAZO DE RETORNO FINANCEIRO, e não existe preço
     * em lugar nenhum da ficha do produto: nem da Gshield, nem de uma
     * descartável, nem de energia. Sem os três não há como saber se a
     * conta fecha em três meses ou em três anos.
     *
     * Fui eu que escrevi a frase, e ela passou porque soa razoável. Soar
     * razoável não é o critério; o critério é ter de onde tirar o número.
     *
     * O que ficou é o que a ficha realmente diz: são 1.200 ciclos, e cada
     * ciclo é um uso que não precisou de pilha nova. A conta de dinheiro
     * fica com quem tem os preços.
     */
    paragraph:
      'Cada recarga é um uso que dispensou uma pilha nova. O campo abaixo ' +
      'conta a troca inteira, uma marca para cada descartável.',
    /**
     * `conta` marca o que sobe do zero com a rolagem, e só o PRIMEIRO sobe.
     *
     * A tensão sempre ficou de fora: contar até 1,5 V não tem drama nenhum e
     * ainda daria a impressão de que a tensão varia, que é o oposto do
     * argumento.
     *
     * A CAPACIDADE saiu pelo mesmo motivo, e por mais um. Contando, a tela
     * exibia capacidades que não existem — com seis linhas do campo acesas
     * ela dizia "1.700 mWh na AA", e numa captura minha estava em "3.354".
     * Número de ficha técnica não tem estado intermediário: ou é 3400 ou
     * está errado. Já as 1.200 descartáveis SÃO uma contagem, e ver a
     * contagem acontecer é o argumento da seção.
     *
     * De quebra some uma divergência de grafia: `contarNoScrub` aplica
     * `toLocaleString('pt-BR')`, então assim que o script assumia o número
     * virava "3.400" — enquanto o HTML servido, o painel do produto e o
     * rótulo oficial escrevem "3400".
     */
    stats: [
      { value: '1.200', label: 'descartáveis substituídas por pilha', conta: 1200 },
      { value: '3400', label: 'mWh na AA', conta: undefined },
      // `conta: undefined` explícito: com `as const` o TypeScript trata
      // cada item como um tipo próprio, e omitir a chave faz a união
      // perder a propriedade inteira
      { value: '1,5 V', label: 'tensão constante', conta: undefined },
    ],
  },

  /** Beat 8 — compra */
  buy: {
    title: 'Energia que acompanha seu ritmo',
    paragraph: 'Disponível nos formatos AA e AAA, em cartelas de 2 ou 4 unidades.',
    cta: 'Onde comprar',
    // Página do produto, não a home (definitivo, 13/08/2026)
    href: 'https://www.gorilashield.com.br/pilha-recarregavel-aa-/-aaa-turbo-powerfast-alta-capacidade-ate-1200-recargas-ideal-para-controles-e-eletronicos-gshield',
    /**
     * A nota diz O QUE VEM E O QUE NÃO VEM, e é por isso que ela existe.
     *
     * Ela era "Para o melhor desempenho, use com os carregadores Gshield", e
     * tinha dois defeitos na última linha antes do clique. Afirmava
     * desempenho sem nenhuma fonte no projeto; e, lida na sequência da
     * página, desmentia o argumento central — "sem dock, sem berço, sem
     * carregador dedicado" aparece no beat 2 e nas descrições da AA e da
     * AAA. Quem chegava aqui entendia que a promessa tinha asterisco.
     *
     * O fato, confirmado pelo cliente, é outro e é simples: o kit acompanha
     * o CABO, não a cabeça de tomada. Dito assim, a nota deixa de competir
     * com a promessa e passa a fazer o serviço que a última linha antes do
     * clique deveria fazer — evitar a compra frustrada de quem imaginou uma
     * fonte na caixa. O link para os carregadores continua, agora como
     * resposta a uma pergunta que o texto acabou de levantar.
     *
     * "Tomada, notebook ou powerbank" não é invenção: é a mesma lista que a
     * descrição do kit já usa (ver `descriptionPanel` do painel 03).
     */
    note: 'O cabo vem no kit; a cabeça de tomada, não. Serve qualquer fonte USB — tomada, notebook ou powerbank.',
    chargerHref: 'https://www.gorilashield.com.br/carregador-turbo',
  },

  /** Beat 9 — footer */
  footer: {
    warranty: '3 meses contra defeitos de fabricação',
    /**
     * ATENDIMENTO, e não marketing.
     *
     * Era `marketing@gorilashield.com.br`: quem chega ao rodapé de uma
     * página de produto com uma dúvida quer suporte, não a caixa de quem
     * anuncia. A embalagem oficial imprime, sob "ATENDIMENTO AO CLIENTE",
     * exatamente este endereço.
     *
     * O domínio da loja continua `gorilashield.com.br` — confirmado pelo
     * cliente — e é ele que segue em `LOJA`, na compra e nas políticas. O
     * canal de atendimento é que mora no outro.
     */
    sac: 'sac.gshield.com.br',
    site: 'gorilashield.com.br',
    /**
     * Endereços confirmados pelo cliente em 13/08/2026.
     *
     * A versão anterior seguia o caminho padrão da plataforma e estava
     * errada nos dois: a política mora num `.html` e as trocas ficam na
     * base de conhecimento, em outro domínio.
     *
     * O texto das políticas continua não sendo nosso: é documento
     * jurídico, e inventar conteúdo legal é pior do que não ter.
     */
    politicas: [
      {
        rotulo: 'Política de privacidade',
        href: 'https://www.gorilashield.com.br/pagina/politica-de-privacidade.html',
      },
      {
        rotulo: 'Trocas e devoluções',
        href: 'https://gorila.movidesk.com/kb/pt-br/article/420592/trocas-e-devolucoes',
      },
    ],
  },
} as const

// ---------------------------------------------------------------------------
// Alternativas de headline — decidir antes do Sprint 3 (REGRAS.md §9.6)
// ---------------------------------------------------------------------------

export const HEADLINE_OPTIONS = [
  { lines: ['RECARREGA', 'ATÉ 1.200 VEZES'], note: 'Direta. O número é o argumento mais forte que existe.' },
  { lines: ['A ÚLTIMA PILHA', 'QUE VOCÊ COMPRA'], note: 'Promessa. Mais memorável, menos literal.' },
  { lines: ['ENERGIA', 'QUE VOLTA'], note: 'Curta. Melhor ritmo em Bebas, mas exige o subtítulo para fechar o sentido.' },
] as const
