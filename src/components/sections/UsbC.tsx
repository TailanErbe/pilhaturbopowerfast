import { CONTENT } from '@/data/products'
import { SectionBg } from '@/components/layout/Layer'

/**
 * Beat 2 — revelação do USB-C.
 *
 * Dois blocos nos CANTOS opostos: superior esquerdo e inferior direito.
 * O eixo central fica livre para a pilha (REGRAS.md §6.4c).
 *
 * Posicionamento absoluto, não grade: numa grade os blocos ficam colados
 * na coluna do meio, encostados no produto. Nos cantos eles respiram e a
 * diagonal entre os dois conduz o olho pela cena.
 *
 * O rótulo de apoio fica centralizado no topo. Ele é curto e decorativo,
 * então perder o miolo atrás da pilha não custa leitura — diferente dos
 * blocos, que carregam o argumento.
 */
export function UsbC() {
  const { apoio, esquerda, direita } = CONTENT.usbc

  return (
    <section className="relative flex h-full min-h-dvh items-center overflow-hidden">
      <SectionBg className="bg-surface-000" />

      {/* Empilhado no mobile, onde não há corredor central a preservar */}
      <div className="container-gutter relative z-2 grid w-full gap-12 md:hidden">
        <p className="text-sm tracking-[0.2em] text-brand-orange uppercase">{apoio}</p>
        <div>
          <h2 className="text-[clamp(1.75rem,7vw,2.5rem)]">{esquerda.titulo}</h2>
          <p className="texto-corpo mt-3 text-white/70">{esquerda.texto}</p>
        </div>
        <div>
          <h2 className="text-[clamp(1.75rem,7vw,2.5rem)]">{direita.titulo}</h2>
          <p className="texto-corpo mt-3 text-white/70">{direita.texto}</p>
        </div>
      </div>

      {/**
       * Rótulo de apoio, centralizado no topo.
       *
       * Fica ACIMA do topo da pilha, então nada o oculta e o tamanho não
       * precisa ser contido. Em Bebas, como os demais títulos: em corpo de
       * texto ele lia como legenda de rodapé, não como abertura do beat.
       */}
      <p className="font-display absolute top-[5%] left-1/2 z-2 hidden -translate-x-1/2 text-[clamp(1.75rem,3.2vw,3.5rem)] tracking-[0.16em] whitespace-nowrap text-brand-orange md:block">
        {apoio}
      </p>

      {/**
       * Os dois blocos ficam ALINHADOS À ESQUERDA, como todo o resto da
       * página.
       *
       * O da direita já foi alinhado à direita, para "encostar no canto", e
       * era o que fazia esta tela parecer de outro site: alinhamento à
       * direita não aparece em nenhuma outra seção, e o olho percebe isso
       * antes de ler qualquer palavra. Ficar no canto é trabalho da posição
       * do bloco, não do alinhamento do texto dentro dele.
       *
       * O corpo também desceu para perto da escala do site (o beat das
       * recargas usa 18px): 30px aqui destoava de tudo.
       */}
      <div className="absolute top-[14%] left-0 z-2 hidden w-[40%] px-[var(--spacing-gutter)] md:block">
        <h2 className="text-(length:--text-display-2)">{esquerda.titulo}</h2>
        <p data-revelar className="texto-corpo mt-6 text-white/70">
          {esquerda.texto}
        </p>
      </div>

      <div className="absolute right-0 bottom-[10%] z-2 hidden w-[40%] px-[var(--spacing-gutter)] md:block">
        <h2 className="text-(length:--text-display-2)">{direita.titulo}</h2>
        <p data-revelar className="texto-corpo mt-6 text-white/70">
          {direita.texto}
        </p>
      </div>
    </section>
  )
}
