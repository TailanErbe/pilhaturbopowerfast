'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sceneState } from '@/lib/scene-state'
import { CARGA_CHEIA, luzEm, misturaDaCarga } from '@/lib/luz'

/**
 * A BRASA — a fonte âmbar que a própria pilha tapa.
 *
 * ------------------------------------------------------------------
 * POR QUE ISTO EXISTE, DEPOIS DE TRÊS HALOS REPROVADOS
 * ------------------------------------------------------------------
 *
 * O cliente pediu, com a captura na mão, a luz amarela do beat do contador
 * "mais forte e irradiando para o resto da página" na primeira tela. O que
 * havia era `.parede-clara`: um gradiente de CSS quase branco, com pico de
 * 18,2 de 255, que MORRIA em 24,8vw e em 92,8vw. Ou seja, um terço da
 * largura da tela recebia zero, e a luz acabava DENTRO do quadro.
 *
 * E é aí que estava a leitura de "mancha", não no formato da elipse. No
 * beat do contador o fundo já não é preto (rgb 20,20,20), então a mesma luz
 * MODULA um piso e varia só 39% — não há para onde ela acabar, e o olho lê
 * iluminação. No herói ela caía a zero absoluto dentro do quadro, e queda a
 * zero dentro do quadro é contorno. Irradiar até a borda e não ler como
 * oval são, portanto, o MESMO requisito.
 *
 * ------------------------------------------------------------------
 * O QUE FAZ ISTO SER LUZ E NÃO ADESIVO
 * ------------------------------------------------------------------
 *
 * 1. OCLUSÃO PELO DEPTH BUFFER. O plano vive no mesmo z da contraluz e o
 *    corpo é opaco em z≈0, com `depthTest: true` e `depthWrite: false`.
 *    Cada fragmento atrás da silhueta é REJEITADO antes do shader. Nenhuma
 *    camada de CSS tem depth buffer — foi por isso que as três tentativas
 *    anteriores não tinham como funcionar, por melhor que fossem os
 *    números.
 *
 * 2. A FONTE VISÍVEL É A LUZ. O z, o centro e a janela de carga saem de
 *    `luzEm(p)` e de `misturaDaCarga(p)`, exatamente como a <ContraLuz />.
 *    A frase que matou o halo — "uma fonte laranja de meia tela depositando
 *    zero fótons" — deixa de ser possível por construção.
 *
 * 3. NÃO PERSEGUE. O centro é projetado dividindo pela meia-altura NA
 *    FONTE (z = −5,5), não na do produto (z ≈ 0). Isso dá paralaxe de 0,80:
 *    o produto DESLIZA sobre a própria luz quando se move. Adesivo andaria
 *    1,00, e é assim que se prova a diferença com um número.
 *
 * 4. NÃO FECHA DENTRO DO QUADRO. `(1+r²)^-0,75` é monótona e tem UMA
 *    inflexão, em r = 1/√(2p+1) = 0,6325. Com os `k` em fração da silhueta
 *    medida, essa inflexão cai a 0,66 da meia-largura do corpo — ou seja
 *    DENTRO da silhueta, onde é ocluída e nunca chega a ser rasterizada. O
 *    que sobra em quadro é só a saia monótona, cortada pela moldura.
 */

/** A borda do plano fica 6% FORA de quadro, sempre. Ver globals.css:279 */
const MARGEM = 1.06

/**
 * Frações da SILHUETA MEDIDA, não da tela.
 *
 * `KY_CIMA` é apertado pelo contraste do título; `KY_BAIXO`, pelas duas
 * linhas do rodapé do herói. A de baixo é a mais apertada das duas porque o
 * blending premultiplicado ESCURECE texto claro por (1−a), e "Role para
 * explorar" já vive perto do piso de 4,5:1.
 */
const KX = 1.05
const KY_CIMA = 0.45
const KY_BAIXO = 0.43

/**
 * `#FFA400` DECODIFICADO para linear e normalizado para luminância 1.
 *
 * Decodificado, e este é o erro que o levantamento pegou: o slot de saída de
 * um shader é LINEAR (o `<colorspace_fragment>` codifica depois), então usar
 * o triplete de 8 bits direto pinta a cor errada. Com (1; 0,643; 0) o pixel
 * saía rgb(62,49,0), razão R/G de 1,27 — oliva. Decodificado, sai rgb(72,43,0),
 * matiz 36,7° contra os 38,6° do laranja da marca.
 *
 * Normalizado para luminância 1 para que `uPico` signifique exatamente a
 * luminância escrita no framebuffer, que é o que os critérios medem.
 */
const AMBAR = [2.0916, 0.7765, 0.0] as const

const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

/*
 * ATENÇÃO: nada de crase dentro deste literal. Uma crase aqui já quebrou a
 * compilação deste projeto uma vez, com o erro apontando dezenas de linhas
 * abaixo do lugar de verdade.
 */
const frag = /* glsl */ `
uniform vec2 uMeia;    // meia-tela em meias-alturas, margem ja embutida
uniform vec2 uCentro;  // a fonte, projetada
uniform vec2 uEixo;    // (sen, cos) da inclinacao do corpo; trig feita em JS
uniform vec3 uK;       // (kx, kyCima, kyBaixo)
uniform vec3 uCor;
uniform float uPico;
varying vec2 vUv;

void main() {
  vec2 s = (vUv - 0.5) * 2.0 * uMeia - uCentro;

  // A elipse TOMBA com o corpo. Sem isto, no beat do contador o produto
  // deita 38,6 graus e o nucleo escapa pela lateral da silhueta: o joelho
  // sai de tras do corpo e vira contorno, que e o defeito que se evita.
  vec2 q = vec2(s.x * uEixo.y - s.y * uEixo.x, s.x * uEixo.x + s.y * uEixo.y);

  float ky = q.y > 0.0 ? uK.y : uK.z;
  float r2 = (q.x * q.x) / (uK.x * uK.x) + (q.y * q.y) / (ky * ky);

  gl_FragColor = vec4(uCor * (uPico * pow(1.0 + r2, -0.75)), 1.0);
  #include <colorspace_fragment>

  // Dither de meio nivel, e ele e OBRIGATORIO: o trecho mais chato da saia
  // anda de rgb 24 para 17 em cerca de 143 px, ou seja 20 px por degrau de 8
  // bits. Sem ruido, isso produz aneis concentricos -- exatamente o contorno
  // fechado que este componente inteiro existe para nao ter.
  gl_FragColor.rgb += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;

  // Premultiplicado VALIDO: rgb <= a em todo pixel. O truque classico de
  // alfa zero com blending aditivo e indefinido pela especificacao quando o
  // canvas e premultiplicado -- e este e (alpha:true sem
  // premultipliedAlpha:false). O beat afetado seria o heroi inteiro, no
  // aparelho de metade do trafego, sem aparecer em medicao nenhuma aqui.
  gl_FragColor.a = max(gl_FragColor.r, gl_FragColor.g);
}`

export function Brasa({ estatico }: { estatico: boolean }) {
  const malha = useRef<THREE.Mesh>(null)

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uMeia: { value: new THREE.Vector2(1, 1) },
          uCentro: { value: new THREE.Vector2(0, 0) },
          uEixo: { value: new THREE.Vector2(0, 1) },
          uK: { value: new THREE.Vector3(0.18, 0.26, 0.25) },
          uCor: { value: new THREE.Vector3(AMBAR[0], AMBAR[1], AMBAR[2]) },
          uPico: { value: 0 },
        },
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        /**
         * `depthTest` ligado é o componente inteiro; `depthWrite` desligado
         * porque a brasa não pode ocluir NADA — ela é o fundo.
         */
        depthTest: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        premultipliedAlpha: true,
        /**
         * Sem tone mapping, e não é descuido. O ACES do three esmaga o pé da
         * curva por 5×: linear 0,006 sairia em 3,5/255 em vez de 17,9/255, e
         * a saia inteira — que é justamente o que irradia até a borda —
         * simplesmente não existiria. Subir a intensidade para compensar
         * dessatura o topo para o branco e entrega âmbar pálido, que é o
         * oposto do pedido.
         */
        toneMapped: false,
        fog: false,
      }),
    [],
  )

  useFrame(({ camera, size }) => {
    const m = malha.current
    if (!m) return
    const u = (m.material as THREE.ShaderMaterial).uniforms
    const p = sceneState.progress
    const v = luzEm(p)
    const cam = camera as THREE.PerspectiveCamera

    /**
     * O z sai da TABELA, não de uma constante local.
     *
     * Se o z da contraluz mudar num beat, a brasa vai junto — a identidade
     * "a fonte visível É a luz" deixa de depender de alguém lembrar de
     * editar dois arquivos.
     */
    const z = v.parede.z
    const meia = Math.tan((cam.fov * Math.PI) / 360) * (cam.position.z - z)
    const meiaLarguraDaTela = meia * (size.width / size.height) * MARGEM
    const meiaAlturaDaTela = meia * MARGEM

    m.position.set(0, 0, z)
    m.scale.set(2 * meiaLarguraDaTela, 2 * meiaAlturaDaTela, 1)
    /* Derivado da própria escala: a MARGEM tem um dono só e não pode
       divergir entre o que se desenha e o que o shader acha que desenhou */
    u.uMeia.value.set(meiaLarguraDaTela / meia, meiaAlturaDaTela / meia)

    /**
     * A fonte projetada, dividida pela meia-altura NA FONTE.
     *
     * É daqui que sai a paralaxe de 0,80 (3,985/4,955): o produto desliza
     * sobre a própria luz. Dividir pela meia-altura do PRODUTO daria 1,00,
     * que é a assinatura do adesivo.
     */
    u.uCentro.value.set(
      sceneState.centroDeMundo / meia,
      (v.parede.y + sceneState.subidaDoRetrato) / meia,
    )

    const th = (sceneState.inclinacaoNaTela * Math.PI) / 180
    u.uEixo.value.set(Math.sin(th), Math.cos(th))

    const w = Math.max(0.02, sceneState.meiaLarguraNaTela)
    const h = Math.max(0.05, sceneState.meiaAlturaNaTela)
    u.uK.value.set(KX * w, KY_CIMA * h, KY_BAIXO * h)

    const pico =
      v.brasaPico + (CARGA_CHEIA.brasa - v.brasaPico) * misturaDaCarga(p)

    /**
     * `(1 − saidaDoAto)` é obrigatório.
     *
     * Passado o pin, o canvas sobe uma tela inteira. Um brilho de quadro
     * cheio dentro dele deixaria uma costura horizontal dura na base,
     * atravessando o impacto — a mesma classe de defeito da borda de caixa
     * que já apareceu no painel branco.
     */
    u.uPico.value = pico * (1 - Math.max(0, Math.min(1, sceneState.saidaDoAto)))
    m.visible = u.uPico.value > 0.0004
  })

  /**
   * Com movimento reduzido a brasa NÃO MONTA — não é "invisível", é
   * inexistente. Tirar uma malha não recompila shader nenhum: só contagem de
   * luzes e mapa de sombra são parâmetro de programa no three.
   */
  if (estatico) return null

  return (
    <mesh ref={malha} name="brasa" frustumCulled={false} material={material}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}
