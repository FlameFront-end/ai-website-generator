import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Read a local image file and return it as a data URL suitable for OpenAI-style
 * `image_url` content parts. Used to attach generated reference-block screenshots
 * to per-section codegen prompts so the model can render code that visually
 * matches the approved reference.
 */
export async function loadImageAsDataUrl(
  absolutePath: string,
): Promise<string> {
  const buffer = await fs.readFile(absolutePath);
  const mimeType = inferImageMimeType(absolutePath);
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

function inferImageMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'image/png';
  }
}
