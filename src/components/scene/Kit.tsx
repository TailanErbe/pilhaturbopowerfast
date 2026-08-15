'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { AAA_SCALE, DIMENSIONS } from '@/data/products'
import { FACE_FRONTAL, kitPresenca, sceneState } from '@/lib/scene-state'
import {
  BatteryMesh,
  useMaterialDoCorpo,
  usePecasDaPilha,
  type MapasDaPilha,
} from './BatteryMesh'

/**
 * O painel 03: DOIS kits, não um conjunto de oito.
 *
 * O kit vendido traz quatro pilhas de UM formato mais o cabo. Quem compra
 * escolhe: quatro AA, ou quatro AAA. Mostrar as oito juntas e encostadas,
 * como estava antes, anunciava um produto que não existe.
 *
 * Por isso duas ilhas separadas por um vão largo, com o "OU" da página
 * caindo exatamente no meio dele. A separação é o argumento: dois grupos
 * que não se tocam leem como alternativa, um bloco só leria como pacote.
 */

const MM = 0.1

/** Medidas do modelo, em unidades de mundo (1 unidade = 10 mm) */
const AA = { raio: (DIMENSIONS.AA.diameter / 2) * MM, altura: DIMENSIONS.AA.length * MM }
const AAA = { raio: AA.raio * AAA_SCALE.radial, altura: AA.altura * AAA_SCALE.axial }

/**
 * O vão entre as duas ilhas.
 *
 * É o espaço onde o "OU" da página cai, então ele é medido a partir do
 * CENTRO (x = 0) e não do centro da caixa que contém tudo. Como a ilha AA
 * é mais larga que a das palito, o conjunto fica um pouco à esquerda do
 * eixo — o que importa é o vão estar centralizado, porque é ali que o
 * texto da página aparece.
 */
const VAO = 2.2

/**
 * Espaçamento proporcional ao diâmetro: mesma folga visual nos dois grupos.
 *
 * Proporcional, e não fixa, porque só assim a ilha das palito lê com o
 * mesmo aperto da ilha das AA: folga fixa em unidades de mundo pareceria
 * larga entre corpos finos e apertada entre corpos grossos.
 *
 * 11% e não 5%: o corpo é preto e escurece muito na borda, então uma folga
 * curta some entre as duas quedas de luz das vizinhas e a fila lê como um
 * bloco só. Nas AA, mais gordas, isso acontecia bem antes que nas palito.
 * A folga precisa ser larga o bastante para o FUNDO aparecer no meio.
 */
const FOLGA = 1.16
const PASSO_AA = AA.raio * 2 * FOLGA
const PASSO_AAA = AAA.raio * 2 * FOLGA

const MEIA_ILHA_AA = PASSO_AA * 1.5 + AA.raio
const MEIA_ILHA_AAA = PASSO_AAA * 1.5 + AAA.raio

const CENTRO_AA = -VAO / 2 - MEIA_ILHA_AA
const CENTRO_AAA = VAO / 2 + MEIA_ILHA_AAA

/** Extremo mais distante do eixo — é ele que manda no ajuste de largura */
const MEIO_EXTENSAO = Math.max(
  Math.abs(CENTRO_AA) + MEIA_ILHA_AA,
  Math.abs(CENTRO_AAA) + MEIA_ILHA_AAA,
)

/**
 * O kit é FOTO DE CARTELA, não composição.
 *
 * As oito ficam retas, no mesmo plano, na mesma linha e todas com a marca
 * de frente. Uma tentativa anterior espalhou inclinação, profundidade e
 * giro próprio em cada pilha, procurando naturalidade: o resultado foi um
 * amontoado. Numa cartela o alinhamento é o produto, e desalinho lê como
 * defeito de montagem, não como vida.
 *
 * Por isso o slot guarda só a posição na fila e o formato: não existe mais
 * nada por pilha para variar.
 */
type Slot = {
  x: number
  aaa: boolean
}

const SLOTS: Slot[] = [
  // Kit AA
  { x: CENTRO_AA - PASSO_AA * 1.5, aaa: false },
  { x: CENTRO_AA - PASSO_AA * 0.5, aaa: false },
  { x: CENTRO_AA + PASSO_AA * 0.5, aaa: false },
  { x: CENTRO_AA + PASSO_AA * 1.5, aaa: false },

  // Kit AAA (palito)
  { x: CENTRO_AAA - PASSO_AAA * 1.5, aaa: true },
  { x: CENTRO_AAA - PASSO_AAA * 0.5, aaa: true },
  { x: CENTRO_AAA + PASSO_AAA * 0.5, aaa: true },
  { x: CENTRO_AAA + PASSO_AAA * 1.5, aaa: true },
]

/**
 * Quanto do retângulo reservado o conjunto ocupa.
 *
 * As duas frações são do RETÂNGULO que o painel mede (ver FaixaDaCena),
 * não da tela: é isso que mantém as pilhas dentro da coluna esquerda e
 * longe da régua de meta, em qualquer proporção de janela.
 */
const OCUPACAO = { largura: 0.99, altura: 0.94 }

/** Enquanto o painel não mediu, um palpite folgado dentro da coluna esquerda */
const FAIXA_PADRAO = { esquerda: 0.05, direita: 0.46, topo: 0.34, base: 0.7 }

export function Kit({
  mapasAA,
  mapasAAA,
}: {
  mapasAA: MapasDaPilha
  mapasAAA: MapasDaPilha
}) {
  const raiz = useRef<THREE.Group>(null)
  const slots = useRef<(THREE.Group | null)[]>([])

  const dim = useMemo(
    () => ({ raio: AA.raio, comprimento: AA.altura }),
    [],
  )

  /**
   * UM conjunto de peças para as oito, e dois materiais de corpo.
   *
   * As oito são geometricamente idênticas: a palito sai da escala não
   * uniforme aplicada no grupo do slot, não de outra malha. Antes cada
   * <BatteryMesh /> declarava a própria geometria em JSX, e o painel do
   * kit gastava 32 buffers e 32 materiais por quadro, no beat mais pesado
   * da página. Agora são 4 geometrias e 5 materiais, para as oito.
   *
   * Os corpos precisam de dois materiais porque o rótulo é outro: a AA e a
   * palito têm mapas próprios, e é só isso que as distingue além do porte.
   */
  const pecas = usePecasDaPilha(dim.raio, dim.comprimento)
  /**
   * SEM a variante de carga: injetar a onda aqui custaria instruções por
   * fragmento em oito corpos para uma luz que nunca acende no beat do kit.
   *
   * Registro de uma investigação que passou por aqui e NÃO era isto, para
   * ninguém repetir: o engasgo de 51 ms na entrada do kit parecia vir destes
   * materiais, porque eles têm chave de programa diferente da protagonista.
   * Passar `true` aqui derrubou o total de 13 para 12 programas e não mexeu
   * no pico.
   *
   * A causa era a PROTAGONISTA: ela liga `transparent` ao esmaecer, e
   * `transparent` é chave de programa. Está resolvido no <PreCompilar />, em
   * Scene.tsx, com um segundo quadro de aquecimento em alpha.
   */
  const corpoAA = useMaterialDoCorpo(mapasAA)
  const corpoAAA = useMaterialDoCorpo(mapasAAA)

  useFrame(({ camera, size }) => {
    const p = kitPresenca(sceneState.progress)
    const r = raiz.current
    if (!r) return
    r.visible = p > 0.001
    if (!r.visible) return

    /**
     * Ajuste ao viewport, por quadro.
     *
     * Oito corpos numa fileira larga é a composição mais sensível a tela
     * da página inteira: o que cabe folgado em 21:9 estoura em 4:3. Medir
     * o frustum a cada quadro é o que mantém as bordas respeitadas em
     * qualquer proporção, inclusive ao redimensionar a janela.
     */
    const cam = camera as THREE.PerspectiveCamera
    const meiaAltura = Math.tan((cam.fov * Math.PI) / 360) * cam.position.z
    const meiaLargura = meiaAltura * (size.width / size.height)

    // Frações da tela → coordenadas de mundo
    const paraMundoY = (f: number) => (0.5 - f) * 2 * meiaAltura
    const paraMundoX = (f: number) => (f - 0.5) * 2 * meiaLargura
    const faixa = sceneState.faixaDoKit ?? FAIXA_PADRAO
    const topo = paraMundoY(faixa.topo)
    const base = paraMundoY(faixa.base)
    const esquerda = paraMundoX(faixa.esquerda)
    const direita = paraMundoX(faixa.direita)

    /**
     * A largura é limitada pelo lado MAIS LARGO do conjunto.
     *
     * As duas ilhas não têm a mesma largura (quatro AA ocupam mais que
     * quatro palito), e o vão é que fica centrado, não a caixa. Medindo
     * pelo extremo mais distante do eixo, a ilha maior nunca vaza para
     * fora da coluna, e o "OU" do painel continua caindo exatamente no
     * meio do vão, que é o centro horizontal da faixa.
     */
    const meiaFaixa = (direita - esquerda) / 2
    const porLargura = (meiaFaixa * OCUPACAO.largura) / MEIO_EXTENSAO
    const porAltura = ((topo - base) * OCUPACAO.altura) / AA.altura
    const ajuste = Math.max(0.05, Math.min(porLargura, porAltura))

    r.scale.setScalar(ajuste)
    r.position.x = (esquerda + direita) / 2
    /* A contraluz precisa seguir o CENTRO DAS DUAS ILHAS aqui, e não a
       protagonista, que a esta altura já está dissolvida. Ver
       `centroDeMundo`: parada no eixo, a luz fazia o realce marchar de
       corpo a corpo, de 22,8% no primeiro a 26,7% no oitavo. */
    sceneState.centroDeMundo = r.position.x

    /**
     * As oito pousam na MESMA linha, e essa linha fica no pé da faixa.
     *
     * Ancorar no pé em vez de centralizar mantém o chão parado quando a
     * escala muda: redimensionando a janela as pilhas crescem para cima,
     * como objetos apoiados numa mesa, em vez de deslizarem no ar.
     */
    const sobra = (topo - base) - AA.altura * ajuste
    r.position.y = base + sobra / 2

    slots.current.forEach((g, i) => {
      if (!g) return
      const s = SLOTS[i]

      /**
       * Nascem no centro e caminham para o lugar: saindo do ponto onde a
       * protagonista está, a leitura é de uma pilha que se multiplica, não
       * de um grupo novo surgindo do nada.
       *
       * Posição e tamanho crescem pelo MESMO fator.
       *
       * Antes a posição usava `p` e a escala usava `0,4 + 0,6p`: durante
       * toda a entrada o espaçamento encolhia mais rápido que os corpos e
       * as pilhas se sobrepunham. Em p = 0,9 a folga já era zero, e como o
       * beat inteiro roda com p < 1 fora do centro exato, era esse o estado
       * que aparecia na tela quase sempre. O defeito batia mais forte nas
       * AA, que são mais gordas e fecham a folga antes.
       *
       * Com um fator só, o conjunto vira uma versão reduzida de si mesmo:
       * a geometria é a mesma em qualquer instante da abertura.
       */
      const cresc = 0.4 + 0.6 * p
      g.position.set(s.x * cresc, 0, 0)

      /**
       * Cada pilha gira para encarar a CÂMERA, não o eixo Z.
       *
       * O kit mora na coluna esquerda, longe do eixo óptico, e a câmera é
       * perspectiva: as pilhas de lá são vistas de esguelha, então uma
       * rotação igual para todas mostrava o rótulo deslocado numas e não
       * noutras. Lia como se uma ilha estivesse torta em relação à outra.
       *
       * Girar cada uma em torno do PRÓPRIO eixo não muda silhueta nenhuma
       * (um cilindro é igual de qualquer ângulo), só escolhe qual parte do
       * rótulo aparece. Custo zero, e as oito apresentam a marca de frente.
       */
      const mundoX = r.position.x + s.x * cresc * ajuste
      g.rotation.set(0, FACE_FRONTAL + Math.atan2(-mundoX, cam.position.z), 0)

      /**
       * Escala em vez de opacidade: com oito corpos que se cruzam em
       * profundidade, transparência traria ordenação de blending e custo
       * de fill rate sem nenhum ganho de leitura.
       */
      const radial = s.aaa ? AAA_SCALE.radial : 1
      const axial = s.aaa ? AAA_SCALE.axial : 1
      g.scale.set(cresc * radial, cresc * axial, cresc * radial)
    })
  })

  return (
    <group ref={raiz}>
      {SLOTS.map((s, i) => (
        <group
          key={i}
          ref={(el) => {
            slots.current[i] = el
          }}
        >
          {/**
           * A malha sobe meia altura dentro do slot.
           *
           * Assim o slot fica ancorado na BASE: as oito pousam na mesma
           * linha mesmo com alturas diferentes (a palito tem 44,5 mm contra
           * 50,5), e o tombo gira em torno do pé, que é onde uma pilha
           * encostada realmente pivota. Centrando pelo meio, as palito
           * flutuariam acima do chão das AA.
           */}
          <group position={[0, dim.comprimento / 2, 0]}>
            <BatteryMesh pecas={pecas} corpo={s.aaa ? corpoAAA : corpoAA} />
          </group>
        </group>
      ))}
    </group>
  )
}
