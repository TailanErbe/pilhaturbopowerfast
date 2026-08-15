/**
 * Os seis símbolos das proteções do chip.
 *
 * ------------------------------------------------------------------
 * O CRITÉRIO É A SILHUETA, NÃO O DESENHO
 * ------------------------------------------------------------------
 *
 * Seis ícones lado a lado só funcionam se cada um for reconhecível pela
 * FORMA GERAL, antes de qualquer detalhe. Se três deles forem "um raio com
 * variações", o leitor vê três vezes a mesma coisa e volta a depender do
 * rótulo — e aí o ícone não está fazendo trabalho nenhum, só ocupando
 * espaço.
 *
 * Por isso as seis silhuetas são deliberadamente diferentes entre si:
 *
 *   sobrecarga        pilha com o nível transbordando por cima
 *   sobretensão       onda com um pico batendo num teto
 *   curto             dois contatos frente a frente com o arco entre eles
 *   sobrepotência     ponteiro de manômetro passando do fim da escala
 *   sobrecorrente     três setas de fluxo barradas
 *   superaquecimento  termômetro com ondas de calor
 *
 * Pilha, onda, contatos, manômetro, setas, termômetro: seis famílias de
 * forma. Nenhuma se confunde com outra a 20 px.
 *
 * ------------------------------------------------------------------
 * TODOS SÃO "O EXCESSO CONTIDO"
 * ------------------------------------------------------------------
 *
 * Cada símbolo mostra uma grandeza passando do limite E o limite. É o que
 * o chip faz: ele não impede o excesso de existir, ele o interrompe. Um
 * ícone que mostrasse só o excesso contaria metade da história, e a metade
 * errada, porque a metade que vende é a barreira.
 *
 * O traço acompanha o carrinho da barra do herói: 1,5 de espessura, pontas
 * e junções arredondadas, `currentColor`. Assim os dois vêm da mesma mão.
 */

const TRACO = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

/** O que ultrapassa o limite, sempre na cor de destaque */
const ALERTA = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

const DESENHOS: Record<string, React.ReactNode> = {
  /* Pilha de pé com o nível passando da tampa */
  sobrecarga: (
    <>
      <rect x="7.5" y="7.5" width="9" height="13" rx="1.6" {...TRACO} />
      <path d="M10 5.5h4" {...TRACO} />
      <path d="M9.5 17.5h5M9.5 14.5h5" {...TRACO} />
      <path d="M12 4.5V1.8M9.6 3.4 12 1.2l2.4 2.2" {...ALERTA} />
    </>
  ),

  /* Onda cujo pico bate no teto */
  sobretensao: (
    <>
      <path d="M2.5 5.5h19" {...ALERTA} />
      <path d="M2.5 18.5c2.4 0 3-1.6 4.2-1.6s1.6 2.4 3 2.4 1.9-11.8 3.3-11.8 1.5 8 2.7 8 1.3-3 2.3-3h3.5" {...TRACO} />
    </>
  ),

  /* Dois contatos frente a frente, arco no meio */
  curto: (
    <>
      <path d="M2.6 12h4.2M2.6 8.4v7.2" {...TRACO} />
      <path d="M21.4 12h-4.2M21.4 8.4v7.2" {...TRACO} />
      <path d="m13.1 6.9-3.5 4.4h3l-2.9 5.4" {...ALERTA} />
    </>
  ),

  /**
   * Manômetro com o ponteiro PASSANDO do fim da escala.
   *
   * A primeira versão tinha os traços da escala soltos, longe do arco, e o
   * ponteiro apontando para cima e para a direita: lia como seta de
   * compartilhar, não como agulha.
   *
   * Aqui os traços encostam no arco por dentro, que é onde escala de
   * mostrador mora, e a agulha desce ABAIXO da linha do zero, do lado de
   * fora do arco. Num mostrador de meio círculo o máximo fica na
   * horizontal; passar dele é justamente cair abaixo dela, que é a imagem
   * de ponteiro encostado no batente.
   */
  sobrepotencia: (
    <>
      <path d="M4 18a8 8 0 0 1 16 0" {...TRACO} />
      <path d="M6.37 14.75 5.1 13.9M12 11.5V10M17.63 14.75l1.27-.85" {...TRACO} />
      <circle cx="12" cy="18" r="1.4" {...TRACO} />
      <path d="m13.3 18.55 7.3 2.05" {...ALERTA} />
    </>
  ),

  /* Fluxo em três linhas, barrado */
  sobrecorrente: (
    <>
      <path d="M2.6 7.4h9M2.6 12h12.4M2.6 16.6h9" {...TRACO} />
      <path d="m8.8 4.8 2.6 2.6-2.6 2.6M12.2 9.4l2.6 2.6-2.6 2.6M8.8 14l2.6 2.6-2.6 2.6" {...TRACO} />
      <path d="M19.4 5.2v13.6" {...ALERTA} />
    </>
  ),

  /* Termômetro com ondas de calor */
  superaquecimento: (
    <>
      <path d="M11.6 14.1V4.9a2.2 2.2 0 0 1 4.4 0v9.2a4.1 4.1 0 1 1-4.4 0Z" {...TRACO} />
      <circle cx="13.8" cy="17.6" r="1.5" {...TRACO} />
      <path d="M5.4 6.6c1.4 1.2 1.4 2.6 0 3.8s-1.4 2.6 0 3.8M8.4 5.6c1.4 1.2 1.4 2.6 0 3.8" {...ALERTA} />
    </>
  ),
}

export function IconeDeProtecao({
  nome,
  className = '',
}: {
  nome: string
  className?: string
}) {
  const desenho = DESENHOS[nome]
  if (!desenho) return null

  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      focusable="false"
    >
      {desenho}
    </svg>
  )
}
