import { Logo } from './Logo'
import { LinkDeBeat } from './LinkDeBeat'

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
 * Até lá o header fica ancorado no topo, onde o fundo é sempre preto.
 * Trocar para `fixed` só junto com a troca de tema — nunca antes.
 */
export function Header() {
  return (
    <header className="absolute inset-x-0 top-0 z-20 container-gutter py-5">
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
      <LinkDeBeat beat="topo" className="mx-auto block w-fit">
        <span className="sr-only">Gshield, início</span>
        <Logo variant="negativa" width={132} priority />
      </LinkDeBeat>
    </header>
  )
}
