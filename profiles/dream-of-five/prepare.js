// Exact local ROM BE8E / B313A6F5; pointers traced from this revision.
(function(root) {
  function prepareExtra({reader:r,bytes,data:D}) {
    for(const[id,item]of Object.entries(D.forecastItems||{}))item.weaponEffect=r.u8(0x1B00150+Number(id)*36+31);
    // Active native class ranges, including the changed critical bonus.
    D.nativeAbilityConfig={
      shot:{first:r.u8(0x2B22A),last:r.u8(0x2B226),chance:'level'},
      pierce:{first:r.u8(0x2B2AE),last:r.u8(0x2B2AA),chance:'level'},
      shield:{first:r.u8(0x2B34A),last:r.u8(0x2B346),chance:'enemy level'},
      slayer:{first:r.u8(0x16C98),last:r.u8(0x16C94)},
      critBonus:r.u8(0x2AC4A),pickClasses:{[r.u8(0x23E90)]:true}
    };
    // Read the actual affinity table; hacks may replace retail support bonuses.
    const affin=['Fire','Thunder','Wind','Ice','Dark','Light','Anima'];
    const support=r.u32(0x28534)-0x08000000;
    for(let stat=0;stat<6;stat++) {
      const table={'---':'---','?':'---','':'---'};
      for(let n=0;n<7;n++) {
        const at=support+n*8;
        if(r.u8(at)!==n+1)throw Error('Unsupported Dream of Five - Definitive Edition affinity table');
        table[affin[n]]=r.u8(at+1+stat)/2;
      }
      D['lookup'+(27+stat)]=table;
    }
    D.talkConfig={chapter:0x0202BCFE,temporaryFlags:0x03005270,permanentFlags:0x03005250};
    D.talkEvents=Array.from({length:79},(_,chapter)=>{
      const eventId=r.u8(0x8B0890+chapter*0x94+0x74);
      const group=r.u32(0x14CFFC8+eventId*4)-0x08000000;
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
    // Use titles/prefixes present in the ROM, never the retail chapter-slot number.
    for(const chapter of D.fe8Chapters) {
      const match=chapter.name.match(/^(Ch(?:apter)?\.?\s*\d+[a-z]?(?:[-.]\d+)?|C\d+[a-z]?|Prologue|P|Finale|Final(?: Chapter)?|Epilogue)\s*:\s*(.+)$/i);
      chapter.label=match?(match[1]==='P'?'Prologue':match[1]):'Chapter';
      if(match)chapter.name=match[2];
    }
  }
  const profile=Object.freeze({
    mapRenderOnDemand:true,
    id:'dream-of-five',code:'BE8E',crc32:0xB313A6F5,language:'en',decodeText:root.CompanionLatinText,
    characters:0x803D30,classes:0x807110,items:0x1B00150,
    portraits:0x1B49874,sprites:0x10F084C,icons:0x14381A4,
    iconPalettes:0x5996F4,spritePalettes:0x59EE20,slots:0x59A5D0,
    text:0x1031DFC,chapters:0x8B0890,minimap:0xA1FBD8,minimapPalette:0xA1FFB0,prepareExtra
  });
  root.DreamOfFivePrep={
    ...root.FE8PublicPrep,
    prepare(input,template,runtime,options={}) {
      return root.FE8PublicPrep.prepare(input,template,runtime,options,profile);
    },
    radarSvg(growth,bonus){return root.CompanionRadar.svg(growth,bonus,'en');}
  };
})(globalThis);
