(function (root) {
  'use strict';

  const MAX_ROM_BYTES = 32 * 1024 * 1024;
  const MAX_INPUT_BYTES = 64 * 1024 * 1024;
  const clone = value => root.structuredClone
    ? root.structuredClone(value)
    : JSON.parse(JSON.stringify(value));

  // This path is independent of the curated game registry and its producers.
  const crcTable = Array.from({length:256}, (_,n) => {
    for (let bit=0;bit<8;bit++) n = n&1 ? 0xedb88320^(n>>>1) : n>>>1;
    return n>>>0;
  });
  function romIdentity(rom) {
    if (!(rom instanceof Uint8Array) || rom.length<192 || rom.length>MAX_ROM_BYTES) throw Error('Invalid GBA ROM size.');
    let crc=0xffffffff;for (const byte of rom) crc=crcTable[(crc^byte)&255]^(crc>>>8);
    return {gameCode:String.fromCharCode(...rom.subarray(0xac,0xb0)),crc32:((crc^0xffffffff)>>>0).toString(16).toUpperCase().padStart(8,'0')};
  }
  function safePath(name) {
    if (typeof name!=='string'||!name||name.length>512||/^[\s/\\]|[\\:\x00-\x1f\x7f]/.test(name)||name.split('/').some(p=>!p||p==='.'||p==='..'||['__proto__','prototype','constructor'].includes(p))) throw Error('Unsafe project file path.');
  }
  function describeDataFields(project) {
    const fields=clone(project.manifest.studioDataFields??{});
    if(!fields||typeof fields!=='object'||Array.isArray(fields)||Object.keys(fields).length>4000)throw Error('Invalid named data fields.');
    let seen=0;
    function visit(value,path='',depth=0){
      if(++seen>20000||depth>32)throw Error('Data field catalog exceeds limits.');
      const kind=Array.isArray(value)?'list':typeof value;
      if(path&&['number','string','boolean','list'].includes(kind)&&!Object.hasOwn(fields,path))fields[path]={kind};
      if(Object.keys(fields).length>4000)throw Error('Too many named data fields.');
      if(Array.isArray(value)){if(value[0]&&typeof value[0]==='object'&&!Array.isArray(value[0]))visit(value[0],path+'[]',depth+1);return;}
      if(value&&typeof value==='object')for(const[key,child]of Object.entries(value))if(/^[\p{L}_][\p{L}\p{N}_-]*$/u.test(key)&&!['__proto__','constructor','prototype'].includes(key))visit(child,path?path+'.'+key:key,depth+1);
    }
    visit(project.data);
    for(const path of Object.keys(project.manifest.values??{}))if(!Object.hasOwn(fields,path))fields[path]={kind:'number'};
    // Native bars already state an expected numeric type. Keep this contract
    // when old project previews use placeholders such as "---".
    let nodes=0;
    function layout(node,prefix='',depth=0){
      if(!node||typeof node!=='object')return;
      if(++nodes>50000||depth>160)throw Error('Layout data catalog exceeds limits.');
      if(node.type==='bar')for(const value of [node.value,node.maxKey])if(typeof value==='string'){
        const path=value.startsWith('$')?value.slice(1):/^\{[^{}]+\}$/.test(value)?value.slice(1,-1):'';
        if(/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(path)&&!path.split('.').some(p=>['__proto__','constructor','prototype'].includes(p))&&!Object.hasOwn(project.manifest.studioDataFields??{},prefix+path))fields[prefix+path]={kind:'number'};
      }
      for(const child of node.children??[])layout(child,prefix,depth+1);
      if(node.child)layout(node.child,prefix,depth+1);
      for(const group of ['pages','tabs'])for(const entry of node[group]??[])layout(entry.child,prefix,depth+1);
      if(node.template){const list=typeof node.items==='string'?node.items.replace(/^\$/,''):'';if(node.type!=='list')layout(node.template,prefix,depth+1);else if(/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(list))layout(node.template,prefix+list+'[].',depth+1);}
    }
    layout(project.layout);
    if(Object.keys(fields).length>4000)throw Error('Too many named data fields.');
    return fields;
  }
  function validatePreparedProject(project, identity) {
    if (project?.formatVersion===1&&Array.isArray(project.presets)) throw Error('This is a block configuration library. Import it in Studio, insert the blocks and save a Studio project first.');
    if (!project || typeof project!=='object' || !project.manifest || typeof project.css!=='string' || !project.layout || typeof project.layout!=='object' || Array.isArray(project.layout) || typeof project.layout.type!=='string' || !project.data || typeof project.data!=='object' || Array.isArray(project.data)) throw Error('Choose a Studio project JSON with manifest, layout, CSS and sample data.');
    const m=project.manifest;
    if (!/^[a-z0-9-]{1,64}$/.test(m.id)||typeof m.name!=='string'||!m.name.trim()||m.name.length>256||typeof m.version!=='string'||!m.version||m.version.length>64) throw Error('Project needs a pack ID, name and version.');
    if (!Array.isArray(m.match?.gameCode)||!m.match.gameCode.includes(identity.gameCode)||!Array.isArray(m.match?.crc32)||!m.match.crc32.some(v=>typeof v==='string'&&v.toUpperCase()===identity.crc32)) throw Error('Project must declare this exact ROM game code and CRC32. Set them in Studio Project settings.');
    if (![project.width,project.height].every(n=>Number.isInteger(n)&&n>=64&&n<=8192)) throw Error('Invalid project canvas size.');
    if (m.tickHz!==undefined&&(!Number.isInteger(m.tickHz)||m.tickHz<1||m.tickHz>30)) throw Error('Invalid project update rate.');
    for (const key of ['studioComputed','studioGraphics','studioPulse']) if (m[key]&&Object.keys(m[key]).length) throw Error('This project requires Studio runtime generation. Export its ZIP in Studio instead.');
    const pending=[{value:project,depth:0}];let count=0;
    while (pending.length) {
      const {value,depth}=pending.pop();
      if (++count>200000||depth>64) throw Error('Project exceeds complexity limits.');
      if (value&&typeof value==='object') for (const [k,v] of Object.entries(value)) {
        if (['__proto__','constructor','prototype'].includes(k)) throw Error('Unsafe project key.');
        pending.push({value:v,depth:depth+1});
      } else if (value!==null && !['string','number','boolean','undefined'].includes(typeof value)||typeof value==='number'&&!Number.isFinite(value)) throw Error('Project must contain JSON data.');
    }
    if (!project.files||typeof project.files!=='object'||Array.isArray(project.files)) throw Error('Project files must be a base64 map.');
    const files=Object.entries(project.files);if (files.length>10000) throw Error('Too many project files.');
    let total=0;
    for (const [name,bytes] of files) {
      safePath(name);
      if (typeof bytes!=='string'||bytes.length>Math.ceil(32*1024*1024/3)*4||bytes.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(bytes)) throw Error('Invalid or oversized base64 project file.');
      const padding=bytes.endsWith('==')?2:bytes.endsWith('=')?1:0,size=bytes.length/4*3-padding;
      const tail='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.indexOf(bytes[bytes.length-padding-1]);
      if (size>32*1024*1024||padding===2&&(tail&15)!==0||padding===1&&(tail&3)!==0) throw Error('Invalid or oversized base64 project file.');
      total+=size;
      if (total>64*1024*1024) throw Error('Project files exceed 64 MiB.');
    }
    for (const name of [m.layout,...(m.styles??[]),m.script].filter(v=>v!==undefined)) safePath(name);
    if (m.script && (!Object.hasOwn(project.files,m.script)||['manifest.json','layout.json','style.css','preview-data.json','studio-design.json'].includes(m.script))) throw Error('Project Lua entry point is missing or uses a managed metadata path.');
    return {files:files.length,fileBytes:total,assets:files.filter(([name])=>name.startsWith('assets/')).length,luaFiles:files.filter(([name])=>/\.lua$/i.test(name)).length};
  }

  // Shared by preflight and packaging. No compilation, ZIP output, image
  // extraction, font loading or custom Lua execution happens in this check.
  function preparedInputs(rom,source){
    const identity=romIdentity(rom);
    try{const files=validatePreparedProject(source,identity),fields=describeDataFields(source);return {identity,files,fields};}
    catch(error){error.romIdentity={...identity};throw error;}
  }
  function inspectProject(rom,source){
    const {identity,files,fields}=preparedInputs(rom,source),m=source.manifest;
    const nativeFields=Object.keys(m.values??{}).length;
    return {...identity,...files,source:'studio-project',packId:m.id,name:m.name,version:m.version,width:source.width,height:source.height,dataFields:Object.keys(fields).length,nativeFields,reader:m.script?'lua':nativeFields?'native':'sample',runtimeVerified:false,diagnostics:projectDiagnostics(source)};
  }

  // BEGIN GENERATED PROJECT DIAGNOSTICS
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
  function projectDiagnostics(project){
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
  function projectIssueText(issue,language='en'){
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
  // END GENERATED PROJECT DIAGNOSTICS
  function referenceError(diagnostics){const error=Error('Project references need attention before packaging.');error.diagnostics=diagnostics;return error;}

  function cancelled(signal) {
    if (!signal?.aborted) return;
    const error = new Error('Cancelled.');
    error.name = 'AbortError';
    throw error;
  }

  function profileFor(rom, expected = {}) {
    if (!(rom instanceof Uint8Array) || rom.length < 0xc0 || rom.length > MAX_ROM_BYTES) {
      throw Error('ROM must be a GBA file between 192 bytes and 32 MiB.');
    }
    const crc = root.FE7PublicPrep.crc32(rom).toString(16).toUpperCase().padStart(8, '0');
    const code = String.fromCharCode(...rom.subarray(0xac, 0xb0));
    const profile = root.COMPANION_PROFILES.find(candidate => candidate.crc32 === crc && candidate.code === code);
    if (!profile) throw Error('Unsupported ROM / CRC32 ' + crc + '. Use an exact supported ROM revision.');
    if (expected.profileId !== undefined && expected.profileId !== profile.id) {
      throw Error('ROM does not match the selected profile.');
    }
    if (expected.crc32 !== undefined && String(expected.crc32).toUpperCase() !== crc) {
      throw Error('ROM CRC32 differs from the catalog.');
    }
    if (expected.gameCode !== undefined && expected.gameCode !== code) {
      throw Error('ROM game code differs from the catalog.');
    }
    return profile;
  }

  async function readRom(file) {
    if (!file || file.size > MAX_INPUT_BYTES) throw Error('File exceeds 64 MiB.');
    const buffer = await file.arrayBuffer();
    if (!/\.zip$/i.test(file.name)) {
      if (buffer.byteLength > MAX_ROM_BYTES) throw Error('ROM exceeds 32 MiB.');
      return new Uint8Array(buffer);
    }

    const zip = await root.JSZip.loadAsync(buffer);
    const entries = Object.values(zip.files).filter(entry => !entry.dir && /\.gba$/i.test(entry.name));
    if (entries.length !== 1) throw Error('ZIP must contain exactly one .gba ROM.');
    if (entries[0]._data?.uncompressedSize > MAX_ROM_BYTES) throw Error('ROM exceeds 32 MiB.');

    // Bound the actual inflated stream as well as the untrusted ZIP size header.
    return new Promise((resolve, reject) => {
      let total = 0;
      let settled = false;
      let stream;
      const chunks = [];
      const fail = error => {
        if (settled) return;
        settled = true;
        stream?.pause();
        chunks.length = 0;
        reject(error);
      };
      try {
        stream = entries[0].internalStream('uint8array');
      } catch (error) {
        fail(error);
        return;
      }
      stream.on('data', chunk => {
        if (settled) return;
        total += chunk.byteLength;
        if (total > MAX_ROM_BYTES) {
          fail(Error('ROM exceeds 32 MiB.'));
          return;
        }
        chunks.push(chunk);
      });
      stream.on('error', fail);
      stream.on('end', () => {
        if (settled) return;
        settled = true;
        const rom = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
          rom.set(chunk, offset);
          offset += chunk.byteLength;
        }
        chunks.length = 0;
        resolve(rom);
      });
      stream.resume();
    });
  }

  let fontPromise;
  function fonts() {
    return fontPromise ??= Promise.all([
      ['Inter-Regular.otf', '400'],
      ['Inter-Bold.otf', '700'],
    ].map(async ([name, weight]) => {
      const bytes = root.FE7PublicPrep.from64(root.COMPANION_UI_FILES['assets/fonts/' + name]);
      const face = new FontFace('KitInter', bytes, { weight });
      await face.load();
      document.fonts.add(face);
    }));
  }

  async function renderRadar(growth, bonus, language = 'vi') {
    await fonts();
    const canvas = document.createElement('canvas');
    root.CompanionRadar.draw(canvas, growth, bonus, language);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(result => result
        ? resolve(result)
        : reject(Error('Could not render Growth diagram.')), 'image/png');
    });
    return new Uint8Array(await blob.arrayBuffer());
  }

  async function build(rom, options = {}) {
    cancelled(options.signal);
    const profile = profileFor(rom, options);
    const api = root[profile.api];
    const template = clone(root[profile.template]);
    // Producers may start from a generic public template. Navigation packaging
    // must receive the exact identity already verified by profileFor().
    template.manifest.match = { gameCode: [profile.code], crc32: [profile.crc32] };
    template.files = clone(root.COMPANION_UI_FILES);
    const result = await api.prepare(rom, template, root[profile.runtime], {
      signal: options.signal,
      renderRadar: options.renderRadar || ((growth, bonus) => renderRadar(growth, bonus, profile.language || 'vi')),
      onProgress: options.onProgress,
      yieldControl: options.yieldControl || (() => new Promise(resolve => setTimeout(resolve, 0))),
    });
    cancelled(options.signal);

    const packed = await packageProject(result.project, options);
    return { profile, ...packed, report: result.report };
  }

  async function packageProject(project, options = {}) {
    cancelled(options.signal);
    const compiled = root.CompanionCompiler.compileDesign(project);
    const zip = new root.JSZip();
    for (const [name, data] of Object.entries(compiled.files)) if(name!=='studio-design.json')zip.file(name, data, { base64: true });
    const generatedLayout = JSON.stringify(compiled.layout, null, 2);
    zip.file('layout.json', generatedLayout);
    zip.file('style.css', compiled.css);
    if (compiled.hasEditorMetadata || Number.isInteger(project.width)&&Number.isInteger(project.height)) {
      zip.file('studio-design.json', JSON.stringify({
        version: 1,
        layout: project.layout,
        css: project.css,
        generatedLayout,
        generatedCss: compiled.css,
        width: project.width,
        height: project.height,
        ...(project.editorGrid?{editorGrid:project.editorGrid}:{}),
      }));
    }
    zip.file('manifest.json', JSON.stringify({
      ...project.manifest,
      formatVersion: 2,
      layout: 'layout.json',
      styles: ['style.css'],
    }, null, 2));
    zip.file('preview-data.json', JSON.stringify(project.data));
    // JSZip creates directory entries too; normalize all timestamps so the
    // same prepared source produces the same bytes regardless of build time.
    for (const entry of Object.values(zip.files)) entry.date = new Date('1980-01-01T00:00:00Z');
    const zipBytes = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
    cancelled(options.signal);
    return { project, zipBytes };
  }

  async function buildProject(rom, source, options = {}) {
    cancelled(options.signal);
    const {identity,fields}=preparedInputs(rom,source);
    const diagnostics=projectDiagnostics(source);if(diagnostics.errors){const error=referenceError(diagnostics);error.romIdentity={...identity};throw error;}
    const project=clone(source);
    project.manifest.studioDataFields=fields;
    // Never broaden a recipe to other revisions, or mutate the author's source.
    project.manifest.match={gameCode:[identity.gameCode],crc32:[identity.crc32]};
    options.onProgress?.('Packing Studio project');
    const result=await packageProject(project,options);
    return {...result,profile:{id:project.manifest.id,name:project.manifest.name,nameVi:project.manifest.name,output:project.manifest.id+'-'+project.manifest.version},report:{...identity,files:Object.keys(project.files).length,source:'studio-project',runtimeVerified:false}};
  }
  root.CompanionBuild = { build, buildProject, inspectProject, projectDiagnostics, projectIssueText, describeDataFields, romIdentity, readRom, profileFor, MAX_ROM_BYTES, MAX_INPUT_BYTES };
})(globalThis);
