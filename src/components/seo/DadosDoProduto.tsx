import { CONTENT, DIMENSIONS, PRODUCTS, PROTECTIONS } from '@/data/products'
import { LOJA, SITE } from '@/lib/site'

/**
 * JSON-LD do produto (schema.org).
 *
 * O que está aqui vem TODO de `data/products.ts`, que é a ficha real.
 * Nada foi inventado para preencher campo.
 *
 * Duas ausências são deliberadas:
 *
 * `offers` — exige `price` e `priceCurrency` para gerar resultado rico, e
 * o preço não é nosso: ele muda na loja e varia por cartela. Publicar um
 * número desatualizado no dado estruturado é pior do que não publicar,
 * porque o buscador mostra o preço errado no resultado da busca.
 *
 * `aggregateRating` — só pode sair de avaliações reais e verificáveis. As
 * diretrizes do Google tratam avaliação fabricada como spam estrutural, e
 * a penalidade atinge o domínio inteiro.
 *
 * Os dois entram assim que vierem os dados da loja.
 */
export function DadosDoProduto() {
  const dados = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Pilha Recarregável Turbo PowerFast',
    description: CONTENT.buy.paragraph,
    brand: { '@type': 'Brand', name: 'Gshield' },
    manufacturer: { '@type': 'Organization', name: 'Gshield', url: LOJA },
    category: 'Pilhas recarregáveis',
    url: SITE,
    image: [`${SITE}/produto/cartela-kit.png`, `${SITE}/produto/cartela-2.png`],
    /**
     * Cada formato vira uma variante, que é o que ele é de verdade: mesma
     * tecnologia, mesma tensão, capacidades e medidas diferentes.
     */
    hasVariant: PRODUCTS.filter((p) => p.dimensions).map((p) => ({
      '@type': 'Product',
      name: `Pilha Recarregável Turbo PowerFast ${p.name}`,
      description: p.description,
      size: p.name,
      height: {
        '@type': 'QuantitativeValue',
        value: p.dimensions!.length,
        unitCode: 'MMT',
      },
      width: {
        '@type': 'QuantitativeValue',
        value: p.dimensions!.diameter,
        unitCode: 'MMT',
      },
    })),
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Tensão nominal', value: '1,5 V' },
      { '@type': 'PropertyValue', name: 'Ciclos de recarga', value: 'Até 1.200' },
      { '@type': 'PropertyValue', name: 'Capacidade AA', value: '3400 mWh' },
      { '@type': 'PropertyValue', name: 'Capacidade AAA', value: '1100 mWh' },
      { '@type': 'PropertyValue', name: 'Recarga', value: 'USB-C direto na pilha' },
      {
        '@type': 'PropertyValue',
        name: 'Proteções do chip',
        value: PROTECTIONS.join(', '),
      },
      {
        '@type': 'PropertyValue',
        name: 'Dimensões AA',
        value: `${DIMENSIONS.AA.length} × ${DIMENSIONS.AA.diameter} mm`,
      },
      {
        '@type': 'PropertyValue',
        name: 'Dimensões AAA',
        value: `${DIMENSIONS.AAA.length} × ${DIMENSIONS.AAA.diameter} mm`,
      },
    ],
    isRelatedTo: {
      '@type': 'Product',
      name: 'Carregadores Gshield',
      url: CONTENT.buy.chargerHref,
    },
  }

  return (
    <script
      type="application/ld+json"
      // O conteúdo é nosso e estático; o escape do `<` evita que uma string
      // com "</script>" feche a tag antes da hora
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(dados).replace(/</g, '\\u003c'),
      }}
    />
  )
}
