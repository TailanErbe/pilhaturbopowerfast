'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { AAA_SCALE, DIMENSIONS } from '@/data/products'
import {
  faixaEm,
  kitPresenca,
  LARGURA_RETRATO,
  poseAt,
  sceneState,
  variantEm,
} from '@/lib/scene-state'
import { asset } from '@/lib/site'
import { Cable } from './Cable'
import { BatteryMesh, useMaterialDoCorpo, usePecasDaPilha } from './BatteryMesh'
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

/**
 * O acerto do retrato: o produto fica com a altura que o texto não usa.
 *
 * A cena fica NA FRENTE do conteúdo no celular e não existe meio-termo
 * (ver SceneMount), então a diagramação é que separa os dois: o texto
 * encosta na base (`base-do-retrato`) e o produto ocupa a faixa de cima.
 *
 * Constante fixa não resolve. O texto tem altura em PIXELS, não em
 * porcentagem: o painel mais alto pede seus 400 px em qualquer aparelho.
 * Numa tela de 844 sobra bastante para o produto; numa de 640, com os
 * mesmos 400 px de texto e a pílula, sobra um quarto da tela. Um valor
 * calibrado na tela grande punha a pilha por cima do texto na pequena.
 *
 * Nem o mesmo teto para todos os beats resolve. O herói tem duas linhas
 * de título; o painel tem título, régua, destaque, descrição e fichas.
 * Calibrar pelo pior deixava a pilha colada no cabeçalho a viagem toda,
 * com meia tela vazia embaixo dela nos beats de texto curto.
 *
 * Então:
 *   TAMANHO   do beat mais apertado, e por isso constante. Um produto que
 *             cresce e encolhe a cada virada denuncia o truque.
 *   POSIÇÃO   do beat atual, medida no DOM (ver TetosDoRetrato). É o que
 *             faz o produto descer para o meio da tela onde há espaço.
 */
const RETRATO = {
  /**
   * Respiro entre a base do produto e a primeira linha de texto.
   *
   * Não é margem estética: a flutuação do respiro move o objeto cerca de
   * 2% da tela, o amortecimento chega ao alvo por aproximação, e as poses
   * dos painéis ainda somam 5% de escala por conta própria. Sem essa
   * reserva, os três juntos encostavam a base da pilha no título.
   *
   * Caiu de 0,08 para 0,04 quando a medida do vão passou a enxergar as
   * peças FIXAS da tela (ver `data-ocupa` em TetosDoRetrato). Metade
   * daquele valor era folga contra um desconhecido: a barra do herói
   * ocupava o pé da primeira tela e não entrava em conta nenhuma, então o
   * número precisava cobrir um erro que ninguém sabia medir.
   *
   * Medindo de verdade, 0,04 (34 px em 844) cobre com sobra os ~17 px do
   * respiro, e o produto recupera o tamanho: com 0,08 ele tinha caído para
   * 27% da altura da tela no herói do celular, contra os 42% de antes.
   */
  folga: 0.04,
  /** Respiro acima do produto, em fração da tela */
  margem: 0.045,
  /** Fração da tela que o produto ocuparia com escala 1, medida no retrato */
  fracaoCheia: 0.76,
  /** Piso: em tela muito baixa o produto encolhe, mas não some */
  minimo: 0.22,
  /** Palpite conservador enquanto a medida do DOM não chega */
  tetoPadrao: 0.42,
}


/**
 * Quanto o produto sobe dentro da faixa livre, no retrato.
 *
 * Fração da altura da tela. Centrado na faixa, ele ficava equidistante do
 * título acima e das linhas abaixo, e no herói isso lê como duas coisas
 * soltas em vez de um título anunciando um objeto. Subindo, ele encosta
 * na chamada e o respiro sobra do lado de baixo, que é onde o olho já
 * espera vazio.
 */
const SUBIDA_RETRATO = 0.045

/* Reaproveitados por quadro: projetar as pontas do eixo não pode alocar */
const PONTA_A = new THREE.Vector3()
const PONTA_B = new THREE.Vector3()

/**
 * A protagonista SAI DE CENA POR OPACIDADE na virada do kit.
 *
 * Ela sumia só por escala, com o argumento de que um objeto que encolhe
 * até virar outros lê como multiplicação. O argumento vale quando os dois
 * ocupam o mesmo ponto — e aqui não ocupam: a protagonista está no eixo
 * central e as oito nascem dentro da coluna esquerda do painel, que é uma
 * faixa medida no DOM. Encolhendo no lugar dela, ela virava uma pilha
 * pequena parada ao lado do kit, e a leitura era de três grupos de
 * pilhas, não de um virando outro.
 *
 * Então: ela apaga cedo, antes de o kit chegar à metade, e o que sobra é
 * um cruzamento limpo. Opacidade aqui é barata porque é UM corpo; no kit
 * continua sendo escala, que lá são oito corpos se cruzando e a
 * transparência custaria ordenação e preenchimento sem ganho de leitura.
 */
const SUMICO = {
  /** Fração da presença do kit em que a protagonista já está invisível */
  ate: 0.42,
  /** Encolhimento que acompanha o esmaecimento. Sutil: quem some é a tinta */
  encolhe: 0.35,
}

/**
 * `estatico`: movimento reduzido, uma foto por beat (ver CenaEstatica).
 *
 * Duas coisas mudam, e as duas são movimento que este componente inventa
 * por conta própria, sem o scroll pedir: o amortecimento, que faz o produto
 * VIAJAR até a pose, e o respiro, que o mantém flutuando parado. Sem elas
 * a pose é aplicada crua, no primeiro quadro, e a imagem congela idêntica
 * quadro a quadro — que é o que permite ao laço parar logo em seguida.
 */
export function Battery({ estatico = false }: { estatico?: boolean }) {
  const grupo = useRef<THREE.Group>(null)
  const corpo = useRef<THREE.Mesh>(null)
  /**
   * Só o CORPO, sem o cabo.
   *
   * O esmaecimento do kit percorre esta subárvore. O cabo é irmão dela
   * dentro do mesmo grupo e tem opacidade própria, escrita todo quadro
   * por Cable.tsx: incluí-lo aqui seria duas mãos escrevendo no mesmo
   * material, e a última a rodar ganharia.
   */
  const corpoDaPilha = useRef<THREE.Group>(null)
  /** Materiais dessa subárvore, colhidos uma vez */
  const materiais = useRef<THREE.Material[]>([])
  /** Último `transparent` aplicado: mudá-lo recompila o shader */
  const transparente = useRef(false)
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

  /**
   * As peças da protagonista, criadas uma vez.
   *
   * O material do corpo é DELA, não compartilhado com o kit: ela reaponta
   * os mapas dele no meio do giro para virar palito, e um material comum
   * arrastaria as quatro AA do kit junto na troca.
   */
  const pecas = usePecasDaPilha(raio, comprimento)
  /* `true`: só a protagonista recebe a onda de carga no shader */
  const corpoMaterial = useMaterialDoCorpo(mapasAA, true)

  useFrame(({ clock, camera, size }, delta) => {
    if (!grupo.current) return

    /**
     * A protagonista apaga conforme o kit toma a cena.
     *
     * `sumico` vai de 0 a 1 bem antes de o kit terminar de crescer, então
     * não existe momento com os dois inteiros na tela — que era o defeito:
     * a pilha ficava parada ao lado do conjunto, do outro lado do painel.
     */
    const kit = kitPresenca(sceneState.progress)
    const sumico = Math.min(1, kit / SUMICO.ate)
    const presenca = 1 - sumico
    grupo.current.visible = presenca > 0.002
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
     * volta ao centro no eixo horizontal.
     */
    const cam = camera as THREE.PerspectiveCamera
    const retrato = size.width < LARGURA_RETRATO
    const meiaAltura = Math.tan((cam.fov * Math.PI) / 360) * (cam.position.z - z)
    const meiaLargura = meiaAltura * (size.width / size.height)
    const fracao = retrato ? 0.5 : alvo.screenX
    const alvoX = (fracao * 2 - 1) * meiaLargura

    /**
     * Amortecimento: a pose vem do scroll, mas a chegada é suave.
     *
     * Parado, `chegar` devolve o alvo direto. Não dá para conseguir isso
     * com um lambda enorme: `damp` é lerp(a, b, 1 - e^(-λ·dt)), e num
     * quadro com dt = 0 — que acontece quando o laço acorda e desenha dois
     * quadros no mesmo instante — o fator zera e o produto não sai do
     * lugar. O atalho tem de ser explícito.
     */
    const s = 6
    const chegar = estatico
      ? (_atual: number, alvo: number) => alvo
      : (atual: number, alvo: number) => THREE.MathUtils.damp(atual, alvo, s, delta)

    g.position.x = chegar(g.position.x, alvoX)
    g.position.z = chegar(g.position.z, z)
    g.rotation.x = chegar(g.rotation.x, alvo.rotation[0])
    g.rotation.z = chegar(g.rotation.z, alvo.rotation[2])

    /**
     * Troca de formato, no meio do giro.
     *
     * Só reapontar os mapas do material: sem rebuild de geometria, sem
     * suspense, sem engasgo. A escala não uniforme (0,724 radial contra
     * 0,881 axial) é o que faz a AAA sair mais esguia em vez de uma AA
     * reduzida por igual.
     */
    /**
     * A onda de carga, entregue ao shader do corpo.
     *
     * Chega pelo REF da malha, e não pelo material que o hook devolveu: o
     * compilador do React proíbe mutar o retorno de um hook, e com razão.
     * É o mesmo caminho que a troca de mapas logo abaixo já usa, e o mesmo
     * motivo pelo qual o <SaidaDoAto> busca o elemento no DOM em vez de
     * partir do `gl`.
     *
     * Quem calcula a fase é o cabo, dono dela; aqui ela só é entregue.
     * Valor negativo apaga a banda, e é o que vale em todo beat sem cabo.
     */
    const uCarga = (
      corpo.current?.material as THREE.Material | undefined
    )?.userData?.uniformesDaCarga as
      | { uCarga: { value: number }; uCargaForca: { value: number } }
      | undefined
    if (uCarga) {
      uCarga.uCarga.value = sceneState.cargaNoCorpo
      uCarga.uCargaForca.value = sceneState.cargaForca
    }

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

    /**
     * TODO fator aplicado na saída precisa ser descontado na leitura.
     *
     * O amortecimento lê `g.scale.y` do quadro anterior para continuar de
     * onde parou. Se a saída multiplica por algo que a leitura não divide,
     * esse algo se acumula a cada quadro: o fator de retrato entrou como
     * 0,72 na saída e ficou de fora aqui, e em quatrocentos quadros a
     * pilha encolheu para 0,72^n, ou seja, sumiu da tela.
     */
    /**
     * A faixa que sobra para o produto, em fração da altura da tela.
     *
     * `faixaAqui` é a do beat ATUAL, e move o produto. `menorFaixa` é a do
     * beat mais apertado, e fixa o tamanho — assim o objeto não cresce e
     * encolhe a cada virada, que denunciaria o truque.
     *
     * A folga é descontada dos DOIS lados, porque agora o texto pode estar
     * de qualquer um deles: no herói ele fica acima do produto, nos demais
     * abaixo.
     */
    const faixas = sceneState.faixasDoRetrato
    const util = (f: { de: number; ate: number }) => {
      const de = f.de > 0 ? f.de + RETRATO.folga : RETRATO.margem
      const ate = f.ate < 1 ? f.ate - RETRATO.folga : 1 - RETRATO.margem
      return { de, ate: Math.max(de + RETRATO.minimo, ate) }
    }
    const faixaAqui = faixas
      ? util(faixaEm(sceneState.progress, faixas))
      : { de: RETRATO.margem, ate: RETRATO.tetoPadrao }
    /**
     * O TAMANHO acompanha a faixa DESTE beat, não a menor de todas.
     *
     * Era a menor, para o produto não crescer e encolher a cada virada. O
     * preço apareceu no celular: basta um beat apertado para encolher o
     * produto na página inteira, inclusive no herói, que é a tela em que
     * ele está sozinho e deveria ser o maior possível.
     *
     * A troca é segura porque a faixa é INTERPOLADA entre beats com a
     * mesma suavização das poses: o tamanho muda junto com a rolagem, no
     * mesmo ritmo do resto, e lê como o objeto se acomodando ao espaço —
     * não como um salto. O que denunciava o truque era o corte, não a
     * mudança.
     */
    const alturaNaTela = faixaAqui.ate - faixaAqui.de
    const retratoEscala = retrato ? alturaNaTela / RETRATO.fracaoCheia : 1
    /**
     * O encolhimento acompanha o esmaecimento, mas discreto: quem some é
     * a tinta. Encolher até zero era o que produzia a pilha minúscula
     * pousada ao lado do kit.
     */
    const fatorKit = 1 - sumico * SUMICO.encolhe
    const aplicados = axialAtual * fatorKit * retratoEscala
    const anterior = g.scale.y / aplicados
    const base = chegar(anterior, alvo.scale)
    const radial = formato.current === 'AAA' ? AAA_SCALE.radial : 1

    /**
     * A protagonista se dissolve enquanto as oito crescem.
     *
     * Some por ESCALA, não por opacidade: as oito nascem no mesmo ponto
     * onde ela está, e um objeto que encolhe até virar as outras lê como
     * multiplicação. Cortar de um quadro para o outro, ou apagar por
     * transparência, entregaria a troca de cena.
     */
    // Ver o comentário da subida, adiante: no retrato o produto cede
    // espaço ao texto encolhendo junto com a mudança de altura
    const restante = base * fatorKit * retratoEscala
    g.scale.set(restante * radial, restante * axialAtual, restante * radial)

    /**
     * O esmaecimento, escrito nos materiais do corpo.
     *
     * `transparent` só é tocado na TRANSIÇÃO: mudá-lo invalida o programa
     * do material e força recompilação de shader, que num scroll a 60 fps
     * apareceria como engasgo. Fora da virada do kit ele volta a false e o
     * caminho opaco é o de sempre.
     */
    if (!materiais.current.length && corpoDaPilha.current) {
      corpoDaPilha.current.traverse((o) => {
        const m = (o as THREE.Mesh).material
        if (!m) return
        const lista = Array.isArray(m) ? m : [m]
        /**
         * A MARCA é o que permite pré-compilar a variante alpha destes.
         *
         * Ligar `transparent` troca a chave de programa do material, e o
         * único lugar da página em que isso acontece é aqui, na virada do
         * kit — ou seja, o driver compila no pior instante possível. Quem
         * resolve é o <PreCompilar /> em Scene.tsx, e ele precisa saber
         * QUAIS materiais vão mudar de estado. Marcar no mesmo laço que os
         * empilha garante que o conjunto marcado seja, por construção,
         * exatamente o conjunto que a linha abaixo muta.
         */
        for (const mat of lista) mat.userData.esmaeceNoKit = true
        materiais.current.push(...lista)
      })
    }
    const querTransparente = presenca < 0.999
    if (querTransparente !== transparente.current) {
      transparente.current = querTransparente
      materiais.current.forEach((m) => {
        m.transparent = querTransparente
        m.needsUpdate = true
      })
    }
    if (querTransparente) {
      materiais.current.forEach((m) => { m.opacity = presenca })
    }

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
    // Parado, respiro nenhum: é movimento que a cena inventa sozinha, e
    // sem scroll pedindo ele seria a única coisa se mexendo na tela
    const t = estatico ? 0 : clock.elapsedTime
    const flutua = Math.sin(t * 0.55) * 0.14
    const balanca = Math.sin(t * 0.31) * 0.05

    /**
     * No retrato o produto SOBE e encolhe, para o texto ter onde morar.
     *
     * A cena fica na frente do conteúdo em qualquer largura (não há
     * meio-termo possível, ver SceneMount), então quem tem de sair do
     * caminho é a composição. Numa tela de 390 de largura a pilha
     * centralizada cobria a frase de destaque e metade da descrição, preto
     * sobre preto.
     *
     * Subindo para o terço superior e reduzindo para 72%, ela ocupa a
     * faixa que o texto não usa. É o mesmo arranjo da referência no
     * celular: produto em cima, texto embaixo, sem cruzamento.
     */
    /**
     * No retrato quem manda na vertical é a FAIXA, e só ela.
     *
     * O `position[0]` da pose desce o produto para o título caber acima
     * dele — e isso é acerto de DESKTOP, onde o título mora no topo e a
     * pose é a única alavanca. No retrato a faixa livre já resolve o
     * mesmo problema, e o deslocamento da pose entrava por cima: somados,
     * empurravam o produto para baixo do centro da faixa e abriam um vão
     * grande entre ele e o título.
     *
     * `SUBIDA_RETRATO` tira o produto do centro exato da faixa e o
     * aproxima do texto de cima. Centrado, ele fica equidistante das duas
     * pontas, e no herói isso lê como duas coisas soltas em vez de um
     * título anunciando um objeto.
     */
    /**
     * A subida é LIMITADA pela sobra da faixa, e não é um valor fixo.
     *
     * Ela é 4,5% da tela e o produto é apenas ~8% menor que a própria
     * faixa (a escala da pose), então sobram uns 4% ao todo, 2% de cada
     * lado. Subir 4,5% dentro disso empurra o topo do objeto para FORA da
     * faixa por cima.
     *
     * Nos painéis de celular isso era visível: a faixa livre começa no
     * topo da tela, a margem reservada ali é justamente 4,5%, e a subida
     * a cancelava por completo — a pilha encostava em y=0 e lia como
     * cortada pela borda. Aqui no herói o efeito era o oposto e igualmente
     * feio: colada no título em cima, com um vão morto sobre a barra.
     *
     * Limitando pela metade da sobra, ela sobe o quanto couber e nada
     * além. Em faixa folgada o gesto continua o mesmo; em faixa apertada
     * ele simplesmente não acontece, que é o certo — não há para onde ir.
     */
    const alturaVisivel = meiaAltura * 2
    const sobraDaFaixa = Math.max(0, alturaNaTela - alturaNaTela * alvo.scale)
    const subidaUtil = retrato ? Math.min(SUBIDA_RETRATO, sobraDaFaixa / 2) : 0
    const centroDaFaixa = (faixaAqui.de + faixaAqui.ate) / 2 - subidaUtil
    const subida = retrato ? alturaVisivel * (0.5 - centroDaFaixa) : 0
    const poseY = retrato ? 0 : alvo.position[0]

    g.position.y = chegar(g.position.y, poseY + flutua + subida)
    g.rotation.y = chegar(g.rotation.y, alvo.rotation[1] + balanca)

    /* A contraluz segue o sujeito; ver `centroDeMundo`. No beat do kit
       quem sobrescreve é o próprio kit, com o centro das duas ilhas. */
    sceneState.centroDeMundo = g.position.x

    /**
     * Publica a INCLINAÇÃO do produto na tela.
     *
     * É o que faz o AMBIENTE tombar junto com ele. Num cilindro vertical só
     * o que está na linha do horizonte vira realce; deitando o produto 38,6
     * graus no beat do contador, a fita de chave precisaria estar em -61,5
     * de elevação para espelhar nele, e ela não alcança. Girando
     * `environmentRotation.z` pelo mesmo ângulo, a exigência sobe para -37 e
     * o rasgo continua correndo o corpo inteiro (ver <ContraLuz />).
     *
     * O ângulo sai da geometria, não da pose: projetar as duas pontas do
     * eixo do corpo dá a direção real na tela, com rotação, perspectiva e
     * aspecto já embutidos. Derivar da pose exigiria refazer a projeção à
     * mão e daria outro número em toda tela de proporção diferente.
     *
     * Em graus e no sentido do CSS: `rotate()` positivo é horário, e o eixo
     * y da tela cresce para baixo, daí o sinal invertido em `dy`.
     */
    PONTA_A.set(0, comprimento / 2, 0).applyMatrix4(g.matrixWorld).project(cam)
    PONTA_B.set(0, -comprimento / 2, 0).applyMatrix4(g.matrixWorld).project(cam)
    const dx = (PONTA_A.x - PONTA_B.x) * (size.width / 2)
    const dy = -(PONTA_A.y - PONTA_B.y) * (size.height / 2)
    sceneState.inclinacaoNaTela = (Math.atan2(dx, -dy) * 180) / Math.PI

    /**
     * E publica o TAMANHO da silhueta, para quem precisa esconder algo atrás.
     *
     * Sai das MESMAS duas pontas já projetadas acima — nenhuma projeção nova,
     * custo zero. O comprimento do eixo na tela, dividido por dois, é a
     * meia-altura; a meia-largura vem da razão do modelo (raio sobre
     * meio-comprimento) aplicada a ela.
     *
     * Derivar a largura da razão em vez de projetar um terceiro ponto torna a
     * medida CONSERVADORA quando o corpo tomba em profundidade: o eixo
     * encurta na tela e a largura estimada encolhe junto, quando na verdade a
     * silhueta engorda. Conservador aqui é o lado seguro — dá um `kx` menor,
     * ou seja o joelho mais para dentro do corpo, que é onde ele tem de ficar.
     */
    const eixoEmMeiasAlturas = Math.hypot(dx, dy) / (size.height / 2)
    sceneState.meiaAlturaNaTela = eixoEmMeiasAlturas / 2
    sceneState.meiaLarguraNaTela =
      (sceneState.meiaAlturaNaTela * (raio * radial)) / ((comprimento / 2) * axialAtual)
    sceneState.subidaDoRetrato = subida
  })

  return (
    <>
      <group ref={grupo}>
        {/* Só o corpo: o esmaecimento da virada do kit percorre esta
            subárvore, e o cabo tem opacidade própria (ver corpoDaPilha) */}
        <group ref={corpoDaPilha}>
          <BatteryMesh pecas={pecas} corpo={corpoMaterial} corpoRef={corpo} />
        </group>

        {/* Cabo: filho do grupo da pilha para continuar plugado na porta
            mesmo enquanto o produto gira */}
        <Cable
          raio={raio}
          anguloPorta={ANGULO_PORTA}
          yPorta={yPorta}
          estatico={estatico}
        />

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
