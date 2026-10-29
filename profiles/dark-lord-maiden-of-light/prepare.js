// Exact local ROM AE7E / C99A6D26; pointers traced from this revision.
(function(root) {
  function prepareExtra({reader:r,bytes,data:D}) {
    // The avatar's text entry is an uncompressed RAM pointer, not ROM text.
    // Keep a bounded runtime recipe instead of baking unrelated ROM bytes.
    D.dynamicNames={};
    D.nameGlyphs=Array.from({length:256},(_,byte)=>root.CompanionLatinText([byte]).replace(/[\x00-\x1f\x7f]/g,''));
    const textTable=r.u32(0x12CB8)-0x08000000;
    for(const [pointer,character] of Object.entries(D.mapMeta.chars)) {
      const raw=r.u32(textTable+r.u16(+pointer-0x08000000)*4),address=raw&0x7FFFFFFF;
      if((raw&0x80000000)===0||address<0x02000000||address+16>0x02040000)continue;
      D.dynamicNames[pointer]={address,limit:16};
      const old=character.name;
      character.name='Avatar';D.lookup12[pointer]='Avatar';
      if(D.growthCharacters[pointer])D.growthCharacters[pointer].name='Avatar';
      for(let n=14;n<=22;n+=2)for(const [key,value]of Object.entries(D['lookup'+n]||{}))
        if(value===old)D['lookup'+n][key]='Avatar';
    }
    // Read the actual affinity table; hacks may replace retail support bonuses.
    const affin=['Fire','Thunder','Wind','Ice','Dark','Light','Anima'];
    const support=r.u32(0x26998)-0x08000000;
    for(let stat=0;stat<6;stat++) {
      const table={'---':'---','?':'---','':'---'};
      for(let n=0;n<7;n++) {
        const at=support+n*8;
        if(r.u8(at)!==n+1)throw Error('Unsupported Dark Lord and the Maiden of Light affinity table');
        table[affin[n]]=r.u8(at+1+stat)/2;
      }
      D['lookup'+(39+stat)]=table;
    }
    D.talkConfig={chapter:0x0202BC06,temporaryFlags:0x03004AD8,permanentFlags:0x03004AD0};
    D.talkEvents=Array.from({length:69},(_,chapter)=>{
      const eventId=r.u8(0xC9A200+chapter*0x98+0x78);
      const group=r.u32(0xC9C9C8+eventId*4)-0x08000000;
      if(group<0||group+8>bytes.length)return [];
      const events=r.u32(group+4)-0x08000000,result=[];
      if(events<0||events>=bytes.length)return result;
      for(let n=0;n<256&&events+n*16+16<=bytes.length;n++) {
        const at=events+n*16,type=r.u16(at);
        if(!type)break;
        // Unused chapter slots can reference ordinary scripts, not CHAR lists.
        if(type!==3)return [];
        if(r.u32(at+4))result.push({flag:r.u16(at+2),from:r.u8(at+8),to:r.u8(at+9),
          anySource:r.u8(at+8)===0,conditionType:r.u16(at+12),conditionFlag:r.u16(at+14)});
      }
      return result;
    });
  }
  const profile=Object.freeze({
    id:'dark-lord-maiden-of-light',crc32:0xC99A6D26,language:'en',decodeText:root.CompanionLatinText,
    characterClassPortraits:true,chapterCount:69,
    tables:{characters:0xBDCE18,classes:0xDF8000,chapters:0xC9A200},prepareExtra
  });
  root.DarkLordMaidenOfLightPrep={
    ...root.FE7PublicPrep,
    prepare(input,template,runtime,options={}) {
      return root.FE7PublicPrep.prepare(input,template,runtime,options,profile);
    },
    radarSvg(growth,bonus){return root.CompanionRadar.svg(growth,bonus,'en');}
  };
})(globalThis);
