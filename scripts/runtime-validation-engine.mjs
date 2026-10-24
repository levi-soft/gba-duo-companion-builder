// Offline characterization host. All memory is an isolated copy of local fixtures.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url);
export function luaFactory(modulePath=process.env.COMPANION_LUA_MODULE){
 const resolved=require.resolve(modulePath||'wasmoon');
 const {LuaFactory}=require(resolved);
 return new LuaFactory(path.join(path.dirname(resolved),'glue.wasm'));
}

export function captureRanges(file){
 const capture=JSON.parse(fs.readFileSync(file,'utf8'));
 return (capture.result||capture).ranges.map(range=>({address:range.address,bytes:Buffer.from(range.base64,'base64')}));
}

export function projectSource(project,name){
 const value=project.files[name];
 if(typeof value!=='string')throw Error('Missing Lua file: '+name);
 return Buffer.from(value,'base64').toString('utf8');
}

export async function executeProject(project,options={}){
 const factory=options.factory||luaFactory();
 const engine=await factory.createEngine();
 async function execute(code){
  // Wasmoon's doString moves returned values onto its global Lua stack. Clear
  // those slots after conversion; otherwise long tick traces exhaust the stack.
  const top=engine.global.getTop();
  try{return await engine.doString(code);}finally{engine.global.setTop(top);}
 }
 const ranges=(options.ranges||[]).map(range=>({address:range.address,bytes:Buffer.from(range.bytes)}));
 const original=ranges.map(range=>Buffer.from(range.bytes));
 const rom=options.rom?Buffer.from(options.rom):Buffer.alloc(0);
 const calls=[];
 function read(address,length){
  assert(Number.isSafeInteger(address)&&Number.isSafeInteger(length)&&length>=0,'Invalid memory read');
  const range=ranges.find(r=>address>=r.address&&address+length<=r.address+r.bytes.length);
  if(range)return range.bytes.subarray(address-range.address,address-range.address+length);
  if(address>=0x08000000&&address+length<=0x08000000+rom.length)return rom.subarray(address-0x08000000,address-0x08000000+length);
  throw Error('Read outside fixture memory: 0x'+address.toString(16)+' + '+length);
 }
 const mem={};
 for(const [name,width,signed]of [['u8',1,false],['u16',2,false],['u32',4,false],['s8',1,true],['s16',2,true],['s32',4,true]]){
  mem[name]=address=>signed?read(address,width).readIntLE(0,width):read(address,width).readUIntLE(0,width);
 }
 try{
  engine.global.set('__hostMem',mem);
  engine.global.set('__readHex',(address,length)=>read(address,length).toString('hex'));
  engine.global.set('__packSource',name=>projectSource(project,name+'.lua'));
  engine.global.set('__log',message=>calls.push(String(message)));
  engine.global.set('input',{focusUnit:id=>calls.push('focusUnit:'+id)});
  await execute(`
    mem={}
    for _,name in ipairs({'u8','u16','u32','s8','s16','s32'})do
      local read=__hostMem[name];mem[name]=function(address)return read(address)end
    end
    function mem.read(address,length)
      return (__readHex(address,length):gsub('..',function(byte)return string.char(tonumber(byte,16))end))
    end
    local modules={}
    pack={require=function(name)
      assert(type(name)=='string' and name:match('^[%w_.%-]+$') and not name:find('..',1,true),'Unsafe module name')
      if modules[name]~=nil then return modules[name] end
      local chunk=assert(load(__packSource(name),'@'..name..'.lua','t',_ENV))
      local value=chunk()
      modules[name]=value;return value
    end}
    function log(message)__log(tostring(message))end
    ui={};actions={}
  `);
  await execute(projectSource(project,project.manifest.script));
  const values=[];
  for(const step of options.steps||[{ticks:1,ui:{}}]){
   for(const patch of step.patches||[]){
    const range=ranges.find(r=>patch.address>=r.address&&patch.address+patch.bytes.length<=r.address+r.bytes.length);
    assert(range,'Memory patch must stay in an isolated RAM fixture');
    Buffer.from(patch.bytes).copy(range.bytes,patch.address-range.address);
   }
   const expected=ranges.map(range=>Buffer.from(range.bytes));
   engine.global.set('ui',step.ui||{});
   if(step.focusUnit!==undefined){
    assert(Number.isSafeInteger(step.focusUnit),'Invalid isolated focus-unit action');
    await execute('assert(actions.focusMapUnit,"Missing focus-unit action");actions.focusMapUnit('+step.focusUnit+')');
   }
   for(let tick=0;tick<(step.ticks||1);tick++){
    values.push(await execute('return update()'));
    options.onTick?.(values.length);
   }
   for(const [key,expectedValue]of Object.entries(step.expect||{}))assert.deepEqual(values.at(-1)[key],expectedValue,'Fixture did not reach expected '+key);
   ranges.forEach((range,n)=>assert.deepEqual(range.bytes,expected[n],'Lua changed fixture RAM'));
  }
  for(const call of options.requiredCalls||[])assert(calls.includes(call),'Fixture did not execute '+call);
  return {values,calls,readOnly:true,fixtureBytes:original.reduce((n,bytes)=>n+bytes.length,0)};
 }finally{engine.global.close();}
}

export async function compareProjects(before,after,options){
 const baseline=await executeProject(before,options),candidate=await executeProject(after,options);
 assert.equal(candidate.values.length,baseline.values.length);
 for(let tick=0;tick<baseline.values.length;tick++){
  assert.deepEqual(candidate.values[tick],baseline.values[tick],'Runtime output changed at tick '+(tick+1));
 }
 assert.deepEqual(candidate.calls,baseline.calls,'Runtime action/log calls changed');
 return {ticks:baseline.values.length,readOnly:true,fieldsCompared:baseline.values.reduce((n,value)=>n+Object.keys(value).length,0)};
}
