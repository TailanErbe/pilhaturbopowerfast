import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/site'

/** Resolvida em tempo de build: no export estático não há servidor */
export const dynamic = 'force-static'

/**
 * A landing tem uma página só, e é isso mesmo.
 *
 * Sitemap de uma URL parece inútil, mas não é: ele declara a canônica e a
 * data de modificação para o rastreador, o que evita o buscador escolher
 * sozinho uma variante com parâmetro de campanha como endereço principal.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ]
}
