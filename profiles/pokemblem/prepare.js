// BE8E / 10BDF112: exact-ROM table literals, not a generic FE8 identity.
(function(root) {
  // Compact species names use UTF-8 modifier letters mixed with FE controls.
  // NFKC recovers readable letters without storing any game-specific strings.
  const utf8=new TextDecoder('utf-8',{fatal:true});
  // The author's UTF-8 sequences select custom font icons, not letters.
  // Keep their meaning readable when the companion uses its own text font.
  const iconLabels={'\u18BB':'Physical:','\u18BC':'Special:',
    '\u0785':' [Lock] ','\u18B0':' [Water] ','\u18B1':' [Bug] ','\u18B2':' [Dragon] ',
    '\u18B3':' [Electric] ','\u18B4':' [Fighting] ','\u18B5':' [Fire] ','\u18B6':' [Ghost] ',
    '\u18B7':' [Grass] ','\u18B8':' [Ground] ','\u18B9':' [Ice] ','\u18BA':' [Normal] ',
    '\u18BE':' [Poison] ','\u18BF':' [Psychic] ','\u18C0':' [Rock] ','\u18C1':' [Flying] ','\u18C2':' [Steel] '};
  const capitals={'\u1D00':'A','\u0299':'B','\u1D04':'C','\u1D05':'D','\u1D07':'E','\uA730':'F','\u0262':'G','\u029C':'H','\u026A':'I','\u1D0A':'J','\u1D0B':'K','\u029F':'L','\u1D0D':'M','\u0274':'N','\u1D0F':'O','\u1D18':'P','\u0280':'R','\uA731':'S','\u1D1B':'T','\u1D1C':'U','\u1D20':'V','\u1D21':'W','\u028F':'Y','\u1D22':'Z'};
  function decodeText(bytes){
    let text='';
    for(let n=0;n<bytes.length;n++){
      const byte=bytes[n];
      if(byte===0x10){n+=2;continue;}
      if(byte===0x80){const command=bytes[++n];if(command<=3)n++;continue;}
      const size=byte>=0xC2&&byte<=0xDF?2:byte>=0xE0&&byte<=0xEF?3:byte>=0xF0&&byte<=0xF4?4:0;
      if(size&&n+size<=bytes.length){try{const value=utf8.decode(new Uint8Array(bytes.slice(n,n+size))).normalize('NFKC');text+=iconLabels[value]??capitals[value]??value;n+=size-1;continue;}catch{}}
      text+=root.CompanionLatinText([byte]);
    }
    return text;
  }
  async function prepareExtra({reader:r,bytes,data:D,project,options,image}) {
    D.levelCaps=Array.from({length:255},(_,id)=>r.u8(0x13093B0+id));
    D.customProfile={id:"pokemblem",split:true,supports:false,growthNote:"Current native growth rates include active bonuses. Analysis follows the current growth mode.",limitations:"Species moves, capture, held items and gym EXP restrictions are not ordinary FE8 weapon/rank mechanics. Tactical range and prediction are not verified for these systems."};
    D.customProfile.promotedExpBonus=r.u8(0x2C35E);
    D.skillConfig={entry:0x964CF40,buffer:0x02026B90,cache:0x02026BB0,limit:6};
    D.skillData={};
    for(let id=1;id<255;id++) {
      const description=r.text(r.u16(0x164E878+id*2));
      if(!description)continue;
      const colon=description.indexOf(':');
      const pixels=root.CompanionRom.tiles(r,bytes.subarray(0x164ECB8+id*128,0x164ECB8+(id+1)*128),16,16,0x5996F4);
      D.skillData[id]={id,name:colon<0?description:description.slice(0,colon),description,icon:await image('assets/images/skills/'+id+'.png',pixels)};
    }
    D.talkConfig={chapter:0x0202BCFE,temporaryFlags:0x03005270,permanentFlags:0x03005250};
    D.talkEvents=Array.from({length:79},(_,chapter)=>{
      const eventId=r.u8(0x13043DC+chapter*0x94+0x74),group=r.u32(0x8B363C+eventId*4)-0x08000000;
      if(group<0||group+8>bytes.length)return [];
      const events=r.u32(group+4)-0x08000000,result=[];
      if(events<0||events>=bytes.length)return result;
      for(let n=0;n<256&&events+n*16+16<=bytes.length;n++){const at=events+n*16,type=r.u16(at);if(!type)break;if(type!==3)return [];if(r.u32(at+4))result.push({flag:r.u16(at+2),from:r.u8(at+8),to:r.u8(at+9),anySource:r.u8(at+8)===0,conditionType:r.u16(at+12),conditionFlag:r.u16(at+14)});}
      return result;
    });
    // Active class caps, including HP; these hacks do not share retail HP60/Luck30.
    for(const [pointer,c]of Object.entries(D.growthClasses)){const at=+pointer-0x08000000;c.caps=[r.u8(at+19),r.u8(at+20),r.u8(at+21),r.u8(at+22),r.u8(at+23),r.u8(at+24),r.u8(0x2C016)];}
    // Use the ROM's own displayed chapter title rather than retail slot numbers.
    for(const chapter of D.fe8Chapters){chapter.label=chapter.name;chapter.name='';}
    D.equipmentConfig={magicOffset:0x3A};
    for(const c of Object.values(D.growthCharacters))for(const asset of c.radars)delete project.files['assets/'+asset.slice(6)];
    const charts=new Set();
    for(const [pointer,c]of Object.entries(D.growthCharacters)){const pid=D.chars[pointer].id,g=c.growth;c.rates=[g[0],g[1],r.u8(0x130F154+pid*2+1),g[2],g[3],g[6],g[4],g[5]];const name='assets/images/growth/'+c.rates.join('-')+'.png';c.radar='asset:'+name.slice(7);c.radars=[c.radar,c.radar];if(!charts.has(name)){project.files[name]=root.CompanionRom.b64(await options.renderRadar(c.rates,0,100,project.files));charts.add(name);}}
    for(const [pointer,c]of Object.entries(D.growthClasses)){const at=+pointer-0x08000000,cid=D.classes[pointer].id;c.caps=[r.u8(at+19),r.u8(at+20),r.u8(0x130F354+cid*4+2),r.u8(at+21),r.u8(at+22),r.u8(0x13094B0+cid*4+3),r.u8(at+23),r.u8(at+24)];D.lookup12[pointer]='Str';}
    // Every active growth getter adds the class/species contribution.
    // Deduplicate by character growth vectors, not by storage-slot identity.
    // Keep UI icons and base-vector fallback charts referenced by the data.
    // The original seven-stat charts were already removed above by exact path.
    D.classGrowths={};D.growthRadarCombinations={};
    for(const [pointer,c]of Object.entries(D.growthClasses)){
      const at=+pointer-0x08000000,cid=D.classes[pointer].id,g=Array.from(bytes.subarray(at+27,at+34));
      D.classGrowths[pointer]=[g[0],g[1],r.u8(0x130F354+cid*4+1),g[2],g[3],g[6],g[4],g[5]];
    }
    const baseVectors=new Map(Object.values(D.growthCharacters).map(c=>[c.rates.join('-'),c.rates]));
    for(const [baseKey,rates]of baseVectors)for(const [pointer,g]of Object.entries(D.classGrowths)){
      if(options.signal?.aborted)throw Error('Cancelled.');
      const combined=rates.map((value,n)=>value+g[n]),name='assets/images/growth/'+combined.join('-')+'.png';
      if(!project.files[name])project.files[name]=root.CompanionRom.b64(await options.renderRadar(combined,0,100,project.files));
      D.growthRadarCombinations[baseKey+':'+pointer]='asset:'+name.slice(7);
    }
  }
  const profile=Object.freeze({
    mapRenderOnDemand:true,...{
    id:"pokemblem",
    allowEmptyPortraits:true,
    code:"BE8E",
    crc32:0x10BDF112,
    language:"en",
    characters:0x803D30,
    classes:0x13098AC,
    classCount:0xFF,
    items:0x1314CDC,
    portraits:0x118FC60,
    sprites:0x139163C,
    icons:0x12ACCFC,
    iconPalettes:0x5996F4,
    spritePalettes:0x59EE20,
    slots:0x59A5D0,
    text:0xB2A73C,
    chapters:0x13043DC,
    minimap:0xA1FBD8,
    minimapPalette:0xA1FFB0
  },decodeText,prepareExtra});
  root.PokemblemPrep={...root.FE8PublicPrep,prepare(input,template,runtime,options={}){return root.FE8PublicPrep.prepare(input,template,runtime,options,profile);},radarSvg(growth,bonus){return root.CompanionRadar.svg(growth,bonus,'en',1/3);}};
})(globalThis);
