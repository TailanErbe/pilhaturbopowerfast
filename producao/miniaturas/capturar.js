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
  const ALVOS = [
    { nome: 'mini-aa', progresso: 0.685, ilha: null },
    { nome: 'mini-aaa', progresso: 0.8125, ilha: null },
    /* No beat do kit há DUAS ilhas, uma de cada formato. A miniatura do
       kit leva a da esquerda, que é a de AA: o kit é quatro pilhas de UM
       formato, e mostrar as oito diria que ele traz os dois. */
    { nome: 'mini-kit', progresso: 0.9375, ilha: 'esquerda' },
  ]

  /** Respiro em volta do recorte, em fração do lado maior */
  const MARGEM = 0.1
  /** Lado do PNG final. 256 dá nitidez de sobra num alvo de 40 a 72 px */
  const LADO = 256

  const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

  /** Lê o buffer do canvas, já com y na orientação da tela */
  function lerPixels() {
    const { gl, scene, camera } = window.__cena
    gl.render(scene, camera)
    const ctx = gl.getContext()
    const L = ctx.drawingBufferWidth
    const A = ctx.drawingBufferHeight
    const px = new Uint8Array(L * A * 4)
    ctx.readPixels(0, 0, L, A, ctx.RGBA, ctx.UNSIGNED_BYTE, px)
    return { px, L, A }
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

  /** Recorta a caixa num PNG quadrado, centrado, com margem */
  function recortar(buf, cx) {
    const { px, L, A } = buf
    const larg = cx.x1 - cx.x0 + 1
    const alt = cx.y1 - cx.y0 + 1
    const lado = Math.ceil(Math.max(larg, alt) * (1 + MARGEM * 2))

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
   * Espera a pose ASSENTAR, em tempo real, e não por contagem de quadros.
   *
   * A primeira versão escrevia o progresso na barra do painel de depuração
   * e avançava 400 quadros à mão. Duas coisas davam errado ao mesmo tempo:
   *
   *   · o GSAP continua dirigindo `sceneState.progress` pelo scroll, então
   *     ele desfazia a escrita da barra no primeiro tique dele
   *   · `advance()` avança o laço do R3F, mas não o relógio do GSAP, então
   *     o scrub nunca chegava ao valor pedido
   *
   * O resultado saiu na imagem: a AA e a palito foram capturadas no meio do
   * giro, mostrando a tarja de especificação em vez da marca. O kit escapou
   * porque as oito pilhas dele têm rotação própria, independente da pose.
   *
   * Rolando de verdade e esperando a rotação parar, quem dirige é o mesmo
   * mecanismo que dirige a página.
   */
  async function assentar(g) {
    let ant = null
    for (let k = 0; k < 40; k++) {
      await esperar(250)
      const agora = { ry: g.rotation.y, z: g.position.z, s: g.scale.y }
      if (
        ant &&
        Math.abs(agora.ry - ant.ry) < 0.004 &&
        Math.abs(agora.z - ant.z) < 0.002 &&
        Math.abs(agora.s - ant.s) < 0.002
      ) {
        return k
      }
      ant = agora
    }
    return 'estourou'
  }

  async function capturar() {
    if (!window.__cena) throw new Error('abra com ?debug=scene')
    const espacador = document.querySelector('.pin-spacer')
    if (!espacador) throw new Error('o ato pinado ainda não montou')
    const curso = espacador.offsetHeight - window.innerHeight
    const irPara = (p) => window.scrollTo(0, Math.round(p * curso))

    /* Acha a protagonista comparando duas posições de scroll distantes */
    const grupos = []
    window.__cena.scene.traverse((o) => {
      if (o.isGroup && o.children.length) grupos.push(o)
    })
    irPara(0.06)
    await esperar(2600)
    const zHeroi = grupos.map((g) => g.position.z)
    irPara(0.225)
    await esperar(2600)
    const i = grupos.findIndex((g, k) => Math.abs(g.position.z - zHeroi[k]) > 0.3)
    if (i < 0) throw new Error('não achei o grupo da protagonista')
    const protagonista = grupos[i]

    for (const alvo of ALVOS) {
      irPara(alvo.progresso)
      const voltas = await assentar(protagonista)
      console.log(`${alvo.nome}: assentou em ${voltas}`, {
        ry: +protagonista.rotation.y.toFixed(3),
        z: +protagonista.position.z.toFixed(3),
      })

      const buf = lerPixels()
      const cx = caixa(buf, alvo.ilha)
      if (!cx) {
        console.warn(`${alvo.nome}: nada em cena`)
        continue
      }
      const dados = recortar(buf, cx)

      const r = await fetch(`http://127.0.0.1:${PORTA}/`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nome: alvo.nome, dados }),
      })
      console.log(alvo.nome, r.ok ? 'ok' : await r.text(), cx)
    }
    console.log('pronto')
  }

  window.capturar = capturar
})()
