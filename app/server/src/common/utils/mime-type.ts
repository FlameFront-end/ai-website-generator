const EXTENSION_MIME_MAP: Record<string, string> = {
  json: 'application/json',
  md: 'text/markdown',
  txt: 'text/plain',
  css: 'text/css',
  html: 'text/html',
  js: 'application/javascript',
  mjs: 'application/javascript',
  ts: 'application/typescript',
  tsx: 'application/typescript',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

export function inferMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_MIME_MAP[ext] ?? 'application/octet-stream';
}

export function isTextMimeType(mimeType: string): boolean {
  return (
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/javascript' ||
    mimeType === 'application/typescript'
  );
}
