import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'ui/function-blocks.js'),'utf8').replace(/\r\n/g,'\n');
export function functionBlocksBundle(source){
  return '// Generated from ui/function-blocks.js; keep its Studio mirror synchronized.\n(function(root){\n"use strict";\n'+source.replace(/^export /gm,'')+'\nroot.CompanionBlocks={characterCard,statsTable};\n})(globalThis);\n';
}
fs.writeFileSync(path.join(root,'site/function-blocks.js'),functionBlocksBundle(source));
