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
  /** Linha de meta: aparece na régua sob o título */
  meta: { format: string; capacity: string; period: string }
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
export const PROTECTIONS = [
  'Sobrecarga',
  'Sobretensão',
  'Curto-circuito',
  'Sobrepotência',
  'Sobrecorrente',
  'Superaquecimento',
] as const

const SHARED_SPECS: SpecRow[] = [
  { label: 'Tensão nominal', value: '1,5 V' },
  { label: 'Ciclos de recarga', value: 'Até 1.200' },
  { label: 'Tecnologia', value: 'Turbo PowerFast' },
  { label: 'Recarga', value: 'USB-C direto na pilha' },
  { label: 'Chip inteligente', value: `${PROTECTIONS.length} proteções integradas` },
  { label: 'Acabamento', value: 'Fosco' },
  { label: 'Garantia', value: '3 meses contra defeitos de fabricação' },
]

const COMPATIBILITY = [
  'Controles remotos',
  'Brinquedos',
  'Teclados',
  'Mouses',
  'Lanternas',
  'Câmeras digitais',
]

// ---------------------------------------------------------------------------
// Painéis de produto (beats 4, 5, 6)
// ---------------------------------------------------------------------------

export const PRODUCTS: Product[] = [
  {
    index: '01',
    name: 'AA',
    meta: { format: 'Pilha recarregável', capacity: '3400 mWh', period: '1,5 V' },
    dimensions: DIMENSIONS.AA,
    // A mesma foto serve aos painéis 01 e 02: é a cartela de 2 com o cabo,
    // e na miniatura da pílula a diferença de tamanho entre AA e palito
    // não seria legível de qualquer forma
    miniatura: { src: asset('/produto/cartela-2-v2.png'), alt: 'Cartela de duas pilhas AA com cabo' },
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
    meta: { format: 'Pilha recarregável', capacity: '1100 mWh', period: '1,5 V' },
    dimensions: DIMENSIONS.AAA,
    miniatura: { src: asset('/produto/cartela-2-v2.png'), alt: 'Cartela de duas pilhas palito com cabo' },
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
    meta: { format: 'Cartela de 4', capacity: 'Um formato por kit', period: 'Cabo incluso' },
    miniatura: { src: asset('/produto/cartela-kit-v2.png'), alt: 'Kit de pilhas recarregáveis com cabo de quatro pontas' },
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
      { nome: 'Kit AA', detalhe: 'Quatro AA e o cabo.' },
      { nome: 'Kit AAA', detalhe: 'Quatro palito e o cabo.' },
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
    headline: ['RECARREGA', 'ATÉ 1.200 VEZES'],
    kicker: 'Pilha Recarregável Turbo PowerFast',
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

  /** Beat 3 — o número. Contagem ligada ao scrub. */
  cycles: {
    number: 1200,
    unit: 'recargas',
    paragraph:
      'Cada pilha descartável vira lixo depois de um uso. Uma Gshield volta ' +
      'à tomada até 1.200 vezes. É economia real e um resíduo a menos, ' +
      'repetido mil e duzentas vezes.',
  },

  /** Beat 7 — impacto */
  impact: {
    title: 'Uma pilha no lugar de 1.200',
    paragraph:
      'Trocar descartáveis por recarregáveis reduz resíduo e custo ao mesmo tempo. ' +
      'A conta fecha já no médio prazo.',
    /**
     * `conta` marca o que sobe do zero com a rolagem. A tensão fica de
     * fora: contar até 1,5 V não tem drama nenhum e ainda daria a
     * impressão de que a tensão varia, que é o oposto do argumento.
     */
    stats: [
      { value: '1.200', label: 'descartáveis substituídas por unidade', conta: 1200 },
      { value: '3400', label: 'mWh na AA', conta: 3400 },
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
    note: 'Para o melhor desempenho, use com os carregadores Gshield.',
    chargerHref: 'https://www.gorilashield.com.br/carregador-turbo',
  },

  /** Beat 9 — footer */
  footer: {
    warranty: '3 meses contra defeitos de fabricação',
    email: 'marketing@gorilashield.com.br',
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
