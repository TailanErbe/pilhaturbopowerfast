'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { POSES, sceneState } from '@/lib/scene-state'
import { useClientValue } from '@/lib/client-value'
import { prefersReducedMotion } from '@/lib/motion'

/**
 * Ponto de montagem da cena.
 *
 * Carrega sem SSR (§6.12): Three.js não roda no servidor e não deve entrar
 * no bundle inicial. O <Scene> em si nunca desmonta depois de montado.
 */
const Scene = dynamic(() => import('./Scene').then((m) => m.Scene), {
  ssr: false,
})

/**
 * Painel de depuração — só com ?debug=scene na URL.
 * É como se verifica a DoD do Sprint 2: o slider percorre 0→1 e o contador
 * mostra o FPS, sem depender da timeline (que só existe no Sprint 3).
 */
function DebugPanel() {
  const [progress, setProgress] = useState(0)
  const [fps, setFps] = useState(0)
  const quadros = useRef(0)
  const marca = useRef(0)

  useEffect(() => {
    let id = 0
    const laco = (t: number) => {
      quadros.current++
      if (!marca.current) marca.current = t
      if (t - marca.current >= 500) {
        setFps(Math.round((quadros.current * 1000) / (t - marca.current)))
        quadros.current = 0
        marca.current = t
      }
      id = requestAnimationFrame(laco)
    }
    id = requestAnimationFrame(laco)
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className="fixed bottom-4 left-1/2 z-[900] w-[min(92vw,520px)] -translate-x-1/2 rounded-xl border border-white/20 bg-black/85 p-4 text-white backdrop-blur">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span>progresso {progress.toFixed(3)}</span>
        <span className={fps >= 55 ? 'text-brand-orange' : 'text-red-400'}>{fps} fps</span>
      </div>

      <input
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={progress}
        aria-label="Progresso da cena"
        onChange={(e) => {
          const v = Number(e.target.value)
          setProgress(v)
          sceneState.progress = v
        }}
        className="w-full accent-[#FFA400]"
      />

      <div className="mt-2 flex flex-wrap gap-2">
        {POSES.map((p, i) => (
          <button
            key={p.at}
            type="button"
            onClick={() => {
              setProgress(p.at)
              sceneState.progress = p.at
            }}
            className="rounded border border-white/25 px-2 py-1 text-xs hover:bg-white/10"
          >
            beat {i + 1}
          </button>
        ))}
      </div>
    </div>
  )
}

const lerDebug = () =>
  new URLSearchParams(location.search).get('debug') === 'scene'

export function SceneMount() {
  const debug = useClientValue(lerDebug, false)
  const reduzido = useClientValue(prefersReducedMotion, false)

  /**
   * Com movimento reduzido a cena NÃO monta.
   *
   * Quem escreve `progress` e `saidaDoAto` é a timeline, e a timeline não
   * é montada nesse modo (PinnedAct). O canvas ficava então parado na pose
   * do beat 1, com opacidade 1, `fixed inset-0` e `z-9` no desktop: uma
   * pilha imóvel cobrindo a faixa central do impacto, da compra e do
   * rodapé pelo resto da página.
   *
   * A regra §6.10 pede "documento vertical normal com todo o conteúdo
   * visível", e um objeto 3D congelado por cima do texto é o contrário
   * disso. Sem timeline a cena não conta história nenhuma: só atrapalha.
   */
  if (reduzido) return null

  return (
    <>
      {/**
       * No retrato a cena fica ATRÁS de tudo; no desktop, à frente.
       *
       * O `z-1` de antes não colocava a cena atrás de nada. O ato pinado
       * ganha `position: fixed` e um `transform` do GSAP, e cada um deles
       * já cria contexto de empilhamento próprio: o `z-2` do conteúdo
       * passa a valer só DENTRO do ato, e lá fora o ato inteiro conta como
       * nível 0. Qualquer z positivo na cena a colocava por cima do texto,
       * inclusive no celular, onde ela cobria a frase de destaque e metade
       * da descrição em preto sobre o corpo preto da pilha.
       *
       * `-z-10` resolve na raiz do problema: negativo fica abaixo do
       * conteúdo em qualquer contexto, sem depender de quem cria stacking
       * context. No desktop sobra largura e a passagem à frente é o que dá
       * a sensação de objeto real, então lá o valor volta a ser positivo.
       */}
      <Scene
        debug={debug}
        className={`pointer-events-none fixed inset-0 ${debug ? 'z-[800] bg-surface-000' : '-z-10 md:z-9'}`}
      />
      {debug && <DebugPanel />}
    </>
  )
}
