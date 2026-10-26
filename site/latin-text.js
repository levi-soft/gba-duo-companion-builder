// Compact Latin glyphs shared by the verified Storge and Hag ROM fonts, verified against its own item-font bitmaps.
// These are character codes, not copied game strings or font artwork.
(function(root) {
  const glyphs = {
    0x81:'a',0x82:'b',0x83:'c',0x84:'d',0x85:'e',0x86:'f',0x87:'g',0x88:'h',
    0x89:'j',0x8a:'k',0x8b:'n',0x8c:'o',0x8d:'p',0x8e:'q',0x8f:'r',0x90:'s',
    0x91:'\u2019',0x92:"'",0x93:'\u201d',0x94:'"',0x95:'t',0x96:'u',0x97:'v',
    0x98:'x',0x99:'y',0x9a:'z',0x9b:'A',0x9c:'B',0x9d:'C',0x9e:'D',0x9f:'E',
    0xa0:'F',0xa1:'I',0xa2:'G',0xa3:'H',0xa4:'J',0xa5:'K',0xa6:'L',0xa7:'O',
    0xa8:'P',0xa9:'Q',0xaa:'\u00b0',0xab:'\u00ab',0xac:'R',0xad:'S',0xae:'U',
    0xaf:'V',0xb0:'W',0xb1:'Y',0xb2:'Z',0xba:'\u00b0',0xbb:'\u00bb',0xbc:' '
  };
  root.CompanionLatinText = function(bytes) {
    let text = '';
    for(let n=0;n<bytes.length;n++) {
      const byte=bytes[n];
      if(byte===0x10) { n+=2; continue; } // Dialogue portrait argument.
      if(byte===0x80) { // Extended dialogue control and optional colour argument.
        const command=bytes[++n];
        if(command<=3)n++;
        continue;
      }
      text+=byte<32?' ':glyphs[byte] ?? String.fromCharCode(byte);
    }
    return text;
  };
})(globalThis);
