// Exact local ROM BE8E / A74E93C7; pointers traced from this revision.
(function(root) {
  function prepareExtra({reader:r,bytes,data:D}) {
    D.nativeAbilityConfig={
      shot:{first:r.u8(0x2B22A),last:r.u8(0x2B226),chance:'level'},
      pierce:{first:r.u8(0x2B2AE),last:r.u8(0x2B2AA),chance:'Skill'},
      shield:{first:r.u8(0x2B34A),last:r.u8(0x2B346),chance:'enemy Defense'},
      slayer:{first:r.u8(0x16C98),last:r.u8(0x16C94)},
      critBonus:r.u8(0x2AC4A),pickClasses:{[r.u8(0x23E90)]:true}
    };
    // Active BattleGetFollowUpOrder hook: bounded zero-terminated item IDs.
    const denyAt=r.u32(0x15E210)-0x08000000;
    D.battleConfig={doublingThreshold:4,noFollowUpItems:{}};
    let terminated=false;
    for(let n=0;n<256;n++){const id=r.u8(denyAt+n);if(!id){terminated=true;break;}D.battleConfig.noFollowUpItems[id]=true;}
    if(!terminated)throw Error('Unterminated Lonely Mirror follow-up deny table');
    for(const[id,item]of Object.entries(D.forecastItems||{}))item.weaponEffect=r.u8(0x125D334+Number(id)*36+31);
    // Read the actual affinity table; hacks may replace retail support bonuses.
    const affin=['Fire','Thunder','Wind','Ice','Dark','Light','Anima'];
    const support=r.u32(0x28534)-0x08000000;
    for(let stat=0;stat<6;stat++) {
      const table={'---':'---','?':'---','':'---'};
      for(let n=0;n<7;n++) {
        const at=support+n*8;
        if(r.u8(at)!==n+1)throw Error('Unsupported The Lonely Mirror affinity table');
        table[affin[n]]=r.u8(at+1+stat)/2;
      }
      D['lookup'+(27+stat)]=table;
    }
    D.talkConfig={chapter:0x0202BCFE,temporaryFlags:0x03005270,permanentFlags:0x03005250};
    D.talkEvents=Array.from({length:79},(_,chapter)=>{
      const eventId=r.u8(0x8B0890+chapter*0x94+0x74);
      const group=r.u32(0x1001400+eventId*4)-0x08000000;
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
    id:'the-lonely-mirror',code:'BE8E',crc32:0xA74E93C7,language:'en',decodeText:root.CompanionLatinText,
    characters:0x803D30,classes:0x807110,items:0x125D334,
    portraits:0x1A11C80,sprites:0x11DE368,icons:0x1001800,
    iconPalettes:0x5996F4,spritePalettes:0x59EE20,slots:0x59A5D0,
    text:0x104DC88,chapters:0x8B0890,minimap:0xA1FBD8,minimapPalette:0xA1FFB0,prepareExtra
  });
  root.TheLonelyMirrorPrep={
    ...root.FE8PublicPrep,
    prepare(input,template,runtime,options={}) {
      return root.FE8PublicPrep.prepare(input,template,runtime,options,profile);
    },
    radarSvg(growth,bonus){return root.CompanionRadar.svg(growth,bonus,'en');}
  };
})(globalThis);
