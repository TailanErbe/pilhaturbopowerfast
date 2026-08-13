import Image from 'next/image'
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

      <div className="container-gutter relative z-2 grid items-center gap-x-[6%] gap-y-12 md:grid-cols-[1fr_auto]">
        <div>
          <h2 className="max-w-[18ch] text-(length:--text-display-1)">
            {CONTENT.buy.title}
          </h2>
          <p className="texto-corpo mt-6 text-white/80">{CONTENT.buy.paragraph}</p>

          {/**
           * A seta anda para fora do botão no hover, e a máscara ao redor
           * dela impede que ela apareça atravessando a borda.
           *
           * `group` no <a> porque quem move é a seta, mas quem recebe o
           * hover é o botão inteiro: um alvo só, do tamanho que o dedo e o
           * mouse esperam.
           */}
          <a
            href={CONTENT.buy.href}
            className="group mt-10 inline-flex items-center gap-3 bg-brand-orange px-8 py-4 font-display text-xl text-brand-black transition-opacity hover:opacity-90"
          >
            {CONTENT.buy.cta}
            <span
              aria-hidden
              className="relative block h-[1em] w-[1.1em] overflow-hidden"
            >
              <span className="absolute inset-0 grid place-items-center transition-transform duration-300 ease-out group-hover:translate-x-[130%]">
                →
              </span>
              <span className="absolute inset-0 grid -translate-x-[130%] place-items-center transition-transform duration-300 ease-out group-hover:translate-x-0">
                →
              </span>
            </span>
          </a>

          {/* `texto-nota` limita a medida: sem ela esta linha corria a
              largura inteira da tela, uns 256 caracteres por linha */}
          <p className="texto-nota mt-6 text-white/60">
            {CONTENT.buy.note}{' '}
            <a href={CONTENT.buy.chargerHref} className="underline">
              Ver carregadores
            </a>
            .
          </p>
        </div>

        {/* Peça de apoio: o que a pessoa leva para casa, ao lado do botão
            que a leva para lá */}
        <Image
          src="/produto/cartela-kit.png"
          alt="Kit de pilhas recarregáveis Gshield com cabo de recarga"
          width={520}
          height={482}
          sizes="(max-width: 768px) 70vw, 34vw"
          quality={92}
          className="mx-auto w-[min(70vw,420px)] md:mx-0"
        />
      </div>
    </section>
  )
}
