export type AiSkillKind =
  | 'design'
  | 'code'
  | 'build'
  | 'visual'
  | 'copy'
  | 'seo';

export type AiPipelineStep =
  | 'spec'
  | 'design'
  | 'reference'
  | 'code'
  | 'build'
  | 'qa';

export type AiSkill = {
  id: string;
  title: string;
  kind: AiSkillKind;
  appliesTo: AiPipelineStep[];
  priority: number;
  tokenBudget: number;
  triggers: string[];
  content: string;
  sourcePath?: string;
};

export type SelectSkillsInput = {
  step: AiPipelineStep;
  projectType?: string;
  framework?: 'next' | 'react-vite';
  errorText?: string;
  previousSkillIds?: string[];
  tokenBudget: number;
};
