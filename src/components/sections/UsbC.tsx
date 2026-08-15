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
      {/* Mesma ideia de `base-do-retrato`, escrita em grid: o bloco encosta
          na base para o produto 3D ter o terço de cima só para ele */}
      <div className="container-gutter relative z-2 grid min-h-dvh w-full content-end gap-4 pb-[84px] md:hidden">
        {/* O rótulo entra COLADO no primeiro título, não como linha própria
            do grid: sozinho ele gastava um vão inteiro para vinte pixels de
            texto, e é altura que o produto 3D precisa acima */}
        <div>
          <p className="mb-2 text-sm tracking-[0.2em] text-brand-orange uppercase">{apoio}</p>
          <h2 className="text-[clamp(1.5rem,7vw,2.5rem)]">{esquerda.titulo}</h2>
          <p className="texto-corpo mt-2 text-white/70">{esquerda.texto}</p>
        </div>
        <div>
          <h2 className="text-[clamp(1.5rem,7vw,2.5rem)]">{direita.titulo}</h2>
          <p className="texto-corpo mt-2 text-white/70">{direita.texto}</p>
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
      {/**
       * Os dois blocos na FAIXA CENTRAL da altura, um de cada lado.
       *
       * Estavam em alturas diferentes, um no alto e outro no pé, para o
       * olho não ler os dois como uma coisa só. Isso funcionava quando
       * cada um tinha três linhas de parágrafo e havia bastante texto para
       * separar; com uma linha por lado, o degrau passou a parecer
       * desalinho, e sobrava um vazio grande no meio da tela — justo onde
       * o cabo cruza, que é o que se quer olhando.
       *
       * Na mesma linha, os dois viram legenda do que acontece entre eles.
       */}
      <div className="absolute top-1/2 left-0 z-2 hidden w-[36%] -translate-y-1/2 px-[var(--spacing-gutter)] md:block">
        <h2 className="text-(length:--text-display-2)">{esquerda.titulo}</h2>
        <p data-revelar className="texto-corpo mt-4 text-white/70">
          {esquerda.texto}
        </p>
      </div>

      <div className="absolute top-1/2 right-0 z-2 hidden w-[36%] -translate-y-1/2 px-[var(--spacing-gutter)] md:block">
        <h2 className="text-(length:--text-display-2)">{direita.titulo}</h2>
        <p data-revelar className="texto-corpo mt-4 text-white/70">
          {direita.texto}
        </p>
      </div>
    </section>
  )
}
