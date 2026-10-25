import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveCursorProfiles} from './cursor-profiles.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Original English profiles are development runtimes outside the public catalogue.
// Inherit each game's implementation; override only region/presentation contracts.
const profiles=['fe7-vietnamese','fe6-remastered','fe8-vietnamese','fe7-english','fe8-europe','fe8-english','fe6-english','fe6-project-ember','fe6-project-ember-rr','voids-blitzarre'];
const inherited={'fe7-english':'fe7-vietnamese','fe8-europe':'fe8-vietnamese','fe8-english':'fe8-europe','fe6-english':'fe7-vietnamese','fe6-project-ember':'fe6-english','fe6-project-ember-rr':'fe6-project-ember','voids-blitzarre':'fe8-english'};
const readModules=directory=>Object.fromEntries(fs.readdirSync(directory).filter(name=>name.endsWith('.lua')).sort().map(name=>[
 name,fs.readFileSync(path.join(directory,name),'utf8').replace(/\r\n/g,'\n')
]));
const shared=readModules(path.join(root,'runtime/shared'));
function authored(profile, chain=[]) {
 if(chain.includes(profile))throw Error('Cyclic runtime inheritance: '+[...chain,profile].join(' -> '));
 const parent=inherited[profile] ? authored(inherited[profile],[...chain,profile]) : {};
 return {...parent,...readModules(path.join(root,'runtime',profile))};
}
const registry={};
for(const profile of profiles){
 const available={...shared,...authored(profile)};
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
const cursorProfiles=resolveCursorProfiles(JSON.parse(fs.readFileSync(path.join(root,'runtime/cursor/profiles.json'),'utf8')));
fs.writeFileSync(path.join(root,'site/runtime-modules.js'),
 '// Generated from runtime/**/*.lua by scripts/build-runtime-modules.mjs.\n'+
 'globalThis.COMPANION_RUNTIME_MODULES='+JSON.stringify(registry)+';\n'+
 'globalThis.COMPANION_CURSOR_PROFILES='+JSON.stringify(cursorProfiles)+';\n');
console.log('Runtime modules: '+profiles.map(p=>p+' '+Object.keys(registry[p]).length).join(', '));
