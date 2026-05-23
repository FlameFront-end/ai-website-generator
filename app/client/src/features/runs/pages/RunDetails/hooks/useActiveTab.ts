import { useCallback, useMemo } from "react";

import { useSearchParams } from "react-router-dom";

import { TABS } from "../lib/constants";
import type { RunDetailsTab } from "../lib/types";

const TAB_IDS: RunDetailsTab[] = TABS.map((tab) => tab.id);

export function useActiveTab() {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = useMemo<RunDetailsTab>(() => {
    const raw = searchParams.get("tab") as RunDetailsTab | null;
    return raw && TAB_IDS.includes(raw) ? raw : "overview";
  }, [searchParams]);

  const setActiveTab = useCallback(
    (tab: RunDetailsTab) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("tab", tab);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return { activeTab, setActiveTab };
}
