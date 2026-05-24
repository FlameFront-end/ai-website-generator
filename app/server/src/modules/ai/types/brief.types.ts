export type BriefQuestionType =
  | 'text'
  | 'single_choice'
  | 'multi_choice'
  | 'scale'
  | 'yes_no';

export interface BriefClarificationQuestion {
  id: string;
  type: BriefQuestionType;
  question: string;
  description?: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  suggestedAnswer?: string | string[] | number | boolean;
  min?: number;
  max?: number;
}

export interface BriefClarificationAnswer {
  questionId: string;
  question: string;
  value: string | string[] | number | boolean;
  skipped?: boolean;
}

export interface BriefClarificationResult {
  status: 'needs_clarification' | 'ready';
  confidence: number;
  estimatedTotalQuestions?: number;
  missingFields: string[];
  understoodSummary?: string;
  projectTitle?: string;
  questions: BriefClarificationQuestion[];
  finalBrief: string | null;
}
