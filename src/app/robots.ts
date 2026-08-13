import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/site'

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
