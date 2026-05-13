import type { BriefClarificationAnswer } from '../ai.types';
import type { ChatMessage } from '../providers/ai-provider.interface';
import { buildSkillContext, joinPromptSections } from '../skills/prompt-context';

const SYSTEM = joinPromptSections(
  buildSkillContext(['product-global-rules', 'brief-and-structure'], 5000),
  `You are a senior product discovery expert for a visual-first AI website generator.

Decide whether the raw brief is sufficient for generating a strong single-page landing page. If not, ask exactly one high-value next question.

Return ONLY valid JSON with this exact shape:
{
  "status": "needs_clarification" | "ready",
  "confidence": 0.0,
  "estimatedTotalQuestions": 3,
  "missingFields": ["missing field"],
  "understoodSummary": "1-3 short human-readable sentences",
  "projectTitle": "short project title or null",
  "questions": [
    {
      "id": "snake_case_id",
      "type": "text" | "single_choice" | "multi_choice" | "scale" | "yes_no",
      "question": "question for the user",
      "description": "why this matters",
      "required": true,
      "options": ["option"],
      "placeholder": "example answer",
      "suggestedAnswer": "best inferred answer",
      "min": 1,
      "max": 5
    }
  ],
  "finalBrief": "improved final brief or null"
}

Rules:
- Ask only about website substance: product, audience, goal, content, structure, style, references, CTA, constraints.
- Never ask about budget, deadline, price, development estimate, or business logistics.
- Ask one question at a time; do not repeat previous questions.
- Stop asking after 5 answers and produce finalBrief.
- If the user does not know, infer a reasonable direction and continue.
- For needs_clarification: finalBrief=null and projectTitle may be null.
- For ready: questions=[], finalBrief is a complete structured brief, projectTitle is 2-5 words.
- Keep all user-facing output in siteLanguage: questions, descriptions, options, placeholders, suggestedAnswer, understoodSummary, projectTitle, and finalBrief.
- Keep these instructions and internal task interpretation in English; only user-facing values must be localized.
- suggestedAnswer must match the question type and be directly usable by the user.`,
);

export function buildClarifyBriefMessages(
  brief: string,
  answers: BriefClarificationAnswer[],
  siteLanguage?: string,
): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: JSON.stringify(
        {
          brief,
          siteLanguage:
            siteLanguage ??
            'Use the language explicitly requested by the user or inferred from the brief.',
          languageRule:
            'Write user-facing questions, options, suggestions, projectTitle and finalBrief in siteLanguage. Keep reasoning/internal instructions in English.',
          answeredCount: answers.length,
          currentStep: answers.length + 1,
          maxQuestions: 5,
          remainingQuestions: Math.max(0, 5 - answers.length),
          previousAnswers: answers,
        },
        null,
        2,
      ),
    },
  ];
}

