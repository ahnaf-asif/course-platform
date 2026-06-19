import { CourseTreeResponse } from '@/api/model/components-schemas-curriculum/courseTreeResponse';
import { ExtendedNode } from './TreeNode';

export function organizeTree(tree: CourseTreeResponse[] | undefined): ExtendedNode[] {
  if (!tree) return [];

  const map: Record<string, ExtendedNode> = {};
  const roots: ExtendedNode[] = [];

  // First pass: create all nodes and put them in the map
  tree.forEach((node) => {
    map[node.id] = { ...node, children: [] };
  });

  // Second pass: build the hierarchy
  tree.forEach((node) => {
    const mappedNode = map[node.id];
    if (node.level === 1) {
      roots.push(mappedNode);
    }
    if (node.parent_id && map[node.parent_id]) {
      map[node.parent_id].children.push(mappedNode);
    }
  });

  const sortNodes = (nodes: ExtendedNode[]) => {
    nodes.sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0));
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);

  return roots;
}
