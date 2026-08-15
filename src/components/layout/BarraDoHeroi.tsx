'use client'

import Image from 'next/image'
import { CONTENT, PRODUCTS } from '@/data/products'
import { useNoHeroi } from '@/lib/no-heroi'
import { LinkDeBeat } from './LinkDeBeat'

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
        /**
         * Declara que esta caixa OCUPA a tela no beat do herói.
         *
         * A cena 3D dimensiona o produto pelo maior vão livre e mede esse
         * vão no DOM (ver TetosDoRetrato). A barra é `fixed`, mora fora da
         * seção do beat, e por isso não entrava nessa conta: depois de ela
         * crescer, sobrou um pixel entre a base da pilha e o topo dela.
         *
         * O nome do beat vem daqui e não de uma lista lá: só a peça sabe
         * em que tela ela aparece.
         */
        data-ocupa="hero"
        /**
         * No retrato a fileira alinha pelo TOPO, não pelo centro.
         *
         * Os itens de produto têm ícone em cima e nome embaixo, 76 px ao
         * todo; o carrinho tem só o ícone. Centrados um contra o outro,
         * as duas caixas ficam com o mesmo meio — e o olho não vê caixas,
         * vê ÍCONES: o do carrinho aparecia 12 px abaixo da fileira dos
         * outros três, e era esse degrau que denunciava o desalinho.
         *
         * Alinhando pelo topo e dando ao carrinho a mesma altura e o
         * mesmo recuo dos ladrilhos, os quatro ícones caem na mesma linha
         * e os nomes ficam pendurados só onde existem.
         */
        /**
         * A BORDA ENVOLVE O MENU, e não a tela.
         *
         * O pedido original foi "está faltando uma borda em volta dessa
         * seção", e eu li "seção" como a primeira tela inteira: pus um
         * filete de 1 px em volta do viewport e o defendi por várias
         * rodadas. Ele acabou removido porque o próprio cliente perguntou
         * se aquilo era marcação de segurança que ia para o servidor. Era
         * a leitura certa de um elemento errado: filete fino colado na
         * borda da tela lê como sobreposição de ferramenta.
         *
         * A "seção" era ESTA: o menu Nossas pilhas. E aqui a borda faz o
         * trabalho que lá não fazia — ela agrupa. Três ladrilhos, uma
         * régua e um botão soltos sobre o fundo são cinco coisas; dentro
         * de uma caixa são um menu.
         *
         * `w-fit` no retrato para a caixa abraçar o conteúdo em vez de
         * encostar nas duas bordas do celular, onde ela viraria barra de
         * ferramentas.
         */
        className="pointer-events-auto mx-auto flex w-fit flex-row items-start justify-center gap-1.5 rounded-2xl border border-white/15 bg-black/35 p-2.5 md:mx-0 md:flex-col md:items-start md:justify-start md:gap-1 md:p-4"
      >
        <p className="hidden text-xs tracking-[0.22em] text-white/50 uppercase md:mb-3 md:block">
          Nossas pilhas
        </p>

        {/**
         * ÂNCORAS, e não botões — mesma razão da pílula.
         *
         * O `irPara` daqui fazia `if (!tl) return`, então com movimento
         * reduzido esta barra também não navegava. Ela some nesse modo (a
         * presença do herói congela em zero), mas some por CSS, e barra que
         * some por CSS reaparece na primeira mudança de sinal. Deixar três
         * botões mortos esperando isso é dívida com juros.
         */}
        {PRODUCTS.map((p) => (
          <LinkDeBeat
            key={p.index}
            beat={`produto-${p.index}`}
            /**
             * No retrato o nome fica ABAIXO da foto, não ao lado.
             *
             * Lado a lado, três itens mais o carrinho passam de 390 px e
             * a linha quebra. Empilhados, cada um ocupa a largura da
             * própria miniatura e a fileira cabe com folga.
             */
            /**
             * RETORNO AO MOUSE E AO DEDO, que praticamente não existia.
             *
             * `hover:bg-white/5` sobre o fundo quase preto move a linha em
             * 1,08:1 — abaixo do que o olho separa. E não havia `:active`
             * nenhum: no celular, tocar "AA" não devolvia nada até o Lenis
             * começar uma rolagem de 2,2 s, o que faz o toque parecer perdido.
             *
             * O anel branco a 40% dá cerca de 3,7:1. O `scale-[0.97]` leva o
             * item de 68×98 para 66×95, muito acima do mínimo de 24 px da
             * WCAG 2.2 (SC 2.5.8).
             */
            className="group flex flex-col items-center gap-1.5 rounded-xl p-1.5 transition-colors hover:bg-white/5 hover:ring-1 hover:ring-white/40 hover:ring-inset active:scale-[0.97] md:flex-row md:gap-4 md:py-2 md:pr-4 md:pl-2 md:text-left"
          >
            {/**
             * O ladrilho cresceu de 40 para 56 no retrato e 72 no desktop.
             *
             * Com 40 e uma foto de cartela dentro, o cliente resumiu bem:
             * "quase não dá pra ver as imagens dos produtos". Uma pilha é
             * um objeto ESGUIO — cerca de 1 para 3,5 —, então numa caixa
             * quadrada de 40 px ela ocupa uns 11 px de largura útil. Não há
             * o que reconhecer nisso.
             *
             * Em 72 a mesma pilha tem 20 px de largura, que é onde a tampa
             * laranja, o corpo escuro e a marca passam a se separar. A
             * imagem também deixou de ser foto de blister e virou render do
             * próprio modelo (ver `miniatura` em data/products.ts), o que
             * dobra o ganho: além de maior, agora é UMA pilha e não uma
             * cartela inteira encolhida.
             */}
            <span
              aria-hidden
              className="relative grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-white/5 md:h-[72px] md:w-[72px]"
            >
              {/* `size-full` e não uma medida menor: o render já vem com o
                  respiro embutido na margem do recorte, e encolher de novo
                  aqui seria margem duas vezes */}
              <Image
                src={p.miniatura.src}
                alt=""
                width={72}
                height={72}
                sizes="72px"
                quality={92}
                className="size-full object-contain p-1"
              />
              <span className="font-display absolute -top-1.5 -left-1.5 grid h-5 w-5 place-items-center rounded-full bg-brand-orange text-[11px] text-brand-black md:h-6 md:w-6 md:text-[13px]">
                {p.index}
              </span>
            </span>
            <span className="font-display text-base whitespace-nowrap md:text-2xl">
              {p.name}
            </span>
          </LinkDeBeat>
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
         * A altura é fechada em pixels; a LARGURA passou a ser a da coluna.
         *
         * Ela esteve em 120 por 50, medida acertada com o cliente quando os
         * ladrilhos tinham 40 px. Com eles em 72 e o nome em 24, a coluna
         * inteira ficou mais larga que o botão, e um botão mais estreito
         * que a lista que ele fecha lê como item solto, não como a ação do
         * conjunto. `w-full` devolve o casamento que ele pediu.
         *
         * A altura continua em pixel de propósito: ela não vem de conteúdo
         * nenhum, é decisão de peso visual. 58 por ficar entre os 50 de
         * antes e os 72 do ladrilho, sem competir com eles.
         *
         * A régua acima não é enfeite: sem ela o botão flutua no fim da
         * lista sem dizer que mudou de assunto.
         */}
        {/* Na coluna a régua separa por cima; na linha, por um filete ao
            lado, que é o que "acima" quer dizer quando o eixo vira */}
        {/* O filete acompanha a fileira de ícones: 40 px de altura com o
            mesmo recuo de 6 px dos ladrilhos */}
        {/* O filete acompanha a altura nova dos ladrilhos */}
        <span
          aria-hidden
          className="mt-1.5 h-14 w-px shrink-0 bg-white/15 md:mt-5 md:h-px md:w-full"
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
        {/**
         * E SEM PULSO. O que pulsava era o único item da régua que NÃO navega.
         *
         * A régua existe para escolher entre AA, AAA e o kit; o carrinho sai
         * da página. O sinal de atenção mais forte que a página tinha — um
         * anel se expandindo a cada 2,5 s — estava justamente nele, enquanto o
         * CTA de verdade, o da seção de compra, é estático. Conferido:
         * `pulsa-carrinho` tinha uso único em todo o repositório.
         *
         * O que o cliente pediu foi o ÍCONE de carrinho no lugar de "Onde
         * comprar" (ver o comentário acima); o pulso não veio de pedido nenhum.
         */}
        <a
          href={CONTENT.buy.href}
          title={`${CONTENT.buy.cta} — ${CONTENT.footer.site}`}
          className="mt-1.5 grid h-14 w-[92px] shrink-0 place-items-center rounded-xl bg-brand-orange text-brand-black transition-colors hover:bg-orange-light md:mt-5 md:h-[58px] md:w-full md:self-center"
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
