import { CONTENT } from '@/data/products'
import { SectionBg } from '@/components/layout/Layer'

/** Beat 8 — compra. */
export function Buy() {
  return (
    <section
      id="comprar"
      className="relative py-(--spacing-section)"
    >
      <SectionBg className="bg-surface-100" />

      <div className="container-gutter relative z-2">
        <h2 className="max-w-[18ch] text-(length:--text-display-1)">
          {CONTENT.buy.title}
        </h2>
        <p className="texto-corpo mt-6 text-white/80">{CONTENT.buy.paragraph}</p>

        <a
          href={CONTENT.buy.href}
          className="mt-10 inline-flex items-center gap-3 bg-brand-orange px-8 py-4 font-display text-xl text-brand-black transition-opacity hover:opacity-90"
        >
          {CONTENT.buy.cta}
          <span aria-hidden>→</span>
        </a>

        {/* `texto-nota` limita a medida: sem ela esta linha corria a largura
            inteira da tela, uns 256 caracteres por linha */}
        <p className="texto-nota mt-6 text-white/60">
          {CONTENT.buy.note}{' '}
          <a href={CONTENT.buy.chargerHref} className="underline">
            Ver carregadores
          </a>
          .
        </p>
      </div>
    </section>
  )
}
