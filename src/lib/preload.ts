/**
 * Orquestrador de carregamento.
 *
 * REGRAS.md §6.9: o `%` do preloader reflete progresso REAL. Nada de
 * `setInterval` fingindo. Se o número mentir, o primeiro beat engasga —
 * o usuário chega ao hero antes da cena estar pronta.
 *
 * Mas progresso real cru fica feio: com 4 tarefas o número pula de 25 em 25
 * e crava 100% em milissegundos, e aí o loader só espera parado. Então o
 * valor EXIBIDO é limitado por duas coisas ao mesmo tempo:
 *
 *   exibido = min(progresso real, tempo decorrido / duração mínima)
 *
 * Continua honesto — nunca mostra mais do que já carregou de verdade —
 * mas sobe de forma contínua. Um lerp por quadro tira o degrau dos saltos.
 *
 * No Sprint 2 o GLB e o HDR entram aqui como tarefas adicionais e passam a
 * dominar o tempo real, como deve ser.
 */

export type PreloadTask = { label: string; run: () => Promise<unknown> }

/** Imagens que precisam estar prontas antes do primeiro beat. */
const CRITICAL_IMAGES = [
  '/brand/logo-negativa.png',
  '/brand/logo-positiva.png',
  '/brand/logo-mono-negativa.png',
  '/brand/icone-negativo.png',
  '/brand/icone-positivo.png',
]

function loadImage(src: string) {
  return new Promise<void>((resolve) => {
    const img = new Image()
    // Falha de asset não pode travar a página: resolve nos dois casos.
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = src
  })
}

function loadFonts() {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve()
  return document.fonts.ready.then(() => undefined)
}

export function buildTasks(): PreloadTask[] {
  return [
    { label: 'fontes', run: loadFonts },
    ...CRITICAL_IMAGES.map((src) => ({
      label: src,
      run: () => loadImage(src),
    })),
  ]
}

/**
 * @param onProgress recebe 0→1, chamado a cada quadro
 * @param minDurationMs piso de duração — o loader nunca passa correndo
 */
export function runPreload(
  onProgress: (value: number) => void,
  minDurationMs = 2600,
): Promise<void> {
  const tasks = buildTasks()
  const total = tasks.length

  let realProgress = 0
  let loaded = false

  const all = Promise.all(
    tasks.map((t, i) =>
      t.run().then(() => {
        realProgress = Math.max(realProgress, (i + 1) / total)
      }),
    ),
  ).then(() => {
    realProgress = 1
    loaded = true
  })

  onProgress(0)

  // Aba em segundo plano: o requestAnimationFrame fica congelado, então
  // não há quadros para animar. Ninguém está vendo — resolve direto.
  if (typeof document !== 'undefined' && document.hidden) {
    return all.then(() => onProgress(1))
  }

  const started = performance.now()

  return new Promise<void>((resolve) => {
    let shown = 0

    const tick = () => {
      const elapsed = performance.now() - started
      const timeCap = Math.min(1, elapsed / minDurationMs)
      const target = Math.min(realProgress, timeCap)

      // Lerp tira o degrau dos saltos de 25 em 25
      shown += (target - shown) * 0.14

      if (loaded && timeCap >= 1 && target - shown < 0.005) {
        onProgress(1)
        resolve()
        return
      }

      onProgress(shown)
      requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  })
}
