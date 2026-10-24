export const DEVICE_DENSITY = 2.30625;
export const clone = (v) => JSON.parse(JSON.stringify(v));
export function walk(root) {
  const out = [];
  function visit(node, parent, key, index, depth, title) {
    if (!node || typeof node !== 'object') return;
    out.push({ node, parent, key, index, depth, title });
    (node.children ?? []).forEach((c, i) => visit(c, node, 'children', i, depth + 1));
    if (node.child) visit(node.child, node, 'child', null, depth + 1);
    if (node.template) visit(node.template, node, 'template', null, depth + 1, 'Mẫu lặp');
    for (const key of ['pages', 'tabs']) (node[key] ?? []).forEach((entry) => visit(entry.child, entry, 'child', null, depth + 1, entry.name ?? entry.title));
  }
  visit(root, null, null, null, 0);
  return out;
}
