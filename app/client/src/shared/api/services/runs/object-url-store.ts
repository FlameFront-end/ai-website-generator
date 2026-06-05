export interface ObjectUrlStore {
  dispose: () => void;
  getSnapshot: () => string | null;
  setBlob: (blob: Blob | undefined) => void;
  subscribe: (listener: () => void) => () => void;
}

export interface ObjectUrlMapStore {
  dispose: () => void;
  getSnapshot: () => Record<string, string>;
  setBlobs: (
    artifactIds: readonly string[],
    blobs: readonly (Blob | undefined)[],
  ) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createObjectUrlStore(): ObjectUrlStore {
  const listeners = new Set<() => void>();
  let currentBlob: Blob | undefined;
  let currentUrl: string | null = null;

  const notify = () => listeners.forEach((listener) => listener());

  const setBlob = (blob: Blob | undefined) => {
    if (blob === currentBlob) return;
    if (currentUrl) window.URL.revokeObjectURL(currentUrl);

    currentBlob = blob;
    currentUrl = blob ? window.URL.createObjectURL(blob) : null;
    notify();
  };

  return {
    dispose: () => {
      setBlob(undefined);
      listeners.clear();
    },
    getSnapshot: () => currentUrl,
    setBlob,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function createObjectUrlMapStore(): ObjectUrlMapStore {
  const listeners = new Set<() => void>();
  const entries = new Map<string, { blob: Blob; url: string }>();
  let snapshot: Record<string, string> = {};

  const notify = () => listeners.forEach((listener) => listener());

  const setBlobs = (
    artifactIds: readonly string[],
    blobs: readonly (Blob | undefined)[],
  ) => {
    const nextSnapshot: Record<string, string> = {};
    const activeIds = new Set(artifactIds);

    artifactIds.forEach((artifactId, index) => {
      const blob = blobs[index];
      if (!blob) return;

      const current = entries.get(artifactId);
      if (current?.blob === blob) {
        nextSnapshot[artifactId] = current.url;
        return;
      }

      if (current) window.URL.revokeObjectURL(current.url);

      const url = window.URL.createObjectURL(blob);
      entries.set(artifactId, { blob, url });
      nextSnapshot[artifactId] = url;
    });

    for (const [artifactId, entry] of entries) {
      if (!activeIds.has(artifactId)) {
        window.URL.revokeObjectURL(entry.url);
        entries.delete(artifactId);
      }
    }

    if (areUrlMapsEqual(snapshot, nextSnapshot)) return;
    snapshot = nextSnapshot;
    notify();
  };

  return {
    dispose: () => {
      setBlobs([], []);
      entries.clear();
      snapshot = {};
      listeners.clear();
    },
    getSnapshot: () => snapshot,
    setBlobs,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function areUrlMapsEqual(
  current: Record<string, string>,
  next: Record<string, string>,
): boolean {
  const currentKeys = Object.keys(current);
  const nextKeys = Object.keys(next);
  if (currentKeys.length !== nextKeys.length) return false;

  return nextKeys.every((key) => current[key] === next[key]);
}
