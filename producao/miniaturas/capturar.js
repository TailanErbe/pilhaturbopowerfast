/**
 * Renderiza as miniaturas da barra do herói a partir da CENA DE VERDADE.
 *
 * Cole no console de http://localhost:3000/?debug=scene e rode `capturar()`,
 * com `producao/miniaturas/servidor.mjs` no ar. Ver o cabeçalho de lá para
 * o procedimento inteiro e para o motivo de ele existir.
 *
 * ------------------------------------------------------------------
 * O QUE CADA MINIATURA MOSTRA
 * ------------------------------------------------------------------
 *
 *   01 AA    uma pilha AA, de frente
 *   02 AAA   uma palito, de frente
 *   03 KIT   quatro pilhas, que é o que o kit é
 *
 * Antes as três eram FOTOS de cartela em 32 px, e duas delas eram o MESMO
 * arquivo: a miniatura da AAA mostrava duas AA. As duas escolhas mais
 * importantes da primeira tela eram visualmente idênticas, e uma delas
 * mostrava o produto errado.
 *
 * Vindo da cena, cada uma mostra o seu formato, com a diferença real de
 * diâmetro e comprimento entre AA e palito, e a silhueta de quatro corpos
 * distingue o kit sem precisar de legenda.
 *
 * ------------------------------------------------------------------
 * POR QUE `gl.render` E NÃO O QUADRO NORMAL
 * ------------------------------------------------------------------
 *
 * O quadro normal passa pelo EffectComposer, e o Bloom deixa uma névoa em
 * volta do objeto. Numa peça de 40 px essa névoa vira um borrão que come a
 * silhueta. `gl.render(scene, camera)` desenha a cena crua, com alfa, que é
 * exatamente o que uma miniatura recortada precisa.
 */

/* eslint-disable */
;(() => {
  const PORTA = 4321

  /**
   * Onde cada formato se apresenta de frente.
   *
   * São os centros dos beats dos painéis, que é onde a pose é frontal e a
   * pilha está parada. Ver POSES em src/lib/scene-state.ts.
   */
  /**
   * `escala` AGRUPA quem tem de ser comparável.
   *
   * Todos os alvos de uma mesma escala são recortados com o MESMO lado de
   * quadrado, calculado a partir do maior deles. Sem isso, cada pilha era
   * ajustada à própria caixa de tinta e a AA e a palito saíam do mesmo
   * tamanho na tela — medido nos PNGs antigos: as duas ocupavam 83,6% da
   * altura, quando a palito é 12% mais curta e 28% mais fina de verdade.
   *
   * O menu existe para escolher ENTRE OS FORMATOS, e o enquadramento estava
   * apagando a única propriedade que os separa. O kit é outra composição e
   * tem escala própria.
   *
   * Os progressos são as ÂNCORAS de cada beat, e não os centros. Eles
   * estavam em 0,685 e 0,8125, valores de uma coreografia que mudou: hoje
   * 0,685 cai dentro do beat do chip, e as poses frontais dos painéis são
   * 0,712 e 0,888 (ver `ancoraDoBeat` em src/lib/scene-state.ts). Capturar
   * no lugar errado devolve a pilha girada, que foi um defeito já visto
   * aqui.
   */
  const ALVOS = [
    { nome: 'mini-aa', progresso: 0.712, ilha: null, escala: 'formato' },
    { nome: 'mini-aaa', progresso: 0.888, ilha: null, escala: 'formato' },
    /* No beat do kit há DUAS ilhas, uma de cada formato. A miniatura do
       kit leva a da esquerda, que é a de AA: o kit é quatro pilhas de UM
       formato, e mostrar as oito diria que ele traz os dois. */
    { nome: 'mini-kit', progresso: 0.95, ilha: 'esquerda', escala: 'kit' },
  ]

  /** Respiro em volta do recorte, em fração do lado maior */
  const MARGEM = 0.1
  /** Lado do PNG final. 256 dá nitidez de sobra num alvo de 40 a 72 px */
  const LADO = 256

  /**
   * Lê o buffer, por um ALVO DE RENDER e não pelo canvas.
   *
   * `gl.render` seguido de `readPixels` no framebuffer padrão só devolve o
   * que se acabou de desenhar enquanto a aba está compondo. Numa aba de
   * fundo — ou num painel de navegador embutido, que é onde isto costuma
   * rodar — o buffer de apresentação não é preservado entre tarefas e a
   * leitura volta com o quadro anterior, ou metade dele. Foi assim que uma
   * rodada inteira de captura saiu com a cena errada.
   *
   * `__cena.alvo()` desenha num alvo próprio e lê de lá, o que é válido
   * sempre. A orientação continua de baixo para cima, como no readPixels.
   */
  function lerPixels() {
    const r = window.__cena.alvo()
    return { px: r.px, L: r.w, A: r.h }
  }

  /** Alfa em (x, y), com y contado do topo */
  const alfa = ({ px, L, A }, x, y) => px[((A - 1 - y) * L + x) * 4 + 3]

  /**
   * A caixa da tinta, opcionalmente só de uma das ilhas.
   *
   * O corte entre ilhas sai do maior VÃO de colunas vazias no miolo: é o
   * mesmo vão em que o "OU" mora, e ele é largo o bastante para não haver
   * ambiguidade. Procurar por posição fixa quebraria assim que a
   * composição do kit mudasse de largura.
   */
  function caixa(buf, ilha) {
    const { L, A } = buf
    const colunaTem = new Array(L).fill(false)
    let y0 = Infinity
    let y1 = -1

    for (let y = 0; y < A; y++) {
      for (let x = 0; x < L; x++) {
        if (alfa(buf, x, y) > 24) {
          colunaTem[x] = true
          if (y < y0) y0 = y
          if (y > y1) y1 = y
        }
      }
    }
    if (y1 < 0) return null

    let x0 = colunaTem.indexOf(true)
    let x1 = colunaTem.lastIndexOf(true)

    if (ilha) {
      let melhor = { de: -1, ate: -1 }
      let corrida = -1
      for (let x = x0; x <= x1 + 1; x++) {
        if (x <= x1 && !colunaTem[x]) {
          if (corrida < 0) corrida = x
        } else if (corrida >= 0) {
          if (x - corrida > melhor.ate - melhor.de) melhor = { de: corrida, ate: x }
          corrida = -1
        }
      }
      if (melhor.de > 0) {
        if (ilha === 'esquerda') x1 = melhor.de - 1
        else x0 = melhor.ate
        /* A altura também é só da ilha escolhida */
        y0 = Infinity
        y1 = -1
        for (let y = 0; y < A; y++) {
          for (let x = x0; x <= x1; x++) {
            if (alfa(buf, x, y) > 24) {
              if (y < y0) y0 = y
              if (y > y1) y1 = y
              break
            }
          }
        }
      }
    }
    return { x0, x1, y0, y1 }
  }

  /**
   * Recorta a caixa num PNG quadrado, centrado, com margem.
   *
   * `lado` vem DE FORA quando o alvo pertence a um grupo de escala: é o
   * mesmo quadrado para a AA e para a palito, calculado a partir da maior
   * das duas. É o que devolve a diferença de porte à imagem.
   */
  function recortar(buf, cx, ladoForcado) {
    const { px, L, A } = buf
    const larg = cx.x1 - cx.x0 + 1
    const alt = cx.y1 - cx.y0 + 1
    const lado = ladoForcado ?? Math.ceil(Math.max(larg, alt) * (1 + MARGEM * 2))

    const fonte = document.createElement('canvas')
    fonte.width = L
    fonte.height = A
    const fc = fonte.getContext('2d')
    const img = fc.createImageData(L, A)
    /* readPixels devolve de baixo para cima; a ImageData é de cima para
       baixo. Copiar linha a linha é o que desvira. */
    for (let y = 0; y < A; y++) {
      const origem = (A - 1 - y) * L * 4
      img.data.set(px.subarray(origem, origem + L * 4), y * L * 4)
    }
    fc.putImageData(img, 0, 0)

    const saida = document.createElement('canvas')
    saida.width = LADO
    saida.height = LADO
    const sc = saida.getContext('2d')
    sc.imageSmoothingQuality = 'high'
    sc.drawImage(
      fonte,
      cx.x0 - (lado - larg) / 2,
      cx.y0 - (lado - alt) / 2,
      lado,
      lado,
      0,
      0,
      LADO,
      LADO,
    )
    return saida.toDataURL('image/png')
  }

  /**
   * Leva a cena a um progresso e ASSENTA a pose, sem depender de scroll.
   *
   * A versão anterior rolava a página de verdade e esperava a rotação parar,
   * e o comentário de `assentar` explica por que: escrever na barra do painel
   * de depuração não bastava, porque o GSAP desfazia a escrita no primeiro
   * tique dele.
   *
   * Só que rolar de verdade exige que a aba esteja COMPONDO — sem quadros, a
   * pose nunca assenta e a captura sai no meio do giro. Num painel embutido
   * isso é o caso normal, não a exceção.
   *
   * Aqui a barra continua sendo a fonte do progresso, mas os quadros são
   * forçados à mão com `__cena.passo()`. O GSAP não desfaz nada porque ele só
   * escreve quando há evento de scroll, e não há: ninguém rola. É o mesmo
   * mecanismo que o resto da depuração desta cena usa.
   */
  function pousar(progresso, quadros = 340) {
    const barra = document.querySelector('input[type=range]')
    if (!barra) throw new Error('painel de depuração não montou')
    const escrever = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    ).set
    escrever.call(barra, String(progresso))
    barra.dispatchEvent(new Event('input', { bubbles: true }))

    let t = performance.now() / 1000
    for (let k = 0; k < quadros; k++) {
      t += 1 / 60
      window.__cena.passo(t)
    }
  }

  async function capturar() {
    if (!window.__cena) throw new Error('abra com ?debug=scene')
    if (!window.__cena.alvo) throw new Error('hook antigo: recarregue a página')

    /**
     * DUAS PASSADAS, e a primeira existe só para medir.
     *
     * O lado do quadrado de cada grupo de escala tem de ser o do MAIOR
     * integrante, e só dá para saber qual é depois de medir todos. Medir
     * primeiro e recortar depois é o que garante que a palito seja desenhada
     * menor que a AA em vez de preencher o próprio quadrado.
     */
    const medidos = []
    for (const alvo of ALVOS) {
      pousar(alvo.progresso)
      const buf = lerPixels()
      const cx = caixa(buf, alvo.ilha)
      if (!cx) {
        console.warn(`${alvo.nome}: nada em cena`)
        continue
      }
      medidos.push({ alvo, buf, cx })
      console.log(alvo.nome, 'caixa', {
        larg: cx.x1 - cx.x0 + 1,
        alt: cx.y1 - cx.y0 + 1,
      })
    }

    const ladoPorEscala = {}
    for (const { alvo, cx } of medidos) {
      const bruto = Math.max(cx.x1 - cx.x0 + 1, cx.y1 - cx.y0 + 1)
      const lado = Math.ceil(bruto * (1 + MARGEM * 2))
      ladoPorEscala[alvo.escala] = Math.max(ladoPorEscala[alvo.escala] ?? 0, lado)
    }
    console.log('lado por escala', ladoPorEscala)

    for (const { alvo, buf, cx } of medidos) {
      const dados = recortar(buf, cx, ladoPorEscala[alvo.escala])
      const r = await fetch(`http://127.0.0.1:${PORTA}/`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nome: alvo.nome, dados }),
      })
      console.log(alvo.nome, r.ok ? 'ok' : await r.text())
    }
    console.log('pronto')
  }

  window.capturar = capturar
})()
