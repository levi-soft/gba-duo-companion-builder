// Exact local ROM: Storge BE8E / 079106D8. Tables relocated by the hack.
(function(root) {
  function prepareExtra({reader:r,bytes,data:D}) {
    D.talkConfig={chapter:0x0202BCFE,temporaryFlags:0x03005270,permanentFlags:0x03005250};
    D.talkEvents=Array.from({length:79},(_,chapter)=>{
      const eventId=r.u8(0x8B0890+chapter*0x94+0x74);
      const group=r.u32(0x8B363C+eventId*4)-0x08000000;
      if(group<0 || group+8>bytes.length)return [];
      const events=r.u32(group+4)-0x08000000,result=[];
      if(events<0 || events>=bytes.length)return result;
      for(let n=0;n<256 && events+n*16+16<=bytes.length;n++) {
        const at=events+n*16,type=r.u16(at);
        if(!type)break;
        if(type!==3)throw Error('Unsupported Storge conversation command: '+type);
        if(!r.u32(at+4))continue;
        result.push({flag:r.u16(at+2),from:r.u8(at+8),to:r.u8(at+9),
          anySource:r.u8(at+8)===0,conditionType:r.u16(at+12),conditionFlag:r.u16(at+14)});
      }
      return result;
    });
    D.fe8Chapters[0].label='Prologue';
    const finale=D.fe8Chapters[6];
    if(/^Finale:\s*/i.test(finale.name)) {
      finale.label='Finale';finale.name=finale.name.replace(/^Finale:\s*/i,'');
    }
  }
  const profile=Object.freeze({
    id:'storge',code:'BE8E',crc32:0x079106D8,language:'en',decodeText:root.StorgeText,
    characters:0x803D30,classes:0x11C9584,classCount:255,items:0x11A3AD8,
    portraits:0x8ACBC4,sprites:0x12AC1E0,icons:0x12C6508,
    iconPalettes:0x5996F4,spritePalettes:0x59EE20,slots:0x59A5D0,
    text:0x1009948,chapters:0x8B0890,minimap:0xA1FBD8,minimapPalette:0xA1FFB0,
    prepareExtra
  });
  root.StorgePrep={
    ...root.FE8PublicPrep,
    prepare(input,template,runtime,options={}) {
      return root.FE8PublicPrep.prepare(input,template,runtime,options,profile);
    },
    radarSvg(growth,bonus){return root.CompanionRadar.svg(growth,bonus,'en');}
  };
})(globalThis);
