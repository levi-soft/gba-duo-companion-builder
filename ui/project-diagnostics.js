// Shared read-only dependency checks. Mirrored in Studio and embedded in Builder.
// No game-specific data, ROM access, Lua execution or network access.
/** @typedef {unknown} Data */
/** @typedef {{normal?:string,pressed?:string,selected?:string}} DiagnosticSkin */
/** @typedef {{id?:string,type:string,text?:string,src?:string,value?:string|number,maxKey?:string,label?:string,items?:string,empty?:string,visibleIf?:string,classIf?:Record<string,string>,bindStyle?:Record<string,string|number>,style?:Record<string,string|number>,studioStyles?:Record<string,Record<string,Record<string,string|number>>>,buttonSkin?:DiagnosticSkin,font?:string,onClick?:Data,children?:DiagnosticNode[],child?:DiagnosticNode,template?:DiagnosticNode,pages?:DiagnosticEntry[],tabs?:DiagnosticEntry[]}} DiagnosticNode */
/** @typedef {{title?:string,labelFont?:string,skin?:DiagnosticSkin,child:DiagnosticNode}} DiagnosticEntry */
/** @typedef {{layout:DiagnosticNode,css?:string,files:Record<string,string>,data:Record<string,Data>,manifest?:{script?:string,values?:Record<string,unknown>,studioDataFields?:Record<string,unknown>}}} DiagnosticProject */
/** @typedef {'error'|'warning'|'info'} DiagnosticLevel */
/** @typedef {{level:DiagnosticLevel,code:string,location:string,nodeId?:string,property?:string,field?:string,scope?:string,detail?:string}} DependencyIssue */
/** @typedef {{errors:number,warnings:number,info:number,issues:DependencyIssue[],truncated:boolean,complete:boolean}} DependencyReport */
/** @typedef {{inList:boolean,rowKnown:boolean,row:Data|undefined,prefix:string}} DiagnosticScope */
// Read-only dependency inspection. No compiler, Lua, ROM access or network.
// One representative row per list is checked; declarations are contracts,
// not observations. Missing fields from custom Lua are nonblocking notes.
/** @param {DiagnosticProject} project @returns {DependencyReport} */
export function projectDiagnostics(project){
  /** @type {Record<DiagnosticLevel,DependencyIssue[]>} */
  const groups={error:[],warning:[],info:[]},counts={error:0,warning:0,info:0},seen=new Set();let work=0,complete=true;
  /** @param {DiagnosticLevel} level @param {string} code @param {string} location @param {Partial<DependencyIssue>} [extra] */
  function add(level,code,location,extra={}){const issue={level,code,location,...extra},key=JSON.stringify(issue);if(seen.has(key))return;seen.add(key);counts[level]++;if(groups[level].length<100)groups[level].push(issue);}
  function step(){if(++work<=100000)return true;if(complete)add('error','diagnostic-limit','layout');complete=false;return false;}
  function finish(){const all=[...groups.error,...groups.warning,...groups.info],issues=all.slice(0,100);return {errors:counts.error,warnings:counts.warning,info:counts.info,issues,truncated:counts.error+counts.warning+counts.info>issues.length,complete};}
  if(!project||typeof project!=='object'||!project.layout||!project.files||!project.data){add('error','invalid-project','project');return finish();}
  const manifest=project.manifest??{},files=project.files,data=project.data,metadata=manifest.studioDataFields??{},metadataKeys=Object.keys(metadata),dynamic=!!manifest.script;
  /** @param {string} path */
  const normalize=path=>path.replace(/\[(\d+)\]/g,'.$1');
  /** @param {string} path */
  const safe=path=>typeof path==='string'&&path.length<=256&&/^[\p{L}_][\p{L}\p{N}_-]*(?:\.(?:[\p{L}_][\p{L}\p{N}_-]*|\d+))*$/u.test(path)&&!path.split('.').some(key=>['__proto__','prototype','constructor'].includes(key));
  /** @param {Data|undefined} value @param {string} path @returns {Data|undefined} */
  function own(value,path){for(const key of path.split('.')){if(value==null||typeof value!=='object'||!Object.hasOwn(value,key))return undefined;value=Array.isArray(value)?value[Number(key)]:/** @type {Record<string,unknown>} */(value)[key];}return value;}
  /** @param {string} prefix @param {string} path */
  function declared(prefix,path){const key=prefix+path;return Object.hasOwn(metadata,key)||metadataKeys.some(p=>p.startsWith(key+'.'));}
  /** @param {string} path @param {DiagnosticScope} ctx */
  function lookup(path,ctx){
    if(path==='@index'&&ctx.inList)return {known:true,value:0};
    if(path==='item'&&ctx.inList)return {known:ctx.rowKnown,value:ctx.row};
    if(path.startsWith('ui.'))return {known:true,value:undefined};
    const local=ctx.inList&&ctx.rowKnown?own(ctx.row,path):undefined;
    if(local!=null)return {known:true,value:local};
    if(ctx.inList&&declared(ctx.prefix,path))return {known:true,value:local};
    const value=own(data,path),known=value!==undefined||declared('',path)||Object.hasOwn(manifest.values??{},path);
    return {known:known||ctx.inList&&!ctx.rowKnown,value};
  }
  /** @param {unknown} rawPath @param {DiagnosticScope} ctx @param {Partial<DiagnosticNode>} node @param {string} property @param {string} location */
  function ref(rawPath,ctx,node,property,location){
    if(!step())return undefined;const path=normalize(String(rawPath).replace(/^\$/,''));
    if(path!=='@index'&&!safe(path)){add('warning','invalid-binding',location,{nodeId:node.id,property,field:path});return undefined;}
    const value=lookup(path,ctx);if(!value.known)add(dynamic?'info':'warning',dynamic?'runtime-field':'missing-field',location,{nodeId:node.id,property,field:path,scope:ctx.prefix});
    return value.value;
  }
  /** @param {unknown} value @param {DiagnosticScope} ctx @param {DiagnosticNode} node @param {string} property @param {string} location */
  function interpolate(value,ctx,node,property,location){if(typeof value==='string')for(const match of value.matchAll(/\{([^{}]+)\}/g)){if(!complete)break;ref(match[1],ctx,node,property,location);}}
  /** @param {Data|undefined} value @param {DiagnosticScope} ctx @param {DiagnosticNode} node @param {string} property @param {string} location */
  function bound(value,ctx,node,property,location){
    if(typeof value!=='string')return value;
    if(value.startsWith('$'))return ref(value.slice(1),ctx,node,property,location);
    const exact=/^\{([^{}]+)\}$/.exec(value);if(exact)return ref(exact[1],ctx,node,property,location);
    interpolate(value,ctx,node,property,location);return value;
  }
  /** @param {unknown} raw @param {boolean} optional @param {Partial<DiagnosticNode>} node @param {string} property @param {string} location @param {boolean} [sample] @param {boolean} [exactFile] */
  function asset(raw,optional,node,property,location,sample=false,exactFile=false){
    if(!step()||typeof raw!=='string'||!raw||raw.startsWith('$')||/[{}]/.test(raw))return;
    if(exactFile){if(!Object.hasOwn(files,raw))add('error','missing-asset',location,{nodeId:node.id,property,detail:raw});else formatWarning(raw,node,property,location);return;}
    if(/^(?:data:|blob:|https?:|\/|#)/i.test(raw))return;
    let name=raw.replace(/^asset:/,'').replace(/^assets\//,'').split(/[?#]/)[0];
    if(!name)return;
    if(name.includes('\\')){add('warning','unverified-asset',location,{nodeId:node.id,property,detail:raw});return;}
    const expected='assets/'+name;
    if(name.split('/').some(p=>!p||p==='.'||p==='..')||/[:\x00-\x1f]/.test(name)){add(sample||optional?'warning':'error','asset-path',location,{nodeId:node.id,property,detail:expected});return;}
    let present=Object.hasOwn(files,expected);
    try{const decoded=decodeURIComponent(name);if(!decoded.split('/').includes('..'))present||=Object.hasOwn(files,'assets/'+decoded);}catch{/* Keep the exact path check. */}
    if(!present)add(sample||optional?'warning':'error',sample?'sample-asset':optional?'conditional-asset':'missing-asset',location,{nodeId:node.id,property,detail:expected});
    else formatWarning(expected,node,property,location);
  }
  /** Existing packs remain editable; flag browser-only formats at their actual references. @param {string} path @param {Partial<DiagnosticNode>} node @param {string} property @param {string} location */
  function formatWarning(path,node,property,location){
    try{path=decodeURIComponent(path);}catch{/* Check literal path. */}
    const code=/\.svg$/i.test(path)?'android-image-format':/\.woff2?$/i.test(path)?'android-font-format':'';
    if(code)add('warning',code,location,{nodeId:node.id,property,detail:path});
  }
  // URL tokens outside CSS comments/strings. The checker never fetches URLs.
  /** @param {unknown} value @param {boolean} optional @param {Partial<DiagnosticNode>} node @param {string} property @param {string} location */
  function css(value,optional,node,property,location){
    if(typeof value!=='string')return;
    let quote='';for(let i=0;i<value.length&&complete;i++){
      const c=value[i];if(c==='\\'){i++;continue;}if(quote){if(c===quote)quote='';continue;}
      if(c==='"'||c==="'"){quote=c;continue;}
      if(c==='/'&&value[i+1]==='*'){const end=value.indexOf('*/',i+2);i=end<0?value.length:end+1;continue;}
      if(value.slice(i,i+3).toLowerCase()!=='url'||/[\w-]/.test(value[i-1]??''))continue;
      let start=i+3;while(/\s/.test(value[start]??'')&&start<value.length)start++;if(value[start]!=='(')continue;start++;while(/\s/.test(value[start]??'')&&start<value.length)start++;
      const q=value[start]==='"'||value[start]==="'"?value[start++]:'';let end=start;
      while(end<value.length){if(value[end]==='\\'){end+=2;continue;}if(q?value[end]===q:value[end]===')')break;end++;}
      asset(value.slice(start,end).trim(),optional,node,property,location);i=end;
    }
  }
  /** @param {Data|undefined} input @param {DiagnosticScope} ctx @param {DiagnosticNode} node @param {string} location */
  function actions(input,ctx,node,location){
    for(const action of Array.isArray(input)?input:[input]){
      if(!step())break;if(!action||typeof action!=='object'||Array.isArray(action))continue;
      const record=/** @type {Record<string,unknown>} */(action);
      if(record.set&&typeof record.set==='object')for(const [key,value]of Object.entries(record.set))bound(value,ctx,node,'onClick.set.'+key,location);
      for(const [index,value]of (record.args==null?[]:Array.isArray(record.args)?record.args:[record.args]).entries())bound(value,ctx,node,'onClick.args.'+index,location);
      interpolate(record.navigate,ctx,node,'onClick.navigate',location);
    }
  }
  /** @param {DiagnosticNode|undefined} node @param {DiagnosticScope} ctx @param {string} location @param {boolean} [optional] @param {number} [depth] */
  function visit(node,ctx,location,optional=false,depth=0){
    if(!step())return;if(depth>128){add('error','diagnostic-limit',location);complete=false;return;}
    if(!node||typeof node!=='object'||Array.isArray(node)){add('error','invalid-project',location);return;}
    optional||=!!node.visibleIf;
    if(['text','button'].includes(node.type))interpolate(node.text,ctx,node,'text',location);
    if(node.type==='image'){
      const dynamicSource=typeof node.src==='string'&&(node.src.startsWith('$')||/\{[^{}]+\}/.test(node.src));
      const value=bound(node.src,ctx,node,'src',location);if(dynamicSource){if(typeof value==='string'&&!/[{}]/.test(value))asset(value,optional,node,'src',location,true);}else asset(value,optional,node,'src',location);
    }
    if(node.type==='bar'){if(typeof node.value==='string')ref(node.value,ctx,node,'value',location);if(node.maxKey!=null)ref(node.maxKey,ctx,node,'maxKey',location);interpolate(node.label,ctx,node,'label',location);}
    if(node.visibleIf!=null)ref(node.visibleIf,ctx,node,'visibleIf',location);
    for(const [key,value]of Object.entries(node.classIf??{}))ref(value,ctx,node,'classIf.'+key,location);
    for(const [key,value]of Object.entries(node.bindStyle??{}))bound(value,ctx,node,'bindStyle.'+key,location);
    for(const [key,value]of Object.entries(node.style??{}))css(value,optional,node,'style.'+key,location);
    for(const [target,states]of Object.entries(node.studioStyles??{}))for(const [state,values]of Object.entries(states??{}))for(const [key,value]of Object.entries(values??{}))css(value,optional,node,'studioStyles.'+target+'.'+state+'.'+key,location);
    // Skin compilation requires literal file-map keys even on hidden widgets.
    /** @type {[string,DiagnosticSkin|undefined][]} */
    const skins=[['buttonSkin',node.buttonSkin],...(node.tabs??[]).map((tab,index)=>/** @type {[string,DiagnosticSkin|undefined]} */(['tabs['+index+'].skin',tab.skin]))];
    for(const [property,skin]of skins)for(const key of /** @type {const} */(['normal','pressed','selected']))if(skin?.[key])asset(skin[key],optional,node,property+'.'+key,location,false,true);
    if(typeof node.font==='string'&&/\.(ttf|otf|woff2?)$/i.test(node.font))asset(node.font,optional,node,'font',location);
    actions(node.onClick,ctx,node,location);
    for(const [index,child]of (node.children??[]).entries()){if(!complete)break;visit(child,ctx,location+'.children['+index+']',optional,depth+1);}
    if(node.child)visit(node.child,ctx,location+'.child',optional,depth+1);
    for(const group of /** @type {const} */(['pages','tabs']))for(const [index,entry]of (node[group]??[]).entries()){
      if(!complete)break;interpolate(entry.title,ctx,node,group+'.title',location);
      if(typeof entry.labelFont==='string'&&/\.(ttf|otf|woff2?)$/i.test(entry.labelFont))asset(entry.labelFont,optional,node,group+'.labelFont',location);
      visit(entry.child,ctx,location+'.'+group+'['+index+']',optional,depth+1);
    }
    if(node.type==='list'){
      const items=ref(node.items,ctx,node,'items',location);interpolate(node.empty,ctx,node,'empty',location);
      if(node.template){
        const rowKnown=Array.isArray(items)&&items.length>0,prefix=ctx.prefix+String(node.items??'').replace(/^\$/,'')+'[].';
        if(!rowKnown)add(dynamic?'info':'warning','row-sample',location,{nodeId:node.id,property:'items',field:node.items});
        visit(node.template,{inList:true,rowKnown,row:rowKnown?items[0]:undefined,prefix},location+'.template',optional,depth+1);
      }
    }else if(node.template)visit(node.template,ctx,location+'.template',optional,depth+1);
  }
  css(project.css,false,{},'css','style.css');visit(project.layout,{inList:false,rowKnown:false,row:undefined,prefix:''},'layout');
  return finish();
}
/** @param {Pick<DependencyIssue,'code'>} issue @param {string} [language] */
export function projectIssueText(issue,language='en'){
  /** @type {Record<string,[string,string]>} */
  const messages={
    'invalid-project':['Invalid project structure. Open and repair it in Studio.','Cấu trúc dự án không hợp lệ. Mở và sửa trong Studio.'],
    'missing-asset':['A directly referenced local image/font is missing.','Thiếu ảnh/font cục bộ được tham chiếu trực tiếp.'],
    'android-image-format':['The Android companion cannot display this SVG. Replace the reference with a PNG, JPEG or WebP image.','Companion Android chưa hiển thị được SVG này. Thay tham chiếu bằng ảnh PNG, JPEG hoặc WebP.'],
    'android-font-format':['The Android companion cannot load this web font. Use the original TTF or OTF file.','Companion Android chưa nạp được font web này. Dùng tệp font gốc TTF hoặc OTF.'],
    'conditional-asset':['An asset in a conditional component is missing. Check before showing it.','Thiếu tài nguyên ở thành phần có điều kiện. Kiểm tra trước khi hiển thị.'],
    'sample-asset':['The sample image source points to a missing file; check the actual reader output.','Nguồn ảnh mẫu trỏ tới tệp chưa có; kiểm tra kết quả bộ đọc thực tế.'],
    'asset-path':['The local asset path is invalid. Repair it in Studio.','Đường dẫn tài nguyên không hợp lệ. Sửa lại trong Studio.'],
    'unverified-asset':['This escaped asset reference needs review in Studio.','Tham chiếu tài nguyên có ký tự escape cần được kiểm tra trong Studio.'],
    'missing-field':['This field is absent from the sample and reader declarations.','Trường chưa có trong dữ liệu mẫu hoặc khai báo bộ đọc.'],
    'runtime-field':['This field may be supplied by Lua; verify it with the game.','Trường này có thể do Lua cung cấp; cần kiểm tra khi chạy game.'],
    'row-sample':['No representative row is available for this list scope.','Chưa có dòng mẫu đại diện để kiểm tra phạm vi danh sách này.'],
    'invalid-binding':['This data reference cannot be checked as a native field path.','Tham chiếu dữ liệu này chưa đúng đường dẫn trường native để kiểm tra.'],
    'diagnostic-limit':['Dependency checks exceed their complexity limit. Simplify the project or export from Studio.','Kiểm tra tham chiếu vượt giới hạn độ phức tạp. Giảm mẫu hoặc xuất từ Studio.']
  };
  return messages[issue.code]?.[language==='vi'?1:0]??issue.code;
}
