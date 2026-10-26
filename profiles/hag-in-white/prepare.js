(function(root) {
  async function prepareExtra({reader:r,bytes,data:D,project,options,image}) {
    D.equipmentConfig={magicOffset:0x3a,avoidSpeedMultiplier:1};
    // This ROM uses separate Str/Mag. Retain FE8's base fields for composition,
    // and prepare only the eight-stat charts used by the inherited split UI.
    const charts=new Set();
    // Clear all intermediate charts first: all-zero seven/eight-stat filenames
    // can coincide, so deleting them inside the generation loop loses new images.
    for(const c of Object.values(D.growthCharacters))
      for(const asset of c.radars)delete project.files['assets/'+asset.slice(6)];
    for(const [pointer,c] of Object.entries(D.growthCharacters)) {
      const pid=D.chars[pointer].id,g=c.growth;
      c.rates=[g[0],g[1],r.u8(0xB2A740+pid*2+1),g[2],g[3],g[6],g[4],g[5]];
      const name='assets/images/growth/'+c.rates.join('-')+'.png';
      c.radar='asset:'+name.slice(7);c.radars=[c.radar,c.radar];
      if(!charts.has(name)) {
        project.files[name]=root.CompanionRom.b64(await options.renderRadar(c.rates,0,100,project.files));
        charts.add(name);
      }
    }
    for(const [pointer,c] of Object.entries(D.growthClasses)) {
      const at=+pointer-0x08000000,cid=D.classes[pointer].id;
      c.caps=[60,r.u8(at+20),r.u8(0xB2A940+cid*4+2),r.u8(at+21),r.u8(at+22),30,r.u8(at+23),r.u8(at+24)];
      D.lookup12[pointer]='Str';
    }
    D.skillConfig={entry:0x08B606C8,buffer:0x02026B90,cache:0x02026BB0,limit:6};
    D.skillData={};
    for(let id=1;id<255;id++) {
      const description=r.text(r.u16(0xB61898+id*2));
      if(!description)continue;
      const colon=description.indexOf(':');
      const pixels=root.CompanionRom.tiles(r,bytes.subarray(0xB61A98+id*128,0xB61A98+(id+1)*128),16,16,0x5996F4);
      D.skillData[id]={id,name:colon<0?description:description.slice(0,colon),description,
        icon:await image('assets/images/skills/'+id+'.png',pixels)};
    }
    D.talkConfig={chapter:0x0202BCFE,temporaryFlags:0x03005270,permanentFlags:0x03005250};
    D.talkEvents=Array.from({length:79},(_,chapter)=>{
      const eventId=r.u8(0x8B0890+chapter*0x94+0x74),group=r.u32(0x140008C+eventId*4)-0x08000000;
      if(group<0 || group+8>bytes.length)return [];
      const events=r.u32(group+4)-0x08000000,result=[];
      if(events<0 || events>=bytes.length)return result;
      for(let n=0;n<256 && events+n*16+16<=bytes.length;n++) {
        const at=events+n*16,type=r.u16(at);
        if(!type)break;
        // Unused chapter records can point at ordinary event scripts, not CHAR lists.
        if(type!==3)return [];
        if(!r.u32(at+4))continue;
        result.push({flag:r.u16(at+2),from:r.u8(at+8),to:r.u8(at+9),anySource:r.u8(at+8)===0,
          conditionType:r.u16(at+12),conditionFlag:r.u16(at+14)});
      }
      return result;
    });
    D.fe8Chapters[0].label='Prologue';
  }
  const profile=Object.freeze({
    id:'hag-in-white',code:'BE8E',crc32:0x7479D7E2,language:'en',decodeText:root.CompanionLatinText,
    characters:0x803D30,classes:0x807110,items:0x809B10,
    portraits:0x1A6FCCC,sprites:0x1307218,icons:0x5926F4,
    iconPalettes:0x5996F4,spritePalettes:0x59EE20,slots:0x59A5D0,
    text:0x181EBFC,chapters:0x8B0890,minimap:0xA1FBD8,minimapPalette:0xA1FFB0,prepareExtra
  });
  root.HagInWhitePrep={
    ...root.FE8PublicPrep,
    prepare(input,template,runtime,options={}) {
      return root.FE8PublicPrep.prepare(input,template,runtime,options,profile);
    },
    radarSvg(growth,bonus){return root.CompanionRadar.svg(growth,bonus,'en');}
  };
})(globalThis);
