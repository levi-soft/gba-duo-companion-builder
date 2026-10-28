// Portable contract, mirrored by Builder scripts/ram-evidence.mjs.
/** @typedef {Record<string,any>} BridgeInfo */
/** @typedef {{label:string,capturedAt:string,packet:BridgeInfo}} EvidenceSample */
/** @typedef {{format:'gba-duo-ram-evidence',version:1,samples:EvidenceSample[]}} RamEvidence */
export const evidenceLimits={samples:16,bytes:8*1024*1024,ramBytes:0x48000};
const regions=[[0x02000000,0x02040000],[0x03000000,0x03008000]];
/** @param {unknown} value @returns {Record<string,any>} */
function object(value){if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid evidence object.');return value;}
/** @param {unknown} value @param {number} max */
function text(value,max){if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('Invalid evidence text.');return value;}
/** @param {unknown} value */
function integer(value){if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)throw Error('Invalid evidence frame.');return value;}
/** Validate before decoding; tolerate neither truncation nor permissive base64. @param {unknown} value */
export function evidenceRange(value){
  const r=object(value),address=integer(r.address),length=integer(r.length);
  if(length<1||!regions.some(([start,end])=>address>=start&&address<end&&length<=end-address))throw Error('Evidence range is outside GBA RAM.');
  if(typeof r.base64!=='string'||r.base64.length!==4*Math.ceil(length/3)||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(r.base64))throw Error('Invalid evidence base64.');
  const binary=atob(r.base64);
  if(binary.length!==length||btoa(binary)!==r.base64)throw Error('Evidence byte length or encoding mismatch.');
  return {address,length,base64:r.base64};
}
/** @param {BridgeInfo} packet */
function identity(packet){return JSON.stringify([packet.gameCode,packet.crc32,packet.sessionId,packet.packId]);}
/** Deliberately project metadata: device serials, paths and scripts are not exported. @param {unknown} value @returns {BridgeInfo} */
function packet(value){
  const p=object(value);
  if(typeof p.gameCode!=='string'||! /^[A-Z0-9]{4}$/.test(p.gameCode)||typeof p.crc32!=='string'||! /^[A-Fa-f0-9]{8}$/.test(p.crc32))throw Error('Evidence requires exact game code and CRC32.');
  const sessionId=text(p.sessionId,128),frame=integer(p.frame);
  if(p.packId!=null&&(typeof p.packId!=='string'||p.packId.length>128))throw Error('Invalid evidence pack ID.');
  if(!Array.isArray(p.ranges)||!p.ranges.length||p.ranges.length>64)throw Error('Evidence requires RAM ranges.');
  const ranges=p.ranges.map(evidenceRange).sort((a,b)=>a.address-b.address);
  let end=0,total=0;
  for(const r of ranges){if(r.address<end)throw Error('Overlapping evidence RAM ranges.');end=r.address+r.length;total+=r.length;}
  if(total>evidenceLimits.ramBytes)throw Error('Evidence RAM is too large.');
  return {gameCode:p.gameCode,crc32:p.crc32.toUpperCase(),sessionId,packId:p.packId??undefined,frame,paused:p.paused===true,ranges};
}
/** @param {unknown} value @returns {RamEvidence} */
export function validateEvidence(value){
  const doc=object(value);
  if(doc.format!=='gba-duo-ram-evidence'||doc.version!==1||!Array.isArray(doc.samples)||doc.samples.length<1||doc.samples.length>evidenceLimits.samples)throw Error('Unsupported RAM evidence document.');
  const samples=doc.samples.map((entry)=>{
    const sample=object(entry),label=text(sample.label,120),capturedAt=text(sample.capturedAt,40);
    if(!Number.isFinite(Date.parse(capturedAt)))throw Error('Invalid evidence timestamp.');
    return {label,capturedAt,packet:packet(sample.packet)};
  });
  if(samples.some(s=>identity(s.packet)!==identity(samples[0].packet)))throw Error('ROM, session or companion changed; start a new evidence file.');
  return {format:'gba-duo-ram-evidence',version:1,samples};
}
/** @param {string} source */
export function parseEvidence(source){if(new TextEncoder().encode(source).length>evidenceLimits.bytes)throw Error('Evidence file is too large.');return validateEvidence(JSON.parse(source));}
/** @param {RamEvidence|null} current @param {BridgeInfo} value @param {string} label @param {string} [capturedAt] */
export function appendEvidence(current,value,label,capturedAt=new Date().toISOString()){
  return validateEvidence({format:'gba-duo-ram-evidence',version:1,samples:[...(current?.samples??[]),{label,capturedAt,packet:value}]});
}
/** Resolve only captured bytes. Replay cannot fall through to a live bridge. @param {EvidenceSample} sample @param {number} address @param {number} length */
export function replayBytes(sample,address,length){
  if(!Number.isSafeInteger(address)||!Number.isSafeInteger(length)||length<1)throw Error('Invalid replay read.');
  const range=sample.packet.ranges?.find(r=>address>=r.address&&length<=r.address+r.length-address);
  if(!range)throw Error('Read outside captured RAM.');
  const bytes=Uint8Array.from(atob(range.base64),c=>c.charCodeAt(0));
  return bytes.slice(address-range.address,address-range.address+length);
}
