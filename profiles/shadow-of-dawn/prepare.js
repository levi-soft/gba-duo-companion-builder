// BE8E / EB38F5F7; tables traced from this ROM's native pointer literals.
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
      const group=r.u32(0x103E5E4+eventId*4)-0x08000000;
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
    // Active level-up path fixes player HP at60, independent of unused class HP bytes.
    for(const [pointer,c]of Object.entries(D.growthClasses))c.caps[0]=60;

    // Exact active native growth contracts.
    D.levelCaps=Array.from({length:256},(_,id)=>r.u8(0xB2A63C+id));
    D.equipmentConfig={magicOffset:0x3A};
    for(const c of Object.values(D.growthCharacters))for(const asset of c.radars)delete project.files['assets/'+asset.slice(6)];
    const charts=new Set();
    for(const [pointer,c]of Object.entries(D.growthCharacters)){
      const pid=D.chars[pointer].id,g=c.growth;
      c.rates=[g[0],g[1],r.u8(0xB2A740+pid*2+1),g[2],g[3],g[6],g[4],g[5]];
      const name='assets/images/growth/'+c.rates.join('-')+'.png';c.radar='asset:'+name.slice(7);c.radars=[c.radar,c.radar];
      if(!charts.has(name)){project.files[name]=root.CompanionRom.b64(await options.renderRadar(c.rates,0,100,project.files));charts.add(name);}
    }
    for(const[pointer,c]of Object.entries(D.growthClasses)){const at=+pointer-0x08000000;
      c.caps=[60,r.u8(at+20),r.u8(0xB2A940+c.id*4+2),r.u8(at+21),r.u8(at+22),40,r.u8(at+23),r.u8(at+24)];
      D.lookup12[pointer]='Str';
    }
    D.skillConfig={entry:0x8B606C8,buffer:0x02026B90,cache:0x02026BB0,limit:6};
    D.skillData={};
    for(let id=1;id<255;id++){
      const description=r.text(r.u16(0xB61898+id*2));
      if(!description)continue;
      const colon=description.indexOf(':');
      D.skillData[id]={id,name:colon<0?description:description.slice(0,colon),description,icon:await image('assets/images/skills/'+id+'.png',root.CompanionRom.tiles(r,bytes.subarray(0xB61A98+id*128,0xB61A98+(id+1)*128),16,16,0x5996F4))};
    }
  }
  const profile=Object.freeze({
    mapRenderOnDemand:true,
    id:"shadow-of-dawn",
    code:"BE8E",
    crc32:0xEB38F5F7,
    language:"en",
    characters:0x803D30,
    classes:0x104E68C,
    items:0x809B10,
    portraits:0x10564F4,
    sprites:0x110AD50,
    icons:0x10BA0F4,
    iconPalettes:0x5996F4,
    text:0x1888EB4,
    chapters:0x8B0890,
    slots:0x59A5D0,
    spritePalettes:0x59EE20,
    minimap:0xA1FBD8,
    minimapPalette:0xA1FFB0,
    classCount:0xFF,
    decodeText:root.CompanionLatinText,prepareExtra
  });
  root.ShadowOfDawnPrep={...root.FE8PublicPrep,prepare(input,template,runtime,options={}){return root.FE8PublicPrep.prepare(input,template,runtime,options,profile);},radarSvg(growth,bonus){return root.CompanionRadar.svg(growth,bonus,'en');}};
})(globalThis);
