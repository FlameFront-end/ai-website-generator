import { promises as fs } from 'node:fs';

export async function writeImageResultToFile(
  image: string,
  absolutePath: string,
): Promise<void> {
  if (image.startsWith('data:image/')) {
    const base64 = image.replace(/^data:image\/\w+;base64,/, '');
    await fs.writeFile(absolutePath, Buffer.from(base64, 'base64'));
    return;
  }

  if (/^[A-Za-z0-9+/=]+$/.test(image)) {
    await fs.writeFile(absolutePath, Buffer.from(image, 'base64'));
    return;
  }

  const response = await fetch(image);
  if (!response.ok) {
    throw new Error(`Failed to download generated image: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(absolutePath, buffer);
}
