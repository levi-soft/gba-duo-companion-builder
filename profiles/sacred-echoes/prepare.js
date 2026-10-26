// Exact local ROM, checked against HyperGammaSpaces' source and live Thor RAM.
(function(root) {
  function prepareExtra({reader:r,bytes,data:D,project}) {
    D.battleConfig={doublingThreshold:2,minimumDamage:1};
    D.weaponTypes={0:'Sword',1:'Lance',2:'Axe',3:'Bow',4:'Dragonstone',
      5:'Black Magic',6:'White Magic',7:'Dark Magic',11:'Terror'};
    for(let id=0;id<256;id++)D.lookup23[id]=D.weaponTypes[r.u8(0x809B10+id*36+7)]||'Item';
    // Native rank slot 4 is Dragonstone in this hack, not retail FE8's Staff.
    project.files['assets/images/weapon-ranks/dragonstone.png']=
      project.files['assets/images/weapon-ranks/staff.png'];
    D.levelCaps=Array.from({length:128},(_,id)=>r.u8(0xB4EAA4+id));
    D.classTraits={};
    const traits=(ids,keys)=>{for(const id of ids)D.classTraits[id]=keys;};
    traits([2,4],['shove','lock']);
    traits([1,3],['swap','lock']);
    traits([5,6,7,8,0x35,0x36,0x48],['canto']);
    traits([0x49],['canto','slayer']);
    traits([9,10],['pivot']);traits([11,12],['pivot','armor']);
    traits([0x25,0x26,0x27,0x28],['swap']);
    traits([0x15,0x16],['apotrope']);traits([0x17,0x18],['lock']);
    traits([0x19,0x1A],['bow1']);traits([0x1B,0x1C,0x1D,0x1E],['bow2']);
    traits([0x3F,0x40,0x47],['smite']);
    D.spellConfig={entry:0x08B4B72C,buffer:0x0202B6D0,costs:0xB4B124};
    D.spellCosts=Array.from({length:256},(_,id)=>id>=0x38 && id<=0x5A?r.u8(0xB4B124+(id-0x38)*2+1):0);
    D.drainItems={};
    for(let id=1;id<256;id++)if(r.u8(0x809B10+id*36+31)===7)D.drainItems[id]=true;
    D.talkConfig={chapter:0x0202BCFE,temporaryFlags:0x03005270,permanentFlags:0x03005250};
    D.talkEvents=Array.from({length:79},(_,chapter)=>{
      const eventId=r.u8(0x8B0890+chapter*0x94+0x74),group=r.u32(0x8B363C+eventId*4)-0x08000000;
      if(group<0 || group+8>bytes.length)return [];
      const events=r.u32(group+4)-0x08000000,result=[];
      if(events<0 || events>=bytes.length)return result;
      for(let n=0;n<256 && events+n*16+16<=bytes.length;n++) {
        const at=events+n*16,type=r.u16(at);
        if(!type)break;
        if(type!==3)return [];
        if(r.u32(at+4))result.push({flag:r.u16(at+2),from:r.u8(at+8),to:r.u8(at+9),
          anySource:r.u8(at+8)===0,conditionType:r.u16(at+12),conditionFlag:r.u16(at+14)});
      }
      return result;
    });
    // Chapters have place names rather than the retail FE8 chapter sequence.
    for(const chapter of D.fe8Chapters){chapter.label=chapter.name;chapter.name='';}
    for(const entry of Object.values(D.growthClasses))entry.caps[0]=52;
  }
  const profile=Object.freeze({
    id:'sacred-echoes',code:'BE8E',crc32:0x13F15F23,language:'en',textEncoding:'latin1',
    characters:0x803D30,classes:0x807110,items:0x809B10,
    portraits:0x1094E64,sprites:0x8AF880,icons:0x5926F4,
    iconPalettes:0xFCA21C,uiIconPaletteBank:1,spritePalettes:0x59EE20,slots:0x59A5D0,
    text:0x15D48C,chapters:0x8B0890,minimap:0xA1FBD8,minimapPalette:0xA1FFB0,prepareExtra
  });
  root.SacredEchoesPrep={
    ...root.FE8PublicPrep,
    prepare(input,template,runtime,options={}) {
      return root.FE8PublicPrep.prepare(input,template,runtime,options,profile);
    },
    radarSvg(growth,bonus){return root.CompanionRadar.svg(growth,bonus,'en');}
  };
})(globalThis);
