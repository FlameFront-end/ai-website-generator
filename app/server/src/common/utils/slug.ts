export function generateSlug(prefix: string, runNumber: number): string {
  const padded = String(runNumber).padStart(4, '0');
  return `${prefix}-${padded}`;
}
