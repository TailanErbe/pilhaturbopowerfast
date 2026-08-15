'use client'

import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

/**
 * A pilha como MALHA pura: sem pose, sem estado, sem scroll.
 *
 * Extraído para o kit poder instanciar oito cópias sem arrastar junto a
 * lógica de progresso, que pertence a uma única pilha protagonista.
 *
 * ------------------------------------------------------------------
 * GEOMETRIA E MATERIAL VÊM DE FORA, PRONTOS
 * ------------------------------------------------------------------
 *
 * Antes as quatro geometrias e os quatro materiais eram declarados em JSX
 * aqui dentro, e o React os criava POR INSTÂNCIA. No painel do kit são
 * oito pilhas: 32 buffers distintos na GPU, 32 trocas de atributo e 32
 * trocas de material por quadro — sendo o do corpo um `meshPhysicalMaterial`
 * com clearcoat, o conjunto de uniformes mais caro da cena, mais um mapa
 * de cor de 1024px.
 *
 * E as oito são geometricamente IDÊNTICAS. A única diferença entre elas é
 * matriz e formato, e matriz é exatamente o que um nó de cena já carrega:
 * a escala não uniforme da palito é aplicada no grupo (ver Kit), não na
 * malha. Criar a mesma caixa oito vezes não estava comprando nada.
 *
 * Agora quem monta chama `usePecasDaPilha` uma vez e passa o resultado
 * para todas. São 4 geometrias no lugar de 32.
 *
 * O material do CORPO fica de fora desse pacote de propósito: a
 * protagonista troca os mapas dele no meio do giro para virar palito, e se
 * ela dividisse o material com o kit, as quatro AA do kit virariam palito
 * junto. Cada dono pede o seu com `useMaterialDoCorpo`.
 */

export type MapasDaPilha = {
  cor: THREE.Texture
  rugosidade: THREE.Texture
  metalico: THREE.Texture
  normal: THREE.Texture
}

const ESCALA_NORMAL = new THREE.Vector2(1.5, 1.5)

/** 1 unidade = 10 mm */
const MM = 0.1

/**
 * Terminal positivo, medido na foto do produto.
 *
 * Varrendo as linhas de cima da pilha em cartela-2-v2.png: o nub ocupa
 * 0,345 da largura do corpo (0,345 × 14,5 = 5,0 mm de diâmetro) e oito
 * das trezentas linhas do comprimento (8/300 × 50,5 = 1,35 mm). Estava
 * com 5,8 mm de diâmetro, largo demais, o que engordava a silhueta
 * justo no ponto que o olho usa para reconhecer uma pilha.
 *
 * A cor também veio da foto: rgb(190,190,190) neutro, aço polido.
 */
const TERMINAL = { raio: 2.5 * MM, altura: 1.35 * MM, cor: '#bebebe' }

/**
 * O RÓTULO É IMPRESSO E ENVERNIZADO, e é isso que o material precisa dizer.
 *
 * Com `meshStandardMaterial` havia uma camada especular só, compartilhada
 * entre a tinta e o verniz: para o preto do corpo brilhar, era preciso
 * baixar a rugosidade, e aí a tinta branca do "POWERFAST" brilhava junto,
 * como se a impressão fosse metálica.
 *
 * O verniz é uma SEGUNDA camada, fina e lisa, por cima de uma tinta fosca.
 * `clearcoat` modela exatamente isso: o realce corre por cima do desenho
 * inteiro, com a mesma intensidade sobre o preto e sobre o branco, que é o
 * que se vê na foto.
 */
const VERNIZ = { clearcoat: 0.62, clearcoatRoughness: 0.28 }

export type PecasDaPilha = {
  comprimento: number
  corpo: THREE.BufferGeometry
  tampa: THREE.BufferGeometry
  terminal: THREE.BufferGeometry
  base: THREE.BufferGeometry
  /**
   * A tampa é envernizada como o rótulo: é a mesma peça dobrada por cima.
   *
   * A cor vem da FOTO, não do token da marca: rgb(240,154,7). O
   * `--brand-orange` do site é #FFA400, e usá-lo aqui deixava a tampa mais
   * clara e mais amarela que a faixa impressa logo abaixo dela, num ponto
   * em que as duas se encostam e a diferença aparece.
   */
  matTampa: THREE.Material
  matTerminal: THREE.Material
  matBase: THREE.Material
}

/**
 * As peças que TODAS as pilhas compartilham, criadas uma vez.
 *
 * Descarta no desmonte porque estes objetos não nasceram em JSX: o R3F só
 * libera automaticamente o que ele mesmo criou.
 */
export function usePecasDaPilha(raio: number, comprimento: number): PecasDaPilha {
  const pecas = useMemo<PecasDaPilha>(() => {
    return {
      comprimento,
      /* Cilindro ABERTO: as tampas são peças próprias, com outro material */
      corpo: new THREE.CylinderGeometry(raio, raio, comprimento, 128, 1, true),
      tampa: new THREE.CircleGeometry(raio, 96),
      terminal: new THREE.CylinderGeometry(
        TERMINAL.raio,
        TERMINAL.raio,
        TERMINAL.altura,
        48,
      ),
      base: new THREE.CircleGeometry(raio, 96),
      matTampa: new THREE.MeshPhysicalMaterial({
        color: '#f09a07',
        roughness: 0.5,
        metalness: 0.05,
        clearcoat: VERNIZ.clearcoat,
        clearcoatRoughness: VERNIZ.clearcoatRoughness,
      }),
      matTerminal: new THREE.MeshStandardMaterial({
        color: TERMINAL.cor,
        roughness: 0.22,
        metalness: 0.95,
      }),
      /**
       * A base (polo negativo) NÃO é preto puro: nenhum objeto real é. O
       * preto absoluto some contra o fundo da página, que também é escuro,
       * e a pilha perde a ponta de baixo — a silhueta termina no ar.
       */
      matBase: new THREE.MeshStandardMaterial({
        color: '#22242a',
        roughness: 0.55,
        metalness: 0.45,
      }),
    }
  }, [raio, comprimento])

  useEffect(
    () => () => {
      pecas.corpo.dispose()
      pecas.tampa.dispose()
      pecas.terminal.dispose()
      pecas.base.dispose()
      pecas.matTampa.dispose()
      pecas.matTerminal.dispose()
      pecas.matBase.dispose()
    },
    [pecas],
  )

  return pecas
}

/**
 * O material do corpo, um por DONO.
 *
 * A protagonista reaponta os mapas deste material no meio do giro para
 * virar palito (ver Battery). Compartilhado com o kit, aquela troca
 * arrastaria as quatro AA do kit junto.
 */
/**
 * A onda de carga que corre DENTRO do corpo.
 *
 * O cabo entrega a energia na porta e ela não pode evaporar ali: o cliente
 * leu exatamente isso como defeito, "o glow do led passando pelo cabo tira
 * todo o glow da pilha e parece mais um bug do que uma pilha carregando".
 *
 * A banda é um anel de luz que desce da porta ao polo negativo, com a
 * mesma cor e a mesma cabeça gaussiana do neon do cabo, para as duas
 * leiturem como UMA onda só atravessando duas peças.
 *
 * Ela é EMISSIVA e passa do limiar do Bloom, então o brilho sai da
 * geometria e ocupa o ar em volta — que é o "emanando o mesmo glow" do
 * pedido. Não é um decalque aceso na superfície.
 */
const CARGA = {
  /** Onde a porta fica no eixo local. Ver `yPorta` em Battery.tsx. */
  yPorta: 5.05 * (0.5 - 0.18 * 0.58),
  /** Base do corpo */
  yBase: -5.05 / 2,
  /**
   * Fechamento da gaussiana. Alto = anel fino.
   *
   * Esteve em 26, o que dá sigma de 0,139 unidade. O neon do cabo tem
   * sigma de 0,68 em unidades de mundo (0,0408 de uv vezes 16,65 de
   * traçado), ou seja a onda ENCOLHIA QUASE CINCO VEZES ao passar do cabo
   * para a célula. Junto com a desaceleração que havia no curso, era o que
   * o cliente sentiu como travada na passagem.
   *
   * Em 4,0 o sigma vai a 0,354: metade do caminho até o cabo. Igualar
   * exatamente os 0,68 acenderia mais de meia pilha de uma vez, o que
   * deixa de ser onda e vira a pilha inteira piscando. Metade do salto
   * some com o degrau visível e mantém a leitura de anel correndo.
   */
  aperto: 4,
  /**
   * Bem acima de 1: é a intensidade que alimenta o Bloom.
   *
   * Caiu de 4,2 para 2,0 junto com o alargamento. Luz total é pico vezes
   * largura, e a banda ficou 2,5 vezes mais larga: mantendo o pico, a
   * quantidade de luz dobraria e o beat viraria uma lavagem laranja.
   *
   * O alvo não é um número bonito, é a quantidade que o cliente já tinha
   * aprovado: 4,2 x 0,139 = 0,58. Aqui 2,0 x 0,354 = 0,71, um pouco acima
   * de propósito, porque banda larga se espalha e lê mais suave que a
   * conta sugere.
   */
  forca: 2,
}

export function useMaterialDoCorpo(
  mapas: MapasDaPilha,
  /**
   * Só a protagonista recebe a onda.
   *
   * As oito do kit usam o mesmo hook, e injetar o trecho de shader nelas
   * custaria instruções por fragmento em oito corpos para uma luz que
   * nunca acende ali: no beat do kit não há cabo nenhum.
   */
  comCarga = false,
): THREE.MeshPhysicalMaterial {
  const material = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      map: mapas.cor,
      roughnessMap: mapas.rugosidade,
      metalnessMap: mapas.metalico,
      normalMap: mapas.normal,
      // Com os mapas presentes, estes viram multiplicadores
      roughness: 1,
      metalness: 1,
      normalScale: ESCALA_NORMAL,
      clearcoat: VERNIZ.clearcoat,
      clearcoatRoughness: VERNIZ.clearcoatRoughness,
    })

    if (!comCarga) return m

    /**
     * Injetado no shader do próprio material, e não num segundo objeto.
     *
     * Uma casca transparente por cima do corpo traria ordenação de
     * profundidade e mais preenchimento numa cena que já é limitada por
     * isso. Aqui a luz nasce onde ela existiria: na superfície da célula.
     */
    const uniformes = {
      uCarga: { value: -1 },
      uCorCarga: { value: new THREE.Color('#FFA400') },
    }
    m.userData.uniformesDaCarga = uniformes

    m.onBeforeCompile = (shader) => {
      shader.uniforms.uCarga = uniformes.uCarga
      shader.uniforms.uCorCarga = uniformes.uCorCarga

      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vYLocal;')
        .replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nvYLocal = position.y;',
        )

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           varying float vYLocal;
           uniform float uCarga;
           uniform vec3 uCorCarga;`,
        )
        /**
         * Somado em `totalEmissiveRadiance`, que é o termo que o
         * MeshPhysical soma DEPOIS de toda a iluminação: assim a banda não
         * é sombreada nem escurecida pelo verniz, ela é luz própria.
         */
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
           if (uCarga >= 0.0) {
             float yOnda = ${CARGA.yPorta.toFixed(4)} + uCarga * (${CARGA.yBase.toFixed(4)} - ${CARGA.yPorta.toFixed(4)});
             float dOnda = vYLocal - yOnda;
             float banda = exp(-dOnda * dOnda * ${CARGA.aperto.toFixed(1)});
             totalEmissiveRadiance += uCorCarga * banda * ${CARGA.forca.toFixed(1)};
           }`,
        )
    }

    /**
     * Chave de cache PRÓPRIA.
     *
     * Sem isto o three reaproveita o programa de um MeshPhysicalMaterial
     * comum, com os mesmos mapas e as mesmas opções, e o trecho injetado
     * simplesmente não entra: o defeito aparece como "a onda não acende"
     * sem nenhum erro no console.
     */
    m.customProgramCacheKey = () => 'corpo-com-carga'

    return m
  }, [mapas, comCarga])

  useEffect(() => () => material.dispose(), [material])

  return material
}

export function BatteryMesh({
  pecas,
  corpo,
  corpoRef,
}: {
  pecas: PecasDaPilha
  corpo: THREE.Material
  /** Só a pilha protagonista precisa disto, para trocar de formato */
  corpoRef?: React.Ref<THREE.Mesh>
}) {
  const meia = pecas.comprimento / 2

  return (
    <>
      {/* Corpo: cilindro aberto com o rótulo planificado */}
      <mesh ref={corpoRef} castShadow geometry={pecas.corpo} material={corpo} />

      {/* Tampa superior */}
      <mesh
        position={[0, meia, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={pecas.tampa}
        material={pecas.matTampa}
      />

      {/* Terminal positivo: aço polido, medido na foto (ver TERMINAL) */}
      <mesh
        position={[0, meia + TERMINAL.altura / 2, 0]}
        geometry={pecas.terminal}
        material={pecas.matTerminal}
      />

      {/* Base (polo negativo) */}
      <mesh
        position={[0, -meia, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        geometry={pecas.base}
        material={pecas.matBase}
      />
    </>
  )
}
