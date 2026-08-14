import Image from 'next/image'
import { asset } from '@/lib/site'

/**
 * Marca Gshield.
 *
 * O manual PROÍBE recolorir a marca (filtro CSS, `invert`, `currentColor`).
 * Cada versão é um ARQUIVO DISTINTO — a troca é de arquivo, nunca de cor.
 * Ver REGRAS.md §5.4.
 *
 * Redução mínima do manual:
 *   logo completa → 120 px
 *   ícone         →  30 px
 * Abaixo de 120 px é obrigatório usar apenas o ícone. O componente escolhe
 * sozinho para que ninguém erre isso por engano.
 */

/**
 * As três versões, e onde cada uma serve.
 *
 * `positiva` e `negativa` são as de COR: escudo e tipografia trocam de
 * preto para branco, mas o gorila e a palavra "SHIELD" continuam laranja
 * nas duas. Isso é o que as torna inúteis sobre o próprio laranja da
 * marca, onde essas partes somem no fundo.
 *
 * `mono` resolve esse caso: é a marca inteira em branco, sem laranja
 * nenhum, e é a única que sobrevive ao painel 02.
 */
type Variant = 'positiva' | 'negativa' | 'mono'

/**
 * `marca-*` e não `logo-*` de propósito.
 *
 * Os arquivos antigos com esse nome eram só o desenho do gorila, na
 * proporção 2,3:1. Os novos são a marca completa, com o logotipo escrito,
 * em 4,06:1. Trocar o CONTEÚDO mantendo o caminho deixa o navegador
 * servindo o arquivo velho por tempo indeterminado, e o header apareceu
 * renderizando 132×57 quando a proporção nova pede 132×33 (§4j).
 *
 * Conteúdo novo, caminho novo. Sempre.
 */
const ARQUIVOS = {
  positiva: asset('/brand/marca-positiva.png'),
  negativa: asset('/brand/marca-negativa.png'),
  mono: asset('/brand/marca-mono-negativa.png'),
} as const

/** Proporção real dos três arquivos: 2000 × 493 */
const PROPORCAO = 2000 / 493

/**
 * O ícone só existe em duas versões, e a `mono` cai na positiva.
 *
 * O ícone positivo tem contorno preto e gorila laranja: sobre laranja
 * sobra só o contorno, que é pouco mas ainda lê como escudo. O negativo,
 * todo laranja, sumiria por completo.
 */
const ICONE = {
  positiva: asset('/brand/icone-positivo.png'),
  negativa: asset('/brand/icone-negativo.png'),
  mono: asset('/brand/icone-positivo.png'),
} as const

export function Logo({
  variant = 'negativa',
  width = 132,
  priority = false,
  className,
}: {
  variant?: Variant
  width?: number
  priority?: boolean
  className?: string
}) {
  if (width < 120) {
    const lado = Math.max(30, Math.min(width, 64))
    return (
      <Image
        src={ICONE[variant]}
        alt="Gshield"
        width={lado}
        height={lado}
        priority={priority}
        className={className}
        style={{ width: lado, height: 'auto' }}
      />
    )
  }

  return (
    <Image
      src={ARQUIVOS[variant]}
      alt="Gshield Gadgets Premium"
      width={width}
      height={Math.round(width / PROPORCAO)}
      priority={priority}
      className={className}
      style={{ width, height: 'auto' }}
    />
  )
}
