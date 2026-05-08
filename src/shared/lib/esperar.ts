/** Promesa que se resuelve tras `ms` milisegundos. */
export function esperar(ms: number): Promise<void> {
  return new Promise((resolver) => {
    setTimeout(resolver, ms);
  });
}
