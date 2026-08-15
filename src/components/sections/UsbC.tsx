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
/**
 * Um bloco do beat: título mais apoio. UMA definição, dois layouts.
 *
 * ------------------------------------------------------------------
 * POR QUE ISTO VIROU COMPONENTE
 * ------------------------------------------------------------------
 *
 * O beat é diagramado de duas formas genuinamente diferentes — no retrato
 * os dois blocos empilham na base, no desktop eles ladeiam o produto numa
 * linha só — e por isso existiam DUAS cópias do conteúdo, uma em cada
 * ramo. Cópia de conteúdo não fica igual sozinha, e esta já tinha
 * divergido: só os parágrafos do desktop levavam `data-revelar`, ou seja a
 * revelação de texto letra a letra, que é a assinatura da página inteira,
 * simplesmente não acontecia no celular.
 *
 * Agora o conteúdo tem uma definição só e o que se repete é a CAIXA, que é
 * o que de fato muda entre as duas telas. Não dá para divergir de novo sem
 * editar este componente, e editá-lo muda os dois lados juntos.
 *
 * `tamanho` continua por fora porque é decisão de diagramação: no retrato o
 * título é menor que o `--text-display-2` do desktop, e essa diferença é
 * deliberada.
 */
function Bloco({
  titulo,
  texto,
  tamanho,
  espaco,
  children,
}: {
  titulo: string
  texto: string
  tamanho: string
  espaco: string
  /** O rótulo de apoio, que só o retrato encaixa aqui dentro */
  children?: React.ReactNode
}) {
  return (
    <div>
      {children}
      <h2 className={tamanho}>{titulo}</h2>
      <p data-revelar className={`texto-corpo ${espaco} text-white/70`}>
        {texto}
      </p>
    </div>
  )
}

export function UsbC() {
  const { apoio, esquerda, direita } = CONTENT.usbc

  return (
    <section className="relative flex h-full min-h-dvh items-center overflow-hidden">
      <SectionBg className="bg-surface-000" noAto />

      {/* Empilhado no mobile, onde não há corredor central a preservar */}
      {/* Mesma ideia de `base-do-retrato`, escrita em grid: o bloco encosta
          na base para o produto 3D ter o terço de cima só para ele */}
      <div className="container-gutter relative z-2 grid min-h-dvh w-full content-end gap-4 pb-[84px] md:hidden">
        {/* O rótulo entra COLADO no primeiro título, não como linha própria
            do grid: sozinho ele gastava um vão inteiro para vinte pixels de
            texto, e é altura que o produto 3D precisa acima */}
        <Bloco
          titulo={esquerda.titulo}
          texto={esquerda.texto}
          tamanho="text-[clamp(1.5rem,7vw,2.5rem)]"
          espaco="mt-2"
        >
          <p className="mb-2 text-sm tracking-[0.2em] text-brand-orange uppercase">{apoio}</p>
        </Bloco>
        <Bloco
          titulo={direita.titulo}
          texto={direita.texto}
          tamanho="text-[clamp(1.5rem,7vw,2.5rem)]"
          espaco="mt-2"
        />
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
      {/**
       * Os dois blocos numa LINHA só, alinhados pelo topo.
       *
       * Eram duas caixas absolutas independentes, cada uma centrada na
       * própria altura. Como o parágrafo da direita quebra em duas linhas e
       * o da esquerda em uma, os dois blocos tinham alturas diferentes — e
       * centrar cada um por si punha os TÍTULOS em alturas diferentes.
       * Medido em 1280: o da esquerda começava em y=321 e o da direita em
       * 308, treze pixels de degrau.
       *
       * Treze pixels não se veem como treze pixels; veem-se como desalinho.
       * Os dois títulos ladeiam o produto e o olho os lê como uma linha só
       * atravessando a tela, então qualquer diferença entre eles denuncia.
       *
       * Numa linha com `items-start`, os dois começam no mesmo y por
       * construção e os parágrafos ficam pendurados no comprimento que
       * tiverem. Quem se centra na tela é a LINHA, que é a unidade certa.
       */}
      <div className="absolute inset-x-0 top-1/2 z-2 hidden -translate-y-1/2 items-start justify-between px-[var(--spacing-gutter)] md:flex">
        <div className="w-[36%]">
          <Bloco
            titulo={esquerda.titulo}
            texto={esquerda.texto}
            tamanho="text-(length:--text-display-2)"
            espaco="mt-4"
          />
        </div>

        <div className="w-[36%]">
          <Bloco
            titulo={direita.titulo}
            texto={direita.texto}
            tamanho="text-(length:--text-display-2)"
            espaco="mt-4"
          />
        </div>
      </div>
    </section>
  )
}
