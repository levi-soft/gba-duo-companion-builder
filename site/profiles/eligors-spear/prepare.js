// BE8E / 6E5FE3B0; tables traced from this ROM's native pointer literals.
(function(root){
  async function prepareExtra({reader:r,bytes,data:D,image}){
    // Preserve native chapter text; never infer hack numbering from retail slots.
    for(const chapter of D.fe8Chapters){
      const match=chapter.name.match(/^(Ch(?:apter)?\.?\s*\d+[a-z]?(?:[-.]\d+)?|C\d+[a-z]?|Prologue|P|Finale|Final(?: Chapter)?|Epilogue)\s*:\s*(.+)$/i);
      chapter.label=match?(match[1]==='P'?'Prologue':match[1]):'Chapter';
      if(match)chapter.name=match[2];
    }
    // Native follow-up hook's zero-terminated item-index table.
    const denyAt=r.u32(0x11B1D38)-0x08000000;
    D.battleConfig={doublingThreshold:4,noFollowUpItems:{}};
    let terminated=false;
    for(let n=0;n<256;n++){const id=r.u8(denyAt+n);if(!id){terminated=true;break;}D.battleConfig.noFollowUpItems[id]=true;}
    if(!terminated)throw Error('Unterminated native follow-up deny table');
    for(const[id,item]of Object.entries(D.forecastItems))item.weaponEffect=r.u8(profile.items+Number(id)*36+31);
    D.talkConfig={chapter:0x0202BCFE,temporaryFlags:0x03005270,permanentFlags:0x03005250};
    D.talkEvents=Array.from({length:79},(_,chapter)=>{
      const eventId=r.u8(0x8B0890+chapter*0x94+0x74);
      const group=r.u32(0x1527CB4+eventId*4)-0x08000000;
      if(group<0||group+8>bytes.length)return [];
      const events=r.u32(group+4)-0x08000000,result=[];
      if(events<0||events>=bytes.length)return result;
      for(let n=0;n<256&&events+n*16+16<=bytes.length;n++){
        const at=events+n*16,type=r.u16(at);if(!type)break;
        if(type!==3)return [];
        if(!r.u32(at+4))continue;
        result.push({flag:r.u16(at+2),from:r.u8(at+8),to:r.u8(at+9),anySource:r.u8(at+8)===0,conditionType:r.u16(at+12),conditionFlag:r.u16(at+14)});
      }
      return result;
    });
    // Read HP caps from class records as well: several hacks exceed retail 60.
    for(const [pointer,c]of Object.entries(D.growthClasses))c.caps[0]=r.u8(+pointer-0x08000000+19);
  }
  const profile=Object.freeze({
    id:"eligors-spear",
    code:"BE8E",
    crc32:0x6E5FE3B0,
    language:"en",
    characters:0x803D30,
    classes:0x807110,
    items:0x17AF774,
    portraits:0x182AFE8,
    sprites:0x17EBA24,
    icons:0x181FA30,
    iconPalettes:0x5996F4,
    text:0x1C2DDA8,
    chapters:0x8B0890,
    slots:0x59A5D0,
    spritePalettes:0x59EE20,
    minimap:0xA1FBD8,
    minimapPalette:0xA1FFB0,
    classCount:0x80,
    decodeText:root.CompanionLatinText,prepareExtra
  });
  root.EligorsSpearPrep={...root.FE8PublicPrep,prepare(input,template,runtime,options={}){return root.FE8PublicPrep.prepare(input,template,runtime,options,profile);},radarSvg(growth,bonus){return root.CompanionRadar.svg(growth,bonus,'en');}};
})(globalThis);
