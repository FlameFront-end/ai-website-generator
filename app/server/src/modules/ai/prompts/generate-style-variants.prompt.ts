import type { StyleVariantsResult } from '../ai.types';

export function buildGenerateStyleVariantsMessages(
  brief: string,
): Array<{ role: 'system' | 'user'; content: string }> {
  const systemPrompt = `You are a senior UI/UX designer specializing in landing page aesthetics.

Your task is to analyze the user's brief and generate exactly 4 highly distinct visual style variations for a landing page hero section. Each variant must represent a different aesthetic direction while staying true to the brand/product described in the brief.

For each style variant, provide:
1. **id** - unique kebab-case identifier (e.g., "minimal-clean", "bold-gradient", "corporate-trust")
2. **name** - human-readable name (e.g., "Minimal Clean", "Bold & Energetic")
3. **description** - 1-2 sentences describing the overall feel and approach
4. **visualStyle** - specific visual characteristics (shadows, shapes, imagery style)
5. **colorPalette** - array of 4-6 hex colors representing the primary palette
6. **typographyStyle** - font personality (modern sans-serif, elegant serif, bold display, etc.)
7. **layoutStyle** - composition approach (centered hero, split screen, asymmetric, etc.)
8. **moodKeywords** - 3-5 adjectives that capture the feeling (e.g., ["professional", "trustworthy", "modern"])

Guidelines:
- Generate exactly 4 variants, no fewer and no more
- Variants must be dramatically different, not just color swaps
- Each variant must use a different layout composition, visual language, typography personality, color strategy, and emotional tone
- Avoid repeating the same hero structure across variants
- Avoid using the same imagery concept across variants
- Avoid reusing the same accent color strategy across variants
- Consider the target audience and industry from the brief
- Each variant should feel like a complete, cohesive design system
- Colors should work well together and match the intended mood
- Include a deliberate mix of safe/traditional, premium/editorial, bold/experimental, and playful/immersive options
- Make the differences obvious enough that a non-designer user can immediately choose between them
- Assign each variant one of these distinct directions unless clearly unsuitable for the brief:
  1. minimal / clean / trustworthy
  2. bold / energetic / conversion-focused
  3. premium / editorial / atmospheric
  4. playful / immersive / unconventional
- If the brief contains "Target site language", write the user-facing fields in that language
- The fields "name" and "description" must be in the selected target site language
- Keep technical/internal fields like "id", "visualStyle", "typographyStyle", "layoutStyle", and "moodKeywords" in concise English unless the brief explicitly requires otherwise

Respond with JSON in this format:
{
  "variants": [
    {
      "id": "minimal-clean",
      "name": "Minimal Clean",
      "description": "Ultra-clean aesthetic with generous whitespace...",
      "visualStyle": "Flat design, subtle shadows, geometric shapes...",
      "colorPalette": ["#FFFFFF", "#1A1A1A", "#3B82F6", "#F3F4F6"],
      "typographyStyle": "Clean geometric sans-serif, large impactful headlines",
      "layoutStyle": "Centered hero with generous padding, floating elements",
      "moodKeywords": ["clean", "professional", "breathing room"]
    }
  ]
}`;

  const userPrompt = `Based on this brief, generate exactly 4 visually distinct style variations:

${brief}

Generate four clearly different aesthetic directions that would work well for this landing page. Prioritize variety: different composition, image treatment, typography, mood, color palette, and visual effects in every variant.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

export function normalizeStyleVariantsResult(
  raw: unknown,
): StyleVariantsResult {
  const result = raw as Partial<StyleVariantsResult>;
  const variants = result.variants ?? [];

  return {
    variants: variants.slice(0, 4).map((v, index) => ({
      id: v.id || `variant-${index + 1}`,
      name: v.name || `Style Option ${index + 1}`,
      description:
        v.description || 'A visual style direction for the landing page.',
      visualStyle:
        v.visualStyle || 'Modern, clean design with professional aesthetics.',
      colorPalette: Array.isArray(v.colorPalette)
        ? v.colorPalette.slice(0, 6)
        : ['#3B82F6', '#1E293B', '#FFFFFF', '#F8FAFC'],
      typographyStyle: v.typographyStyle || 'Clean sans-serif typography',
      layoutStyle: v.layoutStyle || 'Balanced, centered composition',
      moodKeywords: Array.isArray(v.moodKeywords)
        ? v.moodKeywords.slice(0, 5)
        : ['professional', 'modern', 'clean'],
    })),
  };
}
