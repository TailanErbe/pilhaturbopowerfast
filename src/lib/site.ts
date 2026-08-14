/**
 * Onde a página vive.
 *
 * O projeto não tem domínio próprio: o destino é o GitHub Pages, que
 * serve num subcaminho (`/pilhaturbopowerfast`) e não na raiz do
 * domínio. Esse subcaminho é o que torna as duas constantes abaixo
 * necessárias em vez de decorativas.
 *
 * As duas vêm de variável de ambiente para o desenvolvimento local rodar
 * na raiz, sem prefixo, e a publicação rodar com ele.
 */

/** Prefixo de todo caminho servido. Vazio em desenvolvimento. */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

/** Endereço público completo, usado em canonical, sitemap e JSON-LD */
export const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ??
  'https://tailanerbe.github.io/pilhaturbopowerfast'

/** Domínio da loja, onde a compra acontece de fato */
export const LOJA = 'https://www.gorilashield.com.br'

/**
 * Prefixa um caminho de `public/`.
 *
 * O `<Image>` do Next aplica o `basePath` sozinho, mas quem busca o
 * arquivo direto não: o carregador de textura do Three.js e o
 * pré-carregamento de imagens do preloader montam a URL na mão. Sem esta
 * função, publicado num subcaminho, a pilha aparece sem rótulo e o
 * preloader nunca chega a 100%, os dois em silêncio.
 */
export function asset(caminho: string) {
  return `${BASE}${caminho}`
}
