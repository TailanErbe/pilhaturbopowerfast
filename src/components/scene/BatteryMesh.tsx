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
 * que se vê na foto. Custo: um ramo a mais no shader de um objeto que
 * ocupa um terço da tela, contra a cena inteira já limitada pelo Bloom.
 */
const VERNIZ = { clearcoat: 0.62, clearcoatRoughness: 0.28 }

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
        <meshPhysicalMaterial
          map={mapas.cor}
          roughnessMap={mapas.rugosidade}
          metalnessMap={mapas.metalico}
          normalMap={mapas.normal}
          // Com os mapas presentes, estes viram multiplicadores
          roughness={1}
          metalness={1}
          normalScale={ESCALA_NORMAL}
          clearcoat={VERNIZ.clearcoat}
          clearcoatRoughness={VERNIZ.clearcoatRoughness}
        />
      </mesh>

      {/**
       * Tampa superior.
       *
       * A cor vem da FOTO, não do token da marca: rgb(240,154,7). O
       * `--brand-orange` do site é #FFA400, e usá-lo aqui deixava a tampa
       * mais clara e mais amarela que a faixa impressa logo abaixo dela,
       * num ponto em que as duas se encostam e a diferença aparece.
       *
       * Envernizada como o rótulo: é a mesma peça dobrada por cima.
       */}
      <mesh position={[0, comprimento / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[raio, 96]} />
        <meshPhysicalMaterial
          color="#f09a07"
          roughness={0.5}
          metalness={0.05}
          clearcoat={VERNIZ.clearcoat}
          clearcoatRoughness={VERNIZ.clearcoatRoughness}
        />
      </mesh>

      {/* Terminal positivo: aço polido, medido na foto (ver TERMINAL) */}
      <mesh position={[0, comprimento / 2 + TERMINAL.altura / 2, 0]}>
        <cylinderGeometry args={[TERMINAL.raio, TERMINAL.raio, TERMINAL.altura, 48]} />
        <meshStandardMaterial color={TERMINAL.cor} roughness={0.22} metalness={0.95} />
      </mesh>

      {/**
       * Base (polo negativo).
       *
       * Não é preto puro: nenhum objeto real é. O preto absoluto some
       * contra o fundo da página, que também é escuro, e a pilha perde a
       * ponta de baixo — a silhueta termina no ar.
       */}
      <mesh position={[0, -comprimento / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[raio, 96]} />
        <meshStandardMaterial color="#22242a" roughness={0.55} metalness={0.45} />
      </mesh>
    </>
  )
}
