import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/site'

/**
 * Obrigatório no export estático: sem servidor, a rota tem de ser
 * resolvida em tempo de build. O Next recusa a exportação sem esta linha.
 */
export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Ferramenta de desenvolvimento: responde 403 fora de dev, mas não há
      // motivo para gastar orçamento de rastreio com ela
      disallow: '/api/',
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  }
}
