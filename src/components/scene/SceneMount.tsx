'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { POSES, sceneState } from '@/lib/scene-state'
import { useClientValue } from '@/lib/client-value'

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

  return (
    <>
      {/* Mesma escolha responsiva da referência (klimtwine usa `z_3 lg:z_9`
          no container do canvas, com conteúdo em z_4 e painéis em z_8):

            mobile  → z-1, a pilha passa ATRÁS do texto
            desktop → z-9, a pilha passa NA FRENTE do texto

          No retrato a tela é estreita e o produto por cima cobriria a
          leitura; no desktop sobra largura e a passagem à frente é o que
          dá a sensação de objeto real. O header (z-20) fica acima nos dois. */}
      <Scene
        debug={debug}
        className={`pointer-events-none fixed inset-0 ${debug ? 'z-[800] bg-surface-000' : 'z-1 md:z-9'}`}
      />
      {debug && <DebugPanel />}
    </>
  )
}
