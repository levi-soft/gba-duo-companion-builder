(function(root) {
  async function prepareExtra({reader:r,bytes,data:D,image}) {
    D.levelCaps=Array.from(bytes.subarray(0xB2B620,0xB2B720));
    D.skillConfig={entry:0x08B4A68C,buffer:0x02026B90,cache:0x02026BB0,limit:6};
    D.skillData={};
    for(let id=1;id<255;id++) {
      const description=r.text(r.u16(0xB2B420+id*2));
      if(!description)continue;
      const colon=description.indexOf(':');
      const pixels=root.CompanionRom.tiles(r,bytes.subarray(0xB4B5FC+id*128,0xB4B5FC+(id+1)*128),16,16,0x5996F4);
      D.skillData[id]={id,name:colon<0?description:description.slice(0,colon),description,
        icon:await image('assets/images/skills/'+id+'.png',pixels)};
    }
    D.talkConfig={chapter:0x0202BCFE,temporaryFlags:0x03005270,permanentFlags:0x03005250};
    D.talkEvents=Array.from({length:79},(_,chapter)=>{
      const eventId=r.u8(0x8B0890+chapter*0x94+0x74),group=r.u32(0x14AB47C+eventId*4)-0x08000000;
      if(group<0 || group+8>bytes.length)return [];
      const events=r.u32(group+4)-0x08000000,result=[];
      if(events<0 || events>=bytes.length)return result;
      for(let n=0;n<256 && events+n*16+16<=bytes.length;n++) {
        const at=events+n*16,type=r.u16(at);
        if(!type)break;
        if(type!==3)return [];
        if(!r.u32(at+4))continue;
        result.push({flag:r.u16(at+2),from:r.u8(at+8),to:r.u8(at+9),anySource:r.u8(at+8)===0,
          conditionType:r.u16(at+12),conditionFlag:r.u16(at+14)});
      }
      return result;
    });
    // Match the ROM's custom chapter-prefix renderer, including gaiden slots.
    // Chapter IDs are not display numbers (slot 0 is 1-1; slot 63 is 1-7x).
    const prefixes=r.u32(0x16A484)-0x08000000;
    for(let n=0;n<128;n++) {
      const at=prefixes+n*4;
      if(!r.u32(at))break;
      const chapter=D.fe8Chapters[r.u8(at)],textId=r.u16(at+2);
      if(chapter) {
        const prefix=textId?r.text(textId):'';
        chapter.label=/^\d/.test(prefix)?'Ch. '+prefix:prefix || 'Chapter';
      }
    }
  }
  const profile=Object.freeze({
    id:'vision-quest',code:'BE8E',crc32:0x2BCFEC83,language:'en',decodeText:root.CompanionLatinText,
    characters:0x803D30,classes:0x807110,items:0x809B10,
    portraits:0x1B2CF20,sprites:0x8AF880,icons:0x5926F4,
    iconPalettes:0x5996F4,spritePalettes:0x59EE20,slots:0x59A5D0,
    text:0x1024D7C,chapters:0x8B0890,minimap:0xA1FBD8,minimapPalette:0xA1FFB0,prepareExtra
  });
  root.VisionQuestPrep={
    ...root.FE8PublicPrep,
    prepare(input,template,runtime,options={}) {
      return root.FE8PublicPrep.prepare(input,template,runtime,options,profile);
    },
    radarSvg(growth,bonus){return root.CompanionRadar.svg(growth,bonus,'en');}
  };
})(globalThis);
