# Rótulo oficial da AA — levantamento

Trabalho **em andamento**. Nada aqui entrou ainda na cena 3D: as texturas em
`public/produto/rotulo_aa*.png` continuam sendo as antigas.

## O que já existe nesta branch

| arquivo | o que é |
|---|---|
| `../../public/produto/GS-11546 … AA - TIPO C.pdf` | a arte oficial, como veio |
| `oficial-aa-4000.png` | a mesma arte rasterizada a 4000 px |
| `rasterizar.mjs` | como o PNG acima foi gerado |

O PDF é **vetorial** e tem uma página só — não há imagem embutida para
extrair, então ele rasteriza em qualquer resolução sem perder nada.
`rasterizar.mjs` fala CDP com um Chrome em `--remote-debugging-port=9222`,
renderiza com pdf.js e lê o canvas. Serviu porque não há poppler nesta
máquina e o visualizador de PDF do headless não entra na captura de tela.

## Como a arte é orientada

A leitura importa porque ela não bate com a textura atual.

- O eixo **horizontal** da arte (52,0 mm) é o **comprimento** da pilha. Quem
  entrega isso é o `+` desenhado na faixa laranja: `+` marca o polo
  positivo, então a faixa laranja é a PONTA da pilha, não uma lateral.
- O eixo **vertical** (49,5 mm) é a **circunferência**. 49,5 / π = 15,8 mm de
  diâmetro, que é a medida de uma 14500 com a capa — coerente.
- Os dois `2.0 mm` marcam sobra de colagem nas pontas; a linha tracejada
  vermelha é a margem de segurança.

Ou seja: para virar textura de cilindro a arte precisa girar 90°, com a
faixa laranja indo para o TOPO — que é onde a textura de hoje já põe a
tampa e a porta.

## Onde a pilha de hoje não é fiel

Comparando `oficial-aa-4000.png` com `public/produto/rotulo_aa.png`:

1. **Laranja.** A arte especifica `#FF6702`; a cena usa `#FFA400`. É a
   diferença mais visível, e ela contamina também a tampa e o Bloom.
2. **Corpo.** O oficial é um carvão (~`#2A2E35`), não preto puro.
3. **Duas travas de marca**, em alturas diferentes da circunferência — a
   textura atual tem uma só. São elas que fazem a marca aparecer de mais
   ângulos sem depender da pose.
4. **Faixa de especificação** no pé: `AA | 1,5 V | 3400 mWh | BATERIA
   RECARREGÁVEL DE ÍONS DE LÍTIO`. Não existe hoje.
5. **Bloco de cuidado** com os dois símbolos de descarte e o
   `FABRICADO NA R.P.C`. Hoje há só os ícones, sem texto.
6. **Porta USB-C.** No oficial ela é um FURO na faca (9 × 3 mm, a 3,5 mm da
   borda), não arte. A cena não tem furo de verdade — o corpo é um cilindro
   sem recorte (ver o comentário no fim de `Battery.tsx`) — então a porta
   vai continuar sendo desenhada nos mapas, agora na posição do furo
   oficial.

## O que falta fazer

1. Recortar o retângulo do rótulo do PNG (fora as cotas em azul) medindo as
   bordas por varredura, não a olho.
2. Girar 90° (laranja para cima) e reamostrar para a textura, mantendo a
   proporção circunferência × comprimento.
3. Compor a porta USB-C na posição oficial, reaproveitando o desenho da
   cavidade que já existe no rótulo atual.
4. Regerar os outros três mapas — rugosidade, metálico e normal — a partir
   do novo desenho. O `sharp` já está no projeto e dá conta.
5. Reconferir `ANGULO_PORTA` e `FACE_MARCA` em `Battery.tsx` e
   `scene-state.ts`: os dois são medidos em `u` e mudam junto com o layout.

## Duas decisões que dependem de você

- **AAA.** O PDF é só da AA. Reaproveitar a arte trocando a faixa do pé
  (`AAA` e a capacidade) esbarra na fonte da marca, que saiu do repositório
  no commit `4df966d`. Ou você manda a arte oficial da AAA, ou manda a
  fonte, ou a AAA fica com a textura antiga — e aí as duas pilhas da página
  não conversam.
- **Laranja da marca.** Trocar para `#FF6702` no rótulo deixa a pilha
  diferente do resto do site, que é `#FFA400` (`--brand-orange`, tampa,
  gráfico, botões). Ou a página inteira acompanha o rótulo, ou fica um
  laranja para cada coisa.
