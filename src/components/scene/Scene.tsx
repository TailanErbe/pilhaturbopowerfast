'use client'

import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { Battery } from './Battery'
import { sceneState } from '@/lib/scene-state'
import { isCoarsePointer, prefersReducedMotion } from '@/lib/motion'
import { useClientValue } from '@/lib/client-value'

/**
 * Cena 3D.
 *
 * REGRAS.md §6.3: um <Canvas> só, montado uma vez, vivo do hero ao último
 * painel. Nada de remontar entre seções — é isso que dá a continuidade do
 * objeto que a referência tem.
 *
 * A iluminação é montada com Lightformers em vez de um arquivo .hdr: não
 * depende de CDN, pesa zero e dá controle direto sobre onde o brilho cai
 * no corpo fosco.
 */

/** WebGL disponível? Sem ele a página ainda conta a história (§6.8). */
function temWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext('webgl2') || c.getContext('webgl'))
    )
  } catch {
    return false
  }
}

/**
 * Só em depuração: expõe o renderer para forçar um quadro à mão.
 * Necessário porque em aba sem composição o requestAnimationFrame congela
 * e a cena nunca desenharia sozinha.
 */
function DebugHook() {
  const { gl, scene, camera, advance } = useThree()
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>
    w.__cena = {
      gl,
      scene,
      camera,
      render: () => gl.render(scene, camera),
      passo: (t: number) => advance(t),
      info: () => ({
        objetos: scene.children.length,
        chamadas: gl.info.render.calls,
        triangulos: gl.info.render.triangles,
        texturas: gl.info.memory.textures,
      }),
    }
  }, [gl, scene, camera, advance])
  return null
}

/**
 * Aplica a saída do ato na opacidade do canvas.
 *
 * A opacidade vai no elemento, não nos materiais: são oito corpos com
 * quatro mapas cada, e ligar transparência neles traria ordenação de
 * profundidade e custo de blending para resolver o que uma propriedade de
 * CSS resolve de graça. Só escreve quando o valor muda, para não forçar
 * recálculo de estilo a cada quadro.
 */
/** Quanto a cena chega a recuar nos beats de texto. Não some: recua. */
const RECUO = 0.55

function SaidaDoAto() {
  const ultimo = useRef(-1)
  /** Modo do laço, lembrado para não reescrever o store a cada quadro */
  const modo = useRef<'always' | 'never'>('always')
  const setFrameloop = useThree((s) => s.setFrameloop)

  useFrame(() => {
    // As duas causas multiplicam: sair do ato e recuar num beat são
    // independentes, e uma não deve cancelar a outra
    const presenca = (1 - sceneState.saidaDoAto) * (1 - sceneState.atenuacao * RECUO)
    const o = Math.round(presenca * 100) / 100
    if (o === ultimo.current) return

    /**
     * Invisível deixa de desenhar.
     *
     * O laço era sempre 'always', então depois do fim do ato a cena
     * continuava renderizando oito pilhas com Bloom, sessenta vezes por
     * segundo, por trás do impacto, da compra e do rodapé. Ninguém vê e a
     * GPU paga.
     *
     * Só o DESLIGAR mora aqui. Ligar de volta é impossível daqui: com o
     * laço parado este `useFrame` não roda mais, então quem reacende é o
     * ouvinte de scroll abaixo, que independe do laço de render.
     */
    if (o <= 0 && modo.current !== 'never') {
      modo.current = 'never'
      setFrameloop('never')
    }

    ultimo.current = o
    // Busca no DOM em vez de partir do `gl`: o compilador do React proíbe
    // mutar qualquer coisa alcançável a partir do retorno de um hook. Como
    // só entra aqui quando o valor muda, a consulta é rara.
    const el = document.querySelector<HTMLElement>('[data-cena]')
    if (!el) return
    el.style.opacity = String(o)
    el.style.visibility = o <= 0 ? 'hidden' : ''
  })

  /**
   * O despertador, e o motivo de ele lembrar do estado.
   *
   * A primeira versão chamava `setFrameloop('always')` a cada evento de
   * scroll enquanto a cena estivesse visível, ou seja, dezenas de vezes
   * por segundo durante a rolagem inteira. Cada chamada escreve no store
   * do R3F e re-renderiza a árvore do Canvas: o custo aparecia como queda
   * de quadros justamente quando o usuário está rolando, que é o único
   * momento em que a suavidade importa.
   *
   * Com o modo lembrado num ref, a chamada só acontece na TRANSIÇÃO.
   */
  useEffect(() => {
    const acordar = () => {
      if (sceneState.saidaDoAto < 1 && modo.current !== 'always') {
        modo.current = 'always'
        setFrameloop('always')
      }
    }
    window.addEventListener('scroll', acordar, { passive: true })
    return () => window.removeEventListener('scroll', acordar)
  }, [setFrameloop])

  return null
}

/**
 * Ponteiro normalizado para o parallax do cabo.
 *
 * Escrito direto no objeto de estado, sem passar por React: isto atualiza a
 * cada movimento do mouse e re-renderizar a árvore nesse ritmo seria
 * desperdício. Em toque não há ponteiro, então nem registra o ouvinte.
 */
function usePonteiro(ativo: boolean) {
  useEffect(() => {
    if (!ativo) return
    const mover = (e: PointerEvent) => {
      sceneState.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      sceneState.pointer.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', mover, { passive: true })
    return () => window.removeEventListener('pointermove', mover)
  }, [ativo])
}

export function Scene({ className, debug }: { className?: string; debug?: boolean }) {
  // Falso no servidor; o valor real entra na hidratação. Sem setState
  // dentro de efeito, que dispara renderização em cascata.
  const ok = useClientValue(temWebGL, false)
  const coarse = useClientValue(isCoarsePointer, false)
  const reduzido = useClientValue(prefersReducedMotion, false)

  usePonteiro(ok && !coarse && !reduzido)

  if (!ok) return null

  return (
    <div className={className} data-cena>
      <Canvas
        /**
         * `pointer-events: none` PRECISA vir aqui também.
         *
         * O container tem a classe, mas o R3F cria um div interno e o
         * próprio <canvas> com `pointer-events: auto`, e o valor do filho
         * vence o do pai. Medido no celular: um toque sobre o "Ficha
         * técnica" acertava o canvas e o accordion não abria. A cena não
         * só cobria o texto, ela engolia o toque.
         */
        className="!pointer-events-none"
        style={{ pointerEvents: 'none' }}
        /**
         * Teto de 1,75 no desktop, não 2.
         *
         * A cena é limitada por FILL RATE, não por geometria: são 20 mil
         * triângulos e nove chamadas de desenho, mas cada pixel passa
         * pelo Bloom. Numa tela retina, `dpr: 2` quadruplica a área em
         * relação a 1, e o Bloom paga essa conta inteira.
         *
         * 1,75 corta 23% dos pixels e a diferença não aparece num corpo
         * fosco. Em toque, 1,5 pelo mesmo motivo, com margem maior.
         */
        dpr={coarse ? [1, 1.5] : [1, 1.75]}
        /**
         * Lente longa, câmera longe: é assim que se fotografa produto.
         *
         * Estava em 32° a 14 de distância. Com abertura larga, tudo que
         * fica fora do eixo óptico é visto de esguelha: no kit, as pilhas
         * da ponta mostravam a lateral e a tampa virava uma elipse
         * inclinada diferente em cada uma. Lidas lado a lado, pareciam
         * tortas e desalinhadas, mesmo estando no mesmo pixel de topo e de
         * base.
         *
         * 20° a 22,6 de distância enquadra exatamente igual em z = 0
         * (tan(10°) × 22,6 = tan(16°) × 14) e corta quase 40% do desvio
         * angular. As poses com afastamento em z foram multiplicadas por
         * 22,6/14 para manter a mesma sensação de aproximação.
         */
        camera={{ position: [0, 0, 22.6], fov: 20 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        // Sem movimento reduzido a cena não precisa redesenhar sozinha.
        frameloop={reduzido ? 'demand' : 'always'}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.35} />
          <directionalLight position={[4, 8, 6]} intensity={1.6} />
          <directionalLight position={[-6, 2, -4]} intensity={0.5} />

          <Environment resolution={256}>
            {/* Faixa larga no topo: marca o metal do terminal */}
            <Lightformer
              intensity={2.4}
              position={[0, 6, 2]}
              rotation={[Math.PI / 2, 0, 0]}
              scale={[10, 4, 1]}
            />
            {/* Recorte lateral: dá volume ao cilindro preto */}
            <Lightformer
              intensity={1.6}
              position={[-6, 1, 3]}
              rotation={[0, Math.PI / 2, 0]}
              scale={[6, 8, 1]}
            />
            <Lightformer
              intensity={1.1}
              position={[6, -1, 2]}
              rotation={[0, -Math.PI / 2, 0]}
              scale={[6, 8, 1]}
            />
          </Environment>

          {/* O formato vem do progresso, não de prop: ver variantEm() */}
          <Battery />
          <SaidaDoAto />
          {debug && <DebugHook />}

          {/**
           * Bloom: o que faz a luz do cabo SAIR da geometria e ocupar o
           * espaço em volta. Sem ele o brilho fica contido no objeto e não
           * lê como neon, por mais que se ajuste o material.
           *
           * O limiar alto deixa o rótulo e a tampa laranja de fora — só o
           * brilho do cabo, que é emitido acima de 1, atravessa.
           */}
          {/**
           * `multisampling={0}`: o MSAA do composer custa caro e não faz
           * falta aqui.
           *
           * O padrão do EffectComposer é 8 amostras, e ele resolve o
           * buffer inteiro a cada quadro. A cena tem nove chamadas de
           * desenho sobre um cilindro liso: o serrilhado que sobra é o da
           * silhueta, e o Bloom o suaviza de qualquer jeito.
           */}
          <EffectComposer enableNormalPass={false} multisampling={0}>
            <Bloom
              // Raio alto = a névoa se espalha longe do núcleo. É AQUI que
              // se controla o tamanho do halo, não na espessura da casca:
              // o neon é uma linha, a dispersão é que é larga.
              intensity={2.6}
              // Limiar alto: só o neon (que emite muito acima de 1) passa.
              // Em 0,82 a tampa laranja iluminada também florescia e jogava
              // uma névoa âmbar sobre a página inteira.
              luminanceThreshold={0.95}
              luminanceSmoothing={0.2}
              radius={0.96}
              mipmapBlur
              /**
               * O borrão é calculado em METADE da resolução.
               *
               * Bloom é o passo mais caro da cena porque toca cada pixel
               * várias vezes, e é o único que pode ser barateado sem
               * ninguém notar: o resultado é névoa, uma imagem sem
               * nenhuma frequência alta para preservar. Meia resolução
               * corta 75% dos pixels processados e a dispersão sai
               * idêntica ao olho.
               */
              resolutionScale={0.5}
            />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  )
}
