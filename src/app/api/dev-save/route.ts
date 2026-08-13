import { writeFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * FERRAMENTA DE DESENVOLVIMENTO — apagar depois de gerar as texturas.
 *
 * Recebe um PNG do canvas do navegador e grava em public/produto/.
 * Existe porque o Canvas 2D é o único caminho que usa as fontes reais da
 * página (SVG desenhado em canvas ignora webfonts).
 *
 * Só responde em desenvolvimento e só grava em public/produto/*.png.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return new Response('somente em desenvolvimento', { status: 403 })
  }

  const nome = new URL(req.url).searchParams.get('nome') ?? ''
  if (!/^[a-z0-9_-]+\.png$/.test(nome)) {
    return new Response('nome invalido', { status: 400 })
  }

  const buf = Buffer.from(await req.arrayBuffer())
  const destino = path.join(process.cwd(), 'public', 'produto', nome)
  await writeFile(destino, buf)

  return Response.json({ ok: true, nome, bytes: buf.length })
}
