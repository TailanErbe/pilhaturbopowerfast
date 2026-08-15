import Image from 'next/image'
import type { Product } from '@/data/products'
import { SectionBg } from '@/components/layout/Layer'
import { FaixaDaCena } from '@/components/scene/FaixaDaCena'

/**
 * Beats 4, 5 e 6 — painéis de produto.
 *
 * O regime tonal vem do próprio produto (REGRAS.md §5.1):
 *   dark   → fundo preto, texto branco
 *   orange → fundo #FFA400, texto preto   ← nunca texto branco aqui (2.1:1)
 *   light  → fundo branco, texto preto
 *
 * Accordions usam <details>/<summary> nativos: funcionam sem JS,
 * acessíveis por teclado de graça.
 */

const THEMES = {
  dark: {
    bg: 'bg-surface-000',
    section: 'text-brand-white',
    rule: 'border-white/25',
    /* A régua de meta é um elemento, não um border: ver `regua-vazada` */
    regua: 'bg-white/25',
    muted: 'text-white/70',
    accent: 'text-brand-orange',
  },
  orange: {
    bg: 'bg-brand-orange',
    section: 'text-brand-black',
    rule: 'border-black/25',
    regua: 'bg-black/25',
    muted: 'text-black/70',
    accent: 'text-brand-black',
  },
  light: {
    bg: 'bg-brand-white',
    section: 'text-brand-black',
    rule: 'border-black/20',
    regua: 'bg-black/20',
    muted: 'text-black/70',
    /**
     * PRETO, não laranja.
     *
     * `text-orange-deep` é #F59C00, que sobre branco dá 2,18:1. Reprova
     * até no limiar de texto grande (3:1), e o accent aqui é justamente o
     * numeral do título e o "OU", os dois em corpo grande.
     *
     * Nenhum laranja da paleta salva: #FFA400 dá 1,99:1 e os mais claros,
     * menos ainda. Sobre branco o laranja da marca só funciona como
     * CHAPADO de fundo com tinta preta por cima (10,56:1), nunca como
     * tinta de texto.
     */
    accent: 'text-brand-black',
  },
} as const

type Tema = (typeof THEMES)[keyof typeof THEMES]

/**
 * Marca o painel como superfície clara para o anel de foco se inverter.
 *
 * O anel padrão é branco por dentro e preto por fora; sobre fundo claro
 * o branco de dentro some e sobra um filete preto fino demais. A classe
 * troca a ordem dos dois. Ver `:focus-visible` em globals.css.
 */
const claro = (tema: Product['theme']) =>
  tema === 'dark' ? '' : 'superficie-clara'

function Fichas({ product, t }: { product: Product; t: Tema }) {
  return (
    <div>
      <details className={`border-t py-3 md:py-4 ${t.rule}`}>
        <summary className="cursor-pointer list-none text-sm font-bold">
          Ficha técnica
        </summary>
        <dl className="mt-4 grid gap-2 text-sm">
          {product.technicalSheet.map((row) => (
            <div key={row.label} className="flex justify-between gap-6">
              <dt className={t.muted}>{row.label}</dt>
              <dd className="text-right">{row.value}</dd>
            </div>
          ))}
        </dl>
      </details>

      <details className={`border-t py-3 md:py-4 ${t.rule}`}>
        <summary className="cursor-pointer list-none text-sm font-bold">
          Compatibilidade
        </summary>
        <ul className={`mt-4 grid gap-1 text-sm ${t.muted}`}>
          {product.compatibility.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
    </div>
  )
}

export function ProductPanel({ product }: { product: Product }) {
  const t = THEMES[product.theme]
  const escolha = product.escolha === 'ou'

  /**
   * Título e régua entram por CLIP-REVEAL: sobem por baixo de uma borda
   * dura, sem mudar de opacidade. É a técnica que a referência usa nos
   * títulos de painel, e o escalonamento entre os dois dá a ordem de
   * montagem. Ver motion/texto.ts e a utilidade `mascara-clip`.
   *
   * A máscara precisa ser o elemento PAI: um elemento não consegue se
   * cortar e se mover ao mesmo tempo.
   */
  const cabecalho = (
    <div>
      {/* Folga maior aqui: a Bebas em 88px derruba o rabo do "Q" uns 10px
          abaixo da linha de base, e o padrão de 4px cortaria */}
      <span className="mascara-clip [--folga-descida:14px]">
        <h2
          data-clip
          className="flex flex-wrap items-baseline gap-[0.4em] text-[clamp(2.25rem,6vw,5.5rem)]"
        >
          <span className={t.accent}>{product.index}</span>
          <span>{product.name}</span>
          {product.subtitle && (
            <span className={`text-[0.32em] tracking-wide ${t.muted}`}>
              {product.subtitle}
            </span>
          )}
        </h2>
      </span>

      {/**
       * Régua de meta: extremos da largura, CENTRO VAGO.
       *
       * Ela era um `border-t` no <dl>, e um border vai de ponta a ponta:
       * a linha atravessava o corpo da pilha. O produto é o herói da
       * página e nada passa por cima dele (§6.4c) — nem um filete de um
       * pixel, que num render fosco é justamente o tipo de detalhe que
       * denuncia que o objeto foi colado ali.
       *
       * Aqui ela é um elemento próprio, e some no corredor central. A
       * dissolução é suave nas bordas: um corte seco leria como linha
       * quebrada, e o que se quer é a linha PASSANDO ATRÁS.
       *
       * Vazada só nos painéis 01 e 02. No do kit a cena mora na coluna
       * esquerda e bem mais abaixo, então ali a linha não encontra nada
       * e um vão no meio seria um buraco sem motivo.
       */}
      <span className="mascara-clip mt-6">
        <div data-clip>
          <span
            aria-hidden
            className={`block h-px w-full ${t.regua} ${escolha ? '' : 'regua-vazada'}`}
          />
          <dl
            className={`flex flex-wrap items-center justify-between gap-x-8 gap-y-2 pt-4 text-sm ${t.muted}`}
          >
            <div className="flex gap-8">
              <div className="flex gap-2">
                <dt className="sr-only">Formato</dt>
                <dd>{product.meta.format}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="sr-only">Capacidade</dt>
                <dd>{product.meta.capacity}</dd>
              </div>
            </div>
            <div className="flex gap-2">
              <dt className="sr-only">Tensão</dt>
              <dd>{product.meta.period}</dd>
            </div>
          </dl>
        </div>
      </span>
    </div>
  )

  /**
   * O painel do kit mantém as duas colunas dos outros, mas troca o que
   * cada uma carrega.
   *
   * Nos painéis 01 e 02 o produto é um objeto só, esguio, e passa pelo vão
   * central entre as colunas de texto. Aqui são oito corpos em duas ilhas:
   * o conjunto não cabe num vão de 24% e, largo do jeito que é, cruzaria
   * as duas colunas (contra a §6.4c).
   *
   * Então a cena inteira se muda para a coluna ESQUERDA, com a explicação
   * de cada kit logo abaixo da sua ilha, e a direita fica com os cabos e as
   * fichas. O "OU" cai no vão entre as ilhas, que é o centro da coluna (ver
   * o comentário de VAO em scene/Kit.tsx).
   */
  if (escolha) {
    return (
      <section
        id={`produto-${product.index}`}
        className={`relative flex h-full min-h-dvh overflow-hidden ${t.section} ${claro(product.theme)}`}
      >
        <SectionBg className={t.bg} noAto />

        <div className="container-gutter relative z-2 flex w-full flex-col py-[clamp(20px,3.5vh,96px)]">
          {cabecalho}

          {/**
           * A coluna da cena é mais larga que a dos cabos.
           *
           * A altura das pilhas é sempre cerca de 30% da largura da coluna:
           * oito corpos em fila formam uma composição larga e baixa, e a
           * única alavanca para elas ocuparem mais tela é dar mais largura.
           * Metade a metade sobrava um vazio grande acima delas.
           */}
          <div className="mt-4 grid flex-1 gap-x-[4%] gap-y-8 md:grid-cols-[1.5fr_1fr]">
            {/* ESQUERDA: os dois kits em 3D, com o "OU" no vão */}
            <div className="flex min-h-0 flex-col justify-end">
              {/* A frase fica JUNTO das pilhas, não no topo do painel: lá
                  em cima ela abria um vão morto entre o texto e a cena.
                  Perto, mas não colada: encostada no topo do produto ela
                  disputa espaço com a tampa em vez de anunciá-la. */}
              {/**
               * A frase VOLTA no retrato.
               *
               * Ela era `hidden md:block`, escondida porque no celular
               * "não sobrava altura" — e sumia justamente a linha que diz
               * o que o painel é: quatro pilhas e um cabo, todas
               * carregando juntas. Os outros dois painéis mostram a
               * frase deles em qualquer largura; só este perdia.
               *
               * O motivo de esconder também caducou. A cena 3D agora se
               * dimensiona pela faixa livre que o texto deixa (ver
               * TetosDoRetrato), então uma linha a mais encolhe um pouco
               * as pilhas em vez de atropelá-las.
               */}
              <span className="mascara-clip mb-[clamp(16px,5vh,56px)] [--folga-descida:8px]">
                <p data-clip className="texto-lead">
                  {product.highlight}
                </p>
              </span>
              {/**
               * Vazia por dentro: ela se mede e a cena 3D cabe no que
               * sobrou (ver FaixaDaCena).
               *
               * A proporção é fixa, não `flex-1`, porque oito pilhas em
               * fila formam uma composição larga e baixa: a altura que elas
               * pedem é sempre ~30% da largura da coluna, venha de onde
               * vier a tela. Deixando a faixa esticar, ela reservava altura
               * que a cena nunca ia usar e o "OU" flutuava acima das
               * pilhas, longe do vão que ele nomeia.
               */}
              <FaixaDaCena className="relative aspect-[2.8/1] max-h-full w-full min-h-0">
                {/**
                 * O "OU" é CHAPADO laranja com tinta preta, não texto
                 * laranja.
                 *
                 * Sobre o branco deste painel, laranja como tinta dá
                 * 2,18:1 e reprova. Invertendo, o mesmo laranja vira fundo
                 * e a tinta preta sobre ele dá 10,56:1. A marca continua
                 * presente e a leitura passa.
                 */}
                <span
                  aria-hidden
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-orange px-[0.5em] py-[0.12em] font-display text-[clamp(1.75rem,3.4vw,3rem)] leading-none text-brand-black"
                >
                  OU
                </span>
              </FaixaDaCena>

              {/* A explicação de cada kit, sob a sua ilha */}
              <div className={`mt-5 grid grid-cols-2 border-t ${t.rule}`}>
                {product.kits?.map((kit, i) => (
                  <div
                    key={kit.nome}
                    className={`pt-4 ${i === 1 ? `border-l pl-5 ${t.rule}` : 'pr-5'}`}
                  >
                    <p className="font-display text-[clamp(1rem,1.5vw,1.4rem)] leading-none">
                      {kit.nome}
                    </p>
                    <p className={`mt-2 text-sm ${t.muted}`}>{kit.detalhe}</p>
                  </div>
                ))}
              </div>
            </div>

            {/**
             * DIREITA: os dois cabos, depois ficha e compatibilidade.
             *
             * Alturas determinísticas, sem `flex-1` + `min-h-0` encadeados.
             * Com a cadeia, quando a coluna apertava (retrato), o item podia
             * encolher abaixo do próprio conteúdo e as duas figuras
             * colapsavam para altura zero: as fotos sumiam da página sem
             * nenhum aviso, e nada no layout denunciava a perda.
             */}
            {/* Alinhada por BAIXO, como a coluna da cena: com uma no topo e
                outra no pé, sobrava um vazio em diagonal no painel */}
            <div className="flex flex-col justify-between">
              {/**
               * As fotos saem de cena só no celular baixo.
               *
               * O painel não rola: ele é uma tela do trecho pinado, e num
               * aparelho de 667 px de altura o conteúdo passava 65 px do
               * fim, empurrando a ficha técnica para fora. A condição pede
               * as DUAS coisas, pouca altura e pouca largura, para que a
               * janela larga e baixa de desktop continue com as fotos.
               *
               * Nada se perde: a descrição logo abaixo diz por escrito que
               * são dois cabos, de duas e de quatro pontas.
               */}
              {/**
               * O corte cobre a faixa inteira de celular, não só os baixos.
               *
               * A condição era `max-height: 699px`, e num 390×844 comum o
               * painel estourava 62px: a última linha da ficha técnica ficava
               * cortada e "Compatibilidade" caía fora da tela. Como a seção é
               * `overflow-hidden` dentro do pin, o excedente não vira barra de
               * rolagem, vira conteúdo perdido (§4g).
               *
               * Medido: em 390×844 o estouro é 62px, em 412×915 é zero. O teto
               * de 910px cobre 800, 844 e 852, que é onde estão os aparelhos.
               */}
              <div className="grid grid-cols-2 gap-x-[3%] [@media(max-height:910px)_and_(max-width:767px)]:hidden">
                {product.cabos?.map((cabo) => (
                  <figure key={cabo.pontas} className="flex flex-col">
                    {/**
                     * A altura é o que manda, e é CONTIDA de propósito.
                     *
                     * Deixando a foto ocupar a largura da coluna, o cabo
                     * saía maior que a pilha. É acessório: acessório maior
                     * que o produto inverte a hierarquia da página e é a
                     * primeira coisa que denuncia composição amadora.
                     *
                     * O teto fica em torno da metade da altura das pilhas,
                     * que é a proporção real entre um cabo enrolado e uma
                     * cartela em pé.
                     */}
                    <div className="relative h-[clamp(110px,26vh,240px)] w-full">
                      {/* object-contain: as duas fotos têm enquadramentos
                          diferentes e recortar mudaria o comprimento
                          aparente de cada cabo */}
                      <Image
                        src={cabo.imagem}
                        alt={cabo.alt}
                        fill
                        sizes="(max-width: 768px) 45vw, 24vw"
                        // 75 é o padrão e borra o cabo: a peça é fina, preta
                        // e cheia de reflexo estreito, justo o que o JPEG
                        // come primeiro
                        quality={92}
                        className="object-contain object-center"
                      />
                    </div>
                    <figcaption
                      className={`mt-2 border-t pt-2 text-xs md:mt-3 md:pt-3 md:text-sm ${t.rule} ${t.muted}`}
                    >
                      {cabo.pontas}
                    </figcaption>
                  </figure>
                ))}
              </div>

              <p className={`texto-nota mt-4 md:mt-5 ${t.muted}`}>
                {product.description}
              </p>

              <div className="mt-4 md:mt-5">
                <Fichas product={product} t={t} />
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      id={`produto-${product.index}`}
      className={`relative flex h-full min-h-dvh items-center overflow-hidden ${t.section} ${claro(product.theme)}`}
    >
      <SectionBg className={t.bg} noAto />

      {/* Estrutura da referência: título em faixa larga no topo, régua de
          meta abaixo, e então DUAS colunas nas bordas — o vão central fica
          livre para o produto. */}
      <div className="container-gutter base-do-retrato relative z-2 md:py-[clamp(80px,14vh,160px)]">
        {cabecalho}

        {/* No retrato o respiro entre os blocos é menor: com o produto
            ocupando o terço de cima, o que sobra é altura, não largura */}
        <div className="mt-3 grid gap-4 md:mt-12 md:grid-cols-[38%_24%_38%] md:gap-0">
          {/* Coluna esquerda: a frase de destaque */}
          <span className="mascara-clip [--folga-descida:8px]">
            <p data-clip className="texto-lead">
              {product.highlight}
            </p>
          </span>

          {/* Vão central: reservado à pilha 3D */}
          <div aria-hidden className="hidden min-h-[clamp(280px,42vh,520px)] md:block" />

          {/* Coluna direita: descrição e fichas */}
          <div className="grid gap-4 md:gap-8">
            <p className={`texto-corpo ${t.muted}`}>{product.description}</p>
            <Fichas product={product} t={t} />
          </div>
        </div>
      </div>
    </section>
  )
}
