/**
 * FERRAMENTA DE DESENVOLVIMENTO — gera as texturas do rótulo.
 *
 * Desenha em Canvas 2D dentro da página em execução, porque é o único
 * caminho que enxerga as webfonts carregadas (SVG desenhado em canvas
 * ignora @font-face). O logo entra como arquivo oficial, nunca redesenhado.
 *
 * Emite QUATRO mapas, todos pela mesma rotina de desenho para ficarem em
 * registro perfeito:
 *
 *   _cor        cor base (albedo)
 *   _rugosidade quão fosca é cada região
 *   _metalico   quais regiões são metal
 *   _normal     relevo, derivado de um mapa de altura
 *
 * Sem os três últimos a porta USB-C responde à luz igual ao corpo fosco e
 * lê como desenho pintado, não como abertura de verdade.
 *
 * Uso:  const m = await import('/gerar-rotulo.js'); await m.gerar('AA')
 */

const FORMATOS = {
  AA: { largura: 2048, altura: 2270, capacidade: '3400 mWh' },
  AAA: { largura: 2048, altura: 2763, capacidade: '1100 mWh' },
}

/**
 * Valores por modo. Cinza em altura: 128 = superfície do rótulo,
 * abaixo afunda, acima levanta.
 */
const MODOS = {
  cor: {
    corpo: '#000000', laranja: '#FFA400', tinta: '#FFFFFF', laranjaTinta: '#FFA400',
    portaCavidade: '#050505', portaLingua: '#3A3A3A', portaAro: '#8A8A8A',
  },
  altura: {
    // tinta impressa levanta de leve; a porta afunda fundo
    corpo: '#808080', laranja: '#808080', tinta: '#8C8C8C', laranjaTinta: '#8C8C8C',
    portaCavidade: '#1E1E1E', portaLingua: '#5A5A5A', portaAro: '#9A9A9A',
  },
  rugosidade: {
    // claro = fosco. Corpo bem fosco, metal da porta liso.
    corpo: '#E0E0E0', laranja: '#9C9C9C', tinta: '#C8C8C8', laranjaTinta: '#9C9C9C',
    portaCavidade: '#707070', portaLingua: '#4A4A4A', portaAro: '#3A3A3A',
  },
  metalico: {
    // claro = metal. Só a porta.
    corpo: '#000000', laranja: '#000000', tinta: '#000000', laranjaTinta: '#000000',
    portaCavidade: '#B0B0B0', portaLingua: '#D8D8D8', portaAro: '#F0F0F0',
  },
}

const carregarImagem = (src) =>
  new Promise((ok, erro) => {
    const img = new Image()
    img.onload = () => ok(img)
    img.onerror = () => erro(new Error('falhou: ' + src))
    img.src = src
  })

/** Caixa dos pixels opacos de uma imagem — ignora a margem transparente */
function medirConteudo(img) {
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const g = c.getContext('2d', { willReadFrequently: true })
  g.drawImage(img, 0, 0)
  const d = g.getImageData(0, 0, c.width, c.height).data
  let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

function reciclagem(ctx, cx, cy, tamanho, cor) {
  const r = tamanho / 2
  ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = cor
  for (let i = 0; i < 3; i++) {
    ctx.save(); ctx.rotate((i * 2 * Math.PI) / 3)
    ctx.beginPath()
    ctx.moveTo(-r * 0.52, -r * 0.66); ctx.lineTo(r * 0.24, -r * 0.66)
    ctx.lineTo(r * 0.24, -r * 0.9); ctx.lineTo(r * 0.72, -r * 0.45)
    ctx.lineTo(r * 0.24, 0); ctx.lineTo(r * 0.24, -r * 0.24)
    ctx.lineTo(-r * 0.52, -r * 0.24); ctx.closePath(); ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

function lixeiraCortada(ctx, cx, cy, tamanho, cor) {
  ctx.save(); ctx.translate(cx, cy)
  ctx.strokeStyle = cor; ctx.fillStyle = cor; ctx.lineJoin = 'round'
  const w = tamanho * 0.58, h = tamanho * 0.68
  ctx.fillRect(-w * 0.15, -h / 2 - tamanho * 0.1, w * 0.3, tamanho * 0.07)
  ctx.fillRect(-w / 2, -h / 2, w, tamanho * 0.08)
  ctx.lineWidth = tamanho * 0.055
  ctx.beginPath()
  ctx.moveTo(-w * 0.4, -h / 2 + tamanho * 0.13); ctx.lineTo(w * 0.4, -h / 2 + tamanho * 0.13)
  ctx.lineTo(w * 0.31, h / 2); ctx.lineTo(-w * 0.31, h / 2)
  ctx.closePath(); ctx.stroke()
  ctx.lineWidth = tamanho * 0.075; ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-tamanho * 0.5, -tamanho * 0.4); ctx.lineTo(tamanho * 0.5, tamanho * 0.4)
  ctx.moveTo(tamanho * 0.5, -tamanho * 0.4); ctx.lineTo(-tamanho * 0.5, tamanho * 0.4)
  ctx.stroke()
  ctx.restore()
}

function corpoQueCabe(ctx, texto, peso, limite, maximo, espaco = 0) {
  let fs = maximo
  for (; fs > 8; fs -= 2) {
    ctx.font = `${peso} ${fs}px Montserrat, sans-serif`
    if (ctx.measureText(texto).width + espaco * texto.length <= limite) break
  }
  return fs
}

function textoVertical(ctx, texto, x, yBase, fonte, cor, espaco = 0) {
  ctx.save(); ctx.translate(x, yBase); ctx.rotate(-Math.PI / 2)
  ctx.font = fonte; ctx.fillStyle = cor
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  if (espaco) {
    let cursor = 0
    for (const ch of texto) { ctx.fillText(ch, cursor, 0); cursor += ctx.measureText(ch).width + espaco }
  } else {
    ctx.fillText(texto, 0, 0)
  }
  ctx.restore()
}

/**
 * Desenha o rótulo inteiro num modo. A geometria é idêntica entre modos —
 * só as cores mudam — para os mapas ficarem em registro exato.
 */
function desenhar(ctx, W, H, modo, cfg, logo, bboxLogo) {
  const P = MODOS[modo]
  const ehCor = modo === 'cor'

  ctx.fillStyle = P.corpo
  ctx.fillRect(0, 0, W, H)

  const faixa = Math.round(H * 0.18)
  ctx.fillStyle = P.laranja
  ctx.fillRect(0, 0, W, faixa)

  const colMarca = Math.round(W * 0.29)
  const colTecnica = Math.round(W * 0.73)

  // --- porta USB-C: aro metálico, cavidade funda e língua central --------
  // 18,3% da circunferência = 8,34 mm numa AA, que é a abertura real do
  // padrão USB-C. Estava em 16% (7,29 mm) e ficava menor que o plugue,
  // que atravessava a moldura em vez de encaixar.
  const portaL = Math.round(W * 0.183)
  const portaA = Math.round(portaL * 0.3)
  const portaY = Math.round(faixa * 0.58)
  const aro = Math.max(3, Math.round(portaA * 0.13))

  // aro (lábio de metal em volta da abertura)
  ctx.fillStyle = P.portaAro
  ctx.beginPath()
  ctx.roundRect(
    colMarca - portaL / 2 - aro, portaY - portaA / 2 - aro,
    portaL + aro * 2, portaA + aro * 2, (portaA + aro * 2) / 2,
  )
  ctx.fill()

  // cavidade
  ctx.fillStyle = P.portaCavidade
  ctx.beginPath()
  ctx.roundRect(colMarca - portaL / 2, portaY - portaA / 2, portaL, portaA, portaA / 2)
  ctx.fill()

  // língua central do conector
  const linguaL = portaL * 0.74
  const linguaA = portaA * 0.34
  ctx.fillStyle = P.portaLingua
  ctx.beginPath()
  ctx.roundRect(colMarca - linguaL / 2, portaY - linguaA / 2, linguaL, linguaA, linguaA / 2)
  ctx.fill()

  // --- chevron -----------------------------------------------------------
  const chevL = Math.round(W * 0.16)
  ctx.strokeStyle = P.laranjaTinta
  ctx.lineWidth = Math.round(H * 0.022)
  ctx.lineCap = 'butt'; ctx.lineJoin = 'miter'
  ctx.beginPath()
  ctx.moveTo(colMarca - chevL / 2, H * 0.203)
  ctx.lineTo(colMarca, H * 0.243)
  ctx.lineTo(colMarca + chevL / 2, H * 0.203)
  ctx.stroke()

  // --- emblema oficial ---------------------------------------------------
  const alvoAlt = Math.round(H * 0.108)
  const escala = alvoAlt / bboxLogo.h
  const larguraLogo = Math.round(bboxLogo.w * escala)
  const logoX = Math.round(colMarca - larguraLogo / 2)
  const logoY = Math.round(H * 0.283)
  if (ehCor) {
    ctx.drawImage(logo, bboxLogo.x, bboxLogo.y, bboxLogo.w, bboxLogo.h, logoX, logoY, larguraLogo, alvoAlt)
  } else {
    // Nos mapas de material o logo é tinta impressa: usa a silhueta do
    // arquivo como máscara e pinta com o valor do modo.
    const tmp = document.createElement('canvas')
    tmp.width = larguraLogo; tmp.height = alvoAlt
    const g = tmp.getContext('2d')
    g.drawImage(logo, bboxLogo.x, bboxLogo.y, bboxLogo.w, bboxLogo.h, 0, 0, larguraLogo, alvoAlt)
    g.globalCompositeOperation = 'source-in'
    g.fillStyle = P.tinta
    g.fillRect(0, 0, larguraLogo, alvoAlt)
    ctx.drawImage(tmp, logoX, logoY)
  }

  // --- POWERFAST + subtítulo --------------------------------------------
  const baseTexto = Math.round(H * 0.972)
  const topoLivre = Math.round(H * 0.283 + alvoAlt + H * 0.02)
  const corrida = baseTexto - topoLivre

  const fs = corpoQueCabe(ctx, 'POWERFAST', 900, corrida, Math.round(W * 0.105))
  textoVertical(ctx, 'POWERFAST', Math.round(colMarca + W * 0.026), baseTexto,
    `900 ${fs}px Montserrat, sans-serif`, P.tinta)

  const sub = 'PILHA RECARREGÁVEL TURBO TIPO-C'
  const espSub = Math.round(W * 0.0035)
  const fsSub = corpoQueCabe(ctx, sub, 500, corrida, Math.round(W * 0.026), espSub)
  textoVertical(ctx, sub, Math.round(colMarca + W * 0.062), Math.round(baseTexto - H * 0.004),
    `500 ${fsSub}px Montserrat, sans-serif`, P.tinta, espSub)

  // --- face técnica ------------------------------------------------------
  const simb = Math.round(W * 0.075)
  lixeiraCortada(ctx, colTecnica, Math.round(H * 0.22), simb, P.tinta)
  reciclagem(ctx, colTecnica, Math.round(H * 0.305), Math.round(simb * 0.95), P.tinta)

  const baseTec = Math.round(H * 0.95)
  const corridaTec = baseTec - Math.round(H * 0.365)
  const linhas = [
    { txt: `${cfg.capacidade}  |  1,5 V  |  ATÉ 1200 CICLOS`, peso: 500 },
    { txt: 'RECARREGÁVEL COM PORTA USB-C', peso: 500 },
    { txt: 'NÃO CURTO-CIRCUITAR NEM INCINERAR', peso: 700 },
  ]
  const fsTec = Math.min(...linhas.map((l) => corpoQueCabe(ctx, l.txt, l.peso, corridaTec, Math.round(W * 0.023))))
  linhas.forEach((l, i) => {
    textoVertical(ctx, l.txt, Math.round(colTecnica - W * 0.031 + i * W * 0.031), baseTec,
      `${l.peso} ${fsTec}px Montserrat, sans-serif`, P.tinta)
  })
}

/**
 * Altura → normal, por Sobel.
 *
 * O relevo é o que faz a borda da porta pegar luz de um lado e sombra do
 * outro. Sem isso a cavidade continua sendo um retângulo chapado, por mais
 * escura que seja.
 */
function alturaParaNormal(canvasAltura, forca = 3.2) {
  const W = canvasAltura.width, H = canvasAltura.height
  const src = canvasAltura.getContext('2d', { willReadFrequently: true })
    .getImageData(0, 0, W, H).data
  const saida = document.createElement('canvas')
  saida.width = W; saida.height = H
  const dst = saida.getContext('2d').createImageData(W, H)

  const alt = (x, y) => {
    const cx = x < 0 ? W + x : x >= W ? x - W : x // repete na horizontal (costura)
    const cy = Math.max(0, Math.min(H - 1, y))
    return src[(cy * W + cx) * 4] / 255
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx =
        alt(x - 1, y - 1) + 2 * alt(x - 1, y) + alt(x - 1, y + 1) -
        (alt(x + 1, y - 1) + 2 * alt(x + 1, y) + alt(x + 1, y + 1))
      const dy =
        alt(x - 1, y - 1) + 2 * alt(x, y - 1) + alt(x + 1, y - 1) -
        (alt(x - 1, y + 1) + 2 * alt(x, y + 1) + alt(x + 1, y + 1))
      let nx = dx * forca, ny = dy * forca, nz = 1
      const inv = 1 / Math.hypot(nx, ny, nz)
      nx *= inv; ny *= inv; nz *= inv
      const i = (y * W + x) * 4
      dst.data[i] = (nx * 0.5 + 0.5) * 255
      dst.data[i + 1] = (ny * 0.5 + 0.5) * 255
      dst.data[i + 2] = (nz * 0.5 + 0.5) * 255
      dst.data[i + 3] = 255
    }
  }
  saida.getContext('2d').putImageData(dst, 0, 0)
  return saida
}

async function salvar(canvas, nome) {
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'))
  const res = await fetch(`/api/dev-save?nome=${nome}`, { method: 'POST', body: blob })
  return res.json()
}

export async function gerar(formato = 'AA') {
  const cfg = FORMATOS[formato]
  if (!cfg) throw new Error('formato desconhecido: ' + formato)

  await document.fonts.ready
  await document.fonts.load('900 200px Montserrat')
  await document.fonts.load('500 50px Montserrat')

  const W = cfg.largura, H = cfg.altura
  const logo = await carregarImagem('/brand/icone-negativo.png')
  const bbox = medirConteudo(logo)
  const sufixo = formato.toLowerCase()

  const fazer = (modo) => {
    const cv = document.createElement('canvas')
    cv.width = W; cv.height = H
    desenhar(cv.getContext('2d', { willReadFrequently: true }), W, H, modo, cfg, logo, bbox)
    return cv
  }

  const cor = fazer('cor')
  const rug = fazer('rugosidade')
  const met = fazer('metalico')
  const altura = fazer('altura')
  const normal = alturaParaNormal(altura)

  const salvos = {}
  salvos.cor = await salvar(cor, `rotulo_${sufixo}.png`)
  salvos.rugosidade = await salvar(rug, `rotulo_${sufixo}_rugosidade.png`)
  salvos.metalico = await salvar(met, `rotulo_${sufixo}_metalico.png`)
  salvos.normal = await salvar(normal, `rotulo_${sufixo}_normal.png`)

  return { formato, dimensoes: `${W}x${H}`, salvos }
}
