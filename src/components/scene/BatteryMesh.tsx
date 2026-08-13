'use client'

import * as THREE from 'three'

/**
 * A pilha como MALHA pura: sem pose, sem estado, sem scroll.
 *
 * Extraído para o kit poder instanciar oito cópias sem arrastar junto a
 * lógica de progresso, que pertence a uma única pilha protagonista.
 *
 * Os materiais chegam prontos de fora e são COMPARTILHADOS entre as
 * instâncias: oito cópias de quatro mapas de 2048px cada estourariam a
 * memória de textura sem necessidade nenhuma.
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
const TERMINAL = { raio: 2.9 * MM, altura: 1.1 * MM }

export function BatteryMesh({
  raio,
  comprimento,
  mapas,
  corpoRef,
}: {
  raio: number
  comprimento: number
  mapas: MapasDaPilha
  /** Só a pilha protagonista precisa disto, para trocar de formato */
  corpoRef?: React.Ref<THREE.Mesh>
}) {
  return (
    <>
      {/* Corpo: cilindro aberto com o rótulo planificado */}
      <mesh ref={corpoRef} castShadow>
        <cylinderGeometry args={[raio, raio, comprimento, 128, 1, true]} />
        <meshStandardMaterial
          map={mapas.cor}
          roughnessMap={mapas.rugosidade}
          metalnessMap={mapas.metalico}
          normalMap={mapas.normal}
          // Com os mapas presentes, estes viram multiplicadores
          roughness={1}
          metalness={1}
          normalScale={ESCALA_NORMAL}
        />
      </mesh>

      {/* Tampa superior, na cor da faixa */}
      <mesh position={[0, comprimento / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[raio, 96]} />
        <meshStandardMaterial color="#ffa400" roughness={0.55} metalness={0.1} />
      </mesh>

      {/* Terminal positivo */}
      <mesh position={[0, comprimento / 2 + TERMINAL.altura / 2, 0]}>
        <cylinderGeometry args={[TERMINAL.raio, TERMINAL.raio, TERMINAL.altura, 48]} />
        <meshStandardMaterial color="#cfcfcf" roughness={0.28} metalness={0.95} />
      </mesh>

      {/* Base (polo negativo) */}
      <mesh position={[0, -comprimento / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[raio, 96]} />
        <meshStandardMaterial color="#111111" roughness={0.6} metalness={0.4} />
      </mesh>
    </>
  )
}
