'use client'

import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { Battery } from './Battery'
import { POSES, sceneState } from '@/lib/scene-state'
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
function SaidaDoAto() {
  const ultimo = useRef(-1)
  /** Modo do laço, lembrado para não reescrever o store a cada quadro */
  const modo = useRef<'always' | 'never'>('always')
  const setFrameloop = useThree((s) => s.setFrameloop)

  useFrame(() => {
    /**
     * A ÚNICA causa de a cena perder opacidade é o ato ter acabado.
     *
     * Havia uma segunda, que multiplicava aqui: uma atenuação de 45% nos
     * beats das recargas e do chip, para o texto ter mais leitura. Saiu.
     * A pilha é o produto que a página vende e não é cenário em beat
     * nenhum; contra o fundo `#141414` daqueles dois beats, 45% não a
     * deixava discreta, deixava um vulto.
     */
    const o = Math.round((1 - sceneState.saidaDoAto) * 100) / 100
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
 * Quantos quadros desenhar antes de congelar.
 *
 * Um só não basta: o <Environment> do drei monta o cubemap de iluminação
 * no primeiro quadro e o EffectComposer redimensiona os seus buffers, então
 * a primeira imagem sai sem luz de ambiente e sem Bloom. Meia dúzia cobre
 * as duas coisas com folga e ainda assim é um piscar de olho de GPU — e
 * como a pose não interpola no modo estático, os seis quadros são
 * idênticos: nada disso é visível como movimento.
 */
const QUADROS_ESTATICOS = 6

/**
 * Movimento reduzido: uma FOTO por beat.
 *
 * Aqui não existe timeline escrevendo `progress` (o PinnedAct não a monta
 * nesse modo), então quem diz em que pose a cena está é este componente:
 * ele olha qual beat cobre o meio da tela e escreve o `at` daquele beat,
 * cru. Sem scrub, sem interpolação — a pose troca no CORTE, que é
 * justamente o que a §6.10 pede no lugar de uma animação.
 *
 * O laço fica parado o tempo todo e só acorda para os quadros de uma
 * troca. É o oposto do modo normal, e de propósito: quem desliga animação
 * no sistema costuma estar numa máquina que agradece por uma GPU ociosa.
 *
 * Passado o último beat, o canvas some. Sem isso a pilha ficaria pendurada
 * em `fixed inset-0` por cima do impacto, da compra e do rodapé — foi
 * exatamente esse defeito que um dia levou a cena a nem montar aqui.
 */
function CenaEstatica() {
  const setFrameloop = useThree((s) => s.setFrameloop)
  /** Quadros que ainda faltam desenhar nesta troca */
  const restantes = useRef(QUADROS_ESTATICOS)
  /** Laço ligado? Lembrado para chamar `setFrameloop` só na transição */
  const ligado = useRef(true)

  useFrame(() => {
    if (restantes.current > 0) {
      restantes.current--
      return
    }
    /**
     * Só o DESLIGAR mora aqui, como no <SaidaDoAto>: com o laço parado
     * este callback não roda mais, então quem religa é o ouvinte abaixo.
     */
    if (ligado.current) {
      ligado.current = false
      setFrameloop('never')
    }
  })

  useEffect(() => {
    /** Nenhum beat na tela ainda — e nem -1, que é "passou do último" */
    let atual = -2
    let agendado = 0

    const desenhar = () => {
      restantes.current = QUADROS_ESTATICOS
      if (!ligado.current) {
        ligado.current = true
        setFrameloop('always')
      }
    }

    const medir = () => {
      agendado = 0

      /**
       * O beat que cobre o MEIO da tela, não o primeiro que aparece.
       *
       * Fora do pin cada beat ocupa uma altura de tela inteira, então em
       * qualquer rolagem há dois visíveis e um só mandando na composição.
       * O meio da tela decide sem empate e troca na metade da passagem,
       * que é onde o beat novo já domina a leitura.
       */
      const beats = document.querySelectorAll('[data-beat]')
      const meio = window.innerHeight / 2
      let i = -1
      beats.forEach((beat, k) => {
        const r = beat.getBoundingClientRect()
        if (r.top <= meio && r.bottom > meio) i = k
      })
      if (i === atual) return
      atual = i

      const el = document.querySelector<HTMLElement>('[data-cena]')
      if (el) {
        el.style.opacity = i < 0 ? '0' : '1'
        el.style.visibility = i < 0 ? 'hidden' : ''
      }

      // Invisível não precisa de quadro nenhum: deixa o laço dormindo
      if (i < 0) return

      sceneState.progress = POSES[Math.min(i, POSES.length - 1)].at
      desenhar()
    }

    /**
     * O scroll só AGENDA; quem mede é o quadro seguinte. Medir dentro do
     * ouvinte faria um `getBoundingClientRect` por evento, e a leitura de
     * geometria no meio da rolagem é exatamente o que trava a rolagem.
     */
    const agendar = () => {
      if (!agendado) agendado = requestAnimationFrame(medir)
    }

    /**
     * Redimensionar muda o aspecto da câmera e as medidas do retrato, e o
     * beat pode nem ter mudado. Zerar a memória força o redesenho.
     */
    const refazer = () => {
      atual = -2
      agendar()
    }

    medir()
    window.addEventListener('scroll', agendar, { passive: true })
    window.addEventListener('resize', refazer)

    /**
     * O texto reflui depois da primeira pintura — webfont que troca,
     * imagem que chega — e com ele mudam os tetos do retrato que a
     * <Battery /> usa para decidir onde o produto cabe. Num laço vivo isso
     * se corrige sozinho no quadro seguinte; congelado, ficaria uma foto
     * feita com a medida velha, com a pilha por cima do título.
     */
    const obs = new ResizeObserver(refazer)
    document.querySelectorAll('[data-beat] section').forEach((b) => obs.observe(b))

    return () => {
      cancelAnimationFrame(agendado)
      obs.disconnect()
      window.removeEventListener('scroll', agendar)
      window.removeEventListener('resize', refazer)
    }
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
        /**
         * Sempre 'always' na partida, inclusive com movimento reduzido.
         *
         * 'demand' seria o natural para uma cena parada, mas ali o primeiro
         * quadro sai antes de o <Environment> ter montado o cubemap, e não
         * há um segundo quadro para corrigir: a foto congela sem luz de
         * ambiente. O <CenaEstatica> resolve melhor — deixa correr meia
         * dúzia de quadros idênticos e então para o laço de vez.
         */
        frameloop="always"
      >
        <Suspense fallback={null}>
          {/**
           * A luz foi remontada em cima da FOTO do produto, não do gosto.
           *
           * Varrendo uma linha horizontal do corpo escuro em
           * cartela-2-v2.png, da esquerda para a direita, a luminância faz:
           *
           *   14 …  33 · 68 · 46 …  11 · 8 · 5 · 2 · 2 · 1
           *          ^^^^^^^^^
           *          pico estreito a 28% da largura
           *
           * Três coisas saem daí, e as três estavam erradas:
           *
           *   1. O pico é ESTREITO. As fontes laterais tinham 6 de largura,
           *      o que dá um degradê largo e sem forma. Um cilindro só lê
           *      como cilindro quando a softbox é uma FRESTA alta: o realce
           *      vira um rasgo que corre o comprimento inteiro, e é esse
           *      rasgo que o olho usa para ler a curvatura.
           *   2. O lado direito vai a UM. Havia uma fonte de 1,1 ali, e ela
           *      preenchia o lado que no objeto real é escuro. Sem sombra
           *      não há volume: o cilindro saía chapado.
           *   3. O ambiente era 0,35. Com esse piso, nenhuma parte da cena
           *      chega perto de 1 em 255, e o contraste inteiro se comprime.
           *
           * A direcional do topo fica: é ela que acende o aço do terminal,
           * que na foto é a região mais clara da pilha (lum 200).
           */}
          <ambientLight intensity={0.06} />
          <directionalLight position={[-3, 9, 7]} intensity={1.9} />

          {/**
           * 512 e não 256.
           *
           * O cubemap é montado UMA vez e não custa nada por quadro; o que
           * ele paga é memória. Com o verniz do rótulo (clearcoat) o realce
           * ficou nítido o bastante para a fonte aparecer refletida nele, e
           * em 256 a fresta chegava com a borda serrilhada.
           */}
          <Environment resolution={512}>
            {/* Faixa larga no topo: marca o metal do terminal */}
            <Lightformer
              intensity={2.2}
              position={[0, 6, 2]}
              rotation={[Math.PI / 2, 0, 0]}
              scale={[10, 4, 1]}
            />
            {/* A FRESTA: alta e estreita, à esquerda e à frente. É ela que
                desenha o rasgo especular que corre o comprimento da pilha */}
            <Lightformer
              intensity={4.2}
              position={[-4.2, 0, 5]}
              rotation={[0, Math.PI / 2, 0]}
              scale={[1.4, 16, 1]}
            />
            {/* Segunda fresta, mais fraca e mais atrás: separa a silhueta do
                fundo preto da página sem preencher o lado escuro */}
            <Lightformer
              intensity={1.4}
              position={[5.2, 1, -2.5]}
              rotation={[0, -Math.PI / 2, 0]}
              scale={[0.9, 14, 1]}
            />
            {/* Piso de ambiente, largo e quase apagado: tira o preto morto
                das costas sem devolver o achatamento */}
            <Lightformer
              intensity={0.18}
              position={[0, -4, -6]}
              rotation={[-Math.PI / 2, 0, 0]}
              scale={[14, 10, 1]}
            />
          </Environment>

          {/* O formato vem do progresso, não de prop: ver variantEm() */}
          <Battery estatico={reduzido} />
          {reduzido ? <CenaEstatica /> : <SaidaDoAto />}
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
