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

export interface GeneratedContentModule {
  path: string;
  content: string;
}

export interface GeneratedLayoutModule {
  files: GeneratedContentModule[];
}

export interface GeneratedSectionModule {
  files: GeneratedContentModule[];
}
