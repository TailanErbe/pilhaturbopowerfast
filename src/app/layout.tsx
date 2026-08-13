import type { Metadata, Viewport } from 'next'
import { Bebas_Neue, Montserrat } from 'next/font/google'
import { SmoothScroll } from '@/components/SmoothScroll'
import { Preloader } from '@/components/loader/Preloader'
import { DadosDoProduto } from '@/components/seo/DadosDoProduto'
import { LOJA, SITE } from '@/lib/site'
import './globals.css'

/**
 * Tipografia definida pelo manual da marca (REGRAS.md §5.2).
 *
 * Bebas Neue — títulos, chamadas e textos curtos.
 *   O manual pede "Bebas Neue Bold", mas o Google Fonts distribui a família
 *   em peso único (400). Ver REGRAS.md §9.7 item 8.
 *
 * Montserrat — corpo. O manual proíbe pesos abaixo de "medium",
 *   por isso só carregamos 500/700/900.
 */
const bebas = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-bebas',
})

const montserrat = Montserrat({
  weight: ['500', '700', '900'],
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-montserrat',
})

const TITULO = 'Pilha Recarregável Turbo PowerFast | Gshield'
const DESCRICAO =
  'Recarrega até 1.200 vezes direto pela porta USB-C. Disponível em AA ' +
  '(3400 mWh) e AAA (1100 mWh), com cabo de recarga simultânea incluso.'

export const metadata: Metadata = {
  /**
   * Sem `metadataBase`, o Next resolve as imagens de Open Graph como
   * caminhos relativos, e rede social nenhuma aceita isso: o card sai sem
   * imagem. É o erro que só aparece quando alguém cola o link, nunca em
   * teste local.
   */
  metadataBase: new URL(SITE),
  title: TITULO,
  description: DESCRICAO,
  applicationName: 'Gshield',
  authors: [{ name: 'Gshield', url: LOJA }],
  keywords: [
    'pilha recarregável',
    'pilha USB-C',
    'pilha AA recarregável',
    'pilha AAA recarregável',
    'pilha palito recarregável',
    'Gshield',
    'Turbo PowerFast',
  ],
  alternates: { canonical: '/' },
  /**
   * O cartão é um PNG estático, desenhado com as fontes reais da marca.
   *
   * A versão gerada por `opengraph-image.tsx` era mais elegante, porque
   * acompanharia a copy sozinha, mas o gerador do Next quebra neste
   * ambiente ("Input buffer contains unsupported image format", mesmo sem
   * nenhuma imagem no JSX) e ainda usaria uma fonte genérica, não a Bebas.
   * Arquivo estático não tem custo de runtime nem depende do ambiente.
   */
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Gshield',
    url: '/',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'Pilha Recarregável Turbo PowerFast da Gshield: recarrega até 1.200 vezes pela porta USB-C',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITULO,
    description: DESCRICAO,
    images: ['/og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  // A página tem um trecho pinado longo; deixar o zoom livre é requisito
  // de acessibilidade (WCAG 1.4.4), e travá-lo é um erro comum em landing
  colorScheme: 'dark',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${bebas.variable} ${montserrat.variable}`}>
      <head>
        {/**
         * Sem JS, duas coisas quebram a página, e as duas são resolvidas
         * aqui na origem (§6.11).
         *
         * 1. O preloader nunca sairia da tela.
         *
         * 2. O ato pinado empilha os sete beats em `absolute inset-0`
         *    dentro de uma caixa de uma altura de tela, e quem os esconde
         *    um a um é o `gsap.set(autoAlpha)` da timeline. Sem JS, a
         *    timeline não roda e os sete textos ficam sobrepostos na mesma
         *    caixa, ilegíveis. As regras abaixo repetem o que o
         *    `motion-reduce:` já faz, que é desempilhar tudo num documento
         *    vertical comum.
         */}
        <noscript>
          <style>{`[data-preloader]{display:none!important}[data-ato]{height:auto!important;overflow:visible!important}[data-ato]>[data-beat]{position:static!important}[data-cena]{display:none!important}`}</style>
        </noscript>
      </head>
      <body>
        <DadosDoProduto />
        <SmoothScroll />
        <Preloader />
        {children}
      </body>
    </html>
  )
}
