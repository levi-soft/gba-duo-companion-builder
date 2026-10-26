(function(root) {
  function prepareExtra({reader:r,bytes,data:D}) {
    for(const c of Object.values(D.growthClasses))c.levelCap=r.u8(0xDAE800+c.id);
    D.talkConfig={chapter:0x0202BC06,temporaryFlags:0x03004AD8,permanentFlags:0x03004AD0};
    D.talkEvents=Array.from({length:70},(_,chapter)=>{
      const eventId=r.u8(0x1D04000+chapter*0x98+0x78),group=r.u32(0x1474400+eventId*4)-0x08000000;
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
  }
  const profile=Object.freeze({
    id:'the-last-promise',crc32:0xD1C6E5D5,language:'en',prepareExtra,characterClassPortraits:true,
    tables:{characters:0x1D00000,classes:0x1BC7000,chapters:0x1D04000}
  });
  root.TheLastPromisePrep={
    ...root.FE7PublicPrep,
    prepare(input,template,runtime,options={}) {
      return root.FE7PublicPrep.prepare(input,template,runtime,options,profile);
    },
    radarSvg(growth,bonus){return root.CompanionRadar.svg(growth,bonus,'en');}
  };
})(globalThis);
