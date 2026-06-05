import { useEffect } from "react";
import type { RefObject } from "react";

export function useAnswerHistoryScroll(
  historyListRef: RefObject<HTMLDivElement | null>,
  answersCount: number,
  isHistoryExpanded: boolean,
): void {
  useEffect(() => {
    const historyList = historyListRef.current;
    if (!historyList) return;

    requestAnimationFrame(() => {
      historyList.scrollTo({
        top: historyList.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [answersCount, historyListRef, isHistoryExpanded]);
}
