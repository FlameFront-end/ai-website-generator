import { useRef, useState } from "react";

import { toast } from "react-toastify";

import { useClarifyBriefMutation } from "@/api/services/runs";
import type {
  BriefClarificationAnswer,
  ClarifyBriefResponse,
} from "@/api/services/runs";
import { logger } from "@/lib";

export function isLatestClarificationRequest(
  requestId: number,
  latestRequestId: number,
): boolean {
  return requestId === latestRequestId;
}

interface RunClarificationInput {
  brief: string;
  answers: BriefClarificationAnswer[];
  siteLanguage: string;
}

interface UseClarificationFlowResult {
  isClarifying: boolean;
  runClarification: (
    input: RunClarificationInput,
  ) => Promise<ClarifyBriefResponse | null>;
}

export function useClarificationFlow(): UseClarificationFlowResult {
  const clarifyBriefMutation = useClarifyBriefMutation();
  const clarificationRequestIdRef = useRef(0);
  const [isClarifying, setIsClarifying] = useState(false);

  const runClarification = async ({
    brief,
    answers,
    siteLanguage,
  }: RunClarificationInput): Promise<ClarifyBriefResponse | null> => {
    const requestId = clarificationRequestIdRef.current + 1;
    clarificationRequestIdRef.current = requestId;
    setIsClarifying(true);

    try {
      const result = await clarifyBriefMutation.mutateAsync({
        brief,
        siteLanguage,
        answers: answers.map((answer) => ({
          questionId: answer.questionId,
          question: answer.question,
          value: answer.value,
          skipped: answer.skipped,
        })),
      });

      return isLatestClarificationRequest(
        requestId,
        clarificationRequestIdRef.current,
      )
        ? result
        : null;
    } catch (error) {
      if (
        isLatestClarificationRequest(
          requestId,
          clarificationRequestIdRef.current,
        )
      ) {
        logger.error("brief:clarify", error);
        toast.error("Не удалось уточнить бриф");
      }
      return null;
    } finally {
      if (
        isLatestClarificationRequest(
          requestId,
          clarificationRequestIdRef.current,
        )
      ) {
        setIsClarifying(false);
      }
    }
  };

  return { isClarifying, runClarification };
}
