import { PROTECTIONS } from '@/data/products'
import { SectionBg, EdgeColumn } from '@/components/layout/Layer'

/**
 * Beat 3b — Chip Inteligente.
 *
 * Seis proteções é argumento forte demais para viver escondido num
 * accordion. Fica ao lado das 1.200 recargas: uma fala de economia,
 * a outra de segurança.
 */
export function Chip() {
  return (
    <section className="relative flex h-full min-h-dvh items-center overflow-hidden">
      <SectionBg className="bg-surface-100" />

      <div className="container-gutter">
        <EdgeColumn side="left">
        <p className="mb-4 text-sm tracking-wide text-brand-orange">Chip inteligente</p>

        <h2 className="max-w-[14ch] text-[clamp(2.25rem,5.5vw,4.5rem)]">
          Seis proteções em cada pilha
        </h2>

        <ul className="mt-12 grid gap-x-10 gap-y-4 sm:grid-cols-2">
          {PROTECTIONS.map((p) => (
            <li
              key={p}
              className="flex items-baseline gap-3 border-t border-white/20 pt-3 text-base"
            >
              {/* Marcador desenhado em CSS, não em caractere: travessão é
                  proibido em texto visível (REGRAS.md §6.4d) */}
              <span
                aria-hidden
                className="mt-[0.55em] h-px w-3 shrink-0 bg-brand-orange"
              />
              {p}
            </li>
          ))}
        </ul>
        </EdgeColumn>
      </div>
    </section>
  )
}
