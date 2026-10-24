import {walk,clone} from './tree.js';
import {styleTargets} from './style-schema.js';

export const styleStates=['normal','active','pressed','disabled'];
export function cloneStyledTree(source,makeId) {
  const result=clone(source),ids=new Map();
  for(const {node} of walk(result)){const previous=node.id;node.id=makeId();ids.set(previous,node.id);}
  for(const {node} of walk(result)) if(node.studioStyles) {
    node.studioStyles=Object.fromEntries(Object.entries(node.studioStyles).map(([key,value])=>[key.startsWith('tab:')?`tab:${ids.get(key.slice(4))??key.slice(4)}`:key,value]));
  }
  return result;
}
export function styleValues(node,target='self',state='normal') {
  return target==='self'&&state==='normal' ? node.style??{} : node.studioStyles?.[target]?.[state]??{};
}
export function setNodeStyles(layout,id,target,state,changes) {
  const node=walk(layout).find(r=>r.node.id===id)?.node;
  if(!node||!styleTargets(node).some(t=>t.key===target)||!styleStates.includes(state)) throw Error('Đích chỉnh hình thức không hợp lệ.');
  let values;
  if(target==='self'&&state==='normal') values=node.style??={};
  else {node.studioStyles??={};node.studioStyles[target]??={};values=node.studioStyles[target][state]??={};}
  for(const [key,value] of Object.entries(changes)) {if(value==null||value==='')delete values[key];else values[key]=String(value);}
}
export function compileStyles(project) {
  const layout=clone(project.layout);
  let css=project.css,hasStyles=false;
  let sequence=0;
  for(const {node} of walk(layout)) {
    if(!node.studioStyles)continue;
    let selector=`#${node.id}`;
    // State rules cannot override native inline declarations. Move their normal
    // baseline to CSS in the compiled copy, retaining the original in metadata.
    if(node.studioStyles.self && Object.values(node.studioStyles.self).some(s=>Object.keys(s).length)) {
      const token=`studio-state-${++sequence}`;
      node.class=[node.class,token].filter(Boolean).join(' ');
      selector+=`.${token}`;
      if(node.style) {
        css+=`\n${selector} { ${Object.entries(node.style).map(([k,v])=>`${k}: ${v};`).join(' ')} }\n`;
        delete node.style;
      }
    }
    for(const target of styleTargets(node)) for(const state of styleStates) {
      const values=node.studioStyles[target.key]?.[state];
      if(!values||!Object.keys(values).length)continue;
      const pseudo=state==='normal'?'':`:${state}`;
      css+=`\n${selector}${target.selector}${pseudo} { ${Object.entries(values).map(([k,v])=>`${k}: ${v};`).join(' ')} }\n`;
      hasStyles=true;
    }
    delete node.studioStyles;
  }
  return {...project,layout,css,hasStyles};
}

// Split at a separator only outside quotes and function calls (rgba, gradients, etc.).
export function splitCss(value,separator=',') {
  let depth=0,quote='',start=0;const parts=[];
  for(let i=0;i<value.length;i++) {const c=value[i];if(quote){if(c===quote&&value[i-1]!=='\\')quote='';continue;}if(c==='"'||c==="'"){quote=c;continue;}if(c==='(')depth++;if(c===')')depth--;if(!depth&&(separator===' '?/\s/.test(c):c===separator)){if(value.slice(start,i).trim())parts.push(value.slice(start,i).trim());start=i+1;}}
  if(value.slice(start).trim())parts.push(value.slice(start).trim());return parts;
}
export function expandFour(value) {
  const p=splitCss(value,' ');return p.length===1?[p[0],p[0],p[0],p[0]]:p.length===2?[p[0],p[1],p[0],p[1]]:p.length===3?[p[0],p[1],p[2],p[1]]:p.slice(0,4);
}
