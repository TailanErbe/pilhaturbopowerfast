'use client'

import Image from 'next/image'
import { CONTENT, PRODUCTS } from '@/data/products'
import { irParaPosicao } from '@/lib/lenis'
import { scrollDoBeat } from '@/motion/labels'
import { obterTimeline } from '@/motion/registro'
import { useNoHeroi } from '@/lib/no-heroi'

/**
 * A barra da primeira tela: AA, AAA, o kit e onde comprar.
 *
 * No rascunho ela é uma coluna à direita, aberta. Aqui ela existe SÓ no
 * herói e se recolhe na pílula ao entrar no segundo beat, e a razão é de
 * composição: o herói tem largura de sobra, os beats seguintes não. Os
 * painéis de produto são 38% de texto, um vão central para o objeto e mais
 * 38% de texto — uma barra permanente à direita ou invadiria a coluna ou a
 * estreitaria. E no retrato ela não caberia de jeito nenhum, o que
 * obrigaria a manter duas navegações diferentes.
 *
 * O carrinho do rascunho virou "onde comprar". A página não tem carrinho:
 * a compra acontece na loja, em outro domínio. Um ícone de carrinho que
 * abre outro site promete o que não entrega, e cobra essa conta no exato
 * momento em que a pessoa decidiu comprar.
 */
export function BarraDoHeroi() {
  const presenca = useNoHeroi()

  /**
   * Some do DOM quando invisível, e não só da tela.
   *
   * `opacity: 0` deixaria a barra clicável e no caminho do TAB, com o
   * teclado parando em três links que ninguém vê. `visibility` resolve os
   * dois de uma vez e ainda permite a transição de opacidade.
   */
  const oculta = presenca < 0.01

  const irPara = (id: string) => {
    const tl = obterTimeline()
    if (!tl) return
    irParaPosicao(scrollDoBeat(id, tl.inicio(), tl.altura()))
  }

  /**
   * A MESMA barra, em duas formas.
   *
   * No desktop ela é uma coluna encostada à direita, onde sobra largura.
   * No retrato não há coluna a ocupar: ela vira uma LINHA abaixo do
   * produto, acima das duas linhas de serviço do rodapé.
   *
   * Antes ela era simplesmente `hidden md:block`, e o celular ficava sem
   * navegação nenhuma na primeira tela — a barra escondida por CSS e a
   * pílula apagada pelo sinal do herói. "Não cabe do mesmo jeito" não é
   * motivo para remover; é motivo para mudar de forma.
   */
  return (
    <div
      aria-hidden={oculta}
      style={{ opacity: presenca, visibility: oculta ? 'hidden' : 'visible' }}
      className="pointer-events-none fixed inset-x-0 bottom-[152px] z-30 md:inset-x-auto md:top-1/2 md:bottom-auto md:right-0 md:-translate-y-1/2 md:pr-[var(--spacing-gutter)]"
    >
      <nav
        aria-label="Nossas pilhas"
        className="pointer-events-auto flex flex-row items-center justify-center gap-3 md:flex-col md:items-start md:justify-start md:gap-1"
      >
        <p className="hidden text-xs tracking-[0.22em] text-white/50 uppercase md:mb-3 md:block">
          Nossas pilhas
        </p>

        {PRODUCTS.map((p) => (
          <button
            key={p.index}
            type="button"
            onClick={() => irPara(`produto-${p.index}`)}
            /**
             * No retrato o nome fica ABAIXO da foto, não ao lado.
             *
             * Lado a lado, três itens mais o carrinho passam de 390 px e
             * a linha quebra. Empilhados, cada um ocupa a largura da
             * própria miniatura e a fileira cabe com folga.
             */
            className="group flex flex-col items-center gap-1 rounded-xl p-1.5 transition-colors hover:bg-white/5 md:flex-row md:gap-3 md:py-1.5 md:pr-3 md:pl-1.5 md:text-left"
          >
            {/* A foto vem do mesmo lugar da pílula: é o mesmo destino, e o
                numeral no canto é a âncora de navegação da página inteira */}
            <span
              aria-hidden
              className="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/5"
            >
              <Image
                src={p.miniatura.src}
                alt=""
                width={40}
                height={40}
                sizes="40px"
                quality={92}
                className="size-8 object-contain"
              />
              <span className="font-display absolute -top-1 -left-1 grid h-4 w-4 place-items-center rounded-full bg-brand-orange text-[10px] text-brand-black">
                {p.index}
              </span>
            </span>
            <span className="font-display text-sm whitespace-nowrap md:text-lg">
              {p.name}
            </span>
          </button>
        ))}

        {/**
         * O carrinho, como no rascunho.
         *
         * Eu tinha trocado por "Onde comprar" com o argumento de que a
         * página não tem carrinho e o ícone prometeria o que não entrega.
         * O cliente preferiu o ícone, e é decisão dele — mas o rótulo
         * acessível diz para onde o clique leva de verdade, e o `title`
         * mostra o mesmo a quem passar o mouse. Assim o desenho é o que
         * ele pediu sem que a promessa fique só na imagem.
         */}
        {/**
         * O carrinho ocupa a LARGURA da barra e se centra nela.
         *
         * Ele estava do tamanho das miniaturas e encostado à esquerda,
         * como se fosse um quarto produto da lista — e não é: é a única
         * ação da barra.
         *
         * 120 por 50, medida fechada com o cliente.
         *
         * Está em pixels e não em fração de propósito. A barra é a única
         * peça da página cuja largura não vem de uma coluna de texto: ela
         * se dimensiona pelo conteúdo (miniatura mais nome), e amarrar o
         * botão a essa largura fazia ele mudar de tamanho a cada ajuste
         * na lista. Aqui o tamanho é a decisão, não a consequência.
         *
         * A régua acima não é enfeite: sem ela o botão flutua no fim da
         * lista sem dizer que mudou de assunto.
         */}
        {/* Na coluna a régua separa por cima; na linha, por um filete ao
            lado, que é o que "acima" quer dizer quando o eixo vira */}
        <span
          aria-hidden
          className="h-8 w-px shrink-0 bg-white/15 md:mt-4 md:h-px md:w-full"
        />

        {/**
         * Laranja chapado com tinta preta, como os painéis claros.
         *
         * Em branco a 5% ele era mais um bloco cinza numa coluna de
         * blocos cinza — a única AÇÃO da tela, vestida de item de lista.
         * O laranja da marca é a cor que a página reserva para o que
         * importa, e sobre ele o preto dá 10,56:1 de contraste (texto
         * branco daria 1,99:1 e reprovaria).
         */}
        <a
          href={CONTENT.buy.href}
          title={CONTENT.buy.cta}
          className="pulsa-carrinho grid h-[50px] w-[92px] shrink-0 place-items-center self-center rounded-xl bg-brand-orange text-brand-black transition-colors hover:bg-orange-light md:mt-4 md:w-[120px]"
        >
          <span className="sr-only">{CONTENT.buy.cta}</span>
          {/**
           * O cesto é um TRAPÉZIO fechado, não uma linha aberta.
           *
           * O desenho anterior era um traço só que ia do cabo até o fim
           * do cesto e voltava, sem base: nos tamanhos pequenos a boca
           * ficava aberta e o ícone lia como um gancho. Fechando o
           * trapézio, a silhueta se reconhece mesmo em 20 px, e a leve
           * conicidade é o que distingue carrinho de caixa.
           *
           * O cabo encontra o cesto no mesmo ponto em que ele começa, e
           * as rodas ficam sob os dois terços do cesto, que é onde elas
           * estariam num carrinho de verdade.
           */}
          <svg
            aria-hidden
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2.6 3.3h2.05a1.3 1.3 0 0 1 1.26.99l.31 1.31" />
            <path d="M6.22 5.6h14.6l-1.62 6.95a1.65 1.65 0 0 1-1.6 1.27H9.44a1.65 1.65 0 0 1-1.6-1.26L6.22 5.6Z" />
            <circle cx="10.3" cy="19.2" r="1.5" />
            <circle cx="17.3" cy="19.2" r="1.5" />
          </svg>
        </a>
      </nav>
    </div>
  )
}
