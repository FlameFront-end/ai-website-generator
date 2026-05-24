import type {
  DesignContextSummary,
  ProjectSpecSummary,
  ReferenceContextSummary,
} from './types';

export interface CodegenContextInput {
  projectSpecSummary?: ProjectSpecSummary;
  designContextSummary?: DesignContextSummary;
  referenceContextSummary?: ReferenceContextSummary;
  designDescription: string;
  visualReferenceContext: string;
}

export function buildCodegenContext(input: CodegenContextInput): string {
  return [
    formatJsonSection('Project spec summary', input.projectSpecSummary),
    formatJsonSection('Design context summary', input.designContextSummary),
    formatJsonSection(
      'Reference context summary',
      input.referenceContextSummary,
    ),
    formatTextSection('Design description fallback', input.designDescription),
    formatTextSection(
      'Visual reference fallback',
      input.visualReferenceContext,
    ),
  ]
    .filter(Boolean)
    .join('\n\n---\n\n');
}

function formatJsonSection(title: string, value: unknown): string | null {
  if (!value) {
    return null;
  }

  return `${title}:\n${JSON.stringify(value, null, 2)}`;
}

function formatTextSection(title: string, value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return `${title}:\n${trimmed}`;
}
