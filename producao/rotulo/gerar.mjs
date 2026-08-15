/**
 * Gera as texturas do rótulo a partir da arte oficial.
 *
 *   node producao/rotulo/gerar.mjs
 *
 * Entrada:  producao/rotulo/oficial-aa-4000.png  (o PDF de impressão rasterizado)
 * Saída:    public/produto/rotulo_aa*.png        (cor, rugosidade, metálico, normal)
 *
 * ------------------------------------------------------------------
 * COMO A ARTE VIRA TEXTURA DE CILINDRO
 * ------------------------------------------------------------------
 *
 * A prancha tem três camadas (lidas nos content streams do PDF): BG, ART
 * e DIECUT. A DIECUT é anotação de impressão e fica POR CIMA de tudo:
 * linha de faca, margem tracejada, guias de dobra, cotas — e, o que
 * surpreende, o desenho do furo da porta USB-C. Debaixo do furo só há
 * laranja chapado. Ou seja: a porta não é arte, é recorte, e na textura
 * ela precisa ser DESENHADA de volta.
 *
 * O retângulo do rótulo é a linha de faca, não o bloco colorido: o bloco
 * é maior porque tem sangria (3,5 a 4,4 mm por lado). Medir pelo bloco dá
 * escalas diferentes nos dois eixos (22,0 contra 21,7 px/mm); medir pela
 * faca dá 19,0385 contra 19,0505, que concordam em 0,06%. E a faixa
 * laranja, medida a partir da faca, sai em 10,000 mm redondos — que é a
 * confirmação de que a moldura está certa.
 *
 * Orientação: o eixo de 52,0 mm é o COMPRIMENTO e o de 49,5 mm é a
 * CIRCUNFERÊNCIA. Isso se decide na foto do produto, não no desenho:
 *
 *   - o "POWERFAST" corre ao longo do corpo, e na arte ele é horizontal
 *   - a faixa laranja é um anel numa PONTA, e na arte é uma tira lateral
 *   - o furo tem 9 mm no eixo vertical da arte, e na foto da AA a porta é
 *     DEITADA: 0,60 do diâmetro de largura, o que dá 9,4 mm de arco
 *
 * O último item era o que confundia: parece que uma porta de 9 mm teria
 * de correr no comprimento. Na AA não corre, ela abraça a circunferência.
 * Quem fica em pé é a porta da AAA, e só porque uma palito de 10,5 mm de
 * diâmetro não tem 9 mm de arco para dar.
 *
 * Sobras: a etiqueta é maior que o cilindro nos dois eixos, porque dobra
 * sobre as tampas e lapela sobre si mesma. O que sobra é CORTADO, nunca
 * espremido — espremer distorceria a tipografia.
 */

import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
const RAIZ = path.resolve(AQUI, '..', '..')
const require = createRequire(path.join(RAIZ, 'package.json'))
const sharp = require('sharp')

const ENTRADA = path.join(AQUI, 'oficial-aa-4000.png')
const DESTINO = path.join(RAIZ, 'public', 'produto')

/* ---------------------------------------------------------------- medidas */

/**
 * A faca, em pixels da prancha de 4000. Vem de duas medições
 * independentes que concordam dentro de 0,4 px: os eixos das linhas
 * vermelhas sólidas, e as linhas de chamada azuis das cotas, que caem
 * exatamente sobre elas.
 */
const FACA = { x0: 1538.3, y0: 1648.7, x1: 2528.55, y1: 2591.7 }
const FACA_L = FACA.x1 - FACA.x0 // 990,25 px = 52,000 mm
const FACA_A = FACA.y1 - FACA.y0 // 943,00 px = 49,508 mm
const PX_MM = FACA_L / 52

/** Medidas do produto, as mesmas de src/data/products.ts */
const PILHA = { diametro: 14.5, comprimento: 50.5 }
const CIRCUNFERENCIA = Math.PI * PILHA.diametro // 45,553 mm

/** Fronteira laranja|carvão, medida a partir da faca esquerda */
const FAIXA_MM = 10.0

/**
 * O furo da porta, em mm a partir da faca.
 *
 * O estádio branco é o recorte de verdade e mede 3,025 × 9,000 mm, que é
 * a cota "9x3mm" do desenho. O anel cinza de 1 mm em volta é tolerância
 * de faca, não arte: a cota "3,5 mm" mede até a borda EXTERNA dele.
 */
const PORTA = {
  comprimento: 3.025, // no eixo do comprimento da pilha
  circunferencia: 9.0, // no eixo da circunferência
  centroComprimento: 6.026,
  centroCircunferencia: 12.04,
}

/**
 * Sobra da etiqueta sobre o cilindro.
 *
 * No COMPRIMENTO: 52,0 mm de etiqueta para 50,5 mm de corpo. O 1,5 mm
 * dobra sobre as tampas. A repartição não está cotada, então quem decide
 * é a foto: lá a faixa laranja ocupa 18,0% do comprimento visível, e é
 * essa a equação que fixa quanto sai de cada ponta.
 *
 *   (10,0 − dobraMais) / 50,5 = 0,180   =>   dobraMais = 0,91 mm
 *   dobraMenos = 1,5 − 0,91 = 0,59 mm
 *
 * Na CIRCUNFERÊNCIA: 49,508 mm de etiqueta para 45,553 mm de volta. Os
 * 3,955 mm de lapela ficam colados por baixo e nunca aparecem. Saem da
 * borda v=0 porque ali só há carvão liso; do outro lado a tarja de
 * especificação chega a 0,923 e seria cortada.
 */
const DOBRA_MAIS = 0.91
const DOBRA_MENOS = 52 - PILHA.comprimento - DOBRA_MAIS
const LAPELA = 49.508 - CIRCUNFERENCIA

/** Tamanho da textura. A proporção sai de circunferência × comprimento */
const TEX = { largura: 1024, altura: 1135 }

/**
 * Onde a porta deve cair no eixo horizontal da textura.
 *
 * A costura da etiqueta é arbitrária: girar o desenho em volta do
 * cilindro não muda nada no objeto. Então em vez de mexer em
 * ANGULO_PORTA e nas faces de scene-state.ts — e em tudo que depende
 * delas, do cabo à pose da pílula — a textura é ROLADA para a porta
 * cair no mesmo u de sempre. Uma linha aqui contra uma dúzia de
 * constantes lá.
 */
const U_DA_PORTA = 0.29

/* ------------------------------------------------------------- utilidades */

const mmParaPxL = (mm) => mm * PX_MM
const LARANJA = [255, 156, 0]
const CARVAO = [44, 46, 53]

/**
 * Retângulos da camada DIECUT que caem DENTRO da faixa laranja.
 *
 * Ali a arte é chapada, então preencher com laranja é exato — e evita a
 * única armadilha real do arquivo: o cinza do anel do furo está a menos
 * de 9 de distância RGB do anti-alias do texto branco sobre o corpo, e
 * qualquer seleção por cor que pegue um come o outro. Selecionar por
 * REGIÃO não corre esse risco.
 *
 * Em px da prancha. Folga generosa: tudo aqui é laranja liso.
 */
const NA_FAIXA = [
  { x0: 1596, y0: 1765, x1: 1712, y1: 1992 }, // furo + anel
  { x0: 1460, y0: 1900, x1: 1620, y1: 1990 }, // chamadas "9x3mm" e "3.5mm"
  { x0: 1460, y0: 1640, x1: 1620, y1: 1660 }, // extensão azul de cima
  { x0: 1460, y0: 2582, x1: 1620, y1: 2602 }, // extensão azul de baixo
]

/** Vermelho da faca e da tracejada: separável do laranja com folga enorme */
const ehVermelho = (r, g, b) => r > 100 && g - b < 60 && r - g > 55
/** Amarelo dos tiques de dobra */
const ehAmarelo = (r, g, b) => r > 180 && g > 150 && b < 130 && r - g < 90

async function limpar() {
  const { data, info } = await sharp(ENTRADA).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true })
  const { width: L, height: A, channels: C } = info

  /** Núcleo das anotações por cor */
  const marca = new Uint8Array(L * A)
  for (let i = 0; i < L * A; i++) {
    const p = i * C
    const r = data[p], g = data[p + 1], b = data[p + 2]
    if (ehVermelho(r, g, b) || ehAmarelo(r, g, b)) marca[i] = 1
  }

  /**
   * Dilatação de 2 px, nem mais nem menos.
   *
   * A regra de cor pega só o núcleo; em volta fica o halo de anti-alias
   * (misturas de até 50%), que sem tratamento aparece como franja rosada
   * ao redor de cada traço. Com r=3 a máscara alcança a tarja de
   * especificação, que passa a 2 px da tracejada de baixo.
   */
  const R = 2
  const dilatada = new Uint8Array(L * A)
  for (let y = 0; y < A; y++) {
    for (let x = 0; x < L; x++) {
      if (!marca[y * L + x]) continue
      for (let dy = -R; dy <= R; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= A) continue
        for (let dx = -R; dx <= R; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= L) continue
          dilatada[yy * L + xx] = 1
        }
      }
    }
  }

  /** As regiões da faixa entram inteiras, sem teste de cor */
  for (const r of NA_FAIXA) {
    for (let y = r.y0; y <= r.y1; y++) {
      for (let x = r.x0; x <= r.x1; x++) {
        if (x >= 0 && x < L && y >= 0 && y < A) dilatada[y * L + x] = 1
      }
    }
  }

  /**
   * Preenchimento determinístico: o fundo é literalmente dois retângulos.
   * Fora da faca não importa, porque o recorte vem logo depois.
   */
  const fronteira = FACA.x0 + mmParaPxL(FAIXA_MM)
  for (let y = 0; y < A; y++) {
    for (let x = 0; x < L; x++) {
      if (!dilatada[y * L + x]) continue
      const p = (y * L + x) * C
      const cor = x < fronteira ? LARANJA : CARVAO
      data[p] = cor[0]; data[p + 1] = cor[1]; data[p + 2] = cor[2]; data[p + 3] = 255
    }
  }

  return sharp(Buffer.from(data), { raw: { width: L, height: A, channels: C } })
}

/**
 * Desenha a porta USB-C nas coordenadas da textura já pronta.
 *
 * Vetorial, não recortada de imagem: assim o mesmo traçado serve aos
 * quatro mapas, e cada um só troca as cores. Se a cavidade do mapa de cor
 * e o relevo do mapa normal não casarem pixel a pixel, a borda da porta
 * ganha uma sombra deslocada e a peça inteira lê como adesivo.
 */
function svgDaPorta({ largura, altura, esquerda, topo, w, h }, cores) {
  const r = Math.min(w, h) / 2
  const lingueta = h * 0.34
  return Buffer.from(`<svg width="${largura}" height="${altura}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fundo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${cores.fundoTopo}"/>
      <stop offset="1" stop-color="${cores.fundoBase}"/>
    </linearGradient>
  </defs>
  <g transform="translate(${esquerda} ${topo})">
    <rect x="${-w * 0.045}" y="${-h * 0.09}" width="${w * 1.09}" height="${h * 1.18}"
          rx="${r * 1.14}" fill="${cores.aro}"/>
    <rect width="${w}" height="${h}" rx="${r}" fill="url(#fundo)"/>
    <rect x="${w * 0.16}" y="${(h - lingueta) / 2}" width="${w * 0.68}" height="${lingueta}"
          rx="${lingueta / 2}" fill="${cores.lingueta}"/>
  </g>
</svg>`)
}

/* ------------------------------------------------------------------ passo */

const limpa = await limpar()

/** 1. recorta a faca */
const naFaca = await limpa
  .extract({
    left: Math.round(FACA.x0),
    top: Math.round(FACA.y0),
    width: Math.round(FACA_L),
    height: Math.round(FACA_A),
  })
  // O formato é obrigatório: a entrada é buffer cru, e sem isto o sharp
  // não sabe em que codificar a saída
  .png()
  .toBuffer()

/**
 * 2. gira 90° no sentido HORÁRIO.
 *
 * A faixa laranja está à esquerda da arte e precisa terminar no topo da
 * textura, que é a ponta do polo positivo. O giro horário leva a esquerda
 * para cima. De quebra, o texto passa a ler de cima para baixo, que é
 * como ele aparece na foto do produto — o rótulo antigo lia ao contrário.
 */
const girada = await sharp(naFaca).rotate(90).toBuffer()

/**
 * 3. corta as sobras. Depois do giro, o comprimento é o eixo VERTICAL e a
 * circunferência o HORIZONTAL.
 */
const gm = await sharp(girada).metadata()
const pxCircunf = gm.width / 49.508
const pxComp = gm.height / 52

/**
 * O corte da lapela sai da ESQUERDA da imagem já girada.
 *
 * O giro horário inverte o eixo da circunferência: o que era a borda
 * v=0 da arte vira a borda direita, e vice-versa. Cortando pela direita,
 * a faca comeria a tarja de especificação, que na arte fica em
 * v 0,901..0,923 e portanto encosta na borda oposta. Pela esquerda, o
 * corte cai em carvão liso: a trava de marca mais alta só começa em
 * v=0,165.
 */
const recortada = await sharp(girada)
  .extract({
    left: 0,
    top: Math.round(DOBRA_MAIS * pxComp),
    width: Math.round(CIRCUNFERENCIA * pxCircunf),
    height: Math.round(PILHA.comprimento * pxComp),
  })
  .png()
  .toBuffer()

const util = await sharp(recortada)
  .resize(TEX.largura, TEX.altura, { fit: 'fill', kernel: 'lanczos3' })
  .toBuffer()

/**
 * 4. rola horizontalmente para a porta cair em U_DA_PORTA.
 *
 * A porta está, na arte, a 12,040 mm da faca de cima no eixo da
 * circunferência. Descontada a lapela, isso vira a fração abaixo.
 */
/**
 * ATENÇÃO ao sentido: o giro horário INVERTE o eixo da circunferência.
 *
 * A porta está a 12,040 mm da faca de cima na arte; depois do giro ela
 * fica a 49,508 − 12,040 = 37,468 mm da borda esquerda. Ignorar essa
 * inversão foi o que, na primeira versão, pôs a porta desenhada em cima
 * do sinal "+" do polo positivo, que fica quase do lado oposto.
 */
const uAtual = (49.508 - PORTA.centroCircunferencia) / CIRCUNFERENCIA
const rolagem = Math.round(((U_DA_PORTA - uAtual + 1) % 1) * TEX.largura)
const rolada = rolagem === 0
  ? util
  : await sharp({
      create: { width: TEX.largura, height: TEX.altura, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([
        { input: util, left: rolagem - TEX.largura, top: 0 },
        { input: util, left: rolagem, top: 0 },
      ])
      .png()
      .toBuffer()

/** 5. compõe a porta */
const vPorta = (PORTA.centroComprimento - DOBRA_MAIS) / PILHA.comprimento
const caixaPorta = {
  largura: TEX.largura,
  altura: TEX.altura,
  w: (PORTA.circunferencia / CIRCUNFERENCIA) * TEX.largura,
  h: (PORTA.comprimento / PILHA.comprimento) * TEX.altura,
  esquerda: 0,
  topo: 0,
}
caixaPorta.esquerda = U_DA_PORTA * TEX.largura - caixaPorta.w / 2
caixaPorta.topo = vPorta * TEX.altura - caixaPorta.h / 2

const cor = await sharp(rolada)
  .composite([{
    input: svgDaPorta(caixaPorta, {
      aro: '#8d8f94', fundoTopo: '#141414', fundoBase: '#2a2a2a', lingueta: '#3f4145',
    }),
    top: 0, left: 0,
  }])
  .png()
  .toBuffer()

await sharp(cor).toFile(path.join(DESTINO, 'rotulo_aa.png'))

/* -------------------------------------------------- os outros três mapas */

/**
 * Os quatro mapas nascem do MESMO traçado.
 *
 * É por isso que a porta é desenhada em SVG e não recortada de imagem: se
 * a cavidade do mapa de cor e o relevo do mapa normal não casarem pixel a
 * pixel, a borda ganha uma sombra deslocada e a peça inteira lê como
 * adesivo colado, que foi exatamente o defeito que fez a porta antiga
 * parecer pintada.
 */

/** Rugosidade: o rótulo é acetinado por igual; só a porta destoa */
const rugosidade = await sharp({
  create: { width: TEX.largura, height: TEX.altura, channels: 3, background: '#9e9e9e' },
})
  .composite([{
    input: svgDaPorta(caixaPorta, {
      // aro metálico liso, cavidade fosca, língua lisa
      aro: '#3d3d3d', fundoTopo: '#8a8a8a', fundoBase: '#8a8a8a', lingueta: '#4a4a4a',
    }),
    top: 0, left: 0,
  }])
  .png()
  .toFile(path.join(DESTINO, 'rotulo_aa_rugosidade.png'))

/** Metálico: só a porta é metal. O resto é papel impresso, e papel é zero */
await sharp({
  create: { width: TEX.largura, height: TEX.altura, channels: 3, background: '#000000' },
})
  .composite([{
    input: svgDaPorta(caixaPorta, {
      aro: '#e6e6e6', fundoTopo: '#1a1a1a', fundoBase: '#1a1a1a', lingueta: '#dcdcdc',
    }),
    top: 0, left: 0,
  }])
  .png()
  .toFile(path.join(DESTINO, 'rotulo_aa_metalico.png'))

/**
 * Normal: derivado de uma ALTURA, não desenhado à mão.
 *
 * A altura é clara no plano do rótulo e escura dentro da cavidade; o
 * gradiente dela é a inclinação, e a inclinação é o mapa normal. Fazer
 * pelo caminho inverso (pintar um normal azulado à mão) quase sempre
 * produz uma borda que se ilumina do lado errado quando a pilha gira.
 */
const ALTURA_PORTA = svgDaPorta(caixaPorta, {
  aro: '#c8c8c8', fundoTopo: '#101010', fundoBase: '#101010', lingueta: '#6a6a6a',
})
/**
 * `removeAlpha()` não é detalhe: compor um SVG (que tem alfa) sobre uma
 * base RGB faz o sharp PROMOVER a saída para 4 canais. Lendo o buffer
 * com passo 3, cada linha desliza um byte em relação à anterior, e o
 * gradiente resultante vira um redemoinho de contornos em volta da
 * porta — que foi exatamente o que apareceu no cilindro.
 */
const alturaImg = sharp({
  create: { width: TEX.largura, height: TEX.altura, channels: 3, background: '#ffffff' },
})
  .composite([{ input: ALTURA_PORTA, top: 0, left: 0 }])
  // Um borrão curto arredonda o degrau: sem ele a parede da cavidade fica
  // vertical e o realce da borda vira uma linha dura de um pixel
  .blur(2.2)
  .removeAlpha()
const { data: alturaBuf, info: alturaInfo } = await alturaImg
  .raw()
  .toBuffer({ resolveWithObject: true })
const AC = alturaInfo.channels

const NL = TEX.largura
const NA = TEX.altura
const normal = Buffer.alloc(NL * NA * 3)
/** Quanto o degrau da cavidade levanta. Alto demais e a porta descola */
const RELEVO = 2.6
for (let y = 0; y < NA; y++) {
  for (let x = 0; x < NL; x++) {
    const h = (dx, dy) => {
      const xx = Math.min(NL - 1, Math.max(0, x + dx))
      const yy = Math.min(NA - 1, Math.max(0, y + dy))
      return alturaBuf[(yy * NL + xx) * AC] / 255
    }
    const gx = (h(1, 0) - h(-1, 0)) * RELEVO
    const gy = (h(0, 1) - h(0, -1)) * RELEVO
    // normal = (-gx, -gy, 1) normalizada, codificada em 0..255
    const inv = 1 / Math.hypot(gx, gy, 1)
    const p = (y * NL + x) * 3
    normal[p] = Math.round((-gx * inv * 0.5 + 0.5) * 255)
    normal[p + 1] = Math.round((gy * inv * 0.5 + 0.5) * 255)
    normal[p + 2] = Math.round((inv * 0.5 + 0.5) * 255)
  }
}
await sharp(normal, { raw: { width: NL, height: NA, channels: 3 } })
  .png()
  .toFile(path.join(DESTINO, 'rotulo_aa_normal.png'))

console.log('rótulo AA gerado (cor, rugosidade, metálico, normal)')

/* ==================================================================== AAA */

/**
 * A PALITO NÃO É A AA REDUZIDA.
 *
 * Não existe arte oficial dela, e copiar a da AA em escala daria uma
 * pilha errada: nas fotos do produto a porta da palito fica EM PÉ, e a
 * faixa laranja desce numa aba que a envolve e termina em ponta.
 *
 * O motivo é dimensional, não estético. O recorte da porta tem 9 mm no
 * lado maior. Numa AA de 14,5 mm de diâmetro isso são 74° de arco e cabe
 * deitado; numa palito de 10,5 mm seriam 118°, ou seja um terço da volta,
 * e o conector não teria onde se apoiar. Girado, o mesmo recorte ocupa
 * 9 mm dos 44,5 mm de comprimento, que sobram.
 *
 * O que É reaproveitado da arte oficial: as duas travas de marca, o bloco
 * de cuidado e a tarja do pé. O que é redesenhado: a faixa, a aba, a
 * porta, o galão e os dois números da tarja.
 */

/**
 * DESLIGADA. Esta primeira versão saiu errada e está aqui como registro
 * do caminho, não como código em uso. Rode com AAA=1 para trabalhar nela.
 *
 * O que quebrou: as peças novas (faixa, aba, galão, tarja) são compostas
 * em coordenadas da textura FINAL, mas a arte por baixo já foi rolada
 * para a porta cair em ANGULO_PORTA. Misturar os dois sistemas fez a aba
 * nascer na coluna errada, o galão virar uma cunha atravessada e a tarja
 * nova aparecer ao lado da antiga em vez de sobre ela.
 *
 * O conserto não é ajustar número: é compor ANTES da rolagem, no sistema
 * da arte, onde cada elemento tem posição conhecida, e rolar uma vez só
 * no fim. Também falta girar a língua da porta junto com ela — o desenho
 * do conector assume o lado maior na horizontal, e na palito ele é
 * vertical.
 */
if (!process.env.AAA) {
  console.log('rótulo AAA: pulado (defina AAA=1 para gerar)')
  process.exit(0)
}

const AAA = { diametro: 10.5, comprimento: 44.5 }
const AAA_CIRC = Math.PI * AAA.diametro
const TEX_AAA = { largura: 1024, altura: 1382 }

/**
 * A faixa da palito, em fração do comprimento e da circunferência.
 *
 * Lida no recorte da foto do kit, que é o melhor que existe: as pilhas
 * estão em perspectiva e encostadas, então isto é proporção observada,
 * não cota. Fica aqui em cima, num lugar só, para ser fácil de acertar
 * quando aparecer a arte oficial da AAA.
 */
const FAIXA_AAA = {
  cheiaAte: 0.115, // faixa de largura inteira
  abaAte: 0.275, // a aba desce até aqui
  abaPontaAte: 0.315, // e fecha em ponta
  abaDe: 0.3, // borda esquerda da aba, em fração da circunferência
  galaoDe: 0.335,
  galaoAte: 0.4,
}

/** Porta em pé: o mesmo recorte de 9 x 3 mm, girado */
const PORTA_AAA = {
  comprimento: 9.0,
  circunferencia: 3.025,
  centroComprimento: 0.185, // fração do comprimento
}

const utilAAA = await sharp(recortada)
  .resize(TEX_AAA.largura, TEX_AAA.altura, { fit: 'fill', kernel: 'lanczos3' })
  .toBuffer()

/**
 * A rolagem leva a trava de marca da palito para o mesmo lugar da AA.
 *
 * Na AA quem manda é a porta, que precisa cair em ANGULO_PORTA. Aqui é a
 * mesma conta, porque a porta da palito também é desenhada em cima da
 * trava: as duas ficam na face que o produto mostra.
 */
const rolagemAAA = Math.round(((U_DA_PORTA - uAtual + 1) % 1) * TEX_AAA.largura)
const roladaAAA = await sharp({
  create: { width: TEX_AAA.largura, height: TEX_AAA.altura, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([
    { input: utilAAA, left: rolagemAAA - TEX_AAA.largura, top: 0 },
    { input: utilAAA, left: rolagemAAA, top: 0 },
  ])
  .png()
  .toBuffer()

const AL = TEX_AAA.largura
const AA_ALT = TEX_AAA.altura
const fx = (f) => (f * AL).toFixed(1)
const fy = (f) => (f * AA_ALT).toFixed(1)

/** Caixa da porta em pé, centrada na coluna da aba */
const portaAAA = {
  w: (PORTA_AAA.circunferencia / AAA_CIRC) * AL,
  h: (PORTA_AAA.comprimento / AAA.comprimento) * AA_ALT,
}
const portaCx = U_DA_PORTA * AL
const portaCy = PORTA_AAA.centroComprimento * AA_ALT

/**
 * A faixa, a aba e o galão, num SVG só.
 *
 * O retângulo de carvão vem primeiro e apaga a faixa da AA junto com o
 * galão dela, que na palito fica mais embaixo. Depois entra o desenho
 * novo. Fazer numa peça só garante que a ponta da aba e o galão fiquem
 * alinhados na mesma coluna.
 */
const svgFaixaAAA = (cor) => Buffer.from(`<svg width="${AL}" height="${AA_ALT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${AL}" height="${fy(FAIXA_AAA.galaoAte + 0.01)}" fill="${cor.corpo}"/>
  <rect width="${AL}" height="${fy(FAIXA_AAA.cheiaAte)}" fill="${cor.faixa}"/>
  <path d="M ${fx(FAIXA_AAA.abaDe)} ${fy(FAIXA_AAA.cheiaAte - 0.002)}
           H ${AL}
           V ${fy(FAIXA_AAA.abaAte)}
           L ${fx((FAIXA_AAA.abaDe + 1) / 2)} ${fy(FAIXA_AAA.abaPontaAte)}
           L ${fx(FAIXA_AAA.abaDe)} ${fy(FAIXA_AAA.abaAte)} Z" fill="${cor.faixa}"/>
  <path d="M ${fx(FAIXA_AAA.abaDe)} ${fy(FAIXA_AAA.galaoDe)}
           H ${AL}
           L ${fx((FAIXA_AAA.abaDe + 1) / 2)} ${fy(FAIXA_AAA.galaoAte)} Z" fill="${cor.faixa}"/>
</svg>`)

const svgPortaAAA = (cores) => svgDaPorta({
  largura: AL, altura: AA_ALT,
  esquerda: portaCx - portaAAA.w / 2, topo: portaCy - portaAAA.h / 2,
  w: portaAAA.w, h: portaAAA.h,
}, cores)

/**
 * A tarja do pé muda de conteúdo: outra capacidade e outro formato.
 *
 * O texto é redesenhado, não remendado glifo a glifo: a fonte da marca
 * saiu do repositório e remendar "AA" para "AAA" com outra fonte deixaria
 * duas famílias na mesma linha. Redesenhando a linha inteira, ela fica
 * coerente consigo mesma. Na tela ela tem cerca de um pixel de altura.
 */
const TARJA = { de: 0.9008, ate: 0.9231 } // em fração da circunferência, da arte
const tarjaX = ((TARJA.de + TARJA.ate) / 2 + rolagemAAA / AL) % 1
const svgTarjaAAA = Buffer.from(`<svg width="${AL}" height="${AA_ALT}" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(${fx(tarjaX)} ${fy(0.55)}) rotate(-90)">
    <text x="0" y="0" text-anchor="middle" dominant-baseline="middle"
          font-family="Arial Narrow, Liberation Sans Narrow, Arial, sans-serif"
          font-size="17" font-weight="700" letter-spacing="0.5" fill="#ffffff">AAA  |  1.5 V  |  1100mWh  |  <tspan fill="#ff9c00">BATERIA RECARREGÁVEL DE ÍONS DE LÍTIO</tspan></text>
  </g>
</svg>`)

/** Apaga a tarja antiga antes de escrever a nova */
const svgApagaTarja = Buffer.from(`<svg width="${AL}" height="${AA_ALT}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${fx(tarjaX - 0.022)}" y="${fy(0.2)}" width="${fx(0.044)}" height="${fy(0.72)}" fill="#2c2e35"/>
</svg>`)

const corAAA = await sharp(roladaAAA)
  .composite([
    { input: svgApagaTarja, top: 0, left: 0 },
    { input: svgTarjaAAA, top: 0, left: 0 },
    { input: svgFaixaAAA({ corpo: '#2c2e35', faixa: '#ff9c00' }), top: 0, left: 0 },
    {
      input: svgPortaAAA({ aro: '#8d8f94', fundoTopo: '#141414', fundoBase: '#2a2a2a', lingueta: '#3f4145' }),
      top: 0, left: 0,
    },
  ])
  .png()
  .toBuffer()

await sharp(corAAA).toFile(path.join(DESTINO, 'rotulo_aaa.png'))

/** Rugosidade, metálico e normal: mesma receita da AA, na malha da palito */
await sharp({
  create: { width: AL, height: AA_ALT, channels: 3, background: '#9e9e9e' },
})
  .composite([{ input: svgPortaAAA({ aro: '#3d3d3d', fundoTopo: '#8a8a8a', fundoBase: '#8a8a8a', lingueta: '#4a4a4a' }), top: 0, left: 0 }])
  .png()
  .toFile(path.join(DESTINO, 'rotulo_aaa_rugosidade.png'))

await sharp({
  create: { width: AL, height: AA_ALT, channels: 3, background: '#000000' },
})
  .composite([{ input: svgPortaAAA({ aro: '#e6e6e6', fundoTopo: '#1a1a1a', fundoBase: '#1a1a1a', lingueta: '#dcdcdc' }), top: 0, left: 0 }])
  .png()
  .toFile(path.join(DESTINO, 'rotulo_aaa_metalico.png'))

const { data: altAAA, info: infoAAA } = await sharp({
  create: { width: AL, height: AA_ALT, channels: 3, background: '#ffffff' },
})
  .composite([{ input: svgPortaAAA({ aro: '#c8c8c8', fundoTopo: '#101010', fundoBase: '#101010', lingueta: '#6a6a6a' }), top: 0, left: 0 }])
  .blur(2.2)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const ACA = infoAAA.channels
const normalAAA = Buffer.alloc(AL * AA_ALT * 3)
for (let y = 0; y < AA_ALT; y++) {
  for (let x = 0; x < AL; x++) {
    const h = (dx, dy) => {
      const xx = Math.min(AL - 1, Math.max(0, x + dx))
      const yy = Math.min(AA_ALT - 1, Math.max(0, y + dy))
      return altAAA[(yy * AL + xx) * ACA] / 255
    }
    const gx = (h(1, 0) - h(-1, 0)) * RELEVO
    const gy = (h(0, 1) - h(0, -1)) * RELEVO
    const inv = 1 / Math.hypot(gx, gy, 1)
    const p = (y * AL + x) * 3
    normalAAA[p] = Math.round((-gx * inv * 0.5 + 0.5) * 255)
    normalAAA[p + 1] = Math.round((gy * inv * 0.5 + 0.5) * 255)
    normalAAA[p + 2] = Math.round((inv * 0.5 + 0.5) * 255)
  }
}
await sharp(normalAAA, { raw: { width: AL, height: AA_ALT, channels: 3 } })
  .png()
  .toFile(path.join(DESTINO, 'rotulo_aaa_normal.png'))

console.log('rótulo AAA gerado (porta em pé, faixa com aba)')
console.log(`  proporção       ${(AAA_CIRC / AAA.comprimento).toFixed(4)}  (textura ${(TEX_AAA.largura / TEX_AAA.altura).toFixed(4)})`)
console.log(`  porta           ${PORTA_AAA.circunferencia} x ${PORTA_AAA.comprimento} mm, centro em v ${PORTA_AAA.centroComprimento}`)
console.log(`  faca            ${FACA_L.toFixed(2)} x ${FACA_A.toFixed(2)} px  (${PX_MM.toFixed(4)} px/mm)`)
console.log(`  dobra           ${DOBRA_MAIS} mm no polo +, ${DOBRA_MENOS.toFixed(2)} mm no polo -`)
console.log(`  lapela          ${LAPELA.toFixed(3)} mm cortados da circunferência`)
console.log(`  porta em u      ${uAtual.toFixed(4)} -> rolada ${rolagem} px para ${U_DA_PORTA}`)
console.log(`  porta em v      ${vPorta.toFixed(4)}  (foto: 0,101)`)
console.log(`  faixa laranja   ${((FAIXA_MM - DOBRA_MAIS) / PILHA.comprimento).toFixed(4)} do comprimento  (foto: 0,180)`)
