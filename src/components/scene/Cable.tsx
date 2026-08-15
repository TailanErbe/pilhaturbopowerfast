'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { cabeSaida, sceneState } from '@/lib/scene-state'

/**
 * Cabo USB-C enrolado na pilha.
 *
 * Equivalente ao galho de videira da referência: cenário do hero que sai de
 * cena quando a narrativa começa. Só que aqui ele também ARGUMENTA — mostra
 * o produto sendo carregado, que é a promessa do site.
 *
 * Comportamentos:
 *   1. luz correndo POR TRÁS do cabo em direção à porta — a carga entrando;
 *   2. reage ao mouse sem scroll, girando em torno do plugue;
 *   3. some entre os beats 1 e 2, antes do close da porta USB-C.
 */

/** Ponto em coordenadas cilíndricas ao redor do eixo da pilha */
function emVolta(anguloBase: number, giro: number, raio: number, y: number) {
  const a = anguloBase + giro
  return new THREE.Vector3(Math.sin(a) * raio, y, Math.cos(a) * raio)
}

/** 1 unidade = 10 mm, mesma escala da pilha */
const MM = 0.1

/**
 * Medidas reais do plugue USB Tipo-C.
 *
 * O que define o Tipo-C é a seção em "estádio": retângulo com as duas pontas
 * totalmente arredondadas. Um bloco de cantos vivos não passa por Tipo-C.
 */
const TIPO_C = {
  casca: { largura: 8.25 * MM, altura: 2.4 * MM, profundidade: 6.5 * MM },
  /**
   * UMA peça só, como no cabo real.
   *
   * Houve uma tentativa de dividir o corpo em dois estágios para suavizar
   * a passagem até o cabo. O resultado foi pior: a junta entre os dois
   * blocos lia como DOIS conectores em série.
   */
  corpo: { largura: 8.4 * MM, altura: 4.8 * MM, profundidade: 14 * MM },
  cabo: { raio: 1.6 * MM },
}

/**
 * Acabamento do plugue.
 *
 * A casca do Tipo-C é PRATEADA — é o contraste dela com o corpo plástico
 * preto que identifica o conector. Houve uma versão escurecida, feita
 * quando o plugue estava superdimensionado e o metal dominava a cena; com
 * as medidas corretas e o limiar do bloom em 0,95, isso não se aplica mais.
 */
const ACABAMENTO = {
  casca: { color: '#c6c8cc', roughness: 0.3, metalness: 1 },
  corpo: { color: '#0b0b0b', roughness: 0.46, metalness: 0.05 },
  alivio: { color: '#090909', roughness: 0.62, metalness: 0.04 },
}

/** Seção em estádio, extrudada: a casca metálica do plugue */
function criarSecaoEstadio(largura: number, altura: number, profundidade: number, chanfro: number) {
  // O chanfro cresce para FORA, somando 2× em cada eixo. Sem descontar aqui,
  // a casca saía maior que a própria abertura da porta e a atravessava.
  const largBase = largura - chanfro * 2
  const altBase = altura - chanfro * 2
  const r = altBase / 2
  const meia = Math.max(0.0001, largBase / 2 - r)
  const forma = new THREE.Shape()
  forma.absarc(meia, 0, r, -Math.PI / 2, Math.PI / 2, false)
  forma.absarc(-meia, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false)
  return new THREE.ExtrudeGeometry(forma, {
    depth: profundidade - chanfro * 2,
    bevelEnabled: true,
    bevelSize: chanfro,
    bevelThickness: chanfro,
    bevelSegments: 2,
    curveSegments: 18,
  })
}

/** Corpo plástico: cantos arredondados, mas não em estádio */
function criarCorpoPlugue(largura: number, altura: number, profundidade: number) {
  const r = altura * 0.3
  const mx = largura / 2 - r
  const my = altura / 2 - r
  /**
   * O contorno precisa começar no INÍCIO da aresta inferior.
   *
   * A versão anterior partia do meio da aresta esquerda e ia direto para a
   * direita inferior, traçando uma diagonal por cima do canto. A
   * triangulação da extrusão respondia com uma cunha preta no meio da
   * peça, que parecia falha de renderização.
   */
  const forma = new THREE.Shape()
  forma.moveTo(-mx, -my - r)
  forma.lineTo(mx, -my - r)
  forma.absarc(mx, -my, r, -Math.PI / 2, 0, false)
  forma.lineTo(mx + r, my)
  forma.absarc(mx, my, r, 0, Math.PI / 2, false)
  forma.lineTo(-mx, my + r)
  forma.absarc(-mx, my, r, Math.PI / 2, Math.PI, false)
  forma.lineTo(-mx - r, -my)
  forma.absarc(-mx, -my, r, Math.PI, (3 * Math.PI) / 2, false)
  return new THREE.ExtrudeGeometry(forma, {
    depth: profundidade,
    bevelEnabled: true,
    bevelSize: r * 0.25,
    bevelThickness: r * 0.25,
    bevelSegments: 2,
    curveSegments: 12,
  })
}

/**
 * Onde a onda para, na foto do modo estático.
 *
 * Congelando num instante qualquer do relógio, o cabo saía com neon ou
 * sem neon a cada carregamento, na sorte — a primeira publicação pegou
 * justo um quadro apagado, com o cabo preto e sem argumento nenhum.
 *
 * O valor foi MEDIDO, varrendo o ciclo com o composer ligado, porque duas
 * coisas enganam a conta.
 *
 * A primeira é o enquadramento: a cabeça passa boa parte do ciclo dentro
 * do cabo, mas o cabo é muito mais comprido que o quadro, e no herói só o
 * último trecho antes do conector aparece. Até 0,6 a onda está fora de
 * quadro e o cabo lê apagado.
 *
 * A segunda é o Bloom. Quanto mais perto do conector, mais perto da
 * câmera, e a mesma cabeça cobre muito mais pixels: em 0,75 ela chega à
 * porta e a névoa toma o quadro inteiro, tingindo o fundo de âmbar e
 * lavando o contraste do próprio produto — num quadro que passa voando
 * isso nem se nota, mas esta imagem fica na tela.
 *
 * 0,70 é o meio: o traço percorre a parte visível, o halo fica contido no
 * cabo e o fundo continua preto atrás do título.
 */
const FLUXO_PARADO = 0.7

export function Cable({
  raio,
  anguloPorta,
  yPorta,
  estatico = false,
}: {
  raio: number
  anguloPorta: number
  yPorta: number
  /** Movimento reduzido: uma foto, com a onda num ponto escolhido */
  estatico?: boolean
}) {
  const grupo = useRef<THREE.Group>(null)
  /**
   * Tudo que muda por quadro é alcançado pelos MESHES, não pelo retorno do
   * useMemo: o compilador do React trata valores memoizados como imutáveis e
   * proíbe ler `ref.current` durante a renderização. Os uniforms ficam
   * pendurados em `material.userData` para o useFrame achá-los.
   */
  const tubo = useRef<THREE.Mesh>(null)
  /** Envolve cabo E plugue: os dois deixam a porta juntos */
  const conjunto = useRef<THREE.Group>(null)

  const {
    geometria,
    material,
    geometriaBrilho,
    materialBrilho,
    cascaTipoC,
    corpoPlugue,
    pontoPivo,
  } = useMemo(() => {
    // O cabo começa DEPOIS do plugue: casca + corpo + alívio somam ~2,5
    // unidades para fora da superfície.
    /**
     * O cabo nasce NA BOCA do alívio de tração, não dentro dele.
     *
     * O pivô do parallax é justamente este primeiro ponto. Nascendo a 26 mm
     * — dentro da peça, que vai até 28,5 — o trecho interno varria por
     * dentro do alívio ao girar e aparecia atravessando o conector.
     *
     * A 28 mm o pivô cai praticamente na saída da peça: o começo do cabo
     * fica cravado ali e só o resto balança, que é onde um cabo real
     * flexiona.
     */
    const saida = raio + 2.1 * MM * 10

    /**
     * A ponta some FORA DE QUADRO.
     *
     * Antes o cabo terminava no meio da tela, com a extremidade à mostra —
     * lia como pedaço cortado, não como cabo saindo de cena. Os últimos
     * pontos vão muito além da borda para que nem o parallax revele o fim.
     */
    /**
     * SAÍDA AXIAL do conector.
     *
     * Um cabo deixa o plugue seguindo o eixo dele e só depois curva — não
     * dobra na saída. Antes havia só dois pontos colados perto do plugue e
     * o terceiro saltava quase 1 rad de ângulo: a Catmull-Rom respondia com
     * uma quina logo na boca do conector, que era o aspecto errado.
     *
     * Estes três pontos alinhados garantem o trecho reto; a curvatura só
     * começa depois de o cabo ter saído de vez.
     */
    /**
     * DRAPEADO, não enrolado.
     *
     * As versões anteriores davam quase duas voltas completas em torno da
     * pilha — um saca-rolhas. O galho da referência se enrola porque galho
     * é assim; cabo não. Cabo sai do plugue e CAI, descrevendo um arco cada
     * vez mais aberto conforme a gravidade domina.
     *
     * Por isso agora: giro total de ~1,2 rad (não 6,9), raio sempre
     * crescendo e altura sempre descendo. Sem vai e volta, sem zigue-zague.
     */
    /**
     * CURTO E FROUXO, não comprido e esticado.
     *
     * O cabo da caixa é curto, e o traçado anterior o esticava até 26
     * unidades (26 cm) numa varredura quase reta atravessando a tela. Duas
     * coisas erradas de uma vez: comprimento que o objeto real não tem, e
     * uma curva TENSA, que é como se desenha corda puxada, não cabo solto.
     *
     * O alcance caiu para menos da metade e a queda por unidade de avanço
     * subiu: o arco fecha mais cedo e mais fundo, que é o que faz ler como
     * peça flexível pousando, e não como fio esticado entre dois pontos.
     */
    const pontos = [
      // Reto ao sair do plugue — cabo deixa o conector pelo eixo dele
      emVolta(anguloPorta, 0, saida, yPorta),
      emVolta(anguloPorta, 0, saida + 0.4, yPorta - 0.04),

      // A gravidade começa a vencer, e vence mais rápido que antes
      emVolta(anguloPorta, 0.16, saida + 1.05, yPorta - 0.62),
      emVolta(anguloPorta, 0.38, saida + 1.95, yPorta - 1.85),
      emVolta(anguloPorta, 0.62, saida + 2.85, yPorta - 3.3),
      emVolta(anguloPorta, 0.86, saida + 4.1, yPorta - 5.1),

      // Cai para fora de quadro
      emVolta(anguloPorta, 1.02, saida + 6.4, yPorta - 7.2),
      /**
       * O último ponto ainda sai de quadro, mas por pouco.
       *
       * Ele existe só para a ponta não aparecer cortada; não é cabo à
       * mostra. Antes ia a 26 unidades, o que garantia isso com folga
       * enorme e, de brinde, um fio atravessando a tela inteira.
       */
      emVolta(anguloPorta, 1.14, saida + 10.5, yPorta - 10.2),
    ]

    /**
     * Parametrização CENTRÍPETA.
     *
     * A uniforme ('catmullrom') produz cúspides e laços quando os pontos
     * têm espaçamento desigual — que é exatamente a torção que aparecia.
     * A centrípeta é provada como livre de cúspides e auto-interseções.
     */
    const curva = new THREE.CatmullRomCurve3(pontos, false, 'centripetal')
    // Raio em medida real, não proporcional à pilha: o mesmo cabo acompanha
    // AA e AAA, então não pode encolher junto com o produto.
    const geo = new THREE.TubeGeometry(curva, 260, TIPO_C.cabo.raio, 14, false)

    // Pivô no plugue: rotacionar em torno dele mantém a ponta encaixada e
    // faz apenas a parte solta balançar, como um cabo realmente se comporta.
    const pivo = pontos[0].clone()
    geo.translate(-pivo.x, -pivo.y, -pivo.z)

    const mat = new THREE.MeshStandardMaterial({
      // Cabo PRETO PURO, sem emissivo. Toda tentativa de acender o próprio
      // cabo pintava luz NA superfície, e isso lê como líquido por dentro.
      color: '#080808',
      roughness: 0.52,
      metalness: 0.18,
      transparent: true,
    })

    const uniformes = {
      uFluxo: { value: 0 },
      uPresenca: { value: 1 },
      // Laranja da marca. Uma tentativa em amarelo se afastou da identidade.
      uCor: { value: new THREE.Color('#FFA400') },
    }
    mat.userData.uniformes = uniformes

    /**
     * A luz que vem DE TRÁS.
     *
     * Um tubo um pouco mais gordo, desenhado apenas na face DE TRÁS
     * (`BackSide`). Essa parede fica atrás do cabo; o cabo preto tapa o
     * miolo e sobra um contorno de luz escapando pelas bordas.
     *
     * `FrontSide` aqui seria o erro clássico: como o tubo maior envolve o
     * menor, sua face frontal fica sempre à frente e esconderia o cabo
     * inteiro, virando aquela manga grossa e opaca.
     */
    /**
     * O NÚCLEO aceso tem 1 mm. Só isso.
     *
     * A névoa larga que se vê em volta de um neon não é geometria — é
     * DISPERSÃO, e quem faz isso é o bloom. Tentar produzi-la com um tubo
     * gordo (chegou a 3,8 mm de faixa) só engorda a forma sólida e devolve
     * o aspecto de pintura.
     *
     * Casca fina = brilho definido. Bloom = a luz que vaza para o ambiente.
     */
    const NUCLEO = 0.35 * MM
    const geoBrilho = new THREE.TubeGeometry(curva, 320, TIPO_C.cabo.raio + NUCLEO, 16, false)
    geoBrilho.translate(-pivo.x, -pivo.y, -pivo.z)

    const matBrilho = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      // NÃO escreve profundidade: só testa. Assim o cabo (desenhado antes,
      // opaco) tapa o miolo, e a pilha oculta o brilho quando o cabo passa
      // atrás dela — sem que o brilho tape nada por conta própria.
      depthWrite: false,
      depthTest: true,
      // Aditivo: soma luz ao fundo em vez de recortar uma forma. É o que
      // elimina a borda dura, que era o aspecto de "pintura".
      blending: THREE.AdditiveBlending,
      uniforms: uniformes,
      vertexShader: `
        varying float vAoLongo;
        varying vec3 vNormalVista;
        varying vec3 vDirVista;
        void main() {
          vAoLongo = uv.x;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormalVista = normalize(normalMatrix * normal);
          vDirVista = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uFluxo;
        uniform float uPresenca;
        uniform vec3 uCor;
        varying float vAoLongo;
        varying vec3 vNormalVista;
        varying vec3 vDirVista;
        void main() {
          /**
           * Queda gradual até ZERO na borda externa.
           *
           * Um tubo sólido de cor constante tem silhueta dura, e borda dura
           * lê como pintura, não como luz. Aqui a intensidade acompanha
           * quanto volume de brilho a linha de visão atravessa: muito perto
           * do cabo, nada na borda externa.
           *
           * É o INVERSO do Fresnel — que concentra na borda e foi o que
           * criou a faixa marcada antes.
           */
          float k = abs(dot(normalize(vNormalVista), normalize(vDirVista)));
          float queda = pow(k, 1.15);

          /**
           * SEM brilho fixo.
           *
           * Um termo constante acendia o cabo inteiro o tempo todo e criava
           * aquele contorno permanente — que lê como borda pintada, não
           * como energia. A luz só existe onde a onda está passando.
           *
           * A onda tem cabeça e cauda, como um cometa: a cabeça é o ponto
           * de carga e a cauda é o rastro que ela deixa. É o que dá a
           * sensação de fluxo em vez de um ponto isolado correndo.
           *
           * O cabo é ABERTO, não um anel.
           *
           * A versão anterior somava um termo de continuidade circular para
           * o pulso não pipocar ao dar a volta. Só que isso tratava as duas
           * pontas como vizinhas: com a onda no conector, a base acendia
           * junto.
           *
           * Agora a cabeça tem UMA posição só, correndo da base (u = 1)
           * para o conector (u = 0), e nada mais acende.
           */
          /**
           * A cabeça percorre de 1,2 até -0,25 — ou seja, ENTRA no conector
           * e segue além dele. Isso resolve o corte seco: antes a onda era
           * apagada por um smoothstep bem no fim do trajeto, morrendo por
           * decreto. Agora, quando a cabeça já saiu do cabo, o que resta é
           * a cauda escoando sozinha até zerar — o fim vira consequência.
           *
           * O trecho acima de 1,0 é o intervalo entre uma onda e a próxima:
           * a cabeça ainda não entrou no cabo e nada acende.
           */
          float pos = 1.2 - fract(uFluxo) * 1.45;
          float d = vAoLongo - pos;

          /**
           * SÓ a cabeça. Sem rastro.
           *
           * Uma cauda foi adicionada antes para dar sensação de fluxo, mas
           * ela deixava uma linha acesa atrás da onda — e essa linha, por
           * ser contínua, voltava a ler como contorno pintado no cabo.
           * O movimento sozinho já entrega o fluxo.
           *
           * Expoente alto = LINHA fina. A largura visível do neon vem daqui,
           * não da espessura da casca.
           */
          float onda = exp(-d * d * 300.0);

          // Bem acima de 1: com o núcleo fino, é a INTENSIDADE que alimenta
          // o bloom e gera a névoa em volta.
          // Com o núcleo tão fino, a intensidade é o que alimenta o bloom.
          // O tamanho do halo se controla LÁ, não engordando esta casca.
          float energia = onda * 26.0 * queda * uPresenca;
          gl_FragColor = vec4(uCor * energia, 1.0);
        }
      `,
    })

    const casca = criarSecaoEstadio(
      TIPO_C.casca.largura,
      TIPO_C.casca.altura,
      TIPO_C.casca.profundidade,
      TIPO_C.casca.altura * 0.12,
    )
    const corpo = criarCorpoPlugue(
      TIPO_C.corpo.largura,
      TIPO_C.corpo.altura,
      TIPO_C.corpo.profundidade,
    )

    return {
      geometria: geo,
      material: mat,
      geometriaBrilho: geoBrilho,
      materialBrilho: matBrilho,
      cascaTipoC: casca,
      corpoPlugue: corpo,
      pontoPivo: pivo,
    }
  }, [raio, anguloPorta, yPorta])

  useFrame(({ clock }, delta) => {
    const saida = cabeSaida(sceneState.progress)
    const mat = tubo.current?.material as THREE.MeshStandardMaterial | undefined
    if (mat) mat.opacity = saida.opacidade

    // Cabo e brilho compartilham os mesmos objetos de uniform, então
    // escrever num deles já move o outro junto.
    const u = mat?.userData?.uniformes as
      | { uFluxo: { value: number }; uPresenca: { value: number } }
      | undefined
    if (u) {
      u.uPresenca.value = saida.opacidade
      // A onda só corre enquanto está PLUGADO. Desconectado não há mais
      // carga entrando, e manter o neon aceso contaria uma mentira.
      if (saida.conectado) {
        u.uFluxo.value = estatico ? FLUXO_PARADO : (clock.elapsedTime * 0.28) % 1
      }
    }

    /**
     * A desconexão: recua pelo eixo da porta, cede pela gravidade e
     * desliza para fora. Cabo e plugue viajam JUNTOS, por isso ambos
     * vivem dentro deste grupo.
     */
    const c = conjunto.current
    if (c) {
      c.visible = saida.opacidade > 0.01
      const fx = Math.sin(anguloPorta)
      const fz = Math.cos(anguloPorta)
      const avanco = saida.recuo + saida.deslize
      c.position.set(fx * avanco, -saida.queda, fz * avanco)
      // Tomba conforme se solta, como peça que perdeu apoio
      c.rotation.z = -saida.queda * 0.12
    }

    if (!grupo.current) return

    /**
     * Parallax SÓ no cabo, girando em torno do plugue. A geometria foi
     * transladada para o pivô ficar ali, então a ponta encaixada não se
     * mexe e apenas a parte solta balança.
     */
    const p = sceneState.pointer
    const g = grupo.current
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, p.x * 0.07, 3, delta)
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, p.y * 0.05, 3, delta)
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, -p.x * 0.03, 3, delta)
  })

  return (
    /**
     * Grupo do CONJUNTO: cabo e plugue juntos.
     *
     * A desconexão move os dois como uma peça só — plugue puxando, cabo
     * seguindo. O parallax continua atuando apenas no cabo, num grupo
     * interno, para o conector não se soltar da porta enquanto ainda
     * está encaixado.
     */
    <group ref={conjunto}>
      {/* Só o CABO recebe o parallax. O conector fica fora deste grupo:
          está encaixado na porta e não pode se mexer, senão desencaixa. */}
      <group ref={grupo} position={pontoPivo}>
        {/* Ordem importa: o cabo OPACO primeiro, escrevendo profundidade.
            O brilho vem depois, só testando profundidade — assim o cabo
            tapa o miolo e sobra a luz escapando pelas bordas. */}
        <mesh ref={tubo} geometry={geometria} material={material} renderOrder={0} />
        <mesh geometry={geometriaBrilho} material={materialBrilho} renderOrder={2} />
      </group>

      {/* Plugue Tipo-C encaixado na porta. A geometria é extrudada no eixo
          +Z local, então o grupo é girado para +Z apontar para FORA. */}
      <group
        position={[Math.sin(anguloPorta) * raio, yPorta, Math.cos(anguloPorta) * raio]}
        rotation={[0, anguloPorta, 0]}
      >
        {/**
         * Casca metálica INTEIRAMENTE dentro da pilha.
         *
         * Plugue encaixado esconde a casca por completo — é assim no
         * produto real. Antes só 2 dos 6,5 mm entravam (31%) e a maior
         * parte do metal ficava exposta, como um encaixe pela metade.
         *
         * Ficar escondida não a torna inútil: é justamente ela que EMERGE
         * durante a desconexão do beat 2, quando o plugue recua 11 mm.
         * A casca é a prova visual de que o cabo estava conectado.
         *
         * A traseira dela ENCOSTA na face frontal do corpo (z = 1,4 mm).
         * Ancorando em 0 sobrava um vão de 1,4 mm entre as duas peças, e ao
         * desplugar a casca aparecia solta, flutuando à frente do plugue.
         */}
        <mesh
          geometry={cascaTipoC}
          position={[0, 0, 1.4 * MM - TIPO_C.casca.profundidade]}
        >
          <meshStandardMaterial {...ACABAMENTO.casca} transparent />
        </mesh>

        {/**
         * Corpo encostando na superfície.
         *
         * A face dele é PLANA e a da pilha é CURVA: para 8,4 mm de largura
         * num diâmetro de 14,5 mm, a flecha é 1,34 mm. A 1,4 mm o corpo
         * toca o ponto mais alto da curva sem que os cantos afundem.
         */}
        <mesh geometry={corpoPlugue} position={[0, 0, 1.4 * MM]}>
          <meshStandardMaterial {...ACABAMENTO.corpo} transparent />
        </mesh>

        {/**
         * Alívio de tração: encosta no corpo partindo da meia-altura dele e
         * fecha na bitola do cabo.
         *
         * Girado em X: o `radiusTop` do cilindro aponta para +Z, ou seja,
         * para o lado do cabo — por isso é ele o extremo estreito.
         */}
        <mesh position={[0, 0, 18.4 * MM]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry
            args={[TIPO_C.cabo.raio * 1.03, TIPO_C.corpo.altura / 2, 6 * MM, 28]}
          />
          <meshStandardMaterial {...ACABAMENTO.alivio} transparent />
        </mesh>
      </group>
    </group>
  )
}
