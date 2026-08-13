/**
 * Pilha do preloader.
 *
 * Mesma técnica da referência (klimtwine.com), que enche uma taça de vinho
 * com uma máscara SVG: aqui o corpo da pilha é a máscara e um retângulo
 * laranja sobe por dentro.
 *
 * ESCALA: a taça da referência tem 42px de largura (48px no desktop).
 * Este SVG é desenhado para viver nesse mesmo tamanho — traço de 1,5 e
 * poucos elementos. Qualquer coisa mais grossa vira borrão nesse tamanho.
 *
 * O raio é subtraído da carga por máscara: ele aparece como vazio dentro
 * do laranja conforme o nível sobe. Em 0% fica só o contorno tênue.
 *
 * O retângulo é animado por `scaleY` (transform), nunca por `height`
 * — REGRAS.md §6.4, nada de animar layout.
 */

const MASK_ID = 'loader-battery-mask'

/** Raio centrado em x=20, ocupando y 33→63 */
const BOLT = 'M22.8 33 L13.2 51.5 L18.6 51.5 L17.2 63 L26.8 45 L21.4 45 Z'

/** Área interna que a carga pode ocupar */
const INNER = { x: 5.75, y: 8, w: 28.5, h: 81, r: 3 }

export function BatteryFill({
  fillRef,
  className,
}: {
  /** O nível é escrito direto no DOM, fora do React — ver Preloader */
  fillRef?: React.Ref<SVGRectElement>
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 40 92"
      className={className}
      fill="none"
      role="img"
      aria-label="Pilha carregando"
    >
      <defs>
        <mask id={MASK_ID}>
          <rect
            x={INNER.x}
            y={INNER.y}
            width={INNER.w}
            height={INNER.h}
            rx={INNER.r}
            fill="#fff"
          />
          {/* preto = recorte: o raio fica vazado na carga */}
          <path d={BOLT} fill="#000" />
        </mask>
      </defs>

      {/* Carga — sobe de baixo para cima */}
      <g mask={`url(#${MASK_ID})`}>
        <rect
          ref={fillRef}
          x={INNER.x}
          y={INNER.y}
          width={INNER.w}
          height={INNER.h}
          fill="var(--color-brand-orange)"
          style={{
            transformOrigin: `20px ${INNER.y + INNER.h}px`,
            transform: 'scaleY(0)',
          }}
        />
      </g>

      {/* Terminal positivo */}
      <rect x="15.5" y="1" width="9" height="5" rx="1.5" fill="currentColor" />

      {/* Contorno do corpo */}
      <rect
        x="3.75"
        y="6"
        width="32.5"
        height="85"
        rx="4.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      {/* Raio: contorno tênue, visível mesmo em 0% */}
      <path d={BOLT} stroke="currentColor" strokeWidth="1" opacity="0.35" />
    </svg>
  )
}
