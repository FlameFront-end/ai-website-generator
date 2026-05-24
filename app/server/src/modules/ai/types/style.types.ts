export interface StyleVariant {
  id: string;
  name: string;
  description: string;
  visualStyle: string;
  colorPalette: string[];
  typographyStyle: string;
  layoutStyle: string;
  moodKeywords: string[];
}

export interface StyleVariantsResult {
  variants: StyleVariant[];
}
