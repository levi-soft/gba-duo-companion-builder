import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const context={TextDecoder,TextEncoder};context.globalThis=context;
vm.runInNewContext(fs.readFileSync('site/profiles/fe7-vietnamese/prepare.js','utf8'),context);
function fixture(tail){
  const bytes=new Uint8Array(0x13000+tail.length),view=new DataView(bytes.buffer);
  for(const [at,value]of [[0x6bc,0x08000000],[0x6b8,0x08000200],[0x200,0x08000300],[0x12cb8,0x08000400]])view.setUint32(at,value,true);
  bytes.set(tail,0x13000);return {bytes,view,reader:context.CompanionFe7Rom.reader(bytes)};
}
test('literal LZ77 properties match independently generated payloads, including high bytes and truncation',()=>{
  let seed=0x5a334422;const next=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
  for(let run=0;run<120;run++){
    const length=1+next()%256,payload=Uint8Array.from({length},()=>next()>>>24),encoded=[0x10,length&255,length>>>8,0];
    for(let i=0;i<length;i+=8)encoded.push(0,...payload.subarray(i,i+8));
    const {reader}=fixture(encoded);assert.deepEqual([...reader.lz(0x13000)],[...payload]);
    for(const cut of [0,1,3,encoded.length-1])assert.throws(()=>fixture(encoded.slice(0,cut)).reader.lz(0x13000));
  }
  assert.throws(()=>fixture([0x10,3,0,0,0x80,0,0]).reader.lz(0x13000),/reference/);
});
test('pointer properties accept in-file targets and reject either side of the ROM window',()=>{
  const {bytes,view,reader}=fixture([1]);
  for(const offset of [0,1,7,0x100,bytes.length-1]){view.setUint32(0x100,0x08000000+offset,true);assert.equal(reader.ptr(0x100),offset);}
  for(const value of [0,0x07ffffff,0x08000000+bytes.length,0xffffffff]){view.setUint32(0x100,value,true);assert.throws(()=>reader.ptr(0x100),/outside/);}
  assert.equal(context.FE7PublicPrep.crc32(new TextEncoder().encode('123456789')),0xcbf43926,'standard CRC32 check vector');
});
