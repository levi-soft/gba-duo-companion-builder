import { walk } from './tree.js';
import { setNodeStyles } from './style-model.js';

export { isFontAsset as isFont } from './assets.js';
import { isFontAsset as isFont } from './assets.js';
const unquote = (value) => value.trim().replace(/^(['"])(.*)\1$/, '$2');
export const fontValue = (family) => /^(sans-serif|serif|monospace)$/.test(family) ? family : JSON.stringify(family);
export function tabLabelFont(owner,tab) {
  const value=owner?.studioStyles?.[`tab:${tab.child.id}`]?.normal?.['font-family'];
  if(value) {try{return JSON.parse(value);}catch{return value;}}
  return tab.labelFont??'';
}
export function setTabLabelFont(layout,ownerId,childId,family) {
  const owner=walk(layout).find(r=>r.node.id===ownerId)?.node;
  const tab=owner?.tabs?.find(t=>t.child.id===childId);
  if(!tab)throw Error('Không tìm thấy tab cần đổi font.');
  delete tab.labelFont;
  setNodeStyles(layout,ownerId,`tab:${childId}`,'normal',{'font-family':family?fontValue(family):''});
}
export function applyNodeFont(layout, id, family, descendants = false) {
  const target = walk(layout).find(r => r.node.id === id)?.node;
  if (!target) throw new Error('Chọn thành phần trước khi áp dụng font.');
  const nodes = descendants ? walk(target).map(r => r.node) : [target];
  for (const node of nodes) {
    node.style ??= {};
    if (family) node.style['font-family'] = fontValue(family);
    else delete node.style['font-family'];
    delete node.font;
    if(descendants) for(const target of Object.values(node.studioStyles??{})) {
      if(target.normal?.['font-family']!=null) {
        if(family)target.normal['font-family']=fontValue(family);
        else delete target.normal['font-family'];
      }
    }
    if (descendants && node.type === 'tabs') for (const tab of node.tabs) {
      if (family) tab.labelFont = family;
      else delete tab.labelFont;
    }
  }
}
export function fontCatalog(project) {
  const result = [];
  for (const match of project.css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/@font-face\s*\{([^}]+)\}/gi)) {
    const family = match[1].match(/font-family\s*:\s*([^;]+)/i)?.[1];
    const source = match[1].match(/url\(\s*(['"]?)(.*?)\1\s*\)/i)?.[2];
    if (family) result.push({ family: unquote(family), path: source ? 'assets/' + source.replace(/^asset:/, '').replace(/^assets\//, '') : '', declared: true });
  }
  for (const path of Object.keys(project.files).filter(p => isFont(p) && !p.startsWith('assets/__studio_fonts/'))) {
    if (result.some(f => f.path === path)) continue;
    let hash = 2166136261;
    for (const c of path) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
    result.push({ family: 'StudioFont_' + (hash >>> 0).toString(16), path, declared: false });
  }
  return result.filter((f, i, all) => all.findIndex(x => x.family === f.family) === i);
}

export function compileFonts(project) {
  const files = { ...project.files };
  let css = project.css, hasFonts = false;
  let sequence = 0;
  for (const {node} of walk(project.layout)) {
    if (node.type !== 'tabs' || !node.tabs.some(t => t.labelFont)) continue;
    const token = `studio-tabfont-${++sequence}`;
    node.class = [node.class, token].filter(Boolean).join(' ');
    node.tabs.forEach((tab, i) => {
      if (tab.labelFont) {
        css += `\n.${token} > tab-bar > tab:nth-child(${i+1}) { font-family: ${fontValue(tab.labelFont)}; }\n`;
        delete tab.labelFont;
        hasFonts = true;
      }
    });
  }
  const used = css + walk(project.layout).map(r => r.node.style?.['font-family'] ?? '').join('\n');
  for (const font of fontCatalog(project)) {
    if (font.declared || !used.includes(JSON.stringify(font.family))) continue;
    const path = `__studio_fonts/${font.family}.${font.path.split('.').pop()}`;
    files['assets/' + path] = files[font.path];
    css += `\n@font-face { font-family: ${JSON.stringify(font.family)}; src: url("${path}"); }\n`;
    hasFonts = true;
  }
  return { ...project, files, css, hasFonts };
}
