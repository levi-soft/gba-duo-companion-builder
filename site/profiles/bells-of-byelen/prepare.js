// BE8E / 48B996CD: exact-ROM table literals, not a generic FE8 identity.
(function(root) {
  async function prepareExtra({reader:r,bytes,data:D,project,options,image}) {
    D.levelCaps=Array.from({length:132},(_,id)=>r.u8(0x1114AEC+id));
    D.customProfile={id:"bells-of-byelen",split:true,supports:false,growthNote:"Current native growth rates include active bonuses. Analysis follows the current growth mode.",limitations:"PCC, fatigue, movement stars, dismount, accessories and custom support bonuses require game-specific calculation. Range overlays use base movement and weapon ranges."};
    D.customProfile.promotedExpBonus=r.u8(0x2C35E);
    for(const [pointer,c]of Object.entries(D.growthCharacters)){const pid=D.chars[pointer].id;c.movGrowth=r.u8(0x181E97C+pid);c.conGrowth=r.u8(0x181EA7C+pid);}
    D.skillConfig={entry:0x97D9BD0,buffer:0x02026B90,cache:0x02026BB0,limit:6};
    D.skillData={};
    for(let id=1;id<255;id++) {
      const description=r.text(r.u16(0x17DAD3C+id*2));
      if(!description)continue;
      const colon=description.indexOf(':');
      const pixels=root.CompanionRom.tiles(r,bytes.subarray(0x17DAF3C+id*128,0x17DAF3C+(id+1)*128),16,16,0x5996F4);
      D.skillData[id]={id,name:colon<0?description:description.slice(0,colon),description,icon:await image('assets/images/skills/'+id+'.png',pixels)};
    }
    D.talkConfig={chapter:0x0202BCFE,temporaryFlags:0x03005270,permanentFlags:0x03005250};
    D.talkEvents=Array.from({length:79},(_,chapter)=>{
      const eventId=r.u8(0x8B0890+chapter*0x94+0x74),group=r.u32(0x8B363C+eventId*4)-0x08000000;
      if(group<0||group+8>bytes.length)return [];
      const events=r.u32(group+4)-0x08000000,result=[];
      if(events<0||events>=bytes.length)return result;
      for(let n=0;n<256&&events+n*16+16<=bytes.length;n++){const at=events+n*16,type=r.u16(at);if(!type)break;if(type!==3)return [];if(r.u32(at+4))result.push({flag:r.u16(at+2),from:r.u8(at+8),to:r.u8(at+9),anySource:r.u8(at+8)===0,conditionType:r.u16(at+12),conditionFlag:r.u16(at+14)});}
      return result;
    });
    // Active class caps, including HP; these hacks do not share retail HP60/Luck30.
    for(const [pointer,c]of Object.entries(D.growthClasses)){const at=+pointer-0x08000000;c.caps=[r.u8(at+19),r.u8(at+20),r.u8(at+21),r.u8(at+22),r.u8(at+23),r.u8(at+24),r.u8(0x2C016)];}
    // Active native magic attacks read Unit/BattleUnit +0x3A. These are the
    // exact tables referenced by this ROM's Mag getter and level-up cap path.
    D.equipmentConfig={...(D.equipmentConfig||{}),magicOffset:0x3A};
    for(const c of Object.values(D.growthCharacters))for(const asset of c.radars)delete project.files['assets/'+asset.slice(6)];
    const charts=new Set();
    for(const [pointer,c]of Object.entries(D.growthCharacters)){
      const pid=D.chars[pointer].id,g=c.growth;
      c.rates=[g[0],g[1],r.u8(0x11176D0+pid*2+1),g[2],g[3],g[6],g[4],g[5]];
      const name='assets/images/growth/'+c.rates.join('-')+'.png';c.radar='asset:'+name.slice(7);c.radars=[c.radar,c.radar];
      if(!charts.has(name)){project.files[name]=root.CompanionRom.b64(await options.renderRadar(c.rates,0,100,project.files));charts.add(name);}
    }
    for(const [pointer,c]of Object.entries(D.growthClasses)){
      const at=+pointer-0x08000000,cid=D.classes[pointer].id;
      c.caps=[r.u8(at+19),r.u8(at+20),r.u8(0x11178D0+cid*4+2),r.u8(at+21),r.u8(at+22),r.u8(0x2C016),r.u8(at+23),r.u8(at+24)];D.lookup12[pointer]='Str';
    }
    // Use the ROM's own displayed chapter title rather than retail slot numbers.
    for(const chapter of D.fe8Chapters){chapter.label=chapter.name;chapter.name='';}
  }
  const profile=Object.freeze({
    mapRenderOnDemand:true,...{
    id:"bells-of-byelen",
    code:"BE8E",
    crc32:0x48B996CD,
    language:"en",
    characters:0x803D30,
    classes:0x1114B80,
    classCount:0x84,
    items:0x1118F28,
    portraits:0x1000000,
    sprites:0x8AF880,
    icons:0x1766B94,
    iconPalettes:0x5996F4,
    spritePalettes:0x59EE20,
    slots:0x59A5D0,
    text:0x1003800,
    chapters:0x8B0890,
    minimap:0xA1FBD8,
    minimapPalette:0xA1FFB0
  },decodeText:root.CompanionLatinText,prepareExtra});
  root.BellsOfByelenPrep={...root.FE8PublicPrep,prepare(input,template,runtime,options={}){return root.FE8PublicPrep.prepare(input,template,runtime,options,profile);},radarSvg(growth,bonus){return root.CompanionRadar.svg(growth,bonus,'en');}};
})(globalThis);
