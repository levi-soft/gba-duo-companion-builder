// Exact local ROM BE8E / 0DDE5BEB; pointers traced from this revision.
(function(root) {
  async function prepareExtra({reader:r,bytes,data:D,image}) {
    // Active stat-screen page 0x08B48890 calls this getter, not the older
    // embedded copy at 0x08BAD890. Both copies exist in this exact ROM.
    D.levelCaps=Array.from(bytes.subarray(0xB2C020,0xB2C120));
    D.skillConfig={entry:0x08B4ED44,buffer:0x02026B90,cache:0x02026BB0,limit:6};
    D.skillData={};
    for(let id=1;id<255;id++) {
      const description=r.text(r.u16(0xB4FD00+id*2));
      if(!description)continue;
      const colon=description.indexOf(':');
      const pixels=root.CompanionRom.tiles(r,bytes.subarray(0xB4FF00+id*128,0xB4FF00+(id+1)*128),16,16,0x5996F4);
      D.skillData[id]={id,name:colon<0?description:description.slice(0,colon),description,
        icon:await image('assets/images/skills/'+id+'.png',pixels)};
    }
    // Read the actual affinity table; hacks may replace retail support bonuses.
    const affin=['Fire','Thunder','Wind','Ice','Dark','Light','Anima'];
    const support=r.u32(0x28534)-0x08000000;
    for(let stat=0;stat<6;stat++) {
      const table={'---':'---','?':'---','':'---'};
      for(let n=0;n<7;n++) {
        const at=support+n*8;
        if(r.u8(at)!==n+1)throw Error('Unsupported The Four Kings affinity table');
        table[affin[n]]=r.u8(at+1+stat)/2;
      }
      D['lookup'+(27+stat)]=table;
    }
    D.talkConfig={chapter:0x0202BCFE,temporaryFlags:0x03005270,permanentFlags:0x03005250};
    D.talkEvents=Array.from({length:79},(_,chapter)=>{
      const eventId=r.u8(0x8B0890+chapter*0x94+0x74);
      const group=r.u32(0x1A95058+eventId*4)-0x08000000;
      if(group<0||group+8>bytes.length)return [];
      const events=r.u32(group+4)-0x08000000,result=[];
      if(events<0||events>=bytes.length)return result;
      for(let n=0;n<256&&events+n*16+16<=bytes.length;n++) {
        const at=events+n*16,type=r.u16(at);
        if(!type)break;
        // Unused chapter slots can reference ordinary scripts, not CHAR lists.
        if(type!==3)return [];
        if(r.u32(at+4))result.push({flag:r.u16(at+2),from:r.u8(at+8),to:r.u8(at+9),
          anySource:r.u8(at+8)===0,conditionType:r.u16(at+12),conditionFlag:r.u16(at+14)});
      }
      return result;
    });
    // Use titles/prefixes present in the ROM, never the retail chapter-slot number.
    for(const chapter of D.fe8Chapters) {
      const match=chapter.name.match(/^(Ch(?:apter)?\.?\s*\d+[a-z]?(?:[-.]\d+)?|C\d+[a-z]?|Prologue|P|Finale|Final(?: Chapter)?|Epilogue)\s*:\s*(.+)$/i);
      chapter.label=match?(match[1]==='P'?'Prologue':match[1]):'Chapter';
      if(match)chapter.name=match[2];
    }
  }
  const profile=Object.freeze({
    mapRenderOnDemand:true,
    id:'the-four-kings',code:'BE8E',crc32:0x0DDE5BEB,language:'en',decodeText:root.CompanionLatinText,
    characters:0x803D30,classes:0x807110,items:0x1C1D0F8,
    portraits:0x8ACBC4,sprites:0x8AF880,icons:0x5926F4,
    iconPalettes:0x5996F4,spritePalettes:0x59EE20,slots:0x59A5D0,
    text:0x107BF60,chapters:0x8B0890,minimap:0xA1FBD8,minimapPalette:0xA1FFB0,prepareExtra
  });
  root.TheFourKingsPrep={
    ...root.FE8PublicPrep,
    prepare(input,template,runtime,options={}) {
      return root.FE8PublicPrep.prepare(input,template,runtime,options,profile);
    },
    radarSvg(growth,bonus){return root.CompanionRadar.svg(growth,bonus,'en');}
  };
})(globalThis);
