export interface ReferenceBlockMeta {
  fileName: string;
  sectionId: string;
  sectionType: string;
}

export function parseBlockMeta(path: string, index: number): ReferenceBlockMeta {
  const fileName = path.split("/").pop() ?? `block-${index + 1}.png`;
  const stem = fileName.replace(/\.[^.]+$/, "");
  const withoutOrder = stem.replace(/^\d+-/, "");
  const typeMatch = withoutOrder.match(/[a-zа-яё]+$/i);

  return {
    fileName,
    sectionId: withoutOrder || `section-${index + 1}`,
    sectionType: typeMatch?.[0] ?? "",
  };
}
