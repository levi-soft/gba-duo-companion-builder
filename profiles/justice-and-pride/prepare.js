// BE8E / AC23B461; tables traced from this ROM's native pointer literals.
(function(root){
  async function prepareExtra({reader:r,bytes,data:D,image,project,options}){
    // Preserve native chapter text; never infer hack numbering from retail slots.
    for(const chapter of D.fe8Chapters){
      const match=chapter.name.match(/^(Ch(?:apter)?\.?\s*\d+[a-z]?(?:[-.]\d+)?|C\d+[a-z]?|Prologue|P|Finale|Final(?: Chapter)?|Epilogue)\s*:\s*(.+)$/i);
      chapter.label=match?(match[1]==='P'?'Prologue':match[1]):'Chapter';
      if(match)chapter.name=match[2];
    }
    D.talkConfig={chapter:0x0202BCFE,temporaryFlags:0x03005270,permanentFlags:0x03005250};
    D.talkEvents=Array.from({length:79},(_,chapter)=>{
      const eventId=r.u8(0x8B0890+chapter*0x94+0x74);
      const group=r.u32(0x1153894+eventId*4)-0x08000000;
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

    // Exact active native growth contracts.
    D.levelCaps=Array.from({length:256},(_,id)=>r.u8(0xB47DAC+id));
    D.skillConfig={entry:0x8B49168,buffer:0x02026B90,cache:0x02026BB0,limit:6};
    D.skillData={};
    for(let id=1;id<255;id++){
      const description=r.text(r.u16(0xB2B41C+id*2));
      if(!description)continue;
      const colon=description.indexOf(':');
      D.skillData[id]={id,name:colon<0?description:description.slice(0,colon),description,icon:await image('assets/images/skills/'+id+'.png',root.CompanionRom.tiles(r,bytes.subarray(0xB4A0B8+id*128,0xB4A0B8+(id+1)*128),16,16,0x5996F4))};
    }
  }
  const profile=Object.freeze({
    id:"justice-and-pride",
    code:"BE8E",
    crc32:0xAC23B461,
    language:"en",
    characters:0x803D30,
    classes:0x807110,
    items:0x809B10,
    portraits:0x189ABDC,
    sprites:0x8AF880,
    icons:0x5926F4,
    iconPalettes:0x5996F4,
    text:0x1000000,
    chapters:0x8B0890,
    slots:0x59A5D0,
    spritePalettes:0x59EE20,
    minimap:0xA1FBD8,
    minimapPalette:0xA1FFB0,
    classCount:0x80,
    allowEmptyPortraits:true,decodeText:root.CompanionLatinText,prepareExtra
  });
  root.JusticeAndPridePrep={...root.FE8PublicPrep,prepare(input,template,runtime,options={}){return root.FE8PublicPrep.prepare(input,template,runtime,options,profile);},radarSvg(growth,bonus){return root.CompanionRadar.svg(growth,bonus,'en');}};
})(globalThis);
