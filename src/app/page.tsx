import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ProductPill } from '@/components/layout/ProductPill'
import { BarraDoHeroi } from '@/components/layout/BarraDoHeroi'
import { SceneMount } from '@/components/scene/SceneMount'
import { PinnedAct } from '@/components/PinnedAct'
import { ResumoDoAto } from '@/components/a11y/ResumoDoAto'
import { Hero } from '@/components/sections/Hero'
import { UsbC } from '@/components/sections/UsbC'
import { Cycles } from '@/components/sections/Cycles'
import { Chip } from '@/components/sections/Chip'
import { ProductPanel } from '@/components/sections/ProductPanel'
import { Impact } from '@/components/sections/Impact'
import { Buy } from '@/components/sections/Buy'
import { PRODUCTS } from '@/data/products'

/**
 * Ordem dos beats — REGRAS.md §7.
 *
 * Os sete primeiros vivem DENTRO de um único pin: eles não rolam empilhados,
 * ficam sobrepostos e a timeline mestre revela um de cada vez enquanto a
 * tela permanece travada. É o que mantém a pilha 3D contínua.
 *
 * O `data-beat` de cada um precisa bater com o `id` em motion/labels.ts —
 * é por ele que a timeline encontra os elementos.
 */
export default function Home() {
  return (
    <>
      {/* Um canvas só, vivo do hero ao último painel (§6.3) */}
      <SceneMount />

      <Header />
      {/* As duas navegações se revezam pelo mesmo sinal: a barra é do
          herói, a pílula assume do segundo beat em diante */}
      <BarraDoHeroi />
      <ProductPill />

      {/* Sem z-index aqui de propósito: `main` não pode criar contexto de
          empilhamento, senão a cena 3D (fixa) fica presa atrás da página
          inteira. Ver src/components/layout/Layer.tsx */}
      <main>
        <PinnedAct>
          <div data-beat="hero">
            <Hero />
          </div>
          <div data-beat="usbc">
            <UsbC />
          </div>
          <div data-beat="cycles">
            <Cycles />
          </div>
          <div data-beat="chip">
            <Chip />
          </div>
          {PRODUCTS.map((p) => (
            <div key={p.index} data-beat={`produto-${p.index}`}>
              <ProductPanel product={p} />
            </div>
          ))}
        </PinnedAct>

        {/* Os beats invisíveis saem da árvore de acessibilidade, e a única
            forma de revelar o próximo é rolar a janela. Sem este resumo, o
            leitor de tela não encontra nada entre o hero e o impacto. */}
        <ResumoDoAto />

        {/* --- Pós-pin (beats 7 e 8) --- */}
        <Impact />
        <Buy />
      </main>

      <Footer />
    </>
  )
}
