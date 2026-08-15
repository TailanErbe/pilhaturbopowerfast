'use client'

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  aplicarLaje,
  areaPorInstancia,
  COBERTURA,
  estadoEm,
  fracaoDeAtivacao,
  gerarPool,
  JANELA,
  LAJE_PAISAGEM,
  LAJE_RETRATO,
  MARGEM,
  N_MAX,
  perfilDeQueda,
  pesoEm,
  type Carcaca,
} from '@/lib/chuva'
import { centroDoBeat } from '@/motion/labels'
import { LARGURA_RETRATO, poseAt, sceneState } from '@/lib/scene-state'

/**
 * A chuva de pilhas descartáveis. Ver `lib/chuva.ts` para o porquê e para a
 * matemática; aqui só mora o que precisa de three.
 *
 * Uma malha instanciada, uma chamada de desenho, 96 instâncias, nenhuma
 * textura, nenhum blending, nenhum passe novo de tela cheia.
 */

/**
 * O PERFIL da carcaça, em unidades de mundo (1 unidade = 10 mm).
 *
 * Uma pilha AA genérica: 50,5 mm no total, corpo de 49,15 por 14,5 de
 * diâmetro, nub de 5,0 por 1,35 — as mesmas medidas do TERMINAL em
 * BatteryMesh, porque é a mesma peça sem rótulo.
 *
 * A origem fica no CENTROIDE, não na base: corpo em queda livre gira em
 * torno do centro de massa, e ancorar no pé faria a peça pivotar em torno
 * de um ponto que não existe.
 *
 * `LatheGeometry` e não dois cilindros unidos. Torneando o perfil, os anéis
 * de vértices caem EXATAMENTE nas fronteiras das bandas de cor, o degrau do
 * ombro sai de graça, a base fecha sozinha, e não entra nem
 * BufferGeometryUtils nem grupos de material.
 */
const PERFIL: [number, number][] = [
  [0, -2.525],
  [0.725, -2.525],
  [0.725, -2.27],
  [0.725, 1.9],
  [0.725, 1.99],
  [0.725, 2.05],
  [0.725, 2.14],
  [0.725, 2.39],
  [0.25, 2.39],
  [0.25, 2.525],
  [0, 2.525],
]

/**
 * As bandas de luminância, por altura.
 *
 * É isto que faz um bastão de 35 px ler como PILHA em vez de cápsula. Três
 * quebras de luminância bastam: o polo negativo escuro, a crimpagem clara
 * logo acima dele, e o nub claro no topo.
 *
 * A crimpagem sobe em 0,9 mm, tem 0,6 mm de platô e desce em 0,9 mm: numa
 * tela de 1920 isso dá uma linha clara de uns 6 px na carcaça mais próxima.
 *
 * Custa zero por quadro e zero de memória: é atributo de vértice, e o
 * three já define USE_COLOR quando `vertexColors` está ligado, multiplicando
 * cor de vértice e cor de instância no mesmo vColor. Banda e profundidade se
 * compõem sem shader próprio.
 */
const BANDAS: [number, number][] = [
  [-2.525, 0.55],
  [-2.27, 1.0],
  [1.9, 1.0],
  [1.99, 1.35],
  [2.05, 1.35],
  [2.14, 0.72],
  [2.39, 0.78],
  [2.525, 1.3],
]

/** Onde o produto está na largura da tela, neste beat */
const FOCO_PAISAGEM = poseAt(centroDoBeat('cycles')).screenX

/** Quadros de aquecimento do shader. Ver o comentário em `useFrame`. */
const AQUECIMENTO = 3

/* Reaproveitados a cada instância de cada quadro: zero alocação no laço */
const M = new THREE.Matrix4()
const Q_TOMBO = new THREE.Quaternion()
const Q_GIRO = new THREE.Quaternion()
const EIXO = new THREE.Vector3()
const POS = new THREE.Vector3()
const ESC = new THREE.Vector3()
const CIMA = new THREE.Vector3(0, 1, 0)
const MORTA = new THREE.Vector3(1e-3, 1e-3, 1e-3)

function multiplicadorEm(y: number): number {
  if (y <= BANDAS[0][0]) return BANDAS[0][1]
  for (let i = 1; i < BANDAS.length; i++) {
    if (y <= BANDAS[i][0]) {
      const [y0, m0] = BANDAS[i - 1]
      const [y1, m1] = BANDAS[i]
      const t = y1 === y0 ? 1 : (y - y0) / (y1 - y0)
      return m0 + (m1 - m0) * t
    }
  }
  return BANDAS[BANDAS.length - 1][1]
}

export function ChuvaDeDescartaveis({ estatico }: { estatico?: boolean }) {
  const malha = useRef<THREE.InstancedMesh>(null)
  const pool = useRef<Carcaca[]>(null as unknown as Carcaca[])
  const ativas = useRef<boolean[]>([])
  const aquecendo = useRef(estatico ? 0 : AQUECIMENTO)
  const { size, camera } = useThree()

  const geometria = useMemo(() => {
    const pontos = PERFIL.map(([x, y]) => new THREE.Vector2(x, y))
    const g = new THREE.LatheGeometry(pontos, 12)

    const pos = g.getAttribute('position')
    const cores = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      const m = multiplicadorEm(pos.getY(i))
      cores[i * 3] = m
      cores[i * 3 + 1] = m
      cores[i * 3 + 2] = m
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3))
    return g
  }, [])

  /**
   * FOSCO, e sem verniz de propósito.
   *
   * O produto tem clearcoat e brilha; a descartável é fosca e morta.
   * Brilhante contra fosco é a leitura mais rápida que existe de vivo
   * contra lixo, e ela acontece antes de qualquer palavra ser lida.
   *
   * Saturação zero: todo o croma deste beat continua sendo do contador
   * laranja, do halo e da tampa do produto.
   */
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#5d6169',
        roughness: 0.62,
        metalness: 0.28,
        envMapIntensity: 0.35,
        vertexColors: true,
      }),
    [],
  )

  useEffect(
    () => () => {
      geometria.dispose()
      material.dispose()
    },
    [geometria, material],
  )

  /**
   * `instanceColor` nasce ANTES do primeiro desenho.
   *
   * O atributo entra na chave de cache do programa: criado depois, o three
   * monta um shader diferente e recompila — e a recompilação cairia no
   * meio da rolagem, que é o único momento em que ela dói. `useLayoutEffect`
   * roda antes da pintura e antes do primeiro quadro do laço.
   */
  useLayoutEffect(() => {
    const cena = malha.current
    if (!cena || cena.instanceColor) return
    cena.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(N_MAX * 3).fill(1),
      3,
    )
  }, [])

  /**
   * Medida do viewport: só na montagem e em mudança de LARGURA.
   *
   * Nunca de altura. No celular a barra do navegador aparece e some o tempo
   * todo, e cada aparição dispara um resize de altura; recalcular ali
   * mudaria a lista de ativas no meio do beat, na frente do usuário. É o
   * mesmo motivo escrito no PinnedAct.
   *
   * E mesmo quando a largura muda, NADA se move: o pool é independente de
   * tela. O que muda é quais entradas estão ligadas e a que distância elas
   * estão. As que continuam ligadas ficam exatamente onde estavam no eixo
   * do tempo.
   */
  const largura = size.width
  useEffect(() => {
    const retrato = largura < LARGURA_RETRATO
    const laje = retrato ? LAJE_RETRATO : LAJE_PAISAGEM

    if (!pool.current) pool.current = gerarPool(laje)
    else aplicarLaje(pool.current, laje)

    const medir = () => {
      const p = pool.current
      const cena = malha.current
      if (!p || !cena) return

      /**
       * A borda da coluna de texto, MEDIDA.
       *
       * `container-gutter` é um clamp e a coluna é percentual: o x onde ela
       * termina muda com a largura. Um número digitado estaria certo só na
       * tela de quem o digitou.
       */
      const col = document.querySelector<HTMLElement>(
        '[data-beat="cycles"] [data-coluna]',
      )
      const borda = col
        ? col.getBoundingClientRect().right / window.innerWidth
        : 0.42
      const foco = retrato ? 0.5 : FOCO_PAISAGEM

      const pesos = p.map((c) => pesoEm(c.fx0, borda, foco, retrato))
      const cam = camera as THREE.PerspectiveCamera
      const area = areaPorInstancia(laje, cam.fov, largura / size.height)
      const alvo = Math.min(
        N_MAX,
        (retrato ? COBERTURA.retrato : COBERTURA.paisagem) / area,
      )
      const fracao = fracaoDeAtivacao(pesos, alvo)

      ativas.current = p.map((c, i) => c.mascara < Math.min(1, fracao * pesos[i]))

      /**
       * O tom por profundidade é reescrito aqui, e o atributo já existe
       * desde a montagem: criar `instanceColor` depois do primeiro render
       * muda a chave de cache do programa e recompila no meio da rolagem.
       */
      const cor = cena.instanceColor
      if (cor) {
        for (let i = 0; i < p.length; i++) {
          cor.setXYZ(i, p[i].tom, p[i].tom, p[i].tom)
        }
        cor.needsUpdate = true
      }
    }

    medir()
    const alvo = document.querySelector('[data-beat="cycles"] [data-coluna]')
    if (!alvo) return
    const obs = new ResizeObserver(medir)
    obs.observe(alvo)
    return () => obs.disconnect()
  }, [largura, size.height, camera])

  useFrame(() => {
    const cena = malha.current
    if (!cena) return

    /**
     * AQUECIMENTO DO SHADER, nos primeiros quadros depois da montagem.
     *
     * Uma chamada de desenho de verdade, com uma instância parada e
     * minúscula, compila e linka o programa (MeshStandard mais INSTANCING,
     * INSTANCING_COLOR e o envMap PMREM) enquanto o usuário ainda está no
     * herói.
     *
     * Sem isto a compilação acontece no primeiro quadro em que a chuva
     * aparece, ou seja EM p=0,345, com a pessoa rolando. No ANGLE do
     * Windows isso são dezenas de milissegundos travados exatamente na
     * entrada do beat.
     */
    if (aquecendo.current > 0) {
      aquecendo.current--
      cena.visible = true
      cena.count = 1
      M.compose(POS.set(0, 0, 0), Q_GIRO.identity(), MORTA)
      cena.setMatrixAt(0, M)
      cena.instanceMatrix.needsUpdate = true
      return
    }

    /**
     * O progresso vem de `sceneState`, NUNCA de `obterTimeline().progresso()`.
     *
     * Aquele é o scroll cru e adianta em relação ao valor escrubado — o
     * mesmo que dirige o contador. A chuva é a imagem daquele número, então
     * ela anda no relógio dele.
     *
     * O <FundoDoAto /> lê o cru para acender a parede, então a luz do fundo
     * anda alguns centésimos à frente da chuva. Ali isso não custa nada: o
     * que ela dirige é um degradê de fundo sem borda, e um atraso invisível
     * é preferível a desincronizar a chuva do número que ela ilustra.
     */
    const p = sceneState.progress
    const dentro = p > JANELA.de - 0.002 && p < 0.502
    if (cena.visible !== dentro) cena.visible = dentro
    if (!dentro) return

    cena.count = N_MAX
    const pool_ = pool.current
    if (!pool_) return

    const tau = Math.max(0, (p - JANELA.de) / (JANELA.ate - JANELA.de))
    const cam = camera as THREE.PerspectiveCamera
    const tanMeio = Math.tan((cam.fov * Math.PI) / 360)
    const aspecto = size.width / size.height

    for (let i = 0; i < N_MAX; i++) {
      const c = pool_[i]
      const { viva, u, q } = estadoEm(c, tau)

      if (!viva || !ativas.current[i]) {
        /* Estacionada ATRÁS da câmera: recortada antes de rasterizar, e a
           matriz normal não fica singular como ficaria com escala zero */
        M.compose(POS.set(0, 0, 60), Q_GIRO.identity(), MORTA)
        cena.setMatrixAt(i, M)
        continue
      }

      const fy = -MARGEM + perfilDeQueda(u) * (1 + 2 * MARGEM)
      /* Bamboleio lateral pequeno: papel caindo não desce em linha reta */
      const fx = c.fx0 + 0.01 * Math.sin(2 * Math.PI * (0.5 * q + c.faseFlutter))

      /* Meia altura do frustum NA PROFUNDIDADE DESTA peça */
      const hw = tanMeio * c.d
      POS.set(
        (fx * 2 - 1) * hw * aspecto,
        (0.5 - fy) * 2 * hw,
        cam.position.z - c.d,
      )

      /**
       * A rotação é função de `q`, e não de `u`.
       *
       * `u` reinicia a cada queda; `q` é contínuo através do embrulho.
       * Usando `u`, a peça daria um salto angular no instante em que
       * reaparece no topo — e o embrulho acontece fora de quadro
       * justamente para não haver salto nenhum a esconder.
       */
      EIXO.set(c.eixo[0], c.eixo[1], c.eixo[2])
      Q_TOMBO.setFromAxisAngle(EIXO, 2 * Math.PI * c.voltasTombo * q)
      Q_GIRO.setFromAxisAngle(CIMA, 2 * Math.PI * (c.voltasGiro * q + c.faseGiro))
      Q_TOMBO.multiply(Q_GIRO)

      M.compose(POS, Q_TOMBO, ESC.set(1, 1, 1))
      cena.setMatrixAt(i, M)
    }

    cena.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={malha}
      name="chuva"
      args={[geometria, material, N_MAX]}
      /**
       * `frustumCulled` OBRIGATORIAMENTE falso.
       *
       * `Frustum.intersectsObject` computa a esfera envolvente de uma
       * InstancedMesh UMA vez, no primeiro teste de recorte, e a guarda
       * para sempre. O primeiro teste acontece no quadro de aquecimento,
       * com a única instância estacionada e minúscula: a esfera sairia
       * quase pontual e a chuva inteira seria descartada, em silêncio, pelo
       * resto da vida da página.
       */
      frustumCulled={false}
      /* O ordenador estável do three ordena por id de material antes do z:
         sem isto a chuva pode ser desenhada antes do produto e perder o
         teste de profundidade antecipado. É otimização, não correção. */
      renderOrder={1}
      visible={false}
    />
  )
}
