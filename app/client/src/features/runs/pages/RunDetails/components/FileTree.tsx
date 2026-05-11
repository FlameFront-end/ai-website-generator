import { useState } from 'react';
import type { FileTreeNode, FileTreeNodeDir, FileTreeProps } from '../types';

function sortNodes(nodes: FileTreeNode[]): FileTreeNode[] {
  return [...nodes]
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    })
    .map((n) =>
      n.kind === 'dir' ? { ...n, children: sortNodes(n.children) } : n,
    );
}

function buildFileTree(files: { path: string }[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split('/');
    let nodes = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        nodes.push({ kind: 'file', name: part, path: file.path });
      } else {
        let dir = nodes.find(
          (n): n is FileTreeNodeDir =>
            n.kind === 'dir' && n.name === part,
        );
        if (!dir) {
          dir = { kind: 'dir', name: part, children: [] };
          nodes.push(dir);
        }
        nodes = dir.children;
      }
    }
  }

  return sortNodes(root);
}

function IconFile({ ext }: { ext: string }) {
  const colors: Record<string, string> = {
    ts: '#3178c6',
    tsx: '#3178c6',
    js: '#f7df1e',
    jsx: '#61dafb',
    json: '#f97316',
    html: '#e34c26',
    css: '#264de4',
    scss: '#cc6699',
    md: '#6b7280',
  };
  const color = colors[ext] ?? '#94a3b8';
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 2a1 1 0 011-1h6.586a1 1 0 01.707.293l2.414 2.414A1 1 0 0114 4.414V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2z"
        fill={color}
        opacity="0.85"
      />
    </svg>
  );
}

function TreeDirNode({
  node,
  selectedFile,
  depth,
  onSelect,
  styles,
}: {
  node: FileTreeNodeDir;
  selectedFile: string | null;
  depth: number;
  onSelect: (path: string) => void;
  styles: Record<string, string>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <li className={styles.treeDir}>
      <button
        type="button"
        className={styles.treeDirLabel}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={() => setIsOpen((v) => !v)}
      >
        <span
          className={styles.treeIcon}
          style={{ transform: isOpen ? 'rotate(90deg)' : undefined }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M3 2l4 3-4 3"
              stroke="#6b7280"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className={styles.treeDirName}>{node.name}</span>
      </button>
      {isOpen && (
        <ul className={styles.fileList2}>
          <FileTreeNodes
            nodes={node.children}
            selectedFile={selectedFile}
            depth={depth + 1}
            onSelect={onSelect}
            styles={styles}
          />
        </ul>
      )}
    </li>
  );
}

function FileTreeNodes({
  nodes,
  selectedFile,
  depth,
  onSelect,
  styles,
}: {
  nodes: FileTreeNode[];
  selectedFile: string | null;
  depth: number;
  onSelect: (path: string) => void;
  styles: Record<string, string>;
}) {
  return (
    <>
      {nodes.map((node) =>
        node.kind === 'dir' ? (
          <TreeDirNode
            key={node.name}
            node={node}
            selectedFile={selectedFile}
            depth={depth}
            onSelect={onSelect}
            styles={styles}
          />
        ) : (
          <li key={node.path}>
            <button
              type="button"
              className={
                selectedFile === node.path
                  ? styles.fileItemActive
                  : styles.fileItem
              }
              style={{ paddingLeft: `${12 + depth * 16}px` }}
              onClick={() => onSelect(node.path)}
              title={node.path}
            >
              <span className={styles.treeIcon}>
                <IconFile ext={node.name.split('.').pop() ?? ''} />
              </span>
              <span className={styles.fileItemName}>{node.name}</span>
            </button>
          </li>
        ),
      )}
    </>
  );
}

export function FileTree({ files, selectedFile, onSelect, styles }: FileTreeProps) {
  const nodes = buildFileTree(files);
  return (
    <ul className={styles.fileList2}>
      <FileTreeNodes
        nodes={nodes}
        selectedFile={selectedFile}
        depth={0}
        onSelect={onSelect}
        styles={styles}
      />
    </ul>
  );
}
