'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { ancoraDoBeat, sceneState } from '@/lib/scene-state'
import { BEATS } from '@/motion/labels'
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

      {/* Os botões seguem os BEATS, não as poses: hoje há mais poses que
          beats (o herói tem duas âncoras e a virada do USB-C uma terceira),
          e rotular pose como "beat n" mentia sobre onde o botão leva */}
      <div className="mt-2 flex flex-wrap gap-2">
        {BEATS.map((b, i) => {
          const at = ancoraDoBeat(b.id)
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                setProgress(at)
                sceneState.progress = at
              }}
              className="rounded border border-white/25 px-2 py-1 text-xs hover:bg-white/10"
            >
              {i + 1} {b.nome}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const lerDebug = () =>
  new URLSearchParams(location.search).get('debug') === 'scene'

export function SceneMount() {
  const debug = useClientValue(lerDebug, false)

  /**
   * Com movimento reduzido a cena MONTA — parada.
   *
   * Ela já chegou a não montar, e o motivo era legítimo: sem a timeline
   * (que o PinnedAct não monta nesse modo) ninguém escrevia `progress` nem
   * `saidaDoAto`, então o canvas ficava congelado na pose do beat 1, com
   * opacidade 1 e `fixed inset-0`, cobrindo o impacto, a compra e o rodapé
   * pelo resto da página. Cortar a cena resolvia isso.
   *
   * Só que cobrava caro demais. No Windows, desligar "mostrar animações"
   * — que muita gente desliga por desempenho, sem nenhuma intenção de
   * acessibilidade — liga `prefers-reduced-motion`, e a página inteira
   * ficava sem produto: um site de pilha sem a pilha.
   *
   * A §6.10 pede que a página vire um documento vertical normal, sem
   * scroll sequestrado e sem animação. NÃO pede que o produto suma. Um
   * render 3D parado é uma FOTO, e foto não é movimento.
   *
   * Então a cena vira exatamente isso: uma foto por beat. O <CenaEstatica>
   * dentro do Scene troca a pose no CORTE, sem interpolação, quando outro
   * beat toma a tela, desenha um punhado de quadros e para o laço; passado
   * o último beat, esconde o canvas — que é o que a timeline faria com
   * `saidaDoAto`.
   */
  return (
    <>
      {/**
       * Um z só, e a cena fica NA FRENTE em qualquer largura.
       *
       * Não existe meio-termo aqui, e vale registrar por quê: o ato pinado
       * ganha `position: fixed` e um `transform` do GSAP, e cada um já cria
       * contexto de empilhamento próprio. O `z-2` do conteúdo e o `z-0` do
       * fundo das seções passam a valer só DENTRO do ato; visto de fora, o
       * ato inteiro é um bloco no nível 0. A cena, que é irmã dele, fica
       * ou acima de tudo, ou abaixo de tudo.
       *
       * A tentativa de `-z-10` no retrato colocou a cena abaixo do FUNDO
       * das seções, que é preto opaco: o 3D sumiu por completo no celular.
       *
       * Ficar na frente é também o que a referência faz no retrato. Lá o
       * texto não é coberto porque a COMPOSIÇÃO o mantém fora do caminho
       * do produto, não porque a ordem de pintura o proteja. É layout, não
       * z-index, e é assim que se resolve aqui (ver a pose de retrato em
       * scene-state.ts).
       */}
      {/**
       * `overflow-hidden` por causa da parede.
       *
       * As duas camadas dela são bem maiores que a tela de propósito: elas
       * se deslocam por beat, e o degradê continua pintando a última cor até
       * a borda da caixa, então a caixa tem de terminar fora de quadro em
       * todos os deslocamentos. Como o container é `fixed`, o Chrome não
       * conta esse transbordo na área
       * rolável, mas isso é detalhe de implementação, e um filete de
       * rolagem horizontal aparecendo em outro navegador seria um defeito
       * caro de achar. Cortar aqui é explícito e não custa nada: o canvas
       * ocupa a caixa exata.
       */}
      <Scene
        debug={debug}
        className={`pointer-events-none fixed inset-0 overflow-hidden ${debug ? 'z-[800] bg-surface-000' : 'z-1'}`}
      />
      {debug && <DebugPanel />}
    </>
  )
}
