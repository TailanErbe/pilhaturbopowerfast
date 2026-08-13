import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    /**
     * O Next 16 mudou o padrão de `images.qualities` para `[75]` e COAGE
     * qualquer outro valor para o mais próximo da lista. Sem declarar 92
     * aqui, o `quality={92}` das fotos dos cabos virava 75 em silêncio.
     *
     * As fotos dos cabos precisam de qualidade alta: a peça é preta, fina e
     * cheia de reflexo estreito, que é a primeira coisa que a compressão
     * come. Em 75 o cabo chegava borrado na tela.
     *
     * Ver node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md
     */
    qualities: [75, 92],
  },
}

export default nextConfig
