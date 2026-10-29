// BE8E / 566D7A9E: exact-ROM table literals, not a generic FE8 identity.
(function(root) {
  async function prepareExtra({reader:r,bytes,data:D,project,options,image}) {
    // The native support routine points at this ROM's affinity table.
    const affin=['Fire','Thunder','Wind','Ice','Dark','Light','Anima'],support=r.u32(0x28534)-0x08000000;
    for(let stat=0;stat<6;stat++){
      const table={'---':'---','?':'---','':'---'};
      for(let n=0;n<7;n++){const at=support+n*8;if(r.u8(at)!==n+1)throw Error('Unsupported Sun God\'s Wrath affinity table');table[affin[n]]=r.u8(at+1+stat)/2;}
      D['lookup'+(27+stat)]=table;
    }
    D.levelCaps=Array.from({length:256},(_,id)=>r.u8(0x1EC9BBC+id));
    D.customProfile={id:"sun-gods-wrath",split:false,supports:true,growthNote:"Base ROM growths. Skill/item bonuses and alternate growth modes are not included. The chart shows seven core stats.",limitations:"PCC, fatigue variants, weapon-rank bonuses and Mov/Con growths need custom calculations. Range overlays use base movement and weapon ranges."};
    D.customProfile.hpEnemyCap=120;
    D.customProfile.promotedExpBonus=r.u8(0x2C35E);
    for(const [pointer,c]of Object.entries(D.growthCharacters)){const at=+pointer-0x08000000;c.conGrowth=r.u8(at+0x23);c.movGrowth=r.u8(at+0x24);}
    D.skillConfig={entry:0x9EFB87C,buffer:0x02026B90,cache:0x02026BB0,limit:6};
    D.skillData={};
    for(let id=1;id<255;id++) {
      const description=r.text(r.u16(0x1EFD028+id*2));
      if(!description)continue;
      const colon=description.indexOf(':');
      const pixels=root.CompanionRom.tiles(r,bytes.subarray(0x1EFD228+id*128,0x1EFD228+(id+1)*128),16,16,0x5996F4);
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
    // Active level-up HP clamp is 60; the other core caps come from class records.
    for(const [pointer,c]of Object.entries(D.growthClasses)){const at=+pointer-0x08000000;c.caps=[60,r.u8(at+20),r.u8(at+21),r.u8(at+22),r.u8(at+23),r.u8(at+24),r.u8(0x2C016)];}
    // Use the ROM's own displayed chapter title rather than retail slot numbers.
    for(const chapter of D.fe8Chapters){chapter.label=chapter.name;chapter.name='';}
  }
  const profile=Object.freeze({...{
    id:"sun-gods-wrath",
    code:"BE8E",
    crc32:0x566D7A9E,
    language:"en",
    characters:0x803D30,
    classes:0x1EC9CBC,
    classCount:0x100,
    items:0x1ECF474,
    portraits:0xF01A1C,
    sprites:0x11DBFD0,
    icons:0x1004944,
    iconPalettes:0x5996F4,
    spritePalettes:0x59EE20,
    slots:0x59A5D0,
    text:0x1DD8BE0,
    chapters:0x8B0890,
    minimap:0xA1FBD8,
    minimapPalette:0xA1FFB0
  },decodeText:root.CompanionLatinText,prepareExtra});
  root.SunGodsWrathPrep={...root.FE8PublicPrep,prepare(input,template,runtime,options={}){return root.FE8PublicPrep.prepare(input,template,runtime,options,profile);},radarSvg(growth,bonus){return root.CompanionRadar.svg(growth,bonus,'en');}};
})(globalThis);
