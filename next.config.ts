import type { NextConfig } from 'next'

/**
 * O alvo de publicação é o GitHub Pages, que serve arquivos estáticos.
 *
 * Isso muda três coisas, e as três são consequência de não haver
 * servidor Node do outro lado:
 *
 *   1. `output: 'export'` gera HTML puro em `out/`. Some qualquer rota
 *      dinâmica: a `/api/dev-save`, que era ferramenta de
 *      desenvolvimento, foi removida junto.
 *
 *   2. `images.unoptimized` porque o otimizador de imagem do Next é um
 *      serviço em execução. Sem ele, o navegador recebe o arquivo como
 *      está, e por isso as fotos do repositório foram reduzidas para o
 *      tamanho em que aparecem na tela.
 *
 *   3. `basePath` porque a página fica em `/pilhaturbopowerfast`, e não
 *      na raiz do domínio.
 *
 * As duas variáveis ficam vazias em desenvolvimento, então `npm run dev`
 * continua rodando na raiz.
 */
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
const exportando = process.env.NEXT_EXPORT === '1'

const nextConfig: NextConfig = {
  ...(exportando ? { output: 'export' as const } : {}),
  ...(base ? { basePath: base, assetPrefix: base } : {}),

  images: {
    /**
     * O Next 16 mudou o padrão de `images.qualities` para `[75]` e COAGE
     * qualquer outro valor para o mais próximo da lista. Sem declarar 92
     * aqui, o `quality={92}` das fotos dos cabos virava 75 em silêncio.
     *
     * Ver node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md
     */
    qualities: [75, 92],
    // Sem servidor não há otimizador; o arquivo vai como está
    unoptimized: exportando,
  },

  /**
   * O GitHub Pages não serve `/rota` como `/rota/index.html` de forma
   * consistente sem isto, e a barra final evita um redirecionamento a
   * mais em cada acesso.
   */
  trailingSlash: exportando,
}

export default nextConfig
