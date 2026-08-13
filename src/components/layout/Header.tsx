import { Logo } from './Logo'
import { MobileMenu } from './MobileMenu'
import { CONTENT, PRODUCTS } from '@/data/products'

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

        <nav aria-label="Modelos" className="hidden sm:block">
          <ul className="flex flex-col gap-1">
            {PRODUCTS.map((p) => (
              <li key={p.index}>
                <a
                  href={`#produto-${p.index}`}
                  className="text-sm whitespace-nowrap transition-opacity hover:opacity-70"
                >
                  {p.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <a href="#topo" className="justify-self-center" aria-label="Gshield, início">
          <Logo variant="negativa" width={132} priority />
        </a>

        <div className="justify-self-end">
          <a
            href={CONTENT.buy.href}
            className="text-sm whitespace-nowrap transition-opacity hover:opacity-70"
          >
            {CONTENT.buy.cta}
          </a>
        </div>
      </div>
    </header>
  )
}
