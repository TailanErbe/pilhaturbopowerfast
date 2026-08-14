# REGRAS DO PROJETO — Landing Page "Pilha Recarregável"

> Documento-bíblia. Toda decisão de código, motion e design passa por aqui.
> Referência a ser replicada em padrão e qualidade: **https://klimtwine.com/en**
> Última atualização: 13/08/2026

---

## Índice

1. [Objetivo](#1-objetivo)
2. [Engenharia reversa da referência](#2-engenharia-reversa-da-referência)
3. [Mapa de tradução: Vinho → Pilha](#3-mapa-de-tradução-vinho--pilha)
4. [Stack que vamos usar](#4-stack-que-vamos-usar)
5. [Design System](#5-design-system) — *paleta, tipografia e regras do manual Gshield*
6. [As 12 Regras de Ouro](#6-as-12-regras-de-ouro)
7. [Storyboard do scrollytelling](#7-storyboard-do-scrollytelling)
8. [Sprints](#8-sprints)
9. [O que preciso de você](#9-o-que-preciso-de-você)

---

## 1. Objetivo

Construir uma landing page de produto único (pilha recarregável) com **narrativa 100% conduzida por scroll** (scrollytelling), com um objeto 3D real como protagonista contínuo da tela, no mesmo nível de acabamento da referência.

**O critério de sucesso não é "parecer com o site".** É reproduzir os quatro pilares que fazem ele funcionar:

| Pilar | O que significa |
|---|---|
| **Continuidade** | O produto 3D nunca "corta". Ele é um só objeto que atravessa a página inteira, girando e reposicionando. Não existe corte de cena. |
| **Scrub total** | Nada é animado "ao entrar na viewport". Tudo é ligado à posição exata do scroll — rolar para trás desfaz a animação com precisão. |
| **Silêncio visual** | Poucos elementos por tela. Muito espaço vazio. Uma ideia por beat. |
| **Peso do scroll** | O scroll é lento e amortecido de propósito. A página tem ~19 alturas de tela para ~7 ideias. |

---

## 2. Engenharia reversa da referência

Tudo abaixo foi medido diretamente no site em produção (viewport 1280×720), não é suposição.

### 2.1 Stack detectada

| Camada | Tecnologia | Evidência |
|---|---|---|
| Framework | **Next.js** (App Router, Turbopack) | `/_next/static/chunks/turbopack-*.js` |
| CSS | **Panda CSS** (atômico + tokens) | classes `pos_absolute`, `min-h_100dvh`, var `--made-with-panda` |
| Animação | **GSAP 3.15.0** | global `gsapVersions: ["3.15.0"]` |
| Plugins GSAP | **ScrollTrigger, SplitText, Flip, Observer, CustomEase** | strings encontradas nos chunks |
| 3D | **Three.js r184** + **@react-three/fiber** | global `__THREE__: "184"` |
| Compressão 3D | **DRACOLoader** + **KTX2Loader** | `/draco/draco_decoder.wasm` carregado no boot |
| Scroll | **smooth-scrollbar** (idiotWu) | atributos `data-scrollbar`, `data-transform-scroll-wrapper`, div `.scroll-content` |
| CMS | **Strapi** headless | `https://cms.klimtwine.com/uploads/...` |
| Tipografia | ABC Monument Grotesk (texto) + Canela Thin (display) | `@font-face` em `.woff2` |

**Assets 3D reais do site:**
```
/3d/new_bottle-draco.glb     ← o produto (garrafa), comprimido com Draco
/3d/branch/branch_v1.glb     ← o galho de videira do hero
/3d/Light_512.hdr            ← environment map custom (512px) para o vidro
```

### 2.2 A descoberta mais importante: o scroll é falso

O `<body>` tem `overflow: hidden` e `document.scrollHeight === window.innerHeight`. **A página não rola nativamente.** Existe um wrapper que captura o wheel/touch e translada um `.scroll-content` de 13.744px via `transform: translate3d()`, com scrollbar customizada desenhada em DOM.

Isso é o que dá o "peso" característico do scroll — e é o que a maioria das cópias erra.

### 2.3 Arquitetura de pin — o coração do site

O `<main>` tem **13.744px** de altura e apenas **3 filhos**:

```
main (13.744px)
├── .pin-spacer-wine-transform-scroll-timeline   → 11.762px  (85,6% do site!)
│   └── [elemento pinado, 100dvh]
│       ├── canvas WebGL (o produto 3D, camada z-3/z-9)
│       ├── camada de hotspots (6 botões invisíveis)
│       ├── pill "Our Wines" (fixo no rodapé da cena)
│       ├── section#hero
│       └── painéis de produto 01 / 02 / 03
├── .pin-spacer-carousel-motion                  →    720px
│   └── section#heritage
└── div (buy + contacts)                          →  1.986px
```

**Leia de novo: 85,6% da página inteira é UMA seção pinada.** Hero, transição de marca e os três produtos vivem todos dentro de um único elemento travado na tela por ~11.000px de scroll, com uma única timeline GSAP.

Não são 5 seções com 5 ScrollTriggers. É **1 ScrollTrigger com scrub, e uma timeline mestre com labels.**

### 2.4 Design tokens extraídos

```css
/* Cores */
--colors-background:   #cfc6bd;  /* areia acinzentada — cor base do site */
--colors-sand:         #f3f0eb;  /* texto sobre fundo escuro */
--colors-brown:        #191714;  /* "preto" da marca — nunca #000 */
--colors-green:        #a4a473;  /* acento produto 01 */
--colors-light-yellow: #e1d6a2;
--colors-yellow:       #a08921;
--colors-red:          #670000;
--colors-white:        #fff;

/* Breakpoints */
sm: 768px   md: 1024px   lg: 1440px   xl: 1920px

/* Espaçamento */
--spacing-grid:    20px;
--spacing-gutter:  clamp(16px, 4vw, 48px);
--spacing-section: clamp(56px, 10vw, 144px);
--spacing-panel:   24px;

/* Tipografia */
--line-heights-heading:      100%;   /* display colado */
--line-heights-heading-body: 110%;
--line-heights-subtitle:     120%;
--line-heights-body:         140%;

/* Tamanhos */
--sizes-viewport:   100dvh;          /* dvh, nunca vh */
--sizes-scene-min:  clamp(320px, 52vw, 620px);
--z-index-header:   20;
--z-index-modal:    50;
```

**Observações que valem ouro:**
- O preto é `#191714` (marrom quase-preto), o branco é `#f3f0eb`. **Zero preto puro, zero branco puro.** É isso que dá a sensação de material/impresso.
- Display com `line-height: 100%` — as linhas se tocam. É deliberado.
- `100dvh` em todo lugar, nunca `100vh` (barra de endereço do mobile).

### 2.5 Técnicas de motion identificadas

| Técnica | Onde | Como é feito |
|---|---|---|
| **Preloader com fill** | Tela inicial | SVG da taça com `<clipPath id="loader-glass-fill">`; o retângulo dentro do clip sobe de 0→100% enquanto o contador de % acompanha o progresso real do carregamento |
| **Split por caractere** | Título do hero | `SplitText` → divs `.char`, cada uma com `matrix3d` (rotateX ~18°) fazendo o caractere "tombar" para a posição, com stagger |
| **Reveal de texto por scroll** | "Behind the brand" | Cada caractere/palavra vai de `opacity: 0.35` → `1` em stagger **ligado ao scrub** — o texto "acende" conforme você rola (visível nos prints 5 e 6) |
| **Clip-reveal de bloco** | Títulos dos painéis | Container com `overflow: hidden` + `contain: paint`; conteúdo sobe por baixo da máscara (print 7 mostra o texto cortado na metade) |
| **Crossfade de canvas** | Hero → produto | Dois canvases sobrepostos, um com `opacity` animada e `will-change: opacity, transform` |
| **Overlay de escurecimento** | Transições | Div `rgba(25,23,20,0.78)` com opacity animada por cima da cena |
| **Blend multiply** | Fundo | Canvas com `mix-blend-mode: multiply` para grão/textura sobre a cor de fundo |
| **Kill no mobile** | Canvas pesado | `@media (hover: none), (pointer: coarse) { display: none }` — o canvas de hover simplesmente não existe em touch |

### 2.6 Orçamento de scroll (medido em 720px de altura)

| Trecho | Pixels | Em alturas de tela |
|---|---:|---:|
| Timeline mestre pinada (hero + marca + produtos) | 11.762 | ~16,3× |
| Seção institucional pinada | 720 | 1,0× |
| Compra + contato | 1.986 | ~2,8× |
| **Total** | **13.744** | **~19,1×** |

**Use isto como referência de ritmo.** Cerca de 1.500–2.000px de scroll por "ideia". Menos que isso e a animação fica frenética; mais e o usuário desiste.

---

## 3. Mapa de tradução: Vinho → Pilha

Mesmo esqueleto, tema trocado. **Não invente estrutura nova.**

**Produto:** Pilha Recarregável Turbo PowerFast — Gshield.
Corpo preto fosco, tampa e detalhes em `#FFA400`, **porta USB-C na lateral** e terminal positivo metálico. Selo do escudo com gorila no corpo.

| # | Referência (vinho) | Nossa versão (Gshield PowerFast) |
|---|---|---|
| 0 | Taça enchendo de vinho + logo + % | **Pilha enchendo de carga em `#FFA400`** + logo Gshield negativa + % |
| 1 | Garrafa 3D sobre galho, fundo escuro, "Where Art Meets Wine" | **Pilha 3D em pé**, fundo preto, headline em Bebas Neue |
| 2 | Garrafa gira mostrando o contrarrótulo | **Pilha gira revelando a porta USB-C** — é o diferencial do produto, merece ser o beat de virada |
| 3 | "Behind the brand" — herança Esterházy | **1.200 recargas** — o argumento de economia e sustentabilidade |
| 4 | Painel 01 Grüner Veltliner (fundo oliva) | **Painel 01 — AA · 3400 mWh** · fundo preto |
| 5 | Painel 02 White Blend | **Painel 02 — AAA · 1100 mWh** · fundo laranja |
| 6 | Painel 03 Red Blend | **Painel 03 — Cabo USB-A com 4 conectores Tipo-C** · fundo branco |
| 7 | "Austria: Land of Art and Wine" + mapa | **Impacto** — contador animado de pilhas descartáveis evitadas (1 Gshield = até 1.200 descartáveis) |
| 8 | "Taste the Art of Wine" + Buy Now | **CTA de compra** — gorilashield.com.br |
| 9 | Footer | **Footer** — mesma estrutura |

> **Decisão de conteúdo:** a linha tem só dois formatos (AA e AAA), mas o padrão da referência pede três painéis. O terceiro vira o **cabo de recarga múltipla** — que é item incluso no kit e argumento de venda forte. Se preferir, dá para rodar com dois painéis, encurtando o pin em ~3 telas.

**Substituições diretas de conteúdo:**

| Vinho | Gshield |
|---|---|
| Safra (2023–2025) | Capacidade (3400 mWh / 1100 mWh) |
| Notas de degustação | Frase de destaque técnica |
| Tipo (Dry White) | Formato (AA / AAA) |
| "Technical sheet" (accordion) | **"Ficha técnica"** — tensão 1,5V, 1.200 ciclos, proteções |
| "Food pairing" (accordion) | **"Compatibilidade"** — controles, brinquedos, teclados, mouses, lanternas, câmeras |

**Dados reais para `data/products.ts`:**

```ts
// Tensão nominal: 1,5V · Até 1.200 ciclos · Recarga Turbo PowerFast
// Proteções: sobrecarga, superaquecimento, curto-circuito
// Kit: cartela com 2 ou 4 unidades + cabo USB-A com 2 ou 4 conectores Tipo-C
// Garantia: 3 meses contra defeitos de fabricação
```

---

## 4. Stack que vamos usar

### 4.1 Base

| Camada | Escolha | Por quê |
|---|---|---|
| Framework | **Next.js 16.3 (App Router) + TypeScript** ✅ *instalado* | Mesmo da referência; SSR para SEO, `next/image`, `next/font` |
| CSS | **Tailwind CSS v4** ✅ *decidido* | v4 usa CSS vars nativas → mesmo modelo de tokens do Panda, com ecossistema maior |
| Animação | **GSAP 3.13+ + ScrollTrigger, SplitText, Flip, Observer, CustomEase** | Idêntico à referência |
| 3D | **Three.js + @react-three/fiber + @react-three/drei** ✅ *decidido: WebGL real* | Idêntico à referência |
| Scroll suave | **Lenis** *(no lugar de smooth-scrollbar)* | Lenis mantém o scroll **nativo** (só interpola), então ScrollTrigger, âncoras, acessibilidade e SEO funcionam sem gambiarra. smooth-scrollbar quebra tudo isso e exige `scrollerProxy`. |
| Conteúdo | **TS local** (`data/products.ts`) | Landing única não justifica CMS |
| Idioma | **PT-BR apenas** ✅ *decidido* | Sem camada de i18n |

> **Licença GSAP:** desde a 3.13 (2025), **todos** os plugins antes exclusivos do Club (SplitText, MorphSVG, DrawSVG, etc.) são gratuitos, inclusive para uso comercial. Não há custo aqui.

### 4.2 Estrutura de pastas

```
landingpilha/
├── REGRAS.md                     ← este arquivo
├── public/
│   ├── 3d/
│   │   ├── pilha-draco.glb       ← produto, comprimido
│   │   └── env_512.hdr           ← environment map
│   ├── draco/                    ← decoder wasm
│   └── brand/                    ← logos SVG/PNG
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css           ← tokens
│   ├── components/
│   │   ├── loader/               ← Preloader (SVG clipPath)
│   │   ├── layout/               ← Header, MobileMenu, Footer
│   │   ├── scene/                ← Canvas R3F, modelo, luzes, controlador
│   │   └── sections/             ← Hero, Brand, Product, Impact, Buy
│   ├── motion/
│   │   ├── timeline.ts           ← A TIMELINE MESTRE (fonte única da verdade)
│   │   ├── labels.ts             ← labels e durações dos beats
│   │   └── eases.ts              ← CustomEase registrados
│   ├── lib/
│   │   ├── lenis.ts
│   │   └── preload.ts            ← orquestrador do progresso real
│   ├── data/
│   │   └── products.ts           ← as 3 variantes
│   └── styles/tokens.css
```

---

## 5. Design System

### 5.1 Tokens de cor — extraídos do manual da marca Gshield

A paleta digital oficial tem **exatamente três cores**, e o manual é explícito: *"Para aplicações digitais, deve ser respeitada a paleta de cores ao lado."*

```css
:root {
  /* === PALETA OFICIAL — NÃO ALTERAR === */
  --brand-orange: #FFA400;   /* rgb(255,164,0) · PANTONE 137 C · CMYK 0/45/100/0 */
  --brand-black:  #000000;   /* CMYK 20/0/0/100 */
  --brand-white:  #FFFFFF;   /* CMYK 0/0/0/0 */
}
```

**O problema:** três cores chapadas não sustentam 19 telas de scrollytelling. A referência usa transições tonais de fundo para separar os beats. Precisamos disso sem inventar cores novas.

**A solução:** uma rampa neutra derivada do preto (elevação de superfície) + os laranjas de gradiente que já aparecem no próprio manual. **Nenhum matiz novo é introduzido.**

```css
:root {
  /* Rampa de superfície — derivada de --brand-black, só luminância */
  --surface-000: #000000;   /* preto oficial — hero e painel 01 */
  --surface-050: #0A0A0A;
  --surface-100: #141414;
  --surface-200: #1F1F1F;
  --surface-300: #2E2E2E;   /* bordas, divisores */

  /* Laranjas de gradiente (presentes no manual) */
  --orange-light: #FFB736;  /* stop claro */
  --orange-deep:  #F59C00;  /* stop escuro */

  /* Papéis semânticos */
  --color-bg:       var(--surface-000);
  --color-ink:      var(--brand-white);
  --color-accent:   var(--brand-orange);
  --color-energy:   var(--brand-orange);  /* a "carga" do loader */
  --color-hairline: var(--surface-300);
}
```

**Fundos dos painéis 01/02/03.** A referência troca de matiz entre produtos. Como só temos um acento, trocamos de **regime tonal**:

| Painel | Fundo | Texto | Leitura |
|---|---|---|---|
| **01 — AA** | `--surface-000` (preto) | branco | escuro, denso |
| **02 — AAA** | `--brand-orange` | preto | o momento de pico da página |
| **03 — Kit + cabo** | `--brand-white` | preto | respiro, fecha o ciclo |

Preto → laranja → branco é uma progressão de luminância que dá o mesmo drama da referência, usando só a paleta oficial.

**Regras de cor:**
1. `#FFA400`, `#000000` e `#FFFFFF` são intocáveis nas aplicações da marca. A rampa `--surface-*` existe **só para superfícies do site**, nunca para o logo.
2. Máximo **2 cores por tela**, fora o acento.
3. Transição de fundo entre beats é **animada**, nunca cortada.
4. Contraste mínimo 4.5:1 sempre. Atenção ao painel 02: **texto laranja sobre preto tem contraste 9.4:1 (ok), mas preto sobre laranja tem 10.4:1 (ok) — já branco sobre laranja dá 2.1:1 e é proibido.**

> **Divergência consciente com a referência:** o site do vinho evita preto e branco puros para simular papel. Nós fazemos o oposto por obrigação de marca. Isso muda a *temperatura* do site — o nosso é agressivo e tecnológico, o deles é artesanal. A estrutura e o motion permanecem idênticos; só a pele muda. É exatamente o pedido.

### 5.2 Tipografia — definida pelo manual

| Papel | Fonte | Regra do manual |
|---|---|---|
| **Display / títulos** | **Bebas Neue Bold** | "Para utilização em títulos, chamadas e pequenos textos" |
| **Corpo** | **Montserrat Medium** | Principal. "Ideal para utilização em textos mais longos" |
| **Destaque** | **Montserrat Black** | Variação da principal |

**Restrição do manual, obrigatória:** *não usar pesos abaixo do "medium"*. Ou seja, **Montserrat Light e Thin estão proibidos.** Peso mínimo = 500.

Ambas são gratuitas no Google Fonts — sem custo de licença.

```css
--lh-display:  100%;   /* Bebas é condensada: linhas podem se tocar */
--lh-heading:  110%;
--lh-subtitle: 120%;
--lh-body:     140%;
```

**Ajuste em relação à referência:** o site do vinho usa uma serifada Thin gigante, onde o contraste vem da leveza. Bebas Neue é o oposto — condensada e pesada. Para conseguir a mesma elegância, o contraste tem que vir de **escala e tracking**, não de peso:

- Headlines Bebas em tamanho grande com `letter-spacing: 0.02em` e caixa alta.
- Não empilhar mais de 2 linhas de Bebas em corpo grande — ela satura rápido.
- Corpo em Montserrat Medium, `letter-spacing: 0`, nunca abaixo de 16px.

Carregar via `next/font/google` com `display: swap` e subset `latin-ext` (precisamos de ç/ã/õ).

### 5.4 Regras do manual da marca

Extraídas do `brand/manual_marca_gshield.pdf`. **Valem para todo uso do logo no site.**

| Regra | Especificação |
|---|---|
| **Versões** | Ícone (escudo com gorila) e logo completa. O ícone é livre em mídias digitais, mas a logo completa deve aparecer em algum ponto da peça |
| **Positiva** | Fundos claros |
| **Negativa** | Fundos escuros — **é a versão que usaremos no header durante quase todo o site** |
| **Área de respiro** | Espaço livre ao redor ≥ **altura da palavra "SHIELD"** |
| **Redução mínima (web)** | **120px** para a logo completa, **30px** para o ícone. Abaixo de 120px, usar **somente o ícone** |
| **Proibido** | Distorcer, alterar elementos, alterar cor fora das versões definidas, aplicar efeitos, rotacionar |
| **Recriação** | Proibido redesenhar. Sempre usar o arquivo vetorial oficial |

**Impacto direto no projeto:** o header muda de cor de fundo ao longo do scroll (preto → laranja → branco). Como o logo não pode ter cor fora das versões definidas, o header precisa **trocar entre a versão negativa e a positiva** na transição, com crossfade — não recolorir o SVG por filtro.

**Contato da marca:** marketing@gorilashield.com.br

### 5.3 Grid e espaçamento

```css
--space-grid:    20px;
--space-gutter:  clamp(16px, 4vw, 48px);
--space-section: clamp(56px, 10vw, 144px);
```

Breakpoints: `sm 768` · `md 1024` · `lg 1440` · `xl 1920`.

---

## 6. As 12 Regras de Ouro

Se uma linha de código violar qualquer uma destas, ela não entra.

**1. Uma timeline mestre, um pin.**
Todo o ato principal (hero → marca → produtos) é **um** `ScrollTrigger` com `pin: true` e `scrub`. Beats são `labels` dentro dessa timeline. Proibido criar um ScrollTrigger por seção dentro do ato principal.

```ts
// ✅ certo
const tl = gsap.timeline({
  scrollTrigger: { trigger: sceneRef.current, start: 'top top',
                   end: '+=11000', pin: true, scrub: 1, invalidateOnRefresh: true }
})
tl.addLabel('hero').to(...).addLabel('brand').to(...).addLabel('product01')

// ❌ errado — mata a continuidade do objeto 3D
useGSAP(() => { gsap.to(a,{scrollTrigger:{trigger:a}}); gsap.to(b,{scrollTrigger:{trigger:b}}) })
```

**2. Scrub, nunca autoplay.**
Toda animação da narrativa é `scrub`. Se rolar para trás não desfizer exatamente, está errado. Autoplay só é permitido no preloader e em micro-interações de hover/click.

**3. O produto 3D nunca desmonta.**
Um `<Canvas>` só, montado uma vez, vivo do hero até o último painel. Só mudam posição, rotação, escala e luz. Proibido `key` que force remount, proibido desmontar entre seções.

**4. Nada de layout animado.**
Só `transform` e `opacity`. Nunca anime `width`, `height`, `top`, `left`, `margin`. Para mudanças de layout, use **GSAP Flip**.

**4b. As três camadas, e por que `main` não pode ter `z-index`.**
A cena é um `<canvas>` **fixo** único. Para a pilha aparecer entre o fundo colorido e o texto — como na referência — os três precisam viver no **mesmo contexto de empilhamento**:

| z | Camada | Onde |
|---:|---|---|
| 0 | Fundo da seção | `<SectionBg>` |
| 1 | Canvas 3D | `SceneMount` |
| 2 | Conteúdo | wrapper com `relative z-2` |

Nem `<main>` nem as `<section>` podem criar contexto próprio: **nada de `z-index`, `transform`, `filter` ou `isolation` nesses níveis.** Um `z-10` no `<main>` prende a cena atrás da página inteira — foi exatamente o que aconteceu no fim do Sprint 2. Regra documentada em `src/components/layout/Layer.tsx`.

**4c. Texto nunca fica atrás do produto.**
Na referência a garrafa está **na diagonal**: só a ponta dela cruza o parágrafo, e sobra texto legível dos dois lados. A nossa pilha fica **em pé** e tapa o miolo de toda linha — por mais longo que seja o bloco, o meio some.

Regra prática: o eixo central da tela é **corredor do produto**. O texto se distribui pelas laterais, em blocos curtos e em alturas diferentes (nunca simétricos, senão o produto vira separador de tabela).

Isso vale para todos os beats. Se algum dia o produto for para a diagonal, a regra pode ser revista — até lá, não.

**4d. Travessão é proibido em qualquer texto visível.**
Travessão (`—`) lê como texto gerado por IA e não entra em nada que o usuário veja: copy, títulos, rótulos, `alt`, metadados. Use vírgula, ponto ou dois-pontos.

Em comentário de código é permitido, porque não é conteúdo do site.

**4e. Composição larga não cabe no corredor central: a cena vai para dentro de uma coluna.**
A regra 4c resolve o produto único, esguio, que passa no meio. O painel do kit tem **oito corpos em duas ilhas**, uma composição larga e baixa que não cabe num vão de 24% e cruzaria as duas colunas de texto se ficasse no centro.

Nesse caso a cena inteira se muda para **uma coluna**, e o texto que a explica fica logo abaixo dela. A cena não adivinha o espaço: o painel reserva um retângulo, ele **se mede** (`FaixaDaCena`) e publica o resultado em `sceneState.faixaDoKit`; a cena cabe dentro. Número fixo de viewport não serve, porque o cabeçalho ocupa fração diferente conforme a janela muda de altura.

A medida é relativa ao **painel**, nunca ao viewport: fora do trecho pinado o painel está em qualquer altura da página, e o `ResizeObserver` não dispara com scroll.

**4f. Nada de `flex-1` + `min-h-0` encadeados em conteúdo que precisa aparecer.**
Um item flex com as duas classes pode encolher **abaixo do próprio conteúdo**. Quando a coluna apertou no retrato, as duas fotos dos cabos colapsaram para altura zero: sumiram da página sem nenhum aviso, e nada no layout denunciava a perda.

Em conteúdo obrigatório, use altura determinística (`h-[clamp(...)]` ou `aspect-[...]`). O `flex-1` fica para espaço vazio, nunca para o que carrega informação.

**4g. Painel pinado não rola: se não coube, alguma coisa sai por escrito.**
Cada painel é uma tela do trecho pinado, então excesso de conteúdo não vira barra de rolagem, vira conteúdo cortado fora da tela. Em celular baixo (667px) o painel do kit passava 65px do fim e empurrava a ficha técnica para fora.

Quando algo precisa sair, **o texto assume a informação que a imagem carregava**. As fotos dos cabos somem só quando falta altura **e** largura (`(max-height:699px) and (max-width:767px)`), e a descrição passou a dizer por escrito que são dois cabos, de duas e de quatro pontas. Janela de desktop larga e baixa continua com as fotos.

**4h. Texto alinhado à esquerda, em toda a página.**
Nenhuma seção alinha texto à direita. Um bloco no canto direito fica no canto pela **posição** dele, não pelo alinhamento do texto dentro dele: alinhamento à direita é a primeira coisa que o olho percebe e faz a tela parecer de outro site. O beat do USB-C tinha esse defeito e foi corrigido.

Mesma ideia para a escala do corpo de texto: o beat do USB-C chegou a 30px enquanto o das recargas usa 18px. Blocos podem variar de tamanho, mas dentro da mesma família de escala.

**4i. O canvas é `fixed` e vive a página inteira: alguém tem que tirá-lo de cena.**
O fim do pin não some com a cena por si só. O `progress` da timeline satura em 1 e permanece lá enquanto a página continua rolando, então o produto ficava pendurado por cima do impacto, da compra e do rodapé.

A saída é um **segundo ScrollTrigger**, começando exatamente onde o pin termina e correndo por meia altura de tela, com `scrub`: ele escreve `sceneState.saidaDoAto` (0→1) e a cena aplica isso na opacidade do container. Curto de propósito, para o produto sair junto com o painel que ele ilustra.

Dois detalhes que custaram tempo:
- `onLeave` e `onLeaveBack` precisam fixar os extremos à mão, porque saltar a faixa inteira de uma vez (âncora, teclado, `scrollTo`) não dispara `onUpdate`.
- `onEnterBack` **não** deve fixar 1: ele dispara ao voltar para dentro da faixa vindo de baixo, e travava a cena apagada enquanto o scrub já a trazia de volta.

A opacidade vai no ELEMENTO, não nos materiais: são oito corpos com quatro mapas cada, e transparência neles traz ordenação de profundidade e custo de blending para resolver o que uma propriedade de CSS resolve de graça.

**4j. Trocar o conteúdo de uma imagem sem trocar o caminho não chega no navegador.**
A foto do cabo de quatro pontas foi substituída três vezes no mesmo `/produto/cabo-4-pontas.png` e o navegador continuou servindo a primeira. Arquivo com conteúdo novo ganha **caminho novo** (`cabo-4-pontas-tipoc.png`).

Vale também para a qualidade: o Next 16 mudou o padrão de `images.qualities` para `[75]` e **coage em silêncio** qualquer outro valor. Sem declarar em `next.config.ts`, `quality={92}` vira 75.

**4k. Diagramação tem sistema: dois degraus de corpo, poucos de display, uma medida, um ritmo.**
Auditoria medida em 13/08/2026 encontrou **quatro** tamanhos de corpo (12/14/16/18), **cinco** de display (34/56/72/88/104), **cinco** entrelinhas (1,33 a 1,56) e uma linha com **256 caracteres** de medida. Cada seção tinha escrito o seu próprio tamanho.

Um degrau que aparece uma vez só não é hierarquia, é ruído: sem repetição, nada estabelece nível, porque tudo é um tamanho diferente de tudo. É exatamente o que se lê como "amador" antes de conseguir apontar a causa.

Os tokens estão em `globals.css`, e as utilidades `texto-corpo`, `texto-nota` e `texto-lead` empacotam tamanho, entrelinha e **medida** juntos. Medida no pacote de propósito: acima de ~75 caracteres por linha o olho perde a linha seguinte, e um bloco fica ilegível mesmo com contraste perfeito.

Espaçamento vertical de seção vem de `--spacing-section`. O token existia e ninguém usava.

**5. `will-change` é cirúrgico.**
Só nos elementos que estão animando naquele beat, e removido depois. `will-change` em tudo derruba o FPS. Mesma regra para `contain: paint`.

**6. `100dvh`, jamais `100vh`.**
E `min-h` junto de `h` para o Safari iOS.

**7. Estado do 3D é dirigido por um número só.**
A cena lê um `progress` de 0→1 vindo da timeline. A cena **não** conhece seções, não escuta scroll, não tem lógica própria de beat. Um `useFrame` interpola (`damp`/`lerp`) rumo ao alvo.

```ts
// motion/timeline.ts é o único que sabe "onde estamos"
tl.to(sceneState, { progress: 1, ease: 'none' }, 0)
```

**8. Mobile é outra coreografia, não a mesma reduzida.**
Em `(pointer: coarse)`: sem HDR pesado, `dpr` limitado a 1.5, efeitos de hover removidos do DOM (`display: none`, como a referência faz), e beats encurtados. Se o dispositivo não suportar WebGL, cair para uma **sequência de imagens** ou render estático — a página precisa contar a história mesmo assim.

**9. O preloader mede carregamento real.**
O `%` reflete o progresso verdadeiro (GLB + HDR + fontes + imagens críticas) via `THREE.DefaultLoadingManager` / `useProgress`. Nada de `setInterval` fingindo. Só sai da tela quando tudo estiver pronto — senão o primeiro beat engasga.

**10. `prefers-reduced-motion` é obrigatório.**
Com a preferência ativa: sem Lenis, sem scrub, sem pin. A página vira um documento vertical normal com todo o conteúdo visível. Isto não é opcional.

**11. O conteúdo existe no HTML.**
Todo texto é renderizado no servidor e legível sem JS. Animação é camada por cima, nunca a fonte do conteúdo. `SplitText` roda depois da hidratação e usa `revert()` no cleanup.

**12. Orçamento de performance.**
| Métrica | Limite |
|---|---|
| GLB do produto (Draco) | ≤ 1,5 MB |
| Environment map (HDR) | ≤ 512×256 |
| JS inicial (sem 3D) | ≤ 200 KB gzip |
| FPS durante scroll (desktop) | ≥ 55 |
| FPS durante scroll (mobile médio) | ≥ 30 |
| Lighthouse Performance (mobile) | ≥ 70 |
| CLS | < 0,05 |

Cena 3D entra por `dynamic(() => ..., { ssr: false })`.

---

## 7. Storyboard do scrollytelling

Orçamento total: **~19 × 100dvh**. Os beats 1–6 vivem **dentro do mesmo pin**.

| Beat | Nome | Custo | O que acontece na tela |
|---|---|---:|---|
| **0** | **Loader** | — | Fundo `#000`. Logo Gshield **negativa** no topo. Ao centro, SVG da pilha em contorno branco com o interior enchendo de **`#FFA400`** via `clipPath` de baixo para cima. `%` real embaixo em Montserrat Medium. Ao chegar em 100%, dissolve e o hero já está montado atrás. |
| **1** | **Hero** | 2× | Fundo `#000`. Pilha 3D em pé, centralizada, com luz de topo marcando o metal do terminal e o laranja da tampa. Header fixo com logo negativa. Headline em **Bebas Neue caixa alta**, 2 linhas, revelada por caractere com rotateX. Pill "Nossos modelos" no rodapé. |
| **2** | **Revelação do USB-C** | 2× | A pilha **gira até a porta USB-C ficar de frente** e a câmera aproxima. Este é o beat de virada — é o que diferencia o produto. Headline sai, um rótulo curto entra ("Recarrega direto. Sem dock."). |
| **3** | **1.200 recargas** | 3× | Fundo abre de `#000` para `--surface-100`. Número grande em Bebas com contagem ligada ao scrub. Parágrafo com **opacidade por caractere em stagger** — o texto "acende" conforme se rola. |
| **4** | **Produto 01 — AA** | 3× | Fundo permanece preto. Painel sobe sob máscara: "01" + "AA" em Bebas, régua `3400 mWh · 1,5V · 1.200 ciclos`, frase de destaque. Pilha reposiciona ao centro. Abaixo: descrição + accordions "Ficha técnica" e "Compatibilidade". |
| **5** | **Produto 02 — AAA** | 3× | Fundo interpola **preto → `#FFA400`**. Header troca para logo **positiva** (crossfade). A pilha não some: gira e **encolhe proporcionalmente** para a proporção da AAA. Texto passa a preto. |
| **6** | **Produto 03 — Kit + cabo** | 3× | Fundo interpola **laranja → `#FFFFFF`**. Coluna esquerda: **duas ilhas de quatro pilhas** (AA e palito) com **OU** no vão. Coluna direita: fotos dos dois cabos (2 e 4 pontas), ficha e compatibilidade. Fim do pin. |

> **O kit não traz oito pilhas.** São **dois kits**: quatro AA e o cabo, **ou** quatro AAA e o cabo. Mostrar as oito juntas e encostadas anuncia um produto que não existe. A separação em duas ilhas com o "OU" no meio é o que diz isso sem depender de legenda. Vale para qualquer peça futura: nunca compor os dois formatos como um conjunto só.

> **As pilhas do kit ficam retas.** Mesma linha, mesmo plano, espaçamento igual, todas com a marca **de frente** (`FACE_FRONTAL`, sem o desvio de três-quartos da protagonista). Uma tentativa espalhou inclinação, profundidade e giro próprio em cada uma procurando naturalidade, e virou amontoado. Numa cartela o alinhamento **é** o produto: desalinho lê como defeito de montagem, não como vida. A referência é a foto de embalagem do próprio produto. Isto vale só para o kit; a protagonista continua em três-quartos, pelo motivo da §6.4 (conector de frente vira bloco preto achatado).

> **Cada pilha do kit encara a CÂMERA, não o eixo Z.** O kit mora na coluna esquerda, longe do eixo óptico, e a câmera é perspectiva: com a mesma rotação para todas, as de lá apareciam de esguelha e a ilha inteira lia como se estivesse torta em relação à outra. Girar cada cilindro em torno do próprio eixo **não muda silhueta nenhuma**, só escolhe qual parte do rótulo aparece: custo zero e as oito apresentam a marca de frente. `rotation.y = FACE_FRONTAL + atan2(-mundoX, camera.z)`.

> **A lente é longa: 20° a 22,6 de distância.** Estava em 32° a 14. Com abertura larga, tudo fora do eixo óptico aparece de esguelha: no kit, as pilhas da ponta mostravam a lateral e a tampa virava uma elipse inclinada diferente em cada uma, então liam como tortas mesmo tendo topo e base no **mesmo pixel** (medido). É o mesmo motivo pelo qual fotografia de produto usa teleobjetiva. O enquadramento em z = 0 é idêntico (`tan(10°) × 22,6 = tan(16°) × 14`); as poses com afastamento em z foram multiplicadas por `22,6/14` para manter a mesma sensação de aproximação.

> **Acessório nunca aparece maior que o produto.** A foto do cabo chegou a ficar 1,1× a altura das pilhas, e isso inverte a hierarquia do painel na hora. O teto é cerca de **metade** da altura da cartela, que é a proporção real entre um cabo enrolado e uma pilha em pé.

> **Oito pilhas em fila é uma composição larga e baixa.** A altura delas é sempre cerca de **30% da largura da coluna** que as recebe, qualquer que seja a tela. Não existe ajuste de altura que as faça preencher uma coluna alta: a única alavanca é dar mais largura. Se um dia for preciso que ocupem bem mais tela, o caminho é empilhar as duas ilhas na vertical, com o "OU" entre elas, não aumentar a escala.
| **7** | **Impacto** | 1× | Sai do pin. Contador animado: 1 Gshield substitui até 1.200 descartáveis. Gráfico SVG com trace animado. |
| **8** | **Compra** | 2,8× | Headline em Bebas, render de apoio, CTA "Onde comprar" com seta animada → gorilashield.com.br. |
| **9** | **Footer** | 1,3× | Navegação, contato, redes, garantia (3 meses), créditos. |

> **Atenção no beat 5→6:** o header atravessa preto → laranja → branco. O logo **não pode ser recolorido por filtro CSS** (proibido pelo manual). Faça crossfade entre os arquivos da versão negativa e positiva, ambos pré-carregados.

**Navegação:** os links do header ("modelo 01/02/03") não fazem scroll nativo — eles fazem `tween` do progresso da timeline até o `label` correspondente (`gsap.to(window, { scrollTo: tl.scrollTrigger.labelToScroll('product01') })`). A pill do rodapé abre um dropdown com os três modelos.

---

## 8. Sprints

Estimativas para **1 dev**, com os assets em mãos. Cada sprint só fecha se o **DoD** (Definition of Done) estiver 100%.

---

### Sprint 0 — Fundação e Design System · ✅ **CONCLUÍDO 13/08/2026**

- [x] **Next.js 16.3** + React 19.2 + TypeScript + ESLint (Turbopack)
- [x] Tailwind v4 com os tokens da §5.1 em `src/app/globals.css` via `@theme`
- [x] Bebas Neue + Montserrat via `next/font/google`, subset `latin-ext`, `display: swap`
- [x] `body { font-weight: 500 }` no `@layer base` — só carregamos 500/700/900 do Montserrat
- [x] `src/data/products.ts` com os 3 painéis, conteúdo real
- [x] Página estática, sem JS de animação, com todo o conteúdo na ordem dos beats
- [x] `prefers-reduced-motion` já no `@layer base`
- [x] Accordions com `<details>`/`<summary>` nativos — funcionam sem JS
- [x] Slots `[data-scene-slot]` reservados para a cena 3D do Sprint 2
- [ ] Deploy de preview (Vercel) — *pendente, precisa de repositório git*

**Verificado:** `tsc --noEmit` limpo · `eslint` limpo · `next build` estático · console sem erros.

**Contraste medido em runtime:**

| Painel | Fundo | Título | Corpo |
|---|---|---:|---:|
| 01 — AA | `#000000` | 21:1 | 21:1 |
| 02 — AAA | `#FFA400` | 10,56:1 | 10,56:1 |
| 03 — Kit | `#FFFFFF` | 21:1 | 21:1 |

**Duas correções feitas durante o sprint:**

1. **`h1` sem separação entre linhas.** As duas linhas da headline são `<span>` de bloco; sem espaço, leitores de tela liam "RECARREGAATÉ". Corrigido com espaço no fim de cada linha.

2. **Header fixo reprovou no contraste.** Medi **1,99:1** para texto branco sobre `#FFA400` — o header fixo atravessa o painel 02 e falha. Como a correção real depende do logo positivo (bloqueado) **e** da troca de tema por scroll (Sprint 5), o header ficou **`absolute` no topo do hero**, onde o fundo é sempre preto. **Só voltar para `fixed` junto com a troca de tema — nunca antes.** Marcado em `src/components/layout/Header.tsx`.

---

### Sprint 1 — Shell, scroll suave e preloader · ✅ **CONCLUÍDO 13/08/2026**

- [x] **Lenis** integrado ao `gsap.ticker` + `ScrollTrigger.update` — `src/components/SmoothScroll.tsx`
- [x] Guarda de `prefers-reduced-motion` em `src/lib/motion.ts`, desliga Lenis inteiro
- [x] Header desktop (nav / logo / CTA) + header mobile (botão de 4 pontos)
- [x] Painel de menu mobile com `role="dialog"`, `aria-modal`, foco preso, `Escape` fecha e devolve o foco
- [x] **`<Logo variant>`** — troca de **arquivo** entre positiva e negativa, nunca de cor (manual §5.4). Escolhe o ícone sozinho abaixo de 120px
- [x] **Preloader**: SVG da pilha com `clipPath`, carga subindo em `#FFA400` por `scaleY` (nunca `height`), porta USB-C desenhada no contorno
- [x] `src/lib/preload.ts` — progresso real (fontes + imagens críticas), `minDuration` para não piscar. Slots prontos para GLB/HDR no Sprint 2
- [x] Saída do loader com fade GSAP

**Verificado:** `tsc` limpo · `eslint` limpo · `next build` estático · loader sai e libera o scroll · menu mobile usa `icone-positivo.png` automaticamente.

**Revisão do loader após feedback (13/08).** A primeira versão ficou pesada e apressada. Três correções:

| Ponto | Antes | Depois |
|---|---|---|
| **Escala** | 132px / 164px de altura, traço 2,5 | **42px / 48px de largura**, traço 1,5 — a mesma escala da taça da referência, que tem `w_42px md:w_48px` |
| **Ritmo** | `minDuration` 900 ms; com 4 tarefas o número pulava de 25 em 25 e cravava 100% em milissegundos | `minDuration` **2600 ms** + `exibido = min(progresso real, decorrido / duração)` com lerp por quadro. Sobe contínuo e **continua honesto**: nunca mostra mais do que carregou |
| **Símbolo** | Só contorno + porta USB-C, sem sinal de carga | **Raio subtraído da carga por máscara.** Em 0% é um contorno tênue; conforme o laranja sobe, o raio se revela vazado. A porta USB-C saiu do loader — a 48px virava ruído, e ela tem o beat 2 inteiro só para si |

O nível passou a ser escrito direto no DOM por `ref`. Passar 60 atualizações por segundo pelo estado do React re-renderizaria a árvore à toa; só o inteiro do `%` é estado.

**Uma blindagem adicionada durante o sprint.**
Ao verificar no navegador, o loader ficava preso: `%` em 100% mas a carga parada e o overlay sem sair. A causa não era o código — o painel de verificação estava com `document.hidden = true` e **0 frames por segundo**, então o `requestAnimationFrame` estava congelado: a transição CSS não avançava e o tween do GSAP nunca completava, logo o `onComplete` nunca disparava.

Isso é artefato do ambiente de teste, **mas o modo de falha é real**: quem abre o site em aba de segundo plano (link em nova aba) teria um overlay preto cobrindo a página até focar a aba. O `Preloader` agora sai direto quando `document.hidden` — sem frames não há o que animar.

---

### Sprint 2 — Cena 3D · ✅ **CONCLUÍDO 13/08/2026**

**Decisão que mudou o sprint: geometria procedural, sem GLB.**
Uma pilha é um cilindro tampado. Modelar em código dá as medidas reais em milímetros de graça (`DIMENSIONS`), zero download, e — o principal — o UV do `CylinderGeometry` casa exatamente com o rótulo planificado: `u` dá a volta pela circunferência e `v` sobe pelo comprimento, que é como a textura foi construída. Draco, KTX2 e o pipeline de compressão saem de cena junto.

- [x] Geometria procedural: corpo, tampa `#FFA400`, terminal metálico, base
- [x] Rótulo aplicado, um por formato (`rotulo_aa.png` / `rotulo_aaa.png`)
- [x] Anisotropia no máximo — sem ela o texto vira papa justo na borda do cilindro
- [x] Canvas R3F montado uma vez, `dynamic({ ssr: false })`
- [x] Iluminação com `Lightformer`, sem `.hdr` externo (zero download, sem CDN)
- [x] Estado dirigido por **um** `progress` 0→1 (`src/lib/scene-state.ts`) com amortecimento no `useFrame`
- [x] `dpr` adaptativo (1.5 em toque, 2 no resto) + fallback sem WebGL
- [x] Painel de depuração em `?debug=scene` — slider 0→1, botões por beat e contador de FPS

**Custo da cena:** 4 objetos · 4 draw calls · **576 triângulos** · 5 texturas. Muito abaixo do orçamento.

**Verificação do envelopamento** — pixels claros por face, girando o cilindro:

| Face | Brancos | Esperado |
|---|---:|---|
| `u=0` — lisa (costura) | **0** | sem grafismo ✓ |
| `u=0.29` — marca | **11.134** | POWERFAST + subtítulo ✓ |
| `u=0.50` — lisa | 2.230 | só sangria da curvatura ✓ |
| `u=0.73` — técnica | 3.627 | texto pequeno ✓ |

Laranja constante em ~22.600 nas quatro: é a faixa dando a volta. Orientação e costura corretas.

**Correções de lint do React 19 feitas durante o sprint:**

1. **Mutação da textura em `useMemo`** — efeito colateral durante a renderização. O compilador do React trata o retorno de hook como imutável, inclusive dentro de `useEffect`. A configuração foi para o callback do próprio `useTexture`, onde a textura ainda é parâmetro.
2. **`setState` síncrono em efeito** (detecção de WebGL e do parâmetro de depuração) — dispara renderização em cascata. Trocado por `useSyncExternalStore` via `src/lib/client-value.ts`, que devolve o valor do servidor na hidratação e o real depois.

**FPS: ✅ acima de 120**, medido no navegador em 13/08 com bloom e o cabo completos. A DoD pedia ≥ 55 — folga de mais que o dobro. Não há motivo para cortar segmentos do tubo nem desligar o `mipmapBlur`.

---

### O cabo USB-C (adicionado ao Sprint 2)

Equivalente ao galho de videira da referência, com a diferença de que também **argumenta**: mostra o produto sendo carregado.

- Tubo sobre curva **centrípeta** (a uniforme gera cúspides com pontos desiguais — era a origem das torções)
- **Drapeado, não enrolado**: giro total de 1,2 rad, raio sempre crescendo, altura sempre descendo. Cabo cai, não se enrola
- Plugue Tipo-C em três peças: casca em estádio (8,25 × 2,40 mm, padrão), corpo (8,4 × 4,8) e alívio de tração
- **Neon por trás**: tubo de 1 mm em `BackSide` com blending aditivo, ocluído pelo cabo preto. A névoa em volta vem do **bloom**, não da geometria
- Onda **sem brilho fixo e sem cauda**: só a cabeça, correndo da base ao conector. As duas pontas nunca acendem juntas
- Parallax só no cabo, pivotando **no plugue** — o conector fica cravado na porta
- A ponta some fora de quadro (raio 26 contra 6,3 de meia-largura visível)

**Dois bugs que custaram várias rodadas:**

1. **Caminho malformado no `criarCorpoPlugue`.** O contorno partia do meio da aresta esquerda e ia direto para a inferior direita, traçando uma diagonal por cima do canto. A triangulação da extrusão respondia com uma cunha preta no meio do plugue, que parecia falha de renderização. Foi diagnosticado como problema de forma três vezes antes de eu ler o código do contorno.

2. **Crases dentro de comentário GLSL.** O shader vive num template literal; a crase fechou a string e quebrou o build.

---

### Sprint 3 — Timeline mestre e pin · ✅ **CONCLUÍDO 13/08/2026**

**A mudança estrutural do projeto.** Os sete primeiros beats deixaram de rolar empilhados: agora ficam **sobrepostos em `absolute inset-0`** dentro de um único elemento pinado, e a timeline revela um de cada vez enquanto a tela permanece travada. É o que mantém a pilha 3D contínua — com um gatilho por seção, ela cortaria a cada transição.

| Medida | Nosso | Referência |
|---|---:|---:|
| Altura do pin | 13.600px | 11.762px |
| Página inteira | **19,3 telas** | **19,1 telas** |

- [x] `motion/timeline.ts` — **um** ScrollTrigger, `pin`, `scrub: 1`, `invalidateOnRefresh`
- [x] `motion/labels.ts` — beats, durações e `scrollDoBeat()`
- [x] `PinnedAct` empilha os beats e monta a timeline após o layout assentar
- [x] Timeline de duração **1**: a posição de cada tween É o progresso que a cena lê
- [x] Cruzamentos de entrada e saída por beat
- [x] Pílula navegando por **progresso**, não por elemento
- [x] `prefers-reduced-motion` desmonta o pin: vira documento vertical comum

**Verificado no navegador:**

| Fração do pin | Beat na tela | Ato travado |
|---:|---|---|
| 0,00 | hero | ✓ |
| 0,22 | usbc | ✓ |
| 0,37 | cycles | ✓ |
| 0,52 | chip | ✓ |
| 0,67 | produto-01 | ✓ |
| 0,81 | produto-02 | ✓ |
| 0,95 | produto-03 | solta (entrega ao pós-pin) |

**DoD — reversibilidade:** percorrido 0,1 → 0,52 → 0,1 e comparado o estado em 0,37 nas duas direções. **Idêntico, sem drift.**

**A saída do cabo**, encenada em três tempos e amarrada ao scrub:

| Progresso | Recuo | Queda | Deslize | Opacidade | Plugado |
|---:|---:|---:|---:|---:|:--:|
| 0,09 | 0 | 0 | 0 | 1 | sim |
| 0,12 | 0,34 | 0 | 0 | 1 | sim |
| 0,15 | 1,10 | 0,27 | 0 | 1 | **não** |
| 0,18 | 1,10 | 1,15 | 4,32 | 1 | não |
| 0,21 | 1,10 | 1,89 | 9,03 | 0,47 | não |
| 0,24 | 1,10 | 2,20 | 11,0 | 0 | não |

Recua primeiro, cede depois, desliza por último — e a opacidade só entra no fim. A onda de neon **para no instante da desconexão**: fora da porta não há carga entrando, e mantê-la acesa contaria uma mentira.

**Duas armadilhas do pin que valem registro:**

1. **`IntersectionObserver` deixa de funcionar.** Dentro do pin os sete beats ocupam a mesma posição, então todos intersectam sempre. A pílula passou a ler o progresso da timeline.
2. **Navegação por elemento também deixa de funcionar.** Os painéis não têm posição própria na página; o destino vira uma posição de scroll calculada do progresso do beat (`scrollDoBeat`).

---

### Sprint 3 — checklist original

- [ ] `motion/timeline.ts`: ScrollTrigger único, `pin`, `scrub`, `invalidateOnRefresh`
- [ ] `motion/labels.ts` com os beats e durações do §7
- [ ] `CustomEase` registrados
- [ ] Hero: fundo, headline com SplitText + rotateX por caractere
- [ ] Beat 2 (transição): interpolação de cor de fundo + reposicionamento da pilha
- [ ] **Saída do cabo: DESPLUGAR, não desaparecer** — ver abaixo
- [ ] Painel de debug (mostra label e progresso atuais) atrás de flag

**A saída do cabo (pedido de 13/08).**
Hoje `cabePresenca()` só baixa a opacidade entre os beats 1 e 2 — o cabo simplesmente some, o que entrega o resultado sem entregar a ação.

O correto é uma **desconexão encenada**, ligada ao scrub:

| Trecho do progresso | O que acontece |
|---|---|
| início | O plugue recua ao longo do eixo da porta — a casca metálica sai da abertura |
| meio | Já solto, o cabo cede e cai um pouco, obedecendo à gravidade |
| fim | Conjunto desliza para fora de quadro e só então a opacidade baixa |

Detalhes que importam:
- O plugue e o cabo saem **juntos**: o pivô hoje está no plugue justamente para isso
- A onda de neon deve **parar** assim que desconecta — não há mais carga entrando
- Tudo dirigido pelo `progress`, nunca por autoplay (§6.2), para a ação desfazer ao rolar de volta

**DoD:** rolar para frente e para trás no beat 1–2 é perfeitamente reversível, sem drift.

---

### Sprint 4 — Ato da marca · ✅ **CONCLUÍDO 13/08/2026**

- [x] Rotação frente→verso amarrada ao scrub — já vinha do Sprint 2/3: a cena inteira é dirigida por `sceneState.progress`
- [x] **Reveal de texto por caractere com opacidade em stagger ligada ao scrub** — `src/motion/texto.ts`
- [x] **Contagem do 1.200 ligada ao scrub** — nasce no valor final no HTML (§6.11) e é zerada pelo JS
- [x] `SplitText.revert()` no cleanup e **re-split em `resize`** — remonta só quando a LARGURA muda
- [x] **Clip-reveal nos títulos de painel** — título, régua e frase sobem por baixo de uma máscara, escalonados, dando a ordem de montagem do painel
- [x] **Escurecimento nos beats de texto** — a cena recua para 45% nas recargas e no chip, e volta a 100% no painel 01

**Sobre o escurecimento.** Ele NÃO é uma camada preta por cima de tudo. Uma camada acobertaria também o texto, que é exatamente o que não deve recuar nesses beats: ali o argumento é o número e o parágrafo, e a pilha é cenário. Sem recuar, ela segue sendo a coisa mais forte da tela e disputa a leitura com o que deveria estar sendo lido.

A cena é atenuada por opacidade **sobre o fundo da própria seção**. Os dois beats usam `#141414`, então o produto se dissolve no próprio fundo e o efeito é de escurecimento de verdade. Medido: 1 → 0,45 → 1, reversível nos dois sentidos.

A atenuação e a saída do ato **multiplicam**: são causas independentes, e uma não deve cancelar a outra.

**Sobre o clip-reveal.** A referência usa a técnica nos títulos de painel (§2.5), e nós temos o equivalente exato: o `01 AA`, o `02 AAA` e o `03 O KIT`. O que NÃO tem equivalente é o rótulo "Por trás da marca" — inventar uma seção só para ter o efeito seria o caminho errado, então ficou de fora.

Duas armadilhas medidas no navegador, as duas silenciosas:

1. **`padding-bottom: 0.18em` resolve na fonte da MÁSCARA, não na do título.** A máscara herda 16px, o título tem 88px: a folga saía com 2,88px, longe do rabo do "Q" da Bebas. A folga agora vem em pixels, por `--folga-descida`, e cada uso declara a sua (14px no título, 8px na frase, 4px de padrão).
2. **Item de grade estica.** A máscara da frase ficava com 314px de altura para 78px de texto, e o `translateY(100%)` movia o conteúdo 78px — bem dentro da área visível, sem esconder nada. Resolvido com `height: fit-content`.

Verificado: escondido = altura exata do conteúdo, montado = 0, e reversível nos dois sentidos.

**DoD verificado:** medido no navegador, no parágrafo das recargas (134 caracteres).

| Progresso | Acesos | p10 | p50 | p90 |
|---:|---:|---:|---:|---:|
| 0,31 | 0/134 | 0,14 | 0,14 | 0,14 |
| 0,375 | 62/134 | 1,00 | 0,51 | 0,14 |
| 0,40 | 134/134 | 1,00 | 1,00 | 0,91 |
| subindo 0,375 | 72/134 | 1,00 | 0,67 | 0,14 |
| subindo 0,31 | 0/134 | 0,14 | 0,14 | 0,14 |

O gradiente `p10 > p50 > p90` é o stagger, e o retorno desfaz até o estado inicial. Contador: `0 → 650 → 1.200` descendo, `1.200 → 749 → 0` subindo.

**Três armadilhas do SplitText, todas registradas no código:**

1. **Sem `revert()` no cleanup**, cada remontagem duplica a marcação e o texto vira lixo.
2. **A quebra de linha congela** no instante da divisão. Sem re-split, redimensionar deixa as linhas onde estavam, atravessando a coluna nova.
3. **Dividir só em `chars`** solta cada letra como elemento próprio e o navegador passa a quebrar linha no meio das palavras. `type: 'lines,words,chars'` existe para segurar a quebra.

O `aria-label` com o texto original é preservado pelo plugin: verificado, o leitor de tela continua lendo a frase inteira, não 134 letras soltas.

**Opacidade inicial 0,14 e não 0:** o parágrafo apagado por completo abre um buraco na composição e o olho perde a referência de onde o texto vai nascer.

---

### Sprint 5 — Painéis de produto 01/02/03 · *5–6 dias*
**Objetivo:** o miolo do site. É o sprint mais pesado.

- [ ] Componente `<ProductPanel>` parametrizado pelo `data/products.ts`
- [ ] Interpolação de fundo **preto → laranja → branco** e inversão de cor do texto junto
- [ ] Crossfade da versão do logo no header acompanhando a inversão
- [ ] Clip-reveal de título/régua/frase de destaque
- [ ] Troca de rótulo (textura) e reescala AA → AAA durante a passagem
- [ ] Accordions "Ficha técnica" e "Aplicações" (acessíveis, com teclado)
- [ ] Dropdown da pill navegando por `labelToScroll`
- [ ] Links do header saltando para os labels

**DoD:** os 3 painéis rodam dentro do mesmo pin, sem remount do canvas, e a navegação por label chega no lugar certo.

---

### Sprint 6 — Seções finais · ✅ **CONCLUÍDO 13/08/2026**

- [x] **Beat 7 (impacto): contador ligado ao scrub + SVG com trace** — `GraficoImpacto.tsx`
- [x] **Beat 8 (compra):** render de apoio ao lado do CTA, seta que atravessa o botão no hover
- [x] **Beat 9 (footer):** régua de políticas separada do aviso de direitos
- [x] Políticas: **linkadas**, não escritas. Ver abaixo

**O gráfico diz uma coisa e não inventa número nenhum.** As duas linhas saem do MESMO ponto e o que as separa é o descarte: a dos descartáveis sobe uma unidade por ciclo, a da Gshield fica deitada em uma, porque é sempre a mesma pilha voltando. O vão entre elas é o argumento. Tudo vem da ficha (1.200 ciclos, uma unidade); nada de custo, que não temos.

**Política de privacidade: linkada, não escrita.** É documento jurídico, e inventar conteúdo legal é pior do que não ter. Os links apontam para as páginas que a loja já mantém, com os caminhos padrão. **Pendência: conferir os endereços.**

**DoD verificado:** o espaçador do pin termina em 12.580 e o impacto começa em 12.580. Lacuna de 0px, e `sobrepoe: false` nas cinco amostras ao longo da costura. A cena chega em opacidade 0 antes do fim do pin, então nada do produto fica pendurado sobre o conteúdo normal.

**Um bug estrutural apareceu aqui, e valia por si só.**

O gatilho do gráfico nasceu com início em **450** enquanto o elemento está em **12.941** — a diferença é exatamente a altura do pin. Todo gatilho criado ANTES do pin mede uma página que ainda não tem o espaçador de quase dezesseis alturas de tela, e ninguém o avisa depois.

Duas correções, as duas necessárias:

1. `refreshPriority: 1` no pin, para ele recalcular antes de todos os outros.
2. `ScrollTrigger.refresh()` no fim de `montarTimeline`, porque `refreshPriority` só ordena os refreshes que acontecerem daí em diante, e os gatilhos pós-pin já tinham sido medidos.

Isso vale para **qualquer** gatilho abaixo do pin, não só o do gráfico. Segunda armadilha do mesmo dia: âncora `end: 'bottom …'` numa seção mais alta que a tela faz a janela depender da altura da seção. Nas duas âncoras no elemento que anima, a janela é sempre a mesma fração de tela.

---

### Sprint 7 — auditoria de 13/08/2026

Seis frentes auditadas em paralelo, cada achado passado por um cético que tentou refutá-lo. O que sobreviveu, e o que foi feito:

| Achado (confirmado) | Medida | Correção |
|---|---|---|
| Seis dos sete beats fora da árvore de acessibilidade | conteúdo comercial inteiro | `ResumoDoAto`, bloco linear `sr-only` montado a partir de `data/products.ts` |
| Anel de foco laranja sobre painel laranja | **1,00:1** | anel de dois tons, branco+preto, invertido em superfície clara |
| Anel sobre superfícies brancas | 1,99:1 | idem |
| Accent laranja no painel 03 | **2,18:1** | accent preto; o "OU" virou chapado laranja com tinta preta (10,56:1) |
| Cena na FRENTE do texto no retrato, e engolindo o toque | medido em 390×844 | `-z-10` no retrato e `pointer-events: none` no próprio canvas |
| Painel do kit cortando conteúdo | **62px**, "Compatibilidade" fora da tela | guarda estendida para `max-height: 910px` |
| VRAM em texturas de rótulo | **209,7 MB** | mapas reduzidos a 1024 de largura: **52,4 MB** |
| Sem JS os sete beats se sobrepõem | reprova §6.11 | regras de desempilhamento no `<noscript>` |
| Movimento reduzido: cena congelada cobrindo a página | reprova §6.10 | a cena não monta nesse modo |
| SplitText escrevia `aria-label` em `<p>` | proibido pela ARIA 1.2 | `aria: 'hidden'` na configuração |
| Nove âncoras internas levando ao painel errado | | `LinkDeBeat`, que converte o clique em posição de scroll |
| Canvas renderizando com Bloom depois de invisível | | `frameloop: 'never'`, com despertador por evento de scroll |

**Três lições que valem além deste projeto:**

**`autoAlpha` acerta o foco e erra o leitor de tela.** Ele aplica `visibility: hidden`, o que corretamente tira os beats invisíveis da ordem de tabulação. Mas a mesma propriedade os tira da árvore de acessibilidade, e num trecho pinado a única forma de revelar o próximo é rolar a janela. Scrollytelling precisa de uma versão linear do conteúdo, sempre.

**Dentro de um pin, todo `z-index` é local.** O elemento pinado ganha `position: fixed` e um `transform`, e cada um cria contexto de empilhamento: o `z-2` do conteúdo passa a valer só dentro dele. Qualquer z positivo numa camada irmã fica por cima de tudo. Só valor negativo resolve sem depender de quem cria contexto.

**`pointer-events: none` no container não alcança o canvas.** O R3F cria um div interno e o `<canvas>` com `pointer-events: auto`, e o filho vence o pai. A cena cobria o texto E engolia o toque.

---

### Sprint 7 — Mobile, performance e acessibilidade · *4–5 dias*
**Objetivo:** funcionar de verdade fora do MacBook do dev.

- [ ] Coreografia mobile própria (beats encurtados, poses ajustadas para retrato)
- [ ] Remoção de canvas/efeitos de hover em `(pointer: coarse)`
- [ ] Teste real em iOS Safari e Android Chrome de baixo/médio porte
- [ ] Fallback sem WebGL validado
- [ ] Auditoria de teclado: foco visível, ordem lógica, accordions e menu operáveis
- [ ] Verificar contraste em **todas** as fases da interpolação de fundo, não só nos extremos
- [ ] Conferir redução mínima do logo (120px completa / 30px ícone) em todos os breakpoints
- [ ] `prefers-reduced-motion` revalidado ponta a ponta
- [ ] Bater todos os números da tabela do §6.12
- [ ] SEO: metadata, OG image, JSON-LD de Produto, sitemap

**DoD:** todos os limites do orçamento de performance atingidos em device real.

---

### Sprint 8 — publicação estática (13/08/2026)

**Decisão do projeto: não há domínio.** O destino é o GitHub Pages, num subcaminho (`/pilhaturbopowerfast`), e isso muda a natureza da entrega: não existe servidor Node do outro lado.

| Consequência | O que foi feito |
|---|---|
| Sem rotas dinâmicas | `/api/dev-save` removida, junto com `gerar-rotulo.js` e o script de auditoria do rótulo |
| Sem otimizador de imagem | `images.unoptimized`, e as fotos reduzidas ao tamanho em que aparecem |
| A página não fica na raiz | `basePath` e `assetPrefix`, mais a função `asset()` |
| Rotas de metadados | `export const dynamic = 'force-static'` em `robots.ts` e `sitemap.ts` |

**Três armadilhas do export, todas invisíveis até servir o `out/` de verdade:**

1. **`<Image>` com `unoptimized` NÃO aplica o `basePath`.** O prefixo só existia na URL do otimizador, que deixa de existir. Toda foto dava 404 no subcaminho. Por isso `asset()` é aplicado também no `src` de cada `<Image>`, e não só onde o arquivo é buscado na mão.
2. **O Next não copia dotfiles de `public/`.** Um `.nojekyll` colocado ali nunca chega ao `out/`. Ele é criado no fluxo de publicação.
3. **Quem busca o arquivo direto nunca recebe o prefixo.** O carregador de textura do Three.js e o pré-carregamento do preloader montam a URL na mão: sem `asset()`, a pilha apareceria sem rótulo e o preloader nunca chegaria a 100%, os dois em silêncio.

**Verificado servindo o `out/` no subcaminho:** zero respostas 4xx, oito texturas em 200, cinco imagens resolvidas, e a cena desenhando (9 chamadas, 20.352 triângulos).

**Recorte de fundo: a franja é para COMER, não para adivinhar.**

A primeira versão apagava pixels acima de 232 de luminância e considerava opaco todo o resto. Mas a franja anti-serrilhado de um objeto escuro sobre branco percorre a faixa inteira: um pixel com 40% de cobertura fica em torno de 160. Ele não entrava no fundo, saía opaco e cinza-claro, e sobre a página preta virava um halo em volta de cada peça. Sobre branco isso é invisível, que é exatamente por que passou: **a conferência tem de ser feita no fundo em que a imagem vai aparecer.**

O tratamento correto é retirar dois pixels da borda com alfa em rampa e **substituir a cor deles pela do interior**. Assim não sobra mistura com o fundo antigo em canal nenhum. Dois pixels em 600 é invisível; um halo claro sobre preto não é.

**E buraco de fundo não se distingue de tinta branca por limiar.** Uma passagem que apagava toda região clara cercada pelo objeto comeu o "POWERFAST" impresso no corpo preto da pilha. Os dois se separam por TAMANHO e UNIFORMIDADE: o vão interno de um cabo enrolado é enorme e chapado, porque é o infinito do estúdio; uma letra é pequena e tem sombreado, porque é tinta recebendo luz. Como as cartelas têm tinta clara e os cabos não, os limites são por imagem, não globais.

**Performance, no mesmo sprint.** O FPS caiu para ~21 e a causa era minha: o despertador do laço de render chamava `setFrameloop` a cada evento de scroll, e cada chamada escreve no store do R3F e re-renderiza a árvore do Canvas. Custo aparecendo exatamente durante a rolagem, que é o único momento em que a suavidade importa. Corrigido lembrando o modo num ref, para a chamada só acontecer na transição.

Junto, três medidas de custo por pixel, que é o que limita esta cena (nove chamadas de desenho, mas cada pixel passa pelo Bloom):

- `resolutionScale={0.5}` no Bloom: o borrão é névoa, sem frequência alta a preservar. Corta 75% dos pixels processados.
- `multisampling={0}` no composer: o padrão é 8 amostras resolvendo o buffer inteiro a cada quadro.
- Teto de `dpr` em 1,75 no desktop: em tela retina, 2 quadruplica a área em relação a 1.

---

### Sprint 8 — Polimento e entrega · *3 dias*
**Objetivo:** os últimos 5% que separam "bom" de "igual à referência".

- [ ] Passada de timing: ajustar durações de cada beat "no olho"
- [ ] Micro-interações: hover de links, cursor, estados de foco
- [ ] Grão/textura sobre o fundo (`mix-blend-mode: multiply`)
- [ ] Revisão de copy (PT-BR)
- [ ] Analytics + consentimento de cookies
- [ ] Cross-browser (Chrome, Safari, Firefox, Edge)
- [ ] Deploy de produção + domínio

**DoD:** um teste cego lado a lado com a referência não revela diferença de acabamento.

---

**Total estimado: ~30–36 dias úteis** (~6–7 semanas) para 1 dev. O Sprint 2 pode rodar em paralelo com o 0/1 se a modelagem 3D for terceirizada.

---

## 9. O que preciso de você

### 9.1 Recebido ✅

| Item | Status |
|---|---|
| **Manual de identidade visual** | ✅ `brand/manual_marca_gshield.pdf` — paleta, tipografia, respiro, redução e usos indevidos extraídos |
| **Paleta** | ✅ `#FFA400` / `#000000` / `#FFFFFF` · PANTONE 137 C |
| **Tipografia** | ✅ Bebas Neue Bold + Montserrat Medium/Black — **gratuitas no Google Fonts**, sem custo de licença |
| **Ficha técnica** | ✅ AA 3400 mWh, AAA 1100 mWh, 1,5V, 1.200 ciclos, proteções, kit e garantia |
| **Copy base** | ✅ Descrição comercial completa |
| **Render do produto** | ✅ 9 ângulos (frente, verso, topo, base, deitada) |

### 9.2 Logo — resolvido para produção

| Arquivo em `public/brand/` | Origem | Uso |
|---|---|---|
| `logo-negativa.png` · 689×300, alpha | CDN da loja | Logo **completa** sobre fundo escuro — header e footer |
| `icone-negativo.png` · 1080×1080, alpha | `LOGO.png` | Ícone (escudo branco + gorila laranja) para fundo escuro |
| `icone-positivo.png` · 2000×2000, alpha | `LOGO (1).png` | Ícone (escudo preto + gorila laranja) para fundo claro — **usado no menu mobile** |

Isso cobre as duas versões que o manual define e destrava a troca de tema do Sprint 5.

**Conferência dos arquivos — 13/08/2026.** Os três que temos são só desenho, nenhum traz o logotipo escrito:

| Arquivo | O que é |
|---|---|
| `logo-negativa.png` | gorila laranja, sem escudo e sem palavra |
| `icone-negativo.png` | o mesmo gorila, em quadrado |
| `icone-positivo.png` | escudo de contorno preto com o gorila laranja |

**Três lacunas, e a terceira é a que trava o header:**

| Item | Impacto |
|---|---|
| **Marca completa (desenho + "GORILA SHIELD" escrito)** | Não existe em nenhuma versão. Hoje o header e o rodapé mostram só o desenho |
| **Vetor (`.svg`)** | PNG de 2000px cobre todo uso web, inclusive retina. O SVG só faria falta em favicon muito nítido |
| **Versão para FUNDO LARANJA** | **Bloqueante do header fixo.** A negativa é laranja inteira e some no `#FFA400`; a positiva tem o gorila laranja, que também some, sobrando só o contorno do escudo. Nenhum dos dois arquivos serve no painel 02, e é justamente por onde o header fixo passa |

**Sobre o `Logo_Gorila.ai`.** Tentei converter para SVG. O arquivo é PDF-1.5 por fora, mas a arte real está em `AIPrivateData` (formato proprietário da Adobe) e a camada PDF usa **colorspace Lab** — a conversão automática produziu cores erradas (`#a094be` no lugar do laranja). Para uma marca isso é pior que usar o PNG oficial, então **descartei a extração**. O caminho certo é abrir no Illustrator e usar *Exportar como SVG* — 30 segundos para quem tem o programa. O `.ai` ficou guardado em `brand/`.

**Não vetorizei por tentativa e erro.** O manual é explícito: *"Não tente recriá-la, pois você estará arriscando a qualidade do serviço."*

### 9.3 Necessário até o Sprint 2

| Item | Formato | Observação |
|---|---|---|
| **Modelo 3D da pilha** | `.glb`/`.fbx`/`.blend` | Se não existir, eu modelo — `public/produto/pilha360.png` traz 9 ângulos e a geometria é simples: cilindro, tampa laranja, terminal metálico, recorte do USB-C |
| **Arte do rótulo planificada** | `.ai`/`.svg`/PNG 2048px | Para virar textura. Inclui "PILHA RECARREGÁVEL TURBO TIPO-C", wordmark POWERFAST, selo do escudo e o texto de advertência do verso |
| ~~**Dimensões reais**~~ | ✅ **recebido 13/08** | AA 50,5 × 14,5 mm · AAA 44,5 × 10,5 mm. Em `src/data/products.ts` → `DIMENSIONS` |

> **Achado nas dimensões — importa para o beat 5.** A AAA **não é** a AA reduzida uniformemente:
> diâmetro `10,5 / 14,5 = 0,724` mas comprimento `44,5 / 50,5 = 0,881`.
> Ou seja, a AAA é proporcionalmente mais **esguia** (1:4,24 contra 1:3,48). A transição entre os painéis 01 e 02 precisa de escala **não uniforme** — X/Z por 0,724 e Y por 0,881. Escala uniforme deixaria a AAA visivelmente gorda. Já exportado como `AAA_SCALE`.

### 9.4 Necessário até o Sprint 5

| Item | Observação |
|---|---|
| **Render do cabo USB-A + 4 Tipo-C** | Protagonista do painel 03 |
| **Link de compra definitivo** | Página do produto em gorilashield.com.br |
| **Certificações** | Se houver selo (INMETRO, CE, RoHS) para a ficha técnica |

### 9.5 Decisões travadas — 13/08/2026

| Decisão | Escolha |
|---|---|
| **3D** | ✅ WebGL real (`.glb` + Draco + R3F) |
| **CSS** | ✅ Tailwind CSS v4 |
| **Idioma** | ✅ PT-BR apenas, sem i18n |
| **Conteúdo** | ✅ `data/products.ts`, sem CMS |
| **Paleta** | ✅ `#FFA400` / `#000000` / `#FFFFFF` + rampa de superfície derivada (§5.1) |
| **Tipografia** | ✅ Bebas Neue Bold (títulos) + Montserrat Medium/Black (corpo), **peso mínimo 500** |

> Reflexo no cronograma: sem i18n, o Sprint 8 perde o item de tradução. Fontes gratuitas eliminam a espera por licenciamento. Estimativa mantida em ~30–36 dias úteis.

### 9.6 Decisões abertas

1. **Painéis: 2 ou 3?** A linha tem AA e AAA. Proponho um terceiro painel para o cabo/kit. Alternativa: rodar com dois e encurtar o pin em ~3 telas.
2. **Headline do hero.** Três opções escritas em `src/data/products.ts` → `HEADLINE_OPTIONS`. O manual não define slogan.
3. **Escopo do 3D.** Um modelo escalado entre AA e AAA, ou dois modelos distintos? Um só é mais leve e permite a transição contínua do beat 5.

### 9.7 Pendências de conteúdo encontradas na copy

Levantadas ao estruturar `src/data/products.ts`. Nenhuma bloqueia o desenvolvimento, mas todas precisam de resposta antes do site ir ao ar.

| # | Ponto | Situação |
|---|---|---|
| 1 | **Nº de conectores do cabo** | ✅ **Resolvido 13/08** — confirmado com foto: o cabo tem **4 conectores Tipo-C** e uma ponta USB-A. `products.ts` atualizado. |
| 2 | **Unidade de capacidade** | Está em **mWh**, não mAh. Correto para célula Li-ion com conversor, e foi mantido. Só sinalizando que é incomum na categoria e o consumidor pode estranhar — talvez valha uma nota explicativa no accordion. |
| 3 | **Química da célula** | As specs dizem só "células recarregáveis de alta performance". 1,5 V + USB-C indica **Li-ion com conversor**, não NiMH. Vale confirmar e declarar. |
| 4 | **Argumento não explorado** | Se for Li-ion, a pilha entrega **1,5 V constante até acabar**, enquanto NiMH cai para ~1,2 V e vai perdendo força. Isso é um diferencial forte e não aparece em lugar nenhum da copy atual. Recomendo incluir. |
| 5 | **Tempo de recarga** | "Carregamento em tempo reduzido" não é um número. Um valor concreto (ex.: "cheia em 2h") vale muito mais no painel. |
| 6 | **Garantia de 3 meses** | Curta para um produto que promete 1.200 ciclos. Não é problema técnico, mas cria uma dissonância que o visitante atento percebe. Decidir o quanto destacar. |
| 7 | **Laranja divergente na loja** | O manual define `#FFA400`. Amostrei os arquivos do CDN da loja: o ícone é **`#FFA300`** e o logo completo renderiza **`#FEA30B`**. Um tom de diferença. **Adotei `#FFA400`** — o manual é o documento normativo. Sinalizando porque significa que a loja atual está fora do padrão do próprio manual. |
| 8 | **Bebas Neue não tem "Bold" na web** | O manual pede **Bebas Neue Bold**, mas o Google Fonts distribui a família em **peso único (400)**. O corte disponível já é visualmente robusto e é o que o mercado usa como padrão web. Se a marca exigir o Bold real, é preciso licenciar a família completa (Dharma Type) e servir como `.woff2` local. Rodando com o 400 por ora. |

---

## Referências técnicas

- GSAP ScrollTrigger — https://gsap.com/docs/v3/Plugins/ScrollTrigger/
- GSAP SplitText — https://gsap.com/docs/v3/Plugins/SplitText/
- Lenis — https://github.com/darkroomengineering/lenis
- React Three Fiber — https://r3f.docs.pmnd.rs/
- Compressão Draco — https://github.com/google/draco
- Site de referência — https://klimtwine.com/en (feito pelo estúdio Dops)
