import { PROTECTIONS } from '@/data/products'
import { SectionBg, EdgeColumn } from '@/components/layout/Layer'
import { IconeDeProtecao } from './IconeDeProtecao'

/**
 * Beat 4 — Chip Inteligente.
 *
 * Seis proteções é argumento forte demais para viver escondido num
 * accordion. Fica ao lado das 1.200 recargas: uma fala de economia,
 * a outra de segurança.
 *
 * ------------------------------------------------------------------
 * A TELA SE MONTA COM A ROLAGEM, UM ITEM DE CADA VEZ
 * ------------------------------------------------------------------
 *
 * O `data-serie` marca a ordem: rótulo, título e então cada proteção,
 * sozinha. Quem distribui é `revelarEmSerie` em motion/texto.ts.
 *
 * O motivo é de leitura, não de efeito. Seis itens que aparecem juntos são
 * uma LISTA, e lista se varre com o olho e se esquece. Um de cada vez, cada
 * um tem o seu instante e o leitor conta junto: são seis, e cada uma tem
 * nome e desenho. É o mesmo argumento do contador das recargas — ver
 * acontecer vale mais do que ler o resultado.
 *
 * Enquanto isso o produto dá uma volta completa (ver POSES), e as duas
 * coisas fecham juntas: a última proteção aparece com a pilha voltando a
 * ficar de frente para o painel seguinte.
 *
 * A página sem JS mostra tudo de uma vez, e continua correta: quem escreve
 * o estado inicial é a timeline, não o HTML (§6.11).
 */
export function Chip() {
  return (
    <section className="relative flex h-full min-h-dvh items-center overflow-hidden">
      <SectionBg className="bg-surface-100" noAto />

      <div className="container-gutter base-do-retrato">
        <EdgeColumn side="left">
          <p
            data-serie
            className="mb-2 text-sm tracking-wide text-brand-orange md:mb-4"
          >
            Chip inteligente
          </p>

          <h2 data-serie className="max-w-[14ch] text-[clamp(2.25rem,5.5vw,4.5rem)]">
            Seis proteções em cada pilha
          </h2>

          {/**
           * A MEDIDA é ditada pela palavra mais longa, e ela não cabia.
           *
           * "Superaquecimento" tem sete sílabas e mora numa meia coluna. Em
           * 390 de largura, a coluna dá 167 px, o marcador e o vão comem 24,
           * e a palavra em 16 px pede 145: ela furava a caixa em 13 px e
           * terminava a três pixels da borda da tela, passando por cima da
           * régua do próprio item.
           *
           * Corpo menor só no retrato, vão menor entre ícone e texto, e a
           * palavra num elemento que PODE encolher (`min-w-0`) para quebrar
           * em vez de transbordar. As duas primeiras fazem caber; a terceira
           * é a rede, para o dia em que a lista ganhar palavra maior ainda.
           */}
          <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 sm:gap-x-10 md:mt-12 md:gap-y-4">
            {PROTECTIONS.map((p) => (
              <li
                key={p.icone}
                data-serie
                className="flex items-center gap-2 border-t border-white/20 pt-3 text-sm sm:gap-3 sm:text-base"
              >
                {/**
                 * O ícone entrou no lugar do filete que havia aqui.
                 *
                 * O marcador era um traço laranja de 12 px, igual nos seis:
                 * dizia "isto é uma lista" e mais nada. O desenho diz QUAL
                 * proteção, e é ele que faz a lista virar seis coisas em vez
                 * de seis linhas. Ver IconeDeProtecao para o critério das
                 * silhuetas.
                 */}
                <IconeDeProtecao
                  nome={p.icone}
                  className="size-7 shrink-0 text-brand-orange sm:size-8"
                />
                <span className="min-w-0 hyphens-auto">{p.nome}</span>
              </li>
            ))}
          </ul>
        </EdgeColumn>
      </div>
    </section>
  )
}
