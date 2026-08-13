/**
 * Auditoria da textura do rótulo.
 *
 * Verifica o que uma textura de cilindro precisa cumprir e que olho nu
 * não pega: proporção, costura entre as bordas, gradiente residual de
 * iluminação e posição dos elementos.
 *
 *   node scripts/analisa-rotulo.mjs public/produto/rotulo_gerado.png
 */
import fs from 'node:fs'
import { PNG } from 'pngjs'

const png = PNG.sync.read(fs.readFileSync(process.argv[2]))
const { width: W, height: H, data } = png
console.log(`dimensoes: ${W} x ${H}`)
console.log(`proporcao H/L: ${(H / W).toFixed(4)}   alvo AA: 1.1084`)

const at = (x, y) => {
  const i = (y * W + x) * 4
  return [data[i], data[i + 1], data[i + 2], data[i + 3]]
}
const isOrange = (r, g, b) => r > 190 && g > 100 && g < 200 && b < 90

// --- faixa laranja do topo -------------------------------------------------
let bandEnd = 0
for (let y = 0; y < H; y++) {
  let n = 0
  for (let x = 0; x < W; x += 4) if (isOrange(...at(x, y))) n++
  if (n > W / 8) bandEnd = y
  else if (y > 40) break
}
console.log(`faixa laranja: y 0..${bandEnd}  (${((bandEnd / H) * 100).toFixed(1)}% da altura)`)

// --- blocos de laranja abaixo da faixa -------------------------------------
const rows = []
for (let y = bandEnd + 8; y < H; y++) {
  let n = 0, minX = W, maxX = 0
  for (let x = 0; x < W; x++) {
    if (isOrange(...at(x, y))) { n++; if (x < minX) minX = x; if (x > maxX) maxX = x }
  }
  rows.push({ y, n, minX, maxX })
}
const grupos = []
let atual = null
for (const r of rows) {
  if (r.n > 3) {
    if (!atual) atual = { y0: r.y, y1: r.y, minX: r.minX, maxX: r.maxX, px: 0 }
    atual.y1 = r.y
    atual.minX = Math.min(atual.minX, r.minX)
    atual.maxX = Math.max(atual.maxX, r.maxX)
    atual.px += r.n
  } else if (atual && r.y - atual.y1 > 14) {
    grupos.push(atual); atual = null
  }
}
if (atual) grupos.push(atual)

console.log('\n=== blocos laranja (chevrons, escudo) ===')
grupos.filter((g) => g.px > 400).forEach((g, i) => {
  console.log(
    `  [${i}] y ${g.y0}..${g.y1} (alt ${g.y1 - g.y0})  x ${g.minX}..${g.maxX} (larg ${g.maxX - g.minX})  px=${g.px}`,
  )
})

// --- costura ---------------------------------------------------------------
let diff = 0, n = 0
for (let y = 0; y < H; y += 3) {
  const a = at(0, y), b = at(W - 1, y)
  diff += (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])) / 3
  n++
}
console.log(`\ncostura esquerda vs direita: diferenca media ${(diff / n).toFixed(1)}/255`)

// --- gradiente vertical residual -------------------------------------------
const lum = (y) => {
  let s = 0, c = 0
  for (let x = 0; x < W; x += 5) {
    const [r, g, b] = at(x, y)
    if (!isOrange(r, g, b)) { s += (r + g + b) / 3; c++ }
  }
  return s / c
}
console.log('\n=== luminancia do corpo por altura (deveria ser constante) ===')
const amostras = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 0.98].map((p) => ({
  p, v: lum(Math.round(H * p)),
}))
amostras.forEach(({ p, v }) => console.log(`  ${(p * 100).toFixed(0).padStart(3)}% -> ${v.toFixed(1)}`))
const vs = amostras.map((a) => a.v)
console.log(`  amplitude: ${(Math.max(...vs) - Math.min(...vs)).toFixed(1)}`)
