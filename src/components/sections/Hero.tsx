import { CONTENT } from '@/data/products'
import { SectionBg, EdgeColumn } from '@/components/layout/Layer'

/**
 * Beat 1 — hero.
 *
 * Composição da referência: produto no EIXO CENTRAL, texto nas bordas.
 * Headline encostada à esquerda, apoio no rodapé, "role para explorar" no
 * canto oposto. A faixa central fica limpa para a pilha.
 */
export function Hero() {
  return (
    <section
      id="topo"
      className="relative flex h-full min-h-dvh flex-col justify-center overflow-hidden"
    >
      <SectionBg className="bg-surface-000" />

      <div className="container-gutter base-do-retrato">
        <EdgeColumn side="left">
          <p className="mb-4 text-sm tracking-wide text-white/70">
            {CONTENT.hero.kicker}
          </p>

          {/* As linhas são <span> de bloco só para quebrar visualmente.
              O espaço final evita que leitores de tela juntem as palavras
              ("RECARREGAATÉ"). */}
          <h1 className="text-[clamp(2.75rem,6.5vw,6.5rem)]">
            {CONTENT.hero.headline.map((line) => (
              <span key={line} className="block">
                {line}{' '}
              </span>
            ))}
          </h1>
        </EdgeColumn>
      </div>

      {/* Rodapé do hero: apoio à esquerda, chamada de scroll à direita.
          O centro fica vago — é onde a pílula fixa e a pilha vivem. */}
      <div className="container-gutter absolute inset-x-0 bottom-6 z-2 hidden items-end justify-between md:flex">
        <p className="max-w-[34ch] text-sm text-white/60">
          Disponível em AA e AAA, com cabo de recarga simultânea incluso.
        </p>
        <p className="text-sm text-white/40">Role para explorar</p>
      </div>
    </section>
  )
}
