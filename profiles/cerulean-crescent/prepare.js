// BE8E / DC071CC2: exact-ROM table literals, not a generic FE8 identity.
(function(root) {
  async function prepareExtra({reader:r,bytes,data:D,project,options,image}) {
    // The native support routine points at this ROM's affinity table.
    const affin=['Fire','Thunder','Wind','Ice','Dark','Light','Anima'],support=r.u32(0x28534)-0x08000000;
    for(let stat=0;stat<6;stat++){
      const table={'---':'---','?':'---','':'---'};
      for(let n=0;n<7;n++){const at=support+n*8;if(r.u8(at)!==n+1)throw Error('Unsupported Cerulean Crescent affinity table');table[affin[n]]=r.u8(at+1+stat)/2;}
      D['lookup'+(27+stat)]=table;
    }
    // Player-named records reference uncompressed EWRAM, not ROM text.
    D.dynamicNames={};D.nameGlyphs=Array.from({length:256},(_,byte)=>root.CompanionLatinText([byte]).replace(/[\x00-\x1f\x7f]/g,''));
    for(const [pointer,character]of Object.entries(D.chars)){
      const raw=r.u32(0x1C8C2F4+r.u16(+pointer-0x08000000)*4),address=raw&0x7FFFFFFF;
      if((raw&0x80000000)===0||address<0x02000000||address+16>0x02040000)continue;
      D.dynamicNames[pointer]={address,limit:16};
      for(const records of [D.chars,D.mapMeta.chars,D.forecastChars,D.equipmentChars,D.growthCharacters])if(records[pointer])records[pointer].name='Avatar';
      D.lookup10[pointer]='Avatar';
    }
    D.levelCaps=Array.from({length:255},(_,id)=>r.u8(0xB2C020+id));
    D.customProfile={id:"cerulean-crescent",split:false,supports:true,growthNote:"Base ROM growths; growth-mode, item and skill modifiers are not included. Promotion does not reset level.",limitations:"Growth modifiers and capture mode are not inferred from retail FE8 flags. Range overlays use base movement and weapon ranges."};
    D.customProfile.promotedExpBonus=r.u8(0x2C35E);
    D.skillConfig={entry:0x8B408F8,buffer:0x02026B90,cache:0x02026BB0,limit:6};
    D.skillData={};
    for(let id=1;id<255;id++) {
      const description=r.text(r.u16(0xB418B4+id*2));
      if(!description)continue;
      const colon=description.indexOf(':');
      const pixels=root.CompanionRom.tiles(r,bytes.subarray(0xB41AB4+id*128,0xB41AB4+(id+1)*128),16,16,0x5996F4);
      D.skillData[id]={id,name:colon<0?description:description.slice(0,colon),description,icon:await image('assets/images/skills/'+id+'.png',pixels)};
    }
    D.talkConfig={chapter:0x0202BCFE,temporaryFlags:0x03005270,permanentFlags:0x03005250};
    D.talkEvents=Array.from({length:79},(_,chapter)=>{
      const eventId=r.u8(0x8B0890+chapter*0x94+0x74),group=r.u32(0x18276B4+eventId*4)-0x08000000;
      if(group<0||group+8>bytes.length)return [];
      const events=r.u32(group+4)-0x08000000,result=[];
      if(events<0||events>=bytes.length)return result;
      for(let n=0;n<256&&events+n*16+16<=bytes.length;n++){const at=events+n*16,type=r.u16(at);if(!type)break;if(type!==3)return [];if(r.u32(at+4))result.push({flag:r.u16(at+2),from:r.u8(at+8),to:r.u8(at+9),anySource:r.u8(at+8)===0,conditionType:r.u16(at+12),conditionFlag:r.u16(at+14)});}
      return result;
    });
    // Active level-up HP clamp is 80; the other core caps come from class records.
    for(const [pointer,c]of Object.entries(D.growthClasses)){const at=+pointer-0x08000000;c.caps=[80,r.u8(at+20),r.u8(at+21),r.u8(at+22),r.u8(at+23),r.u8(at+24),r.u8(0x2C016)];}
    // Use the ROM's own displayed chapter title rather than retail slot numbers.
    for(const chapter of D.fe8Chapters){chapter.label=chapter.name;chapter.name='';}
  }
  const profile=Object.freeze({...{
    id:"cerulean-crescent",
    code:"BE8E",
    crc32:0xDC071CC2,
    language:"en",
    characters:0x803D30,
    classes:0x125C970,
    classCount:0xFF,
    items:0x1262770,
    portraits:0x101ABD4,
    sprites:0x1048524,
    icons:0x1010A70,
    iconPalettes:0x5996F4,
    spritePalettes:0x59EE20,
    slots:0x59A5D0,
    text:0x1C8C2F4,
    chapters:0x8B0890,
    minimap:0xA1FBD8,
    minimapPalette:0xA1FFB0
  },decodeText:root.CompanionLatinText,prepareExtra});
  root.CeruleanCrescentPrep={...root.FE8PublicPrep,prepare(input,template,runtime,options={}){return root.FE8PublicPrep.prepare(input,template,runtime,options,profile);},radarSvg(growth,bonus){return root.CompanionRadar.svg(growth,bonus,'en');}};
})(globalThis);
