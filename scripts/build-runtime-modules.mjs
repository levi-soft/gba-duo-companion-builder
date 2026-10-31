import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {resolveCursorProfiles} from './cursor-profiles.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Derived profiles inherit the base game and override only their own contracts.
// Their development/stable status is declared separately in the profile registry.
const registryContext={};
vm.runInNewContext(fs.readFileSync(path.join(root,'site/profiles.js'),'utf8'),registryContext);
const profiles=registryContext.COMPANION_PROFILES.map(profile=>profile.id);
const inherited={'fe7-english':'fe7-vietnamese','fe8-europe':'fe8-vietnamese','fe8-english':'fe8-europe','fe6-english':'fe7-vietnamese','fe6-project-ember':'fe6-english','fe6-project-ember-rr':'fe6-project-ember','voids-blitzarre':'fe8-english','storge':'fe8-english','hag-in-white':'fe8-english','sacred-echoes':'fe8-english','vision-quest':'fe8-english','the-last-promise':'fe7-english'};
for(const profile of registryContext.COMPANION_PROFILES){
 if(profile.runtimeParent){
  if(!profiles.includes(profile.runtimeParent))throw Error('Unknown runtime parent: '+profile.runtimeParent);
  inherited[profile.id]=profile.runtimeParent;
 }
}
const readModules=directory=>Object.fromEntries(fs.readdirSync(directory).filter(name=>name.endsWith('.lua')).sort().map(name=>[
 name,fs.readFileSync(path.join(directory,name),'utf8').replace(/\r\n/g,'\n')
]));
const shared=readModules(path.join(root,'runtime/shared'));
// Explicit alias to the canonical FE8 orchestrator. Derived Analysis adapters
// can reuse it without copying it or resolving their own features.analysis.
shared['features.fe8-analysis.lua']=fs.readFileSync(path.join(root,'runtime/fe8-vietnamese/features.analysis.lua'),'utf8').replace(/\r\n/g,'\n');
function authored(profile, chain=[]) {
 if(chain.includes(profile))throw Error('Cyclic runtime inheritance: '+[...chain,profile].join(' -> '));
 const parent=inherited[profile] ? authored(inherited[profile],[...chain,profile]) : {};
 return {...parent,...readModules(path.join(root,'runtime',profile))};
}
const cursorProfiles=resolveCursorProfiles(JSON.parse(fs.readFileSync(path.join(root,'runtime/cursor/profiles.json'),'utf8')));
function cursorLua(value){
 if(typeof value==='number')return String(value);
 if(typeof value==='string')return /^0x[0-9a-f]+$/i.test(value)?value:JSON.stringify(value);
 if(Array.isArray(value))return '{'+value.map(cursorLua).join(',')+'}';
 if(value&&typeof value==='object'&&!Array.isArray(value))return '{'+Object.entries(value).map(([key,child])=>'['+JSON.stringify(key)+']='+cursorLua(child)).join(',')+'}';
 throw Error('Unsupported cursor profile value');
}
const registry={};
for(const profile of profiles){
 const available={...shared,...authored(profile)};
 const cursor=cursorProfiles[profile],info=registryContext.COMPANION_PROFILES.find(p=>p.id===profile);
 const nativeCursor=cursor?{...cursor,gameCode:info.code}:{version:0,kind:'unsupported'};
 if(profile==='pokemblem')nativeCursor.modeGuard={...cursor.modeGuard,processScripts:[0x0969B044,0x0969B004,0x0969B024]};
 available['game.cursor-profile.lua']='-- Generated exact-ROM native D-pad cursor contract. Unit offsets use raw mem.\nreturn '+cursorLua(nativeCursor)+'\n';
 if((available['main.lua'].match(/^function update\(\)/gm)||[]).length!==1)
  throw Error(profile+': expected one authored update entry point');
 available['main.lua']=available['main.lua'].replace(/^function update\(\)/m,'local function updateProfile()');
 // Present Growth after every profile has finished reading and calculating.
 // FE7 exposes its Growth algorithm as a different contract, so decorate the
 // final update rather than replacing any ROM-specific features.growth module.
 available['main.lua']+='\n-- Common Growth presentation; uses official pack.require and PNG assets only.\n'
  +'local applyGrowthRates = pack.require("presentation.growth-rates")(pack.require("data.rom_tables"))\n'
  +'local continueWork = pack.require("presentation.continuation")()\n'
  +'local updateSnapshots = pack.require("game.snapshot")\n'
  +'actions = actions or {}\n'
  +'function actions.resumeCompanion()\n'
  +'  local pulse = tonumber(ui and ui.companionWorkPulse) or 0\n'
  +'  if math.type(pulse) ~= "integer" or pulse < 0 or pulse >= 2147483647 then pulse = 0 end\n'
  +'  return { set = { companionWorkPulse = (pulse + 1) % 2147483647 } }\n'
  +'end\n'
  +'function update()\n'
  +'  if type(updateSnapshots) == "table" then updateSnapshots.begin() end\n'
  +'  local v = updateProfile()\n'
  +'  if type(updateSnapshots) == "table" then updateSnapshots.finish() end\n'
  +'  return continueWork(applyGrowthRates(v))\n'
  +'end\n';
 const output={};
 function include(file){
  if(output[file])return;
  const source=available[file];
  if(!source)throw Error(`${profile}: missing authored module ${file}`);
  output[file]=source;
  for(const match of source.matchAll(/pack\.require\(["']([A-Za-z0-9_.-]+)["']\)/g)){
   const name=match[1];
   if(name==='data.rom_tables')continue; // Prepared locally from the user's ROM.
   if(name.includes('..'))throw Error('Invalid module name: '+name);
   include(name+'.lua');
  }
 }
 include('main.lua');
 registry[profile]=Object.fromEntries(Object.entries(output).sort(([a],[b])=>a.localeCompare(b,'en')));
 // Keep the profile's discoverable entry point readable outside the JS registry.
 fs.writeFileSync(path.join(root,'site/profiles',profile,'runtime-template.lua'),available['main.lua']);
}
const hostRequirements=JSON.parse(fs.readFileSync(path.join(root,'runtime/host/profiles.json'),'utf8'));
const hostFeatures=new Set(['gba-bus-context-v1','fe-map-mode-guard-v1']);
for(const [id,features]of Object.entries(hostRequirements)){
 if(!profiles.includes(id)||!Array.isArray(features)||!features.length||new Set(features).size!==features.length||features.some(feature=>!hostFeatures.has(feature)))throw Error('Invalid host requirements: '+id);
}
fs.writeFileSync(path.join(root,'site/runtime-modules.js'),
 '// Generated from runtime/**/*.lua by scripts/build-runtime-modules.mjs.\n'+
 'globalThis.COMPANION_RUNTIME_MODULES='+JSON.stringify(registry)+';\n'+
 'globalThis.COMPANION_CURSOR_PROFILES='+JSON.stringify(cursorProfiles)+';\n'+
 'globalThis.COMPANION_HOST_REQUIREMENTS='+JSON.stringify(hostRequirements)+';\n');
console.log('Runtime modules: '+profiles.map(p=>p+' '+Object.keys(registry[p]).length).join(', '));
