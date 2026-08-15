'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { Battery } from './Battery'
import { ChuvaDeDescartaveis } from './ChuvaDeDescartaveis'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import { ancoraDoBeat, cabeSaida, kitPresenca, sceneState } from '@/lib/scene-state'
import { CARGA_CHEIA, gelDeAmbiente, luzEm, misturaDaCarga } from '@/lib/luz'
import { Brasa } from './Brasa'
import { BEATS, beatPorId } from '@/motion/labels'
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

/**
 * WebGL disponível? Sem ele a página ainda conta a história (§6.8).
 *
 * A RESPOSTA É LEMBRADA, e isso não é micro-otimização: é correção.
 *
 * Quem chama é `useClientValue`, que por baixo é `useSyncExternalStore`, e
 * ele executa a leitura A CADA RENDERIZAÇÃO. Cada execução criava um
 * <canvas> e pedia um contexto WebGL de verdade, que nunca era liberado.
 * O navegador tem teto de contextos ativos e descarta os mais velhos: o
 * console enchia de "Too many active WebGL contexts" e terminava em
 * "THREE.WebGLRenderer: Context Lost" — o contexto derrubado era o da
 * própria cena, e a pilha sumia da tela.
 *
 * Em desenvolvimento isso parecia culpa do Fast Refresh. Não era: basta
 * o componente renderizar de novo umas dezenas de vezes, e a página tem
 * quatro laços que mexem em estado.
 *
 * O próprio comentário de `useClientValue` já pedia isto em voz alta:
 * "cacheie leituras caras no módulo".
 */
let webglLembrado: boolean | null = null

function temWebGL() {
  if (webglLembrado !== null) return webglLembrado
  try {
    const c = document.createElement('canvas')
    const ctx = c.getContext('webgl2') || c.getContext('webgl')
    webglLembrado = !!(window.WebGLRenderingContext && ctx)
    /**
     * E o contexto de teste é DEVOLVIDO na hora.
     *
     * Ele já cumpriu a função no instante em que existiu. Mantê-lo vivo
     * ocupa uma das poucas vagas que o navegador dá, e a vaga que falta é
     * sempre a da cena.
     */
    ctx?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    webglLembrado = false
  }
  return webglLembrado
}

/**
 * Só em depuração: expõe o renderer para forçar um quadro à mão.
 * Necessário porque em aba sem composição o requestAnimationFrame congela
 * e a cena nunca desenharia sozinha.
 *
 * `alvo()` desenha num render target em vez da tela, e é a única leitura
 * confiável em aba escondida: o buffer de apresentação não é preservado
 * entre tarefas, então `readPixels` nele devolve o quadro anterior, ou
 * metade dele. Foi assim que uma rodada inteira de medições saiu com o
 * lado escuro do corpo em zero.
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
      alvo: (hdr?: boolean) => {
        const rt = new THREE.WebGLRenderTarget(gl.domElement.width, gl.domElement.height, {
          type: hdr ? THREE.FloatType : THREE.UnsignedByteType,
        })
        /**
         * Em HDR o alvo fica em espaço LINEAR, sem conversão de saída: é
         * exatamente o que o Bloom recebe, e é a única forma de responder
         * "quanto do quadro passa do limiar de luminância" sem adivinhar.
         */
        rt.texture.colorSpace = hdr ? THREE.LinearSRGBColorSpace : gl.outputColorSpace
        gl.setRenderTarget(rt)
        gl.render(scene, camera)
        const px = hdr
          ? new Float32Array(rt.width * rt.height * 4)
          : new Uint8Array(rt.width * rt.height * 4)
        gl.readRenderTargetPixels(rt, 0, 0, rt.width, rt.height, px)
        gl.setRenderTarget(null)
        rt.dispose()
        return { px, w: rt.width, h: rt.height }
      },
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
/**
 * Enquanto o herói manda, o canvas fica ACIMA do ato.
 *
 * A troca acontece no FIM do beat do herói, e não no meio da saída dele.
 * Estava em `SAIDA_DO_HEROI.meio` (0,08) e o título do herói só apaga entre
 * 0,105 e 0,15: havia sete centésimos em que o canvas já estava embaixo e o
 * texto ainda na tela, com o "TURBO POWERFAST" desenhado POR CIMA da tampa
 * da pilha. 0,15 é a única janela em que os dois textos estão em opacidade
 * zero, ou seja em que não há um pixel de texto para trocar de lado.
 */
const TROCA_DE_CAMADA = beatPorId('hero').fim

function SaidaDoAto() {
  /** Último deslocamento escrito, em px */
  const ultimoY = useRef(-1)
  /** Último z escrito. String, para comparar antes de tocar no estilo */
  const ultimoZ = useRef('')
  /** Último estado de visibilidade escrito */
  const ultimoFora = useRef<boolean | null>(null)
  /** Modo do laço, lembrado para não reescrever o store a cada quadro */
  const modo = useRef<'always' | 'never'>('always')
  const setFrameloop = useThree((s) => s.setFrameloop)

  useFrame(() => {
    const saida = sceneState.saidaDoAto
    const el = document.querySelector<HTMLElement>('[data-cena]')
    if (!el) return

    /**
     * A CENA VAI EMBORA COM A PÁGINA, e não apaga.
     *
     * O canvas é `fixed inset-0`, então quando o pin solta e o painel do
     * kit sobe com a rolagem, as oito pilhas ficariam paradas na tela: elas
     * se descolam do painel e passam por cima da seção de impacto. As
     * fotos dos cabos, que são DOM, vão embora certinho.
     *
     * Houve aqui uma tentativa de resolver isso com opacidade, e ela
     * trocou um defeito por outro: as pilhas desbotavam enquanto os cabos
     * ao lado continuavam sólidos, o que denuncia na hora que aquilo é uma
     * camada e não conteúdo. O cliente pegou: "o kit pode ficar fixo após
     * aparecer na tela, sem esse efeito de fade out, já que não tem no
     * cabo".
     *
     * Agora é só geometria. A saída do ato corre por UMA altura de tela e
     * o deslocamento é `saidaDoAto * altura`, ou seja um pixel por pixel
     * rolado. Como o canvas tem exatamente o tamanho da janela, uma tela de
     * rolagem o tira inteiro de quadro por conta própria. Nada apaga, nada
     * desbota: ele sai como um elemento do documento sairia.
     *
     * `translate3d` e não `top`: é transformação, o compositor resolve sem
     * repintar, e o container só tem o canvas e as duas paredes dentro.
     */
    const y = saida > 0 ? -saida * window.innerHeight : 0
    const arred = Math.round(y * 10) / 10
    if (arred !== ultimoY.current) {
      ultimoY.current = arred
      el.style.transform = arred ? `translate3d(0, ${arred}px, 0)` : ''
    }

    /**
     * A TROCA DE CAMADA DO HERÓI MORA AQUI, e não no <FundoDoAto />.
     *
     * Lá ela lia `tl.progresso()`, que é o progresso CRU do ScrollTrigger,
     * enquanto a cena inteira lê `sceneState.progress`, escrubado com
     * `scrub: 1`. Os dois relógios andam separados por alguns centésimos
     * durante toda rolagem rápida.
     *
     * Com o canvas quase transparente na fronteira isso não aparecia. Com a
     * brasa acesa dos dois lados de 0,150, o canvas passa da FRENTE para
     * ATRÁS do texto enquanto, pelo relógio atrasado, esse texto ainda tem
     * opacidade — e o título troca de cor de um quadro para o outro.
     *
     * Aqui os dois lados da comparação saem do mesmo relógio, e a troca
     * continua caindo em `beatPorId('hero').fim`, que é a única janela em
     * que os dois textos estão em opacidade zero.
     */
    const z = sceneState.progress < TROCA_DE_CAMADA ? '3' : '1'
    if (z !== ultimoZ.current) {
      ultimoZ.current = z
      el.style.zIndex = z
    }

    /**
     * FORA DE QUADRO deixa de desenhar.
     *
     * O laço era sempre 'always', então depois do fim do ato a cena
     * continuava renderizando oito pilhas sessenta vezes por segundo, por
     * trás do impacto, da compra e do rodapé. Ninguém vê e a GPU paga.
     *
     * O critério deixou de ser a opacidade e passou a ser a posição, que é
     * o que de fato governa agora: em `saidaDoAto >= 1` a cena já subiu uma
     * tela inteira e não há um pixel dela em quadro.
     *
     * Só o DESLIGAR mora aqui. Ligar de volta é impossível daqui: com o
     * laço parado este `useFrame` não roda mais, então quem reacende é o
     * ouvinte de scroll abaixo, que independe do laço de render.
     */
    const fora = saida >= 1
    if (fora !== ultimoFora.current) {
      ultimoFora.current = fora
      el.style.visibility = fora ? 'hidden' : ''
      if (fora && modo.current !== 'never') {
        modo.current = 'never'
        setFrameloop('never')
      }
    }
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

      /* Pelo BEAT, não pelo índice da pose: ver `ancoraDoBeat` */
      sceneState.progress = ancoraDoBeat(BEATS[Math.min(i, BEATS.length - 1)].id)
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
 * O Bloom só existe enquanto há o que florescer.
 *
 * ------------------------------------------------------------------
 * O QUE ELE CUSTAVA PARADO
 * ------------------------------------------------------------------
 *
 * A cadeia é RenderPass, extração de luminância, MipmapBlurPass e
 * EffectPass. O `levels` do borrão por mipmap vale 8 por padrão, ou seja
 * oito reduções e oito ampliações: cerca de dezoito trocas de alvo de
 * render por quadro. Em GPU de celular, que trabalha por ladrilho, cada
 * troca paga a leitura e a escrita do ladrilho inteiro, independente de
 * quantos pixels de fato mudaram.
 *
 * E o único emissor acima do limiar de 0,95 é a onda de neon do cabo, que
 * emite 26. O rótulo e a tampa laranja ficam de fora de propósito. Como o
 * cabo some de cena em `CABO.sai.ate`, dali até o fim da página a cadeia
 * inteira estava borrando uma imagem preta, sessenta vezes por segundo,
 * em dois terços da timeline.
 *
 * ------------------------------------------------------------------
 * O CRITÉRIO VEM DO CABO, NÃO DE UM NÚMERO
 * ------------------------------------------------------------------
 *
 * Podia ser `progresso < 0,36`. Seria uma quarta cópia da janela do cabo
 * espalhada pelo projeto, e ficaria errada calada no dia em que a saída
 * mudasse. `cabeSaida().opacidade` é a mesma fonte que decide se o cabo
 * está na tela: se ele não está, não há emissor.
 *
 * Desligar é seguro e reversível: a lib sai do laço na primeira linha e
 * derruba a prioridade do próprio `useFrame` para zero (`o ? s : 0` no
 * fonte instalado), então o R3F volta a desenhar a cena direto. Nada
 * desmonta, nenhum shader recompila, nenhum alvo é realocado.
 *
 * De brinde, o antisserrilhado volta a valer. Com o composer ligado a cena
 * é desenhada no alvo dele, que tem `multisampling={0}`, e o `antialias`
 * do canvas só via o triângulo de tela cheia do passe final: MSAA pago e
 * jogado fora. Desligado, ele volta a suavizar a silhueta do produto.
 */
function BrilhoDoCabo() {
  const [ligado, setLigado] = useState(true)
  useFrame(() => {
    const deve = cabeSaida(sceneState.progress).opacidade > 0
    if (deve !== ligado) setLigado(deve)
  })

  return (
    <EffectComposer enabled={ligado} enableNormalPass={false} multisampling={0}>
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
         * várias vezes, e é o único que pode ser barateado sem ninguém
         * notar: o resultado é névoa, uma imagem sem nenhuma frequência
         * alta para preservar. Meia resolução corta 75% dos pixels
         * processados e a dispersão sai idêntica ao olho.
         */
        resolutionScale={0.5}
      />
    </EffectComposer>
  )
}

/**
 * A CONTRALUZ, e os dois uniformes globais do ambiente.
 *
 * ------------------------------------------------------------------
 * POR QUE UMA LUZ DE ÁREA, E NÃO MAIS UM GRADIENTE
 * ------------------------------------------------------------------
 *
 * O halo que existia aqui foi reprovado três vezes, e as três respostas
 * foram mexer nos números do mesmo gradiente. O que ele nunca teve é o que
 * esta luz tem: fonte com posição, tamanho e cor, oclusão pelo produto por
 * construção, e fótons.
 *
 * Ela mora ATRÁS, em azimute 180, porque nas duas bordas da silhueta a
 * reflexão de um cilindro aponta para o mesmo ponto, exatamente atrás. Uma
 * fonte só rima os dois lados e é a única que pode acender a parede
 * lateral do terminal. E ela NÃO pode preencher o lado escuro: em 180 o
 * n·l é negativo para toda normal voltada para a câmera. A máscara sai da
 * geometria, não de disciplina.
 *
 * O rim que ela desenha é de VERNIZ, não da base. Conferi no fonte
 * instalado (lights_physical_pars_fragment, dentro de
 * RE_Direct_RectArea_Physical) que há um bloco `#ifdef USE_CLEARCOAT` com
 * LTC próprio: a luz de área FAZ clearcoat. Com clearcoatRoughness 0,24 o
 * lóbulo tem ~13°, o que dá um fio de 2,9% da largura, e a base de 0,62 dá
 * um envolvimento macio de 10,7% por baixo dele. É esse par, fio brilhante
 * sobre borda macia, que evita o buraco entre 81% e 98% da largura.
 *
 * ------------------------------------------------------------------
 * ELA SEGUE O SUJEITO
 * ------------------------------------------------------------------
 *
 * `position.x` acompanha o produto. Medido no beat do kit, com a luz
 * parada em x=0 os oito corpos a viam em azimutes de 135 a 166 graus: um
 * leque de 31 graus, todo para um lado, e o realce marchava de corpo a
 * corpo. Seguindo o centro da composição, o leque cai para 17 e fica
 * simétrico em torno de 180.
 *
 * A CHAVE não segue nada: ela é IBL, ou seja infinitamente distante, e
 * vale igual para os oito.
 *
 * ------------------------------------------------------------------
 * E O AMBIENTE GIRA COM O PRODUTO
 * ------------------------------------------------------------------
 *
 * No beat das recargas o eixo do cilindro tomba 38,6 graus, e a fita no
 * horizonte precisaria estar em elevação -61,5 para espelhar nele: ela não
 * alcança. Girando `environmentRotation.z` junto com a inclinação que a
 * <Battery /> já publica, a exigência sobe para -37 graus, dentro da fita.
 * É uniforme global, custa zero por quadro, e o valor de entrada já existe.
 */
function ContraLuz() {
  const luz = useRef<THREE.RectAreaLight>(null)

  /**
   * O `RectAreaLightUniformsLib` precisa ser inicializado UMA vez antes de
   * qualquer luz de área desenhar. Sem isso a luz existe, não dá erro, e
   * simplesmente não ilumina nada — o pior tipo de falha.
   */
  useEffect(() => {
    RectAreaLightUniformsLib.init()
  }, [])

  /**
   * A cena vem pelo ARGUMENTO do useFrame, não por `useThree`.
   *
   * As duas devolvem o mesmo objeto, mas escrever num valor capturado de
   * hook é justamente o que o compilador do React proíbe (ele não tem como
   * saber que este objeto é externo ao React e vive fora do render). Pelo
   * argumento, é um parâmetro de função comum, e a regra não se aplica.
   */
  useFrame(({ scene: cena }) => {
    const l = luz.current
    if (!l) return
    const p = sceneState.progress
    const v = luzEm(p)

    /**
     * A carga do contador ESQUENTA a contraluz.
     *
     * É isto que substitui o halo de carga: em vez de um oval laranja
     * pintado atrás do produto, a parede atrás dele fica mais quente e
     * mais forte, e o que se vê na pilha é luz batendo nela.
     */
    /* A conta mora em luz.ts: a contraluz e a brasa TÊM de esquentar juntas,
       porque são a mesma fonte — uma invisível e outra visível */
    const misturaCarga = misturaDaCarga(p)

    /**
     * A luz sobe junto com o produto no RETRATO.
     *
     * `subidaDoRetrato` é zero em paisagem, então nenhuma medida de paisagem
     * se move. No celular o corpo vai para o terço de cima e a contraluz
     * ficava em y=0: o que se via era luz de chão atrás de um objeto alto.
     */
    const ySujeito = v.parede.y + sceneState.subidaDoRetrato
    l.position.set(sceneState.centroDeMundo, ySujeito, v.parede.z)
    l.width = v.parede.largura
    l.height = v.parede.altura
    l.intensity =
      v.parede.intensidade +
      (CARGA_CHEIA.intensidade - v.parede.intensidade) * misturaCarga
    l.color.setRGB(
      (v.parede.cor[0] + (CARGA_CHEIA.cor[0] - v.parede.cor[0]) * misturaCarga) / 255,
      (v.parede.cor[1] + (CARGA_CHEIA.cor[1] - v.parede.cor[1]) * misturaCarga) / 255,
      (v.parede.cor[2] + (CARGA_CHEIA.cor[2] - v.parede.cor[2]) * misturaCarga) / 255,
    )
    l.lookAt(sceneState.centroDeMundo, ySujeito, 0)

    cena.environmentIntensity = v.ambiente
    /* O giro some quando o kit se forma: são oito corpos em pé, e girar o
       ambiente por baixo deles inclinaria o realce de todos ao mesmo tempo */
    cena.environmentRotation.z =
      (sceneState.inclinacaoNaTela * Math.PI) / 180 * (1 - kitPresenca(p))
  })

  return <rectAreaLight ref={luz} intensity={2} width={7} height={9} position={[0, 0, -5.5]} />
}

/**
 * COMPILA TUDO ANTES, para a travada acontecer onde ninguém está olhando.
 *
 * ------------------------------------------------------------------
 * O QUE FOI MEDIDO
 * ------------------------------------------------------------------
 *
 * Varrendo o progresso de 0 a 1 e cronometrando cada quadro, a mediana é
 * 0,3 ms e existem exatamente dois picos:
 *
 *   p = 0,18   17,0 ms   programas de 8 para 10   (o cabo entra)
 *   p = 0,91   70,3 ms   programas de 10 para 13  (o kit se forma)
 *
 * Setenta milissegundos é um engasgo que se vê. E os dois acontecem UMA
 * vez, na primeira passagem — que é exatamente como o cliente descreveu:
 * "só na primeira vez que carrega, algumas transições dão uma travada".
 *
 * A causa NÃO é textura, e vale registrar porque a suspeita óbvia era
 * essa: medi `info.memory.textures` antes e depois da virada 01→02 e a
 * contagem não muda (14 e 14). Os mapas da AAA já estão na GPU muito
 * antes. O que custa é COMPILAR PROGRAMA de shader, que o driver faz na
 * primeira vez que um material é desenhado.
 *
 * ------------------------------------------------------------------
 * POR QUE PRECISA TORNAR VISÍVEL
 * ------------------------------------------------------------------
 *
 * `WebGLRenderer.compile` percorre com `traverseVisible` (conferido no
 * fonte instalado, three 0.185). O cabo e as oito do kit passam quase a
 * página inteira invisíveis — justamente até o instante em que travam —,
 * então uma chamada ingênua compilaria só o que já está em cena e não
 * resolveria nada.
 *
 * ------------------------------------------------------------------
 * DESENHA DE VERDADE, NUM ALVO DE 1×1
 * ------------------------------------------------------------------
 *
 * A primeira tentativa foi `compileAsync`, e ela só cortou o pico de 70
 * para 56 ms. Medido de novo, o quadro de p=0,905 continuava levando os
 * programas de 11 para 13: `compile` não alcançava os dois materiais do
 * kit, quase certamente porque eles só divergem dos da protagonista no
 * instante em que o kit entra — antes disso não há o que compilar.
 *
 * Adivinhar o que `compile` percorre é frágil. Desenhar não é: um render
 * de verdade compila o programa, sobe a geometria e sobe a textura, pelo
 * mesmo caminho que o quadro real usaria. Num alvo de 1×1 isso custa
 * preenchimento nenhum e não chega à tela — o pico acontece aqui, uma vez,
 * durante o carregamento, em vez de no meio da rolagem.
 */
function PreCompilar() {
  const feito = useRef(false)
  const quadros = useRef(0)

  useFrame(({ gl, scene, camera }) => {
    if (feito.current) return
    /* O ambiente tem de estar assado antes: o PMREM do <Environment> só
       existe depois do primeiro quadro, e material compilado sem ele
       compilaria com outra configuração de luz — ou seja, de novo errada */
    if (quadros.current++ < 3) return
    feito.current = true

    const escondidos: THREE.Object3D[] = []
    /**
     * Visível NÃO BASTA: o que não passa pelo frustum também não é
     * desenhado, e portanto também não compila.
     *
     * Medido: acendendo tudo, os programas paravam em 11 e o pico do kit
     * ficava inteiro. Em p=0 as oito pilhas estão com escala perto de zero
     * na posição do painel 03, ou seja fora ou degeneradas no volume de
     * visão — o desenho nunca chegava a acontecer.
     */
    const semCorte: THREE.Object3D[] = []
    scene.traverse((o) => {
      if (!o.visible) {
        o.visible = true
        escondidos.push(o)
      }
      if (o.frustumCulled) {
        o.frustumCulled = false
        semCorte.push(o)
      }
    })

    /**
     * NA TELA, com tesoura de 1×1. E as duas coisas importam.
     *
     * Alvo fora da tela não serve, e isto foi medido duas vezes: com um
     * `WebGLRenderTarget` os programas iam de 13 para 21 e os picos
     * continuavam inteiros — a chave de programa do three inclui a
     * configuração de saída, então desenhar noutro alvo compila um conjunto
     * PARALELO de variantes que o quadro real não reaproveita. Casar o
     * `colorSpace` do alvo não resolveu; a divergência é maior que isso.
     *
     * Desenhando no mesmo alvo do quadro real, a chave é a mesma e o
     * programa é reaproveitado. A tesoura restringe a escrita a um pixel do
     * canto: o driver compila, sobe a geometria e sobe a textura, e a tela
     * não muda — o `autoClear` também fica dentro da tesoura, então nem o
     * fundo é apagado.
     */
    /**
     * DOIS quadros, porque `transparent` é chave de programa.
     *
     * O primeiro cobre o mundo opaco. Ele sozinho matou o pico do cabo, mas
     * deixou 51 ms de pé na entrada do kit, e por três rodadas eu procurei
     * a causa nos materiais DO KIT. Não é lá.
     *
     * É a PROTAGONISTA. Ela esmaece quando o kit se forma, e esmaecer liga
     * `transparent` nos quatro materiais do corpo (ver Battery.tsx). No
     * three, `transparent` entra na chave do programa pelo parâmetro
     * `opaque`, então cada um daqueles materiais tem DUAS variantes de
     * shader — e a alpha só é pedida naquele instante, que é o pior da
     * página. O aquecimento roda com progresso ~0, onde tudo é opaco, e por
     * isso nunca a alcançava.
     *
     * Confirmado antes de escrever isto, com uma linha descartável
     * (`querTransparente = true`): a varredura de 0 a 1 passou a ter ZERO
     * picos e pior quadro de 1,3 ms, contra 51,3.
     *
     * Então o segundo quadro liga `transparent` nos materiais marcados e
     * desenha de novo. Restaurar é barato: o three guarda as variantes num
     * mapa por material e só as libera no `dispose`, então a volta para
     * opaco reusa o programa que já existe.
     */
    const alphas = [] as THREE.Material[]
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material
      if (!m) return
      for (const mat of Array.isArray(m) ? m : [m]) {
        if (mat.userData?.esmaeceNoKit && !mat.transparent) alphas.push(mat)
      }
    })

    const tesouraAntes = gl.getScissorTest()
    const caixa = new THREE.Vector4()
    gl.getScissor(caixa)
    try {
      gl.setScissorTest(true)
      gl.setScissor(0, 0, 1, 1)
      gl.render(scene, camera)

      if (alphas.length) {
        for (const m of alphas) {
          m.transparent = true
          m.needsUpdate = true
        }
        gl.render(scene, camera)
      }
    } finally {
      for (const m of alphas) {
        m.transparent = false
        m.needsUpdate = true
      }
      gl.setScissor(caixa.x, caixa.y, caixa.z, caixa.w)
      gl.setScissorTest(tesouraAntes)
      for (const o of escondidos) o.visible = false
      for (const o of semCorte) o.frustumCulled = true
    }
  })

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
      {/**
       * A PAREDE do estúdio, ANTES do canvas no documento.
       *
       * É a ordem que a põe atrás do produto: os três elementos são
       * posicionados e nenhum declara z-index, então quem pinta por último
       * pinta por cima. O container do R3F vem depois e ganha a frente sem
       * precisar de camada nomeada.
       *
       * A escura vem depois da clara porque vinheta escurece o que já foi
       * pintado, inclusive o ponto quente. Invertidas, o brilho passaria
       * por cima do escurecimento e o canto do painel branco não fecharia.
       *
       * Elas não têm conteúdo nem interação; o desenho inteiro está no CSS
       * (ver .parede-clara), e quem as acende por beat é o <FundoDoAto />.
       */}
      <div aria-hidden className="parede-clara" />
      <div aria-hidden className="parede-escura" />
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
          {/**
           * SAÍRAM a ambiente e a direcional, e as duas por medida.
           *
           * A `ambientLight` de 0,06 tinha efeito medido zero na leitura do
           * corpo e contribuía para o piso do lado escuro, que é o defeito
           * central deste beat.
           *
           * A `directionalLight` em [-3, 9, 7] era mantida por um motivo
           * escrito no código: "é ela que acende o aço do terminal". O
           * motivo não se sustenta. 76% daquele vetor aponta para +Y, onde
           * um cilindro vertical tem n·l igual a zero em toda a barriga, e
           * o que sobra fica a 23° do eixo óptico, ou seja luz FRONTAL, que
           * é a definição de achatar. E a face de cima do terminal nunca é
           * rasterizada: a câmera está em y=0 e o topo do terminal perto de
           * +1,85, então aquele disco é face traseira. O aço que aparece na
           * tela é a parede LATERAL de 1,35 mm.
           *
           * Apagando as duas, o piso do lado escuro cai de 16 para 9 de
           * 255, e a faixa dinâmica sai de 4,8:1 rumo aos 68:1 da foto.
           */}
          <ContraLuz />

          {/**
           * 512 e não 256.
           *
           * O cubemap é montado UMA vez e não custa nada por quadro; o que
           * ele paga é memória. Com o verniz do rótulo (clearcoat) o realce
           * ficou nítido o bastante para a fonte aparecer refletida nele, e
           * em 256 a fresta chegava com a borda serrilhada.
           */}
          {/**
           * O ESTÚDIO, em quatro peças, e cada ângulo sai de conta.
           *
           * Num cilindro vertical visto por lente longa a reflexão nunca
           * sai do plano horizontal: só o que está na LINHA DO HORIZONTE
           * vira realce, e tudo acima ou abaixo é preenchimento. Invertendo
           * a posição do pico medido na foto do produto (28% da largura),
           * a chave tem de estar em -52,2° de azimute. O rig anterior a
           * punha em -40° e por isso renderizava o pico em 33%.
           *
           * `rotation` NÃO entra em Lightformer nenhum: o drei já faz
           * lookAt na origem, e é a ESCALA que vira o tamanho angular da
           * fonte. Declarar rotação aqui briga com o lookAt e o resultado
           * é uma fonte apontando para o lugar errado.
           *
           * Fluxo relativo na barriga (intensidade x ângulo sólido):
           *   chave 1,54  cartão 0,29  teto 0,51  piso 0,12   total 2,46
           *   antes: 2,09 + 1,42 + 0,46 + 0,27 = 4,23
           * São 42% de queda, e ela acontece inteira nas direções que não
           * modelam nada.
           *
           * `frames` fica no padrão (1). O PMREM É invalidado a cada
           * quadro se isto virar Infinity: CubeCamera marca
           * `needsPMREMUpdate` e a textura incrementa `pmremVersion`, então
           * o ambiente seria reassado com seis faces de cubo mais a
           * convolução, sessenta vezes por segundo. O que anima aqui é uma
           * luz analítica e dois uniformes globais, que custam zero.
           */}
          <Environment resolution={512}>
            {/**
             * A CHAVE: uma FITA no horizonte, a -52,2° de azimute.
             *
             * Alta e estreita de propósito. Um cilindro só lê como
             * cilindro quando a fonte é uma fresta: o realce vira um rasgo
             * que corre o comprimento inteiro, e é esse rasgo que o olho
             * usa para ler a curvatura.
             */}
            {/**
             * O GEL é o que atende ao "manter essa luz meio amarelada em
             * todas as seções": estes quatro são globais aos sete beats.
             *
             * O número que fica escrito é o FLUXO — o valor medido —, e a
             * intensidade sai de `fluxo / L(cor)`. Escrever a intensidade à
             * mão depois de trocar a cor é a forma silenciosa de mexer em
             * todas as medidas do produto; aqui isso é impossível.
             *
             * E `gelDeAmbiente` DECODIFICA o hex, porque `Color.setStyle`
             * decodifica: aplicar a fórmula linear num hex dá 0,9627 onde o
             * valor real é 0,9179, ou seja 5% de erro em cima da fonte que
             * responde por 63% do fluxo da cena.
             *
             * `#FFF4E8` é quase neutro de propósito na chave e no cartão: é
             * ela que renderiza o laranja impresso do rótulo, e gelatinar a
             * chave demais mudaria a cor da marca no produto.
             */}
            <Lightformer
              {...gelDeAmbiente('#FFF4E8', 8.0)}
              position={[-5.0, 1.46, 3.88]}
              scale={[1.5, 20, 1]}
            />

            {/**
             * O CARTÃO DE OMBRO: largo, fraco, do MESMO lado da chave.
             *
             * Sem ele o realce vira decalque. A rugosidade da base do
             * rótulo é 0,62 medida no mapa, ou seja um lóbulo largo, e
             * lóbulo largo convolvendo um hemisfério vazio devolve quase
             * nada: o pico ficava 3,33 vezes acima da coluna seguinte
             * contra 1,48 na foto.
             *
             * Radiância treze vezes menor e ângulo sólido duas vezes e
             * meia maior: o lóbulo largo da tinta o enxerga, o lóbulo
             * estreito do verniz quase não. O pico próprio dele cai em 37%
             * da largura, que é exatamente onde a foto marca 46.
             */}
            <Lightformer
              {...gelDeAmbiente('#FFF4E8', 0.3)}
              position={[-3.68, 0.77, 6.37]}
              scale={[7, 10, 1]}
            />

            {/* Teto: dá o topo do corpo e o aro do terminal sem preencher
                a barriga, porque em +82° de elevação ele está fora do
                horizonte especular */}
            {/* Teto e piso podem esquentar bem mais que a chave: eles não
                desenham realce nenhum, só preenchem, e é no preenchimento
                que o tom da casa aparece sem competir com o rótulo */}
            <Lightformer
              {...gelDeAmbiente('#FFE2BE', 0.38)}
              position={[0, 8.12, 1.14]}
              scale={[9, 9, 1]}
            />

            {/* Piso, quase apagado: tira o preto morto do pé sem devolver
                o achatamento que a direcional causava */}
            <Lightformer
              {...gelDeAmbiente('#FFB260', 0.04)}
              position={[0, -5.64, 2.05]}
              scale={[10, 6, 1]}
            />
          </Environment>

          {/**
           * A BRASA, a fonte âmbar que a pilha tapa.
           *
           * A ordem no JSX não decide nada aqui: quem decide é `transparent`,
           * que joga o plano para depois de todos os opacos na fila de
           * desenho — que é exatamente onde a oclusão pelo depth buffer
           * acontece. Ver o cabeçalho de Brasa.tsx.
           */}
          <Brasa estatico={reduzido} />

          {/* O formato vem do progresso, não de prop: ver variantEm() */}
          <Battery estatico={reduzido} />

          {/**
           * A chuva é IRMÃ da pilha, não filha dela.
           *
           * O grupo da <Battery /> carrega pose, amortecimento, respiro e a
           * escala do retrato. A chuva não pode herdar nada disso: ela não
           * é do produto, é do BEAT. Pendurada lá dentro, ela balançaria
           * junto com o respiro e encolheria junto com a faixa do celular.
           */}
          <ChuvaDeDescartaveis estatico={reduzido} />
          {reduzido ? <CenaEstatica /> : <SaidaDoAto />}
          {/* Depois de tudo no JSX: quando este laço roda, o cabo, a chuva
              e as oito do kit já estão na árvore, ainda que invisíveis */}
          <PreCompilar />
          {debug && <DebugHook />}

          {/**
           * Bloom: o que faz a luz do cabo SAIR da geometria e ocupar o
           * espaço em volta. Sem ele o brilho fica contido no objeto e não
           * lê como neon, por mais que se ajuste o material.
           *
           * O limiar alto deixa o rótulo e a tampa laranja de fora — só o
           * brilho do cabo, que é emitido acima de 1, atravessa. E como só
           * ele atravessa, a cadeia inteira se desliga quando o cabo sai
           * de cena: ver <BrilhoDoCabo />.
           */}
          <BrilhoDoCabo />
        </Suspense>
      </Canvas>
    </div>
  )
}
