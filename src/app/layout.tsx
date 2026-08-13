import type { Metadata, Viewport } from 'next'
import { Bebas_Neue, Montserrat } from 'next/font/google'
import { SmoothScroll } from '@/components/SmoothScroll'
import { Preloader } from '@/components/loader/Preloader'
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

export const metadata: Metadata = {
  title: 'Pilha Recarregável Turbo PowerFast | Gshield',
  description:
    'Recarrega até 1.200 vezes direto pela porta USB-C. Disponível em AA (3400 mWh) ' +
    'e AAA (1100 mWh), com cabo de recarga simultânea incluso.',
  openGraph: {
    title: 'Pilha Recarregável Turbo PowerFast | Gshield',
    description:
      'Recarrega até 1.200 vezes direto pela porta USB-C. AA e AAA, com cabo incluso.',
    type: 'website',
    locale: 'pt_BR',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${bebas.variable} ${montserrat.variable}`}>
      <head>
        {/* Sem JS o preloader nunca sairia da tela e travaria a página
            inteira. Esconde na origem — REGRAS.md §6.11. */}
        <noscript>
          <style>{`[data-preloader]{display:none!important}`}</style>
        </noscript>
      </head>
      <body>
        <SmoothScroll />
        <Preloader />
        {children}
      </body>
    </html>
  )
}
