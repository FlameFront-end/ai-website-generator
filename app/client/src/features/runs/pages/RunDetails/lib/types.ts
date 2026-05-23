import type { RunArtifact } from "@/api/services/runs";

export type RunDetailsTab =
  | "overview"
  | "style"
  | "reference"
  | "code"
  | "result"
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
}

export interface CodeViewerProps {
  content: string;
  language: string;
}

export interface FileTreeProps {
  files: { path: string }[];
  selectedFile: string | null;
  onSelect: (path: string) => void;
}
