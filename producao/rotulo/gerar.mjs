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
 * O motivo é dimensional, não estético. O recorte tem 9 mm no lado maior.
 * Numa AA de 14,5 mm de diâmetro isso são 74° de arco e cabe deitado;
 * numa palito de 10,5 mm seriam 118°, um terço da volta, e o conector não
 * teria onde se apoiar. Girado, o mesmo recorte ocupa 9 mm dos 44,5 mm de
 * comprimento, que sobram.
 *
 * Consequência que não é óbvia: se a porta ocupa 20% do comprimento, a
 * faixa precisa descer até lá, e TUDO que vem depois dela (galão, escudo,
 * marca, bloco de cuidado, tarja) tem de descer junto. A palito não é a
 * AA com outra faixa; é a AA com o miolo inteiro deslocado.
 *
 * A PRIMEIRA TENTATIVA falhou por coordenadas, não por proporção: as
 * peças novas eram compostas em fração da textura final enquanto a arte
 * por baixo já tinha sido ROLADA. Aqui a ordem é uma só — rola primeiro,
 * e daí em diante todo mundo se ancora em U_DA_PORTA, que é onde a porta
 * está por construção.
 */

const AAA = { diametro: 10.5, comprimento: 44.5 }
const AAA_CIRC = Math.PI * AAA.diametro
const TEX_AAA = { largura: 1024, altura: 1382 }

/**
 * Onde a arte da AA se divide.
 *
 * `blocoDe` é a fronteira laranja|carvão da AA, medida: 10,0 mm de faixa
 * menos 0,91 mm de dobra, sobre 50,5 mm de corpo. Dali para baixo está
 * tudo que a palito reaproveita.
 */
const BLOCO_DE = (FAIXA_MM - DOBRA_MAIS) / PILHA.comprimento

/**
 * A faixa da palito, em fração da textura dela.
 *
 * Proporções OBSERVADAS na foto do kit, não cotas: lá as pilhas estão em
 * perspectiva e encostadas umas nas outras, e nenhuma medida por
 * varredura sobreviveu à conferência. Ficam juntas e nomeadas para serem
 * fáceis de acertar quando aparecer a arte oficial da AAA.
 */
const AAA_FAIXA = {
  /** Faixa de largura inteira, do topo até aqui */
  cheiaAte: 0.1,
  /**
   * A aba desce até aqui e então fecha em ponta.
   *
   * O trecho RETO tem de conter a porta inteira. Com 0,245 a base do aro
   * caía já dentro do afunilamento e escapava pelos lados da ponta, o que
   * lê como recorte mal posicionado — que é justamente o defeito que esta
   * arte existe para não ter.
   */
  abaAte: 0.275,
  abaPontaAte: 0.315,
  /**
   * Meia largura da aba, em fração da circunferência.
   *
   * A porta ocupa 9,2% da volta; a aba precisa ser mais larga que ela,
   * mas pouco. Com 0,145 de meia largura ela saía quase quadrada, um
   * bloco com um bico raso em vez da aba estreita e funda da foto.
   */
  abaMeia: 0.082,
  /** Onde o miolo reaproveitado da AA recomeça */
  blocoNovoDe: 0.31,
}

/** A porta em pé: o mesmo recorte de 9 x 3 mm, girado 90° */
const PORTA_AAA = {
  aoLongo: 9.0 / AAA.comprimento,
  emVolta: 3.025 / AAA_CIRC,
  /**
   * Centro tal que a ORLA caiba no trecho reto da aba.
   *
   * Quem manda não é o recorte, é o aro em volta dele: `svgDaPorta`
   * desenha a orla 9% além da caixa em cima e embaixo, então a base dela
   * fica em centro + 0,59 x altura, não em centro + 0,5 x altura.
   */
  centro: 0.145,
}

const AL = TEX_AAA.largura
const AH = TEX_AAA.altura

/** 1. mesma arte limpa da AA, na proporção da palito, já rolada */
const baseAAA = await (async () => {
  const esticada = await sharp(recortada)
    .resize(AL, AH, { fit: 'fill', kernel: 'lanczos3' })
    .png()
    .toBuffer()
  const r = Math.round(((U_DA_PORTA - uAtual + 1) % 1) * AL)
  return sharp({
    create: { width: AL, height: AH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: esticada, left: r - AL, top: 0 },
      { input: esticada, left: r, top: 0 },
    ])
    .png()
    .toBuffer()
})()

/**
 * 2. o miolo desce.
 *
 * Recorta tudo abaixo da faixa da AA e recoloca mais para baixo,
 * comprimido no que sobrou. A compressão sai em 0,84, e não é arbitrária:
 * a palito tem 44,5 mm contra 50,5 mm da AA, ou seja 0,88 do comprimento.
 * O miolo encolhe quase na mesma medida em que o corpo encolheu, então a
 * tipografia mantém a proporção que tem no objeto.
 */
/**
 * O recorte começa ABAIXO da fronteira, não em cima dela.
 *
 * `BLOCO_DE` é exatamente onde o laranja vira carvão, e a primeira linha
 * ali ainda é laranja por causa do antialias. Recolocada mais abaixo, ela
 * virava um fio laranja atravessando a textura inteira, no meio do corpo.
 */
const MARGEM_EMENDA = 0.005
const bloco0 = Math.round((BLOCO_DE + MARGEM_EMENDA) * AH)
const alturaBloco = AH - bloco0
const alturaNova = Math.round((1 - AAA_FAIXA.blocoNovoDe) * AH)
const bloco = await sharp(baseAAA)
  .extract({ left: 0, top: bloco0, width: AL, height: alturaBloco })
  .resize(AL, alturaNova, { fit: 'fill', kernel: 'lanczos3' })
  .png()
  .toBuffer()

/**
 * 3. a faixa, a aba e a porta.
 *
 * Tudo ancorado em U_DA_PORTA, que é onde a porta está por construção
 * depois da rolagem. A aba nasce centrada nela porque é para isso que ela
 * existe: abrigar o recorte. Como 0,29 ± 0,145 cabe em 0..1, nada
 * atravessa a costura da textura.
 */
const px = (f) => (f * AL).toFixed(1)
const py = (f) => (f * AH).toFixed(1)
const abaE = U_DA_PORTA - AAA_FAIXA.abaMeia
const abaD = U_DA_PORTA + AAA_FAIXA.abaMeia

const svgFaixaAAA = (corpo, faixa) => Buffer.from(`<svg width="${AL}" height="${AH}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${AL}" height="${py(AAA_FAIXA.blocoNovoDe)}" fill="${corpo}"/>
  <rect width="${AL}" height="${py(AAA_FAIXA.cheiaAte)}" fill="${faixa}"/>
  <path d="M ${px(abaE)} ${py(AAA_FAIXA.cheiaAte - 0.004)}
           H ${px(abaD)}
           V ${py(AAA_FAIXA.abaAte)}
           L ${px(U_DA_PORTA)} ${py(AAA_FAIXA.abaPontaAte)}
           L ${px(abaE)} ${py(AAA_FAIXA.abaAte)} Z" fill="${faixa}"/>
</svg>`)

/**
 * A porta da palito é a mesma peça, DE PÉ.
 *
 * `svgDaPorta` desenha a língua ao longo do lado maior, e na AA esse lado
 * é o horizontal. Aqui é o vertical, então a chamada troca as duas
 * dimensões e o próprio desenho segue coerente: a língua continua correndo
 * pelo comprimento do conector, que é o que ela faz num USB-C de verdade.
 */
const caixaPortaAAA = {
  largura: AL,
  altura: AH,
  w: PORTA_AAA.emVolta * AL,
  h: PORTA_AAA.aoLongo * AH,
  esquerda: U_DA_PORTA * AL - (PORTA_AAA.emVolta * AL) / 2,
  topo: PORTA_AAA.centro * AH - (PORTA_AAA.aoLongo * AH) / 2,
}

/**
 * A tarja do pé muda de conteúdo: outro formato e outra capacidade.
 *
 * A linha inteira é redesenhada, não remendada glifo a glifo. A fonte da
 * marca saiu do repositório, e trocar só o "AA" por "AAA" com outra fonte
 * deixaria duas famílias na mesma linha — o tipo de detalhe que ninguém
 * sabe nomear mas todo mundo estranha. Redesenhada, ela fica coerente
 * consigo mesma. Na tela tem cerca de um pixel de altura.
 *
 * A posição vem da arte: a tarja da AA mora em v 0,9008..0,9231 da
 * circunferência; depois do giro, da rolagem e da descida do miolo, cai
 * onde as constantes abaixo dizem. Foram conferidas no PNG gerado.
 */
const TARJA = { x0: 0.543, x1: 0.592, y0: 0.42, y1: 0.90 }
const svgTarjaAAA = Buffer.from(`<svg width="${AL}" height="${AH}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${px(TARJA.x0)}" y="${py(TARJA.y0)}"
        width="${px(TARJA.x1 - TARJA.x0)}" height="${py(TARJA.y1 - TARJA.y0)}" fill="#2c2e35"/>
  <g transform="translate(${px((TARJA.x0 + TARJA.x1) / 2)} ${py((TARJA.y0 + TARJA.y1) / 2)}) rotate(-90)">
    <text x="0" y="0" text-anchor="middle" dominant-baseline="central"
          font-family="Arial Narrow, Liberation Sans Narrow, DejaVu Sans Condensed, Arial, sans-serif"
          font-size="26" font-weight="700" letter-spacing="1" fill="#ffffff"
        >AAA  |  1.5 V  |  1100mWh  |  <tspan fill="#ff9c00">BATERIA RECARREGÁVEL DE ÍONS DE LÍTIO</tspan></text>
  </g>
</svg>`)

const corAAA = await sharp({
  create: { width: AL, height: AH, channels: 4, background: { r: 44, g: 46, b: 53, alpha: 255 } },
})
  .composite([
    { input: bloco, left: 0, top: Math.round(AAA_FAIXA.blocoNovoDe * AH) },
    { input: svgTarjaAAA, left: 0, top: 0 },
    { input: svgFaixaAAA('#2c2e35', '#ff9c00'), left: 0, top: 0 },
    {
      input: svgDaPorta(caixaPortaAAA, {
        aro: '#8d8f94', fundoTopo: '#141414', fundoBase: '#2a2a2a', lingueta: '#3f4145',
      }),
      left: 0, top: 0,
    },
  ])
  .png()
  .toBuffer()

await sharp(corAAA).toFile(path.join(DESTINO, 'rotulo_aaa.png'))

/** 4. os outros três mapas, pela mesma receita da AA */
const portaSVG = (cores) => svgDaPorta(caixaPortaAAA, cores)

await sharp({ create: { width: AL, height: AH, channels: 3, background: '#9e9e9e' } })
  .composite([{ input: portaSVG({ aro: '#3d3d3d', fundoTopo: '#8a8a8a', fundoBase: '#8a8a8a', lingueta: '#4a4a4a' }), left: 0, top: 0 }])
  .png()
  .toFile(path.join(DESTINO, 'rotulo_aaa_rugosidade.png'))

await sharp({ create: { width: AL, height: AH, channels: 3, background: '#000000' } })
  .composite([{ input: portaSVG({ aro: '#e6e6e6', fundoTopo: '#1a1a1a', fundoBase: '#1a1a1a', lingueta: '#dcdcdc' }), left: 0, top: 0 }])
  .png()
  .toFile(path.join(DESTINO, 'rotulo_aaa_metalico.png'))

const { data: altA, info: infoA } = await sharp({
  create: { width: AL, height: AH, channels: 3, background: '#ffffff' },
})
  .composite([{ input: portaSVG({ aro: '#c8c8c8', fundoTopo: '#101010', fundoBase: '#101010', lingueta: '#6a6a6a' }), left: 0, top: 0 }])
  .blur(2.2)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const CA = infoA.channels
const normalA = Buffer.alloc(AL * AH * 3)
for (let y = 0; y < AH; y++) {
  for (let x = 0; x < AL; x++) {
    const h = (dx, dy) => {
      const xx = Math.min(AL - 1, Math.max(0, x + dx))
      const yy = Math.min(AH - 1, Math.max(0, y + dy))
      return altA[(yy * AL + xx) * CA] / 255
    }
    const gx = (h(1, 0) - h(-1, 0)) * RELEVO
    const gy = (h(0, 1) - h(0, -1)) * RELEVO
    const inv = 1 / Math.hypot(gx, gy, 1)
    const p = (y * AL + x) * 3
    normalA[p] = Math.round((-gx * inv * 0.5 + 0.5) * 255)
    normalA[p + 1] = Math.round((gy * inv * 0.5 + 0.5) * 255)
    normalA[p + 2] = Math.round((inv * 0.5 + 0.5) * 255)
  }
}
await sharp(normalA, { raw: { width: AL, height: AH, channels: 3 } })
  .png()
  .toFile(path.join(DESTINO, 'rotulo_aaa_normal.png'))

console.log('rótulo AAA gerado (cor, rugosidade, metálico, normal)')
console.log(`  proporção       ${(AAA_CIRC / AAA.comprimento).toFixed(4)}  (textura ${(AL / AH).toFixed(4)})`)
console.log(`  miolo desceu    de ${BLOCO_DE.toFixed(3)} para ${AAA_FAIXA.blocoNovoDe}, comprimido ${(alturaNova / alturaBloco).toFixed(3)}`)
console.log(`  porta em pé     ${(PORTA_AAA.emVolta * 100).toFixed(1)}% da volta x ${(PORTA_AAA.aoLongo * 100).toFixed(1)}% do comprimento`)
console.log(`  aba             u ${abaE.toFixed(3)}..${abaD.toFixed(3)}, desce até ${AAA_FAIXA.abaPontaAte}`)
