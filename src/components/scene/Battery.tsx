'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { AAA_SCALE, DIMENSIONS } from '@/data/products'
import { kitPresenca, poseAt, sceneState, variantEm } from '@/lib/scene-state'
import { asset } from '@/lib/site'
import { Cable } from './Cable'
import { BatteryMesh } from './BatteryMesh'
import { Kit } from './Kit'

/**
 * A pilha.
 *
 * Geometria PROCEDURAL, não GLB. Uma pilha é um cilindro tampado: modelar
 * em código dá as medidas reais em milímetros de graça, zero download, e o
 * UV do cilindro casa exatamente com o rótulo planificado — `u` dá a volta
 * (circunferência) e `v` sobe pelo comprimento, que é como a textura foi
 * construída.
 *
 * Escala: 1 unidade = 10 mm.
 */

const MM = 0.1

/**
 * Posição angular da porta no rótulo: mesma coluna da marca (u = 0,29).
 * O UV do cilindro tem u=0 em +Z, então o ângulo é u × 2π.
 */
const ANGULO_PORTA = 0.29 * Math.PI * 2

export function Battery() {
  const grupo = useRef<THREE.Group>(null)
  const corpo = useRef<THREE.Mesh>(null)
  /** Último formato aplicado, para trocar os mapas só quando muda */
  const formato = useRef<'AA' | 'AAA'>('AA')
  const { gl } = useThree()

  /**
   * A geometria é SEMPRE a da AA.
   *
   * A AAA é obtida escalando o grupo, não reconstruindo malha: rebuild no
   * meio do scroll custaria um engasgo justo na virada do painel. E como a
   * escala é não uniforme (0,724 no raio, 0,881 no comprimento, ver
   * AAA_SCALE), a proporção sai correta — a AAA é mais esguia, não uma AA
   * encolhida por igual.
   */
  const dim = DIMENSIONS.AA
  const raio = (dim.diameter / 2) * MM
  const comprimento = dim.length * MM

  /** Altura da porta: mesma posição usada no gerador do rótulo */
  const yPorta = comprimento * (0.5 - 0.18 * 0.58)

  /**
   * Os DOIS conjuntos de textura ficam carregados o tempo todo.
   *
   * Trocar a URL do `useTexture` suspenderia o componente no meio do
   * scroll: a pilha sumiria por alguns quadros justo na virada do painel
   * 01 para o 02. Carregando ambos, a troca é só apontar o material para
   * outro mapa, sem nenhum custo em tempo de execução.
   */
  /**
   * `asset()` porque quem busca a textura é o carregador do Three.js, e
   * ele não conhece o `basePath` do Next. Publicado num subcaminho, sem
   * o prefixo a pilha apareceria sem rótulo nenhum, em silêncio.
   */
  const base = asset('/produto/rotulo_aa')
  const baseAAA = asset('/produto/rotulo_aaa')

  /**
   * Quatro mapas, não um.
   *
   * Só com a cor, a porta USB-C respondia à luz exatamente igual ao corpo
   * fosco — e por isso lia como desenho pintado. O que a torna uma abertura
   * de verdade é ter material próprio: metálica, lisa e afundada.
   *
   *   cor         albedo
   *   rugosidade  corpo bem fosco, metal da porta liso
   *   metálico    só a porta é metal
   *   normal      relevo da cavidade e do aro
   *
   * A configuração vai no callback do useTexture: é onde a textura ainda é
   * parâmetro, e não retorno de hook (que o compilador do React trata como
   * imutável, mesmo dentro de efeito).
   */
  const [cor, rugosidade, metalico, normal, corB, rugB, metB, normB] = useTexture(
    [
      `${base}.png`, `${base}_rugosidade.png`, `${base}_metalico.png`, `${base}_normal.png`,
      `${baseAAA}.png`, `${baseAAA}_rugosidade.png`, `${baseAAA}_metalico.png`, `${baseAAA}_normal.png`,
    ],
    (t) => {
      const lista = (Array.isArray(t) ? t : [t]) as THREE.Texture[]
      lista.forEach((tex, i) => {
        // Só os mapas de COR são sRGB (índices 0 e 4). Os de dados têm que
        // ficar lineares, senão os valores saem distorcidos pela gama.
        tex.colorSpace = i % 4 === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace
        // Sem anisotropia o texto vira papa na borda do cilindro, que é
        // justamente onde ele fica mais visível.
        tex.anisotropy = gl.capabilities.getMaxAnisotropy()
        tex.wrapS = THREE.RepeatWrapping
        tex.needsUpdate = true
      })
    },
  )

  /** Agrupa os mapas por formato, para a protagonista e o kit compartilharem */
  const mapasAA = useMemo(
    () => ({ cor, rugosidade, metalico, normal }),
    [cor, rugosidade, metalico, normal],
  )
  const mapasAAA = useMemo(
    () => ({ cor: corB, rugosidade: rugB, metalico: metB, normal: normB }),
    [corB, rugB, metB, normB],
  )

  useFrame(({ clock, camera, size }, delta) => {
    if (!grupo.current) return

    // A protagonista encolhe conforme o kit toma a cena
    const kit = kitPresenca(sceneState.progress)
    grupo.current.visible = kit < 0.995
    const alvo = poseAt(sceneState.progress)
    const g = grupo.current
    const z = alvo.position[1]

    /**
     * Fração da tela → coordenada de mundo.
     *
     * Feito por quadro porque depende do aspecto: em tela larga o mesmo x
     * de mundo cai muito mais à esquerda. Convertendo aqui, a pilha fica
     * sempre na mesma faixa visual, seja em 1280 ou em 2560 de largura.
     *
     * Em retrato a coluna de texto ocupa a largura toda, então o produto
     * volta ao centro e passa atrás (ver z-index em SceneMount).
     */
    const cam = camera as THREE.PerspectiveCamera
    const retrato = size.width < size.height
    const meiaAltura = Math.tan((cam.fov * Math.PI) / 360) * (cam.position.z - z)
    const meiaLargura = meiaAltura * (size.width / size.height)
    const fracao = retrato ? 0.5 : alvo.screenX
    const alvoX = (fracao * 2 - 1) * meiaLargura

    // Amortecimento: a pose vem do scroll, mas a chegada é suave
    const s = 6
    g.position.x = THREE.MathUtils.damp(g.position.x, alvoX, s, delta)
    g.position.z = THREE.MathUtils.damp(g.position.z, z, s, delta)
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, alvo.rotation[0], s, delta)
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, alvo.rotation[2], s, delta)

    /**
     * Troca de formato, no meio do giro.
     *
     * Só reapontar os mapas do material: sem rebuild de geometria, sem
     * suspense, sem engasgo. A escala não uniforme (0,724 radial contra
     * 0,881 axial) é o que faz a AAA sair mais esguia em vez de uma AA
     * reduzida por igual.
     */
    const alvoFormato = variantEm(sceneState.progress)
    const mat = corpo.current?.material as THREE.MeshStandardMaterial | undefined
    if (mat && alvoFormato !== formato.current) {
      formato.current = alvoFormato
      const aaa = alvoFormato === 'AAA'
      mat.map = aaa ? corB : cor
      mat.roughnessMap = aaa ? rugB : rugosidade
      mat.metalnessMap = aaa ? metB : metalico
      mat.normalMap = aaa ? normB : normal
      mat.needsUpdate = true
    }

    const axialAtual = formato.current === 'AAA' ? AAA_SCALE.axial : 1
    const anterior = g.scale.y / (axialAtual * Math.max(0.001, 1 - kit))
    const base = THREE.MathUtils.damp(anterior, alvo.scale, s, delta)
    const radial = formato.current === 'AAA' ? AAA_SCALE.radial : 1

    /**
     * A protagonista se dissolve enquanto as oito crescem.
     *
     * Some por ESCALA, não por opacidade: as oito nascem no mesmo ponto
     * onde ela está, e um objeto que encolhe até virar as outras lê como
     * multiplicação. Cortar de um quadro para o outro, ou apagar por
     * transparência, entregaria a troca de cena.
     */
    const restante = base * (1 - kit)
    g.scale.set(restante * radial, restante * axialAtual, restante * radial)

    // Respiro: flutuação e balanço leves somados à pose.
    // NÃO é a narrativa — essa continua sendo `progress`, dirigido pelo
    // scroll (§6.2). Isto é só a micro-interação que impede o objeto de
    // parecer uma foto parada enquanto ninguém rola.
    // O respiro entra no ALVO do amortecimento, não somado depois: somar
    // por fora deixaria o movimento dependente da taxa de quadros.
    /**
     * O balanço é pequeno de propósito.
     *
     * O plugue tem 18 mm de corpo saindo radialmente da pilha, então ele
     * funciona como um ponteiro: cada grau de giro vira um arco visível na
     * ponta. Com ±0,13 rad (7,4°) o conector parecia abanar, e em alguns
     * ângulos chegava a raspar na tampa. A flutuação vertical pode ser mais
     * generosa — ela não gira nada.
     */
    const t = clock.elapsedTime
    const flutua = Math.sin(t * 0.55) * 0.14
    const balanca = Math.sin(t * 0.31) * 0.05

    g.position.y = THREE.MathUtils.damp(g.position.y, alvo.position[0] + flutua, s, delta)
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, alvo.rotation[1] + balanca, s, delta)
  })

  return (
    <>
      <group ref={grupo}>
        <BatteryMesh
          raio={raio}
          comprimento={comprimento}
          mapas={mapasAA}
          corpoRef={corpo}
        />

        {/* Cabo: filho do grupo da pilha para continuar plugado na porta
            mesmo enquanto o produto gira */}
        <Cable raio={raio} anguloPorta={ANGULO_PORTA} yPorta={yPorta} />

        {/**
         * A PORTA NÃO TEM GEOMETRIA PRÓPRIA: é desenhada no rótulo.
         *
         * O corpo é um cilindro sem furo. Qualquer peça colocada por dentro
         * fica invisível atrás da parede; colocada por fora, vira relevo
         * colado, que lia como um crachá grudado na tampa.
         *
         * Sem cortar a malha (CSG) não existe abertura de verdade, então o
         * trabalho fica com os mapas do rótulo, que já trazem a cavidade
         * escura, a língua, o aro metálico e o relevo no mapa normal.
         */}
      </group>

      {/* O kit do painel 03: oito pilhas nascendo do centro */}
      <Kit mapasAA={mapasAA} mapasAAA={mapasAAA} />
    </>
  )
}
