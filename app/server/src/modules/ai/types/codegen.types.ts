export interface GeneratedFile {
  path: string;
  content: string;
}

export interface CodePlanSection {
  id: string;
  componentName: string;
  filePath: string;
  purpose: string;
}

export interface CodePlan {
  architecture: string;
  files: string[];
  sections: CodePlanSection[];
  sharedComponents: string[];
}

export interface GeneratedLayoutModule {
  files: GeneratedFile[];
}

export interface GeneratedSectionModule {
  files: GeneratedFile[];
}
