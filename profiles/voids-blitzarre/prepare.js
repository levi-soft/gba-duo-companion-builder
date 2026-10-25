// Exact CCB build; extra tables are appended before the common builder exports Lua.
(function(root) {
  function prepareTalk(r,D,bytes) {
    D.talkConfig={chapter:0x0202BCFE,temporaryFlags:0x03005270,permanentFlags:0x03005250};
    D.talkEvents=Array.from({length:79},(_,chapter)=>{
      const eventId=r.u8(0x8B0890+chapter*0x94+0x74);
      const group=r.u32(0x8B363C+eventId*4)-0x08000000;
      if(group<0 || group+8>bytes.length)return [];
      const events=r.u32(group+4)-0x08000000,result=[];
      if(events<0 || events>=bytes.length)return result;
      for(let n=0;n<256 && events+n*16+16<=bytes.length;n++) {
        const at=events+n*16,flag=r.u8(at+2);
        if(!flag)break;
        result.push({flag,from:r.u8(at+8),to:r.u8(at+9)});
      }
      return result;
    });
  }
  async function prepareSkills({reader:r,bytes,data:D,image}) {
    prepareTalk(r,D,bytes);
    // Hack chapter numbers do not follow the original FE8 table order.
    for(const chapter of D.fe8Chapters || []) {
      const match=chapter.name.match(/^(Prologue|Final|\d+)\s*:\s*(.+)$/i);
      if(match) {
        chapter.label=/^\d+$/.test(match[1])?'Ch. '+match[1]:match[1];
        chapter.name=match[2];
      }
    }
    D.skillConfig={personal:0x08B39C84,classes:0x08B3978C,level:0x08B3988C,bwl:0x0203E884,learnedLimit:0x46};
    D.skillData={};
    for(let id=1;id<=138;id++) {
      const description=r.text(r.u16(0xB3A184+id*2)),colon=description.indexOf(':');
      if(!description)continue;
      const pixels=root.CompanionRom.tiles(r,bytes.subarray(0xB5AB50+id*128,0xB5AB50+(id+1)*128),16,16,0x5996F4);
      D.skillData[id]={id,name:colon<0?description:description.slice(0,colon),description,
        icon:await image('assets/images/skills/'+id+'.png',pixels)};
    }
  }
  const profile=Object.freeze({
    id:'voids-blitzarre',code:'BE8E',crc32:0x9D22107C,language:'en',textEncoding:'latin1',
    characters:0x803D30,classes:0x807110,items:0x809B10,portraits:0x8ACBC4,sprites:0x8AF880,
    icons:0x5926F4,iconPalettes:0x5996F4,spritePalettes:0x59EE20,slots:0x59A5D0,
    text:0x15D48C,chapters:0x8B0890,minimap:0xA1FBD8,minimapPalette:0xA1FFB0,prepareExtra:prepareSkills
  });
  root.VoidsBlitzarrePrep={
    ...root.FE8PublicPrep,
    prepare(input,template,runtime,options={}){return root.FE8PublicPrep.prepare(input,template,runtime,options,profile);},
    radarSvg(growth,bonus){return root.CompanionRadar.svg(growth,bonus,'en');}
  };
})(globalThis);
