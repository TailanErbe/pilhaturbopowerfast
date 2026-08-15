'use client'

import { Logo } from './Logo'
import { LinkDeBeat } from './LinkDeBeat'
import { useNoHeroi } from '@/lib/no-heroi'

/**
 * Header.
 *
 * ATENÇÃO — posicionamento provisório (`absolute`, não `fixed`).
 *
 * O alvo é um header FIXO, como na referência. Mas a página atravessa três
 * fundos (preto → #FFA400 → branco) e um header fixo com texto branco cai
 * para 1,99:1 de contraste sobre o laranja — reprovado (mínimo 4,5:1).
 *
 * Resolver isso exige a troca de tema dirigida por scroll (Sprint 5).
 * O mecanismo de marca já está pronto: <Logo variant> troca de ARQUIVO
 * entre positiva e negativa, como o manual exige.
 *
 * ------------------------------------------------------------------
 * O QUE MUDOU: FIXO, MAS SÓ NO HERÓI
 * ------------------------------------------------------------------
 *
 * Ele era `absolute top-0`, e isso o punha no topo do DOCUMENTO. Como o
 * ato é pinado, a primeira tela fica no lugar por cerca de duas mil
 * alturas de rolagem — e o logotipo saía de quadro depois de setenta
 * pixels. Ou seja: em quase toda a primeira tela, que o rascunho desenha
 * COM a marca no topo, não havia marca nenhuma.
 *
 * Agora ele é `fixed` e se apaga pelo MESMO sinal da barra do herói e da
 * pílula (useNoHeroi). Isso resolve o problema de contraste que travava a
 * mudança: ele morre bem antes do painel laranja, então nunca chega a
 * pisar num fundo em que o branco reprovaria. A troca de tema continua
 * necessária no dia em que o header tiver de sobreviver ao ato inteiro.
 */
export function Header() {
  const presenca = useNoHeroi()

  /**
   * Some do DOM quando invisível, como a barra.
   *
   * `opacity: 0` deixaria o link no caminho do TAB, e o primeiro alvo do
   * teclado na página seria um logotipo que ninguém vê.
   */
  const oculto = presenca < 0.01

  return (
    <header
      aria-hidden={oculto}
      style={{ opacity: presenca, visibility: oculto ? 'hidden' : 'visible' }}
      className="container-gutter pointer-events-none fixed inset-x-0 top-0 z-20 py-5"
    >
      {/**
       * SÓ O LOGOTIPO, como o rascunho pede.
       *
       * Saíram daqui, um de cada vez e por motivos que se somam: a
       * navegação de modelos, o "onde comprar" e o menu de quatro pontos
       * do celular. Os três levavam aos mesmos lugares que a barra do
       * herói e a pílula já levam, com foto do produto e o numeral do
       * painel, que é a âncora da página inteira.
       *
       * Três caminhos para o mesmo destino não é redundância útil: é
       * ruído empilhado no canto justo na tela em que o produto deveria
       * estar sozinho. Com um elemento só, o logotipo centraliza sem
       * precisar de colunas vazias para equilibrá-lo.
       */}
      {/* O `pointer-events` volta no link: a faixa inteira do header não
          pode capturar o mouse, mas o logotipo continua clicável */}
      <LinkDeBeat beat="topo" className="pointer-events-auto mx-auto block w-fit">
        <span className="sr-only">Gshield, início</span>
        <Logo variant="negativa" width={132} priority />
      </LinkDeBeat>
    </header>
  )
}
