import { Logo } from './Logo'
import { MobileMenu } from './MobileMenu'
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
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
        {/* Mobile: botão de 4 pontos. Desktop: navegação. */}
        <div className="sm:hidden">
          <MobileMenu />
        </div>

        {/**
         * A navegação de modelos SAIU do cabeçalho.
         *
         * Ela vive agora na barra do herói e, dali em diante, na pílula —
         * as duas com foto do produto e o numeral do painel, que é a
         * âncora da página inteira. Mantida aqui, seria um terceiro
         * caminho para o mesmo lugar, empilhado no canto justo na tela em
         * que o rascunho pede só o logotipo em cima.
         *
         * A coluna vazia FICA: é ela que mantém o logotipo no centro
         * óptico da tela, e não no centro do que sobrou.
         */}
        <div aria-hidden className="hidden sm:block" />

        <LinkDeBeat beat="topo" className="justify-self-center">
          <span className="sr-only">Gshield, início</span>
          <Logo variant="negativa" width={132} priority />
        </LinkDeBeat>

        {/**
         * O "onde comprar" também saiu do cabeçalho: o rascunho pede só o
         * logotipo em cima.
         *
         * A compra não some da página — ela está na barra do herói, na
         * primeira tela, e na seção final, que é onde a decisão acontece.
         * No celular continua no menu de quatro pontos.
         *
         * A coluna vazia FICA, aqui e do outro lado: são elas que mantêm o
         * logotipo no centro da TELA, e não no centro do que sobrou.
         */}
        <div aria-hidden className="justify-self-end" />
      </div>
    </header>
  )
}
