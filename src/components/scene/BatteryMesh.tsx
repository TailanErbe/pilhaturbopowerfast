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
export function useMaterialDoCorpo(mapas: MapasDaPilha): THREE.MeshPhysicalMaterial {
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
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
      }),
    [mapas],
  )

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
