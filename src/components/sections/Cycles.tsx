import { CONTENT } from '@/data/products'
import { SectionBg, EdgeColumn } from '@/components/layout/Layer'

/**
 * Beat 3 — o número.
 *
 * Sprint 4: a contagem até 1.200 fica ligada ao scrub, e o parágrafo
 * "acende" por caractere. Aqui o número já nasce no valor final para que
 * a página faça sentido sem JS (REGRAS.md §6.11).
 */
export function Cycles() {
  return (
    <section className="relative flex h-full min-h-dvh items-center overflow-hidden">
      <SectionBg className="bg-surface-100" noAto />

      <div className="container-gutter base-do-retrato">
        {/**
         * `data-coluna`: onde este texto TERMINA, para a chuva medir.
         *
         * A chuva de descartáveis rarefaz atrás da coluna de texto, e a
         * borda dela precisa ser medida e não digitada: `container-gutter`
         * é `clamp(16px, 4vw, 48px)` e a coluna é percentual, então o x
         * onde ela acaba muda com a largura. Um 0,42 escrito à mão estaria
         * errado em toda tela que não fosse a de quem escreveu.
         */}
        <EdgeColumn side="left" data-coluna>
          <p className="flex items-baseline gap-4">
            <span
              data-count-target={CONTENT.cycles.number}
              className="font-display text-[clamp(4rem,11vw,11rem)] leading-none text-brand-orange"
            >
              {CONTENT.cycles.number.toLocaleString('pt-BR')}
            </span>
            <span className="font-display text-[clamp(1.25rem,2.5vw,2.25rem)] text-white/60">
              {CONTENT.cycles.unit}
            </span>
          </p>

          {/* `data-revelar`: acende caractere a caractere junto com o scroll,
              e apaga na mesma ordem ao voltar. Ver motion/texto.ts */}
          <p data-revelar className="texto-corpo mt-8 text-white/80">
            {CONTENT.cycles.paragraph}
          </p>
        </EdgeColumn>
      </div>
    </section>
  )
}
