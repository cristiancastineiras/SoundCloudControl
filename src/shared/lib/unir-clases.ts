/** Une clases CSS truthy en un solo string. */
export function unirClases(
  ...clases: ReadonlyArray<string | false | null | undefined>
): string {
  return clases.filter(Boolean).join(' ');
}
