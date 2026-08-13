import { CONTENT, PRODUCTS, PROTECTIONS } from '@/data/products'

/**
 * O ato pinado, em versão linear, só para leitor de tela.
 *
 * O PROBLEMA que isto resolve, medido na auditoria do Sprint 7: a
 * timeline esconde os beats inativos com `autoAlpha`, que é apelido de
 * `opacity` mais `visibility`. `visibility: hidden` tira o conteúdo da
 * árvore de acessibilidade, e é isso que mantém o foco de teclado fora
 * dos painéis invisíveis, o que está certo.
 *
 * Só que a única forma de revelar o beat seguinte é ROLAR A JANELA. Um
 * leitor de tela em modo de navegação lê o buffer do documento e não
 * encontra nada entre o hero e a seção de impacto: a porta USB-C, as
 * 1.200 recargas, o chip, os três painéis com ficha técnica e
 * compatibilidade. O argumento comercial inteiro ficava inacessível.
 *
 * Este bloco é montado a partir de `data/products.ts`, a mesma fonte dos
 * painéis. Não é cópia: se a ficha mudar, os dois mudam juntos e não têm
 * como divergir.
 *
 * Fica DEPOIS do ato e anunciado como resumo, não antes: quem usa leitor
 * de tela recebe o beat visível e depois o texto completo, na ordem da
 * narrativa, sem parecer que a página se repetiu do nada.
 */
export function ResumoDoAto() {
  return (
    <section aria-labelledby="resumo-do-ato" className="sr-only">
      <h2 id="resumo-do-ato">Resumo do produto</h2>
      <p>
        A apresentação acima é conduzida por rolagem. Este resumo traz o mesmo
        conteúdo em texto corrido.
      </p>

      <h3>{CONTENT.usbc.apoio}</h3>
      <h4>{CONTENT.usbc.esquerda.titulo}</h4>
      <p>{CONTENT.usbc.esquerda.texto}</p>
      <h4>{CONTENT.usbc.direita.titulo}</h4>
      <p>{CONTENT.usbc.direita.texto}</p>

      <h3>
        {CONTENT.cycles.number.toLocaleString('pt-BR')} {CONTENT.cycles.unit}
      </h3>
      <p>{CONTENT.cycles.paragraph}</p>

      <h3>Chip inteligente</h3>
      <p>As {PROTECTIONS.length} proteções integradas:</p>
      <ul>
        {PROTECTIONS.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>

      {PRODUCTS.map((p) => (
        <section key={p.index} aria-labelledby={`resumo-${p.index}`}>
          <h3 id={`resumo-${p.index}`}>
            {p.index} {p.name}
            {p.subtitle ? ` ${p.subtitle}` : ''}
          </h3>
          <p>{p.highlight}</p>
          <p>{p.description}</p>

          {p.kits && (
            <ul>
              {p.kits.map((k) => (
                <li key={k.nome}>
                  {k.nome}: {k.detalhe}
                </li>
              ))}
            </ul>
          )}

          <h4>Ficha técnica</h4>
          <dl>
            {p.technicalSheet.map((r) => (
              <div key={r.label}>
                <dt>{r.label}</dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>

          <h4>Compatibilidade</h4>
          <ul>
            {p.compatibility.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  )
}
