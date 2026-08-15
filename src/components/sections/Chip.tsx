import { PROTECTIONS } from '@/data/products'
import { SectionBg, EdgeColumn } from '@/components/layout/Layer'
import { IconeDeProtecao } from './IconeDeProtecao'

/**
 * Onde cada nome pode PARTIR, se não couber. Só para a lista visual.
 *
 * O caractere é o hífen suave (U+00AD): o navegador o ignora quando a
 * palavra cabe e o transforma num hífen de fim de linha quando não cabe.
 * Escrito como escape, e não colado literalmente, porque na fonte ele é
 * invisível — e caractere invisível em arquivo de código é armadilha para
 * quem editar depois.
 *
 * Mora AQUI e não em `PROTECTIONS` de propósito: `nome` também alimenta o
 * JSON-LD (seo/DadosDoProduto) e a lista do leitor de tela
 * (a11y/ResumoDoAto), e nenhum dos dois deve receber um caractere de
 * controle de quebra de linha. A chave é o `icone`, que já é o
 * identificador estável de cada proteção.
 */
const QUEBRA: Record<string, string> = {
  superaquecimento: 'Super\u00ADaquecimento',
}

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
           * A REDE ERA PLACEBO, e isso foi medido.
           *
           * A rede era `hyphens-auto`. Ela não faz nada: com `lang="pt-BR"`
           * correto no `<html>` e `hyphens: auto` computado no elemento,
           * pus "Superaquecimento" numa caixa de prova de 100 px e a altura
           * deu 20 px com e sem hifenização — uma linha, sem quebra. Este
           * Chrome não traz dicionário de pt-BR, então `hyphens` é inerte e
           * a palavra simplesmente transbordava.
           *
           * Medido em 383 de largura: a palavra pede 137 px e a caixa dava
           * 128. Faltavam 9, e por isso ela aparecia cortada em
           * "Superaqueciment".
           *
           * Agora são três coisas de verdade:
           *
           *   vão entre colunas menor no retrato   +4 px por coluna
           *   ícone e vão internos menores         +6 px
           *   hífen SUAVE dentro da palavra        quebra "Super-/aquecimento"
           *
           * As duas primeiras fazem a palavra caber em 383 — medido, 138
           * disponíveis contra 137 pedidos. Um pixel de folga não é conserto,
           * é coincidência: num Android de 360 a caixa cai para 126 e a
           * palavra não cabe de novo. Por isso a terceira, que é a que
           * realmente resolve — o hífen suave é invisível quando cabe e vira
           * quebra com hífen quando não cabe, sem depender de dicionário.
           *
           * `overflow-wrap: anywhere` fica como último recurso, para o dia em
           * que a lista ganhar palavra maior e ninguém marcar a quebra dela.
           */}
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 sm:gap-x-10 md:mt-12 md:gap-y-4">
            {PROTECTIONS.map((p) => (
              <li
                key={p.icone}
                data-serie
                className="flex items-center gap-1.5 border-t border-white/20 pt-3 text-sm sm:gap-3 sm:text-base"
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
                  className="size-6 shrink-0 text-brand-orange sm:size-8"
                />
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {QUEBRA[p.icone] ?? p.nome}
                </span>
              </li>
            ))}
          </ul>
        </EdgeColumn>
      </div>
    </section>
  )
}
