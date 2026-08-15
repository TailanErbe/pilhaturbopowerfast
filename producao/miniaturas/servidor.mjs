/**
 * Recebe as miniaturas renderizadas pelo navegador e grava em public/produto.
 *
 * ------------------------------------------------------------------
 * POR QUE ESTE SERVIDOR EXISTE
 * ------------------------------------------------------------------
 *
 * As miniaturas da barra do herói precisam ser o PRODUTO, e o produto
 * desta página é geometria procedural montada em three.js: não existe
 * arquivo de modelo para abrir num renderizador de linha de comando, e o
 * `gl` do npm não compila neste Windows sem um toolchain que ninguém quer
 * manter só para gerar três PNGs.
 *
 * Então quem renderiza é o navegador, que já tem a cena montada, com a
 * iluminação certa e o rótulo oficial aplicado. O que faltava era um
 * caminho para os bytes saírem de lá: `readPixels` devolve a imagem, mas
 * ela precisa virar arquivo no disco.
 *
 * Este processo é esse caminho, e nada além disso. Ele não faz parte do
 * site, não sobe para lugar nenhum e só roda durante a geração.
 *
 * ------------------------------------------------------------------
 * COMO USAR
 * ------------------------------------------------------------------
 *
 *   1. `npm run dev` num terminal
 *   2. `node producao/miniaturas/servidor.mjs` noutro
 *   3. abra http://localhost:3000/?debug=scene
 *   4. no console:
 *      fetch('http://127.0.0.1:4321/capturar.js').then(r=>r.text()).then(eval)
 *      capturar()
 *   5. Ctrl+C aqui
 *
 * Regerar é obrigatório sempre que a geometria, o rótulo ou a luz da cena
 * mudarem. Uma miniatura velha não dá erro: ela só passa a mostrar um
 * produto que a página não vende mais.
 */

import { createServer } from 'node:http'
import { writeFile, readFile, mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = dirname(fileURLToPath(import.meta.url))
const DESTINO = resolve(AQUI, '..', '..', 'public', 'produto')
const PORTA = 4321

/**
 * O nome é validado, e não interpolado direto no caminho.
 *
 * O corpo do POST vem do navegador, e escrever em disco um caminho que
 * veio de fora é como se abre um buraco. Aqui só passam letras, números e
 * hífen, e o destino é sempre a mesma pasta.
 */
const NOME_VALIDO = /^[a-z0-9-]{1,60}$/

const servidor = createServer(async (req, res) => {
  /* Só o dev server local fala com isto */
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end()
    return
  }

  /**
   * O próprio script de captura, servido daqui.
   *
   * Assim o passo 4 vira uma linha no console em vez de colar sete mil
   * caracteres, e não há a tentação de largar uma cópia em `public/` — que
   * é justamente onde uma ferramenta de produção não deve morar, porque
   * dali ela iria para o ar junto com o site.
   *
   *   fetch('http://127.0.0.1:4321/capturar.js').then(r => r.text()).then(eval)
   */
  if (req.method === 'GET') {
    try {
      const js = await readFile(join(AQUI, 'capturar.js'), 'utf8')
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' }).end(js)
    } catch (erro) {
      res.writeHead(500).end(String(erro.message))
    }
    return
  }

  if (req.method !== 'POST') {
    res.writeHead(405).end('só POST')
    return
  }

  const partes = []
  for await (const p of req) partes.push(p)

  try {
    const { nome, dados } = JSON.parse(Buffer.concat(partes).toString('utf8'))
    if (!NOME_VALIDO.test(nome)) throw new Error(`nome recusado: ${nome}`)

    const base64 = String(dados).replace(/^data:image\/png;base64,/, '')
    const bytes = Buffer.from(base64, 'base64')

    await mkdir(DESTINO, { recursive: true })
    const caminho = join(DESTINO, `${nome}.png`)
    await writeFile(caminho, bytes)

    console.log(`gravado  ${caminho}  ${(bytes.length / 1024).toFixed(1)} KB`)
    res.writeHead(200).end('ok')
  } catch (erro) {
    console.error('recusado:', erro.message)
    res.writeHead(400).end(String(erro.message))
  }
})

servidor.listen(PORTA, '127.0.0.1', () => {
  console.log(`ouvindo em http://127.0.0.1:${PORTA}`)
  console.log(`gravando em ${DESTINO}`)
})
