export function resolveArtifactFileQueryId(
  isOpen: boolean,
  isText: boolean,
  artifactId: string,
): string | undefined {
  if (!isOpen || isText) return undefined;
  return artifactId;
}
