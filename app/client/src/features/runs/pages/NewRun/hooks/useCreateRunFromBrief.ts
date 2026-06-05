import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { useCreateRunMutation } from "@/api/services/runs";
import { ROUTES } from "@/model";

import { deleteBriefDraft } from "../../../lib/brief-drafts";
import { buildLocalizedBrief } from "../../../lib/brief-wizard";

interface UseCreateRunFromBriefOptions {
  draftId: string;
  projectTitle: string;
  siteLanguage: string;
}

interface UseCreateRunFromBriefResult {
  createRun: (brief: string) => void;
  isCreating: boolean;
}

export function useCreateRunFromBrief({
  draftId,
  projectTitle,
  siteLanguage,
}: UseCreateRunFromBriefOptions): UseCreateRunFromBriefResult {
  const navigate = useNavigate();
  const createRunMutation = useCreateRunMutation();

  const createRun = (brief: string) => {
    const localizedBrief = buildLocalizedBrief(brief, siteLanguage);
    createRunMutation.mutate(
      { brief: localizedBrief, displayName: projectTitle.trim() || null },
      {
        onSuccess: (run) => {
          deleteBriefDraft(draftId);
          void navigate(ROUTES.runDetails(run.id));
        },
        onError: () => toast.error("Не удалось создать проект"),
      },
    );
  };

  return {
    createRun,
    isCreating: createRunMutation.isPending,
  };
}
