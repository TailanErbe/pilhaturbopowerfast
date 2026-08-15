/**
 * Camadas da página.
 *
 * A cena 3D é um <canvas> FIXO único (§6.3). Para a pilha aparecer entre o
 * fundo colorido e o texto — como na referência — os três precisam viver no
 * MESMO contexto de empilhamento, ordenados por z:
 *
 *   z-0        fundo da seção   (<SectionBg>)
 *   z-1        canvas 3D no MOBILE — passa atrás do texto
 *   z-2        conteúdo         (<SectionContent>)
 *   z-9 (lg)   canvas 3D no DESKTOP — passa na frente do texto
 *   z-20       header
 *
 * A inversão no desktop é da referência (klimtwine usa `z_3 lg:z_9` no
 * canvas, conteúdo em z_4, painéis em z_8): no retrato a tela é estreita e
 * o produto por cima atrapalharia a leitura; no desktop sobra largura, e
 * passar à frente é o que dá a sensação de objeto real atravessando a
 * página.
 *
 * Por isso nem <main> nem as <section> podem criar contexto próprio: nada
 * de `z-index`, `transform`, `filter` ou `isolation` nesses níveis. Se
 * alguém puser `z-10` no <main> de novo, a cena some atrás da página — foi
 * exatamente o que aconteceu antes.
 */

export function SectionBg({
  className = '',
  noAto = false,
}: {
  className?: string
  /**
   * A seção vive DENTRO do ato pinado.
   *
   * Nesse caso o fundo dela não é pintado aqui: quem pinta é a camada
   * única do <FundoDoAto />, que fica ABAIXO do canvas 3D. É o que
   * permite o produto passar entre o fundo e o texto — dentro do ato,
   * um fundo por seção ficaria por cima do canvas e o esconderia.
   *
   * `motion-safe:` e não uma condição em JavaScript: com movimento
   * reduzido a timeline não é montada, ninguém dirige a cor da camada, e
   * aí é o fundo da própria seção que tem de valer. As duas metades leem
   * a MESMA consulta de mídia que o PinnedAct usa para decidir se pina,
   * então não há como discordarem.
   */
  noAto?: boolean
}) {
  return (
    <div
      aria-hidden
      className={`absolute inset-0 z-0 ${className} ${noAto ? 'motion-safe:bg-transparent' : ''}`}
    />
  )
}

export function SectionContent({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={`relative z-2 ${className}`}>{children}</div>
}

/**
 * Coluna de texto encostada numa borda, deixando o EIXO CENTRAL livre.
 *
 * O produto fica no centro da tela (ver scene-state.ts) e o texto se
 * distribui pelas laterais, como na referência. Cada coluna ocupa no
 * máximo 38% da largura, o que garante uma faixa central limpa de ~24%
 * para o produto respirar.
 *
 * Onde texto e produto se cruzam, o produto passa na frente no desktop —
 * é intencional e dá a sensação de objeto real atravessando a página.
 */
export function EdgeColumn({
  side = 'left',
  children,
  className = '',
}: {
  side?: 'left' | 'right'
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`relative z-2 w-full md:w-[38%] ${
        side === 'right' ? 'md:ml-auto' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
