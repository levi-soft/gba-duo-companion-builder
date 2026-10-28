import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function diagnosticsRegion(source){
 return '  // BEGIN GENERATED PROJECT DIAGNOSTICS\n'+source.replace(/\r\n/g,'\n').replace(/^export /gm,'').trimEnd().split('\n').map(line=>'  '+line).join('\n')+'\n  // END GENERATED PROJECT DIAGNOSTICS';
}
const file=path.join(root,'site/builder-core.js'),before=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
const region=/  \/\/ BEGIN GENERATED PROJECT DIAGNOSTICS\n[\s\S]*?  \/\/ END GENERATED PROJECT DIAGNOSTICS/g;
if([...before.matchAll(region)].length!==1)throw Error('Expected one embedded diagnostics region.');
const source=fs.readFileSync(path.join(root,'ui/project-diagnostics.js'),'utf8');
fs.writeFileSync(file,before.replace(region,()=>diagnosticsRegion(source)));
