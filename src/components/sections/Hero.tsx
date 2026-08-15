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
       * A moldura da primeira tela.
       *
       * Uma tela com o produto no meio e texto nos cantos não tem nada
       * dizendo onde ela começa e termina — o preto do fundo e o preto da
       * borda do navegador são o mesmo preto, e a composição fica boiando.
       * O filete resolve isso e ainda dá à abertura um ar de peça
       * impressa, com margem declarada.
       *
       * Fica ACIMA do produto de propósito: no herói o canvas sobe para
       * cima do ato (ver FundoDoAto), e uma moldura que o objeto
       * atravessasse deixaria de ser moldura.
       */}
      {/**
       * 26% e não 12%.
       *
       * A 12% ela existia e não se via: o halo do produto ilumina o meio
       * da tela e levanta o preto em volta, e um filete quase transparente
       * desaparece contra esse fundo aceso. Borda de moldura precisa
       * ganhar do fundo mais claro que ela vai encontrar, não do mais
       * escuro.
       */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-4 z-3 rounded-xl border border-white/26 sm:inset-6"
      />

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
          {/* O piso do clamp é do CELULAR: em 390 de largura, 2,4vw dá
              9px e a linha some. Quem manda no retrato é o piso, não o vw */}
          <p className="font-display text-[clamp(1.5rem,2.4vw,2.2rem)] tracking-[0.1em] text-white">
            {CONTENT.hero.kicker}
          </p>

          {/* Uma linha só: é o nome do produto, não uma frase. O espaço
              final evita que leitores de tela juntem as palavras */}
          <h1 className="font-display text-[clamp(3rem,5.4vw,5rem)] leading-[0.95] tracking-[0.04em] text-brand-orange">
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
      <div className="container-gutter absolute inset-x-0 bottom-[84px] z-2 flex flex-col items-start gap-1 md:bottom-6 md:flex-row md:items-end md:justify-between">
        <p className="max-w-[34ch] text-sm text-white/60">
          Disponível em AA e AAA, com cabo de recarga simultânea incluso.
        </p>
        <p className="text-sm text-white/40">Role para explorar</p>
      </div>
    </section>
  )
}
