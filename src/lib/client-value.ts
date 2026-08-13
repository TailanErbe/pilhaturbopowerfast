import { useSyncExternalStore } from 'react'

/**
 * Lê um valor que só existe no cliente, sem `setState` dentro de efeito.
 *
 * O padrão `useEffect(() => setX(...), [])` dispara uma segunda renderização
 * em cascata e é sinalizado pelo lint do React 19. `useSyncExternalStore`
 * resolve na origem: devolve o valor do servidor na hidratação e o valor
 * real do cliente daí em diante.
 *
 * `ler` precisa ser barato e devolver sempre o mesmo valor para a mesma
 * situação — cacheie leituras caras no módulo.
 */
const semInscricao = () => () => {}

export function useClientValue<T>(ler: () => T, noServidor: T): T {
  return useSyncExternalStore(semInscricao, ler, () => noServidor)
}
