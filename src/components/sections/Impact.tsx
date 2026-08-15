import { CONTENT } from '@/data/products'
import { SectionBg } from '@/components/layout/Layer'
import { CampoDeDescartaveis } from './CampoDeDescartaveis'

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

        {/**
         * Os números ficam DENTRO do campo, e não ao lado dele.
         *
         * Não é diagramação: é o gatilho. O componente anterior alcançava
         * os contadores por `svg.closest('section')`, ou seja subia até a
         * seção para achar irmãos que ele não renderiza. Envolvendo-os, o
         * efeito procura dentro da própria raiz, e o campo e os números
         * passam a andar no mesmo relógio por construção.
         *
         * A consequência é a que interessa: quando a linha `i` do campo
         * acende, o contador marca 100(i+1). Um diz o mesmo que o outro,
         * no mesmo instante.
         */}
        <CampoDeDescartaveis>
          <dl className="mt-16 grid gap-10 sm:grid-cols-3">
            {CONTENT.impact.stats.map((s) => (
              <div key={s.label} className="border-t border-white/25 pt-4">
                <dt className="sr-only">{s.label}</dt>
                <dd>
                  {/* O valor final já vem no HTML: sem JS a seção continua
                      dizendo o que precisa dizer (§6.11). O contador zera e
                      sobe só depois que o script assume. */}
                  <span
                    data-count-target={s.conta}
                    className="block font-display text-[clamp(2.5rem,7vw,5rem)] leading-none text-brand-orange"
                  >
                    {s.value}
                  </span>
                  <span className="texto-nota mt-2 block text-white/60">
                    {s.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </CampoDeDescartaveis>
      </div>
    </section>
  )
}
