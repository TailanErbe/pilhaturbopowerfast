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
      <SectionBg className="bg-surface-100" noAto />

      <div className="container-gutter base-do-retrato">
        <EdgeColumn side="left">
        <p className="mb-2 text-sm tracking-wide text-brand-orange md:mb-4">Chip inteligente</p>

        <h2 className="max-w-[14ch] text-[clamp(2.25rem,5.5vw,4.5rem)]">
          Seis proteções em cada pilha
        </h2>

        {/* Duas colunas já no celular: são seis palavras curtas, e em coluna
            única a lista sozinha comia um terço da tela que o produto 3D
            precisa ocupar no retrato */}
        <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 sm:gap-x-10 md:mt-12 md:gap-y-4">
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
