/**
 * Endereço público da landing.
 *
 * Fica num lugar só porque três coisas dependem dele e precisam concordar:
 * o `metadataBase` (que transforma caminhos relativos em URLs absolutas nas
 * metatags), o sitemap e o JSON-LD. Divergindo, o compartilhamento quebra
 * de um jeito que não aparece em teste local, só quando alguém cola o link
 * no WhatsApp.
 *
 * A variável de ambiente vence para o deploy de preview ter o endereço
 * dele, não o de produção.
 */
export const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pilha.gorilashield.com.br'

/** Domínio da loja, onde a compra acontece de fato */
export const LOJA = 'https://www.gorilashield.com.br'
