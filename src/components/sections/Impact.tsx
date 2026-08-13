import { CONTENT } from '@/data/products'
import { SectionBg } from '@/components/layout/Layer'

/** Beat 7 — impacto. Sai do pin. */
export function Impact() {
  return (
    <section className="relative py-(--spacing-section)">
      <SectionBg className="bg-surface-000" />

      <div className="container-gutter relative z-2">
        <h2 className="max-w-[16ch] text-(length:--text-display-2)">
          {CONTENT.impact.title}
        </h2>
        <p className="texto-corpo mt-6 text-white/80">
          {CONTENT.impact.paragraph}
        </p>

        <dl className="mt-16 grid gap-10 sm:grid-cols-3">
          {CONTENT.impact.stats.map((s) => (
            <div key={s.label} className="border-t border-white/25 pt-4">
              <dt className="sr-only">{s.label}</dt>
              <dd>
                <span className="block font-display text-[clamp(2.5rem,7vw,5rem)] leading-none text-brand-orange">
                  {s.value}
                </span>
                <span className="texto-nota mt-2 block text-white/60">{s.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
