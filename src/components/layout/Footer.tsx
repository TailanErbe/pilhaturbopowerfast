import { CONTENT, PRODUCTS } from '@/data/products'
import { SectionBg } from './Layer'
import { Logo } from './Logo'

/** Beat 9 — footer. */
export function Footer() {
  return (
    <footer className="relative py-(--spacing-section)">
      <SectionBg className="bg-surface-000" />

      <div className="container-gutter relative z-2">
        {/* Pelo componente, não pelo arquivo: a proporção da marca vive num
            lugar só, e trocar o arquivo não distorce quem o usa */}
        <Logo variant="negativa" width={220} />

        <div className="mt-12 grid gap-10 border-t border-white/20 pt-8 sm:grid-cols-3">
          <nav aria-label="Modelos">
            <h2 className="texto-nota mb-3 text-white/50">Modelos</h2>
            <ul className="texto-nota grid gap-1">
              {PRODUCTS.map((p) => (
                <li key={p.index}>
                  <a href={`#produto-${p.index}`} className="hover:opacity-70">
                    {p.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="texto-nota mb-3 text-white/50">Contato</h2>
            <ul className="texto-nota grid gap-1">
              <li>
                <a href={`mailto:${CONTENT.footer.email}`} className="hover:opacity-70">
                  {CONTENT.footer.email}
                </a>
              </li>
              <li>
                <a
                  href={`https://www.${CONTENT.footer.site}`}
                  className="hover:opacity-70"
                >
                  {CONTENT.footer.site}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="texto-nota mb-3 text-white/50">Garantia</h2>
            <p className="texto-nota text-white/70">{CONTENT.footer.warranty}</p>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-white/20 pt-6">
          {/* 14px como o resto do rodapé. Em 12px era o único tamanho de
              corpo da página inteira, e um degrau que aparece uma vez só
              não é hierarquia, é ruído. */}
          <p className="texto-nota text-white/40">
            © {new Date().getFullYear()} Gshield. Todos os direitos reservados.
          </p>

          <nav aria-label="Políticas">
            <ul className="texto-nota flex flex-wrap gap-x-6 gap-y-2 text-white/50">
              {CONTENT.footer.politicas.map((p) => (
                <li key={p.href}>
                  <a href={p.href} className="underline hover:text-white/80">
                    {p.rotulo}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}
