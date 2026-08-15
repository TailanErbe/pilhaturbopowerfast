import { CONTENT } from '@/data/products'
import { SectionBg } from '@/components/layout/Layer'

/**
 * Beat 1 — herói.
 *
 * O produto SOZINHO, de frente, no eixo central, com o nome dele em cima e
 * duas linhas de serviço nos cantos de baixo. Mais nada.
 *
 * Antes o texto era um bloco encostado à esquerda com a promessa das 1.200
 * recargas, e o cabo já nascia plugado. Duas coisas erradas na mesma tela:
 * a promessa gastava aqui a novidade que tem um beat inteiro só para ela,
 * e o cabo punha um segundo assunto ao lado do produto que a página existe
 * para vender.
 *
 * O título vai ACIMA do produto, centralizado, e não ao lado: no eixo
 * central o objeto tem a tela toda para si, e é assim que se fotografa
 * produto. As duas linhas dos cantos são informação de serviço — onde o
 * produto existe e o que fazer agora — e por isso ficam onde o olho só
 * passa depois.
 */
export function Hero() {
  return (
    <section
      id="topo"
      className="relative flex h-full min-h-dvh flex-col overflow-hidden"
    >
      <SectionBg className="bg-surface-000" noAto />

      {/**
       * NÃO EXISTE MOLDURA AQUI, e isso é decisão tomada.
       *
       * Houve um filete de 1 px em volta da primeira tela, pedido para
       * resolver um problema real: o preto do fundo e o preto da borda do
       * navegador são o mesmo preto, e sem nada declarando onde a
       * composição começa ela fica boiando.
       *
       * Ele saiu porque falhava no próprio objetivo. Filete fino, de baixo
       * contraste e recuado poucos pixels da borda da tela não lê como
       * moldura: lê como sobreposição de ferramenta. O cliente olhou e
       * perguntou se aquilo era marcação de segurança e se iria para o
       * servidor — e quando o dono do produto confunde um elemento de
       * composição com artefato de build, a intenção não está chegando,
       * por mais correto que seja o argumento que a criou.
       *
       * Se o problema do preto contra preto voltar a incomodar, o caminho
       * NÃO é engrossar este filete. É dar corpo ao fundo: uma queda de
       * luminância nas bordas, ou o próprio halo do produto assumindo o
       * papel de dizer onde a cena está acesa. Borda desenhada é a
       * resposta mais literal e a que mais parece ferramenta.
       */}
      {/**
       * O bloco do nome fica na faixa de cima, acima do produto.
       *
       * `pt` grande o bastante para não encostar no cabeçalho e no logo, e
       * o produto começa logo abaixo (ver a pose do beat 1 e, no retrato,
       * a faixa que ele ocupa em RETRATO/Battery.tsx).
       */}
      {/**
       * As duas linhas formam UM bloco, alinhadas à esquerda entre si.
       *
       * O bloco é que fica centrado sobre o produto, não cada linha por si.
       * Centralizar as duas separadamente daria dois eixos diferentes, e a
       * descida da primeira para a segunda perderia a régua — que é o que
       * segura um lockup de nome de produto.
       *
       * `w-fit` mais `mx-auto`: o bloco tem a largura da linha mais longa,
       * que é a do nome, e é essa caixa que se centraliza.
       */}
      <div className="container-gutter relative z-2 pt-[max(11vh,88px)]">
        <div className="mx-auto w-fit text-left">
          {/**
           * O KICKER MORA DENTRO DO h1, e isso é semântica, não diagramação.
           *
           * Ele era um `<p>` irmão. Visualmente dava o mesmo lockup, mas o
           * h1 da página passava a ser só "Turbo PowerFast" — que é o nome
           * da tecnologia, não do produto. Quem navega por títulos com leitor
           * de tela, e o buscador, nunca ficavam sabendo o que a página
           * vende. O `<title>` (layout.tsx) e o JSON-LD (DadosDoProduto) já
           * diziam "Pilha Recarregável Turbo PowerFast"; o h1 era o único
           * lugar que discordava dos dois.
           *
           * Juntos num h1 só, o nome acessível vira exatamente a mesma
           * string dos outros dois. E NADA muda na tela — foi conferido
           * antes e depois:
           *
           *   · a Bebas Neue não tem minúsculas. "Pilha Recarregável" e
           *     "PILHA RECARREGÁVEL" medem os mesmos 155,4 px, então o
           *     `text-transform: uppercase` que o h1 aplica (globals.css)
           *     não altera um pixel;
           *   · o `leading-[1.4]` do span é obrigatório e reproduz o
           *     `--leading-body` que o `<p>` tinha. Sem ele o span herdaria
           *     o `leading-[0.95]` do h1, a linha encolheria de 33,6 para
           *     22,8 px e o nome subiria junto.
           *
           * O piso do clamp é do CELULAR: em 390 de largura, 2,4vw dá 9px e
           * a linha some. Quem manda no retrato é o piso, não o vw.
           */}
          <h1 className="font-display text-[clamp(3rem,5.4vw,5rem)] leading-[0.95] tracking-[0.04em] text-brand-orange">
            {/* O espaço final é o mesmo cuidado das linhas do nome: sem ele
                o nome acessível sai "Pilha RecarregávelTurbo PowerFast" */}
            <span className="block text-[clamp(1.5rem,2.4vw,2.2rem)] leading-[1.4] tracking-[0.1em] text-white">
              {CONTENT.hero.kicker}{' '}
            </span>
            {/* Uma linha só: é o nome do produto, não uma frase. O espaço
                final evita que leitores de tela juntem as palavras */}
            {CONTENT.hero.headline.map((linha) => (
              <span key={linha} className="block">
                {linha}{' '}
              </span>
            ))}
          </h1>
        </div>
      </div>

      {/**
       * Rodapé do herói: disponibilidade à esquerda, chamada de rolagem à
       * direita. O centro fica vago — é onde o produto e a pílula vivem.
       */}
      {/**
       * No RETRATO as duas linhas empilham acima da pílula.
       *
       * Elas eram `hidden md:flex` e simplesmente sumiam no celular, junto
       * com a chamada de rolagem — numa página de dezesseis telas de
       * scroll, justo a instrução de que há algo abaixo. "Não cabe lado a
       * lado" não é motivo para remover conteúdo; é motivo para empilhar.
       *
       * O `bottom` do retrato reserva a altura da pílula, que é fixa e
       * mora no mesmo canto.
       */}
      {/**
       * As duas linhas descem para a base da tela.
       *
       * Elas estavam em `bottom-[84px]`, reserva feita para a pílula
       * quando ela ainda aparecia no herói. A pílula cede lugar à barra
       * agora, e a reserva virou um vão: o texto ficava colado na barra
       * com 84 px de tela vazia embaixo dele.
       */}
      <div className="container-gutter absolute inset-x-0 bottom-6 z-2 flex flex-col items-start gap-1 md:flex-row md:items-end md:justify-between">
        <p className="max-w-[34ch] text-sm text-white/60">
          Disponível em AA e AAA, com cabo de recarga simultânea incluso.
        </p>
        {/* No retrato ele vai para o canto OPOSTO ao da disponibilidade:
            empilhados do mesmo lado, os dois liam como um parágrafo só */}
        {/**
         * `/50` e não `/40`: a `/40` REPROVAVA em contraste.
         *
         * Branco a 40% sobre o preto puro deste beat compõe #666666, que dá
         * 3,66:1 — abaixo dos 4,5:1 que a WCAG 2.2 (SC 1.4.3) exige de texto
         * normal, e isto é `text-sm`, ou seja 14 px. A `/50` compõe #808080 e
         * dá 5,32:1.
         *
         * Ela continua um degrau abaixo da linha de disponibilidade, que é
         * `/60` e mede 7,37:1 — a diferença de peso que a diagramação quer
         * está preservada; o que muda é ela passar a existir para quem enxerga
         * pouco. E a folga importa porque o fundo daqui vai clarear: o teto
         * medido para este texto é fundo 72/255.
         */}
        <p className="self-end text-sm text-white/50 md:self-auto">
          Role para explorar
        </p>
      </div>
    </section>
  )
}
