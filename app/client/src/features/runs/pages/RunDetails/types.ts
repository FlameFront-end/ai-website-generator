import type { RunArtifact } from "@/api/services/runs";

export type RunDetailsTab =
  | "overview"
  | "reference"
  | "result"
  | "spec"
  | "design"
  | "code"
  | "artifacts"
  | "logs";

export interface FileTreeNodeFile {
  kind: "file";
  name: string;
  path: string;
}

export interface FileTreeNodeDir {
  kind: "dir";
  name: string;
  children: FileTreeNode[];
}

export type FileTreeNode = FileTreeNodeFile | FileTreeNodeDir;

export interface ArtifactViewerProps {
  runId: string;
  artifact: RunArtifact;
  styles: Record<string, string>;
}

export interface CodeViewerProps {
  content: string;
  language: string;
  styles: Record<string, string>;
}

export interface FileTreeProps {
  files: { path: string }[];
  selectedFile: string | null;
  onSelect: (path: string) => void;
  styles: Record<string, string>;
}
