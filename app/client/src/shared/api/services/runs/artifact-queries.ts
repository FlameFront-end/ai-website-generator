import { useQueries, useQuery } from "@tanstack/react-query";
import { useEffect, useState, useSyncExternalStore } from "react";

import { runsApi } from "./runs-api";
import { runsQueryKeys } from "./query-keys";
import {
  createObjectUrlMapStore,
  createObjectUrlStore,
} from "./object-url-store";

export function useArtifactContentQuery(runId: string, artifactId?: string) {
  return useQuery({
    queryKey: runsQueryKeys.artifactContent(runId, artifactId ?? ""),
    queryFn: () => runsApi.getArtifactContent(runId, artifactId ?? ""),
    enabled: Boolean(runId && artifactId),
    staleTime: Infinity,
  });
}

export function useArtifactFileUrl(runId: string, artifactId?: string) {
  const query = useQuery({
    queryKey: runsQueryKeys.artifactFile(runId, artifactId ?? ""),
    queryFn: () => runsApi.getArtifactFile(runId, artifactId ?? ""),
    enabled: Boolean(runId && artifactId),
    retry: false,
    staleTime: Infinity,
  });

  const url = useObjectUrl(query.data);

  return { ...query, url };
}

export function useArtifactFileUrls(
  runId: string,
  artifactIds: readonly string[],
) {
  const queries = useQueries({
    queries: artifactIds.map((artifactId) => ({
      queryKey: runsQueryKeys.artifactFile(runId, artifactId),
      queryFn: () => runsApi.getArtifactFile(runId, artifactId),
      enabled: Boolean(runId && artifactId),
      retry: false,
      staleTime: Infinity,
    })),
  });
  return useObjectUrlMap(
    artifactIds,
    queries.map((query) => query.data),
  );
}

function useObjectUrl(blob: Blob | undefined): string | null {
  const [store] = useState(createObjectUrlStore);
  const url = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );

  useEffect(() => {
    store.setBlob(blob);

    return () => {
      store.setBlob(undefined);
    };
  }, [blob, store]);

  useEffect(() => () => store.dispose(), [store]);

  return url;
}

function useObjectUrlMap(
  artifactIds: readonly string[],
  blobs: readonly (Blob | undefined)[],
): Record<string, string> {
  const [store] = useState(createObjectUrlMapStore);
  const urls = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );

  useEffect(() => {
    store.setBlobs(artifactIds, blobs);
  }, [artifactIds, blobs, store]);

  useEffect(() => () => store.dispose(), [store]);

  return urls;
}
