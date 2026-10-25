// Individual glyph codes used by the supported English patch. No game text.
globalThis.FE6_ENGLISH_GLYPHS={
  "8180": " ",
  "8343": "<",
  "8345": "=",
  "8347": ">",
  "8349": "?",
  "8350": "]",
  "8352": "^",
  "8354": "_",
  "8356": "'",
  "8358": "{",
  "829F": "2",
  "82A1": "3",
  "82A3": "4",
  "82A5": "5",
  "82A7": "6",
  "82C1": "7",
  "82E1": "8",
  "82E3": "9",
  "82E5": ":",
  "82A0": "A",
  "82A2": "B",
  "82A4": "C",
  "82A6": "D",
  "82A8": "E",
  "82A9": "F",
  "82AA": "u",
  "82AB": "G",
  "82AC": "v",
  "82AD": "H",
  "82AE": "w",
  "82AF": "I",
  "82B0": "x",
  "82B1": "J",
  "82B2": "y",
  "82B3": "K",
  "82B4": "z",
  "82B5": "L",
  "82B6": "  ",
  "82B7": "M",
  "82B8": " ",
  "82B9": "N",
  "82BA": "!",
  "82BB": "O",
  "82BC": "\"",
  "82BD": "P",
  "82BE": "#",
  "82BF": "Q",
  "82C0": "$",
  "82C2": "R",
  "82C3": "%",
  "82C4": "S",
  "82C5": "&",
  "82C6": "T",
  "82C7": "'",
  "82C8": "U",
  "82C9": "V",
  "82CA": "W",
  "82CB": "X",
  "82CC": "Y",
  "82CD": "Z",
  "82CE": "(",
  "82CF": "-",
  "82D0": "a",
  "82D1": ")",
  "82D2": ".",
  "82D3": "b",
  "82D4": "*",
  "82D5": "/",
  "82D6": "c",
  "82D7": "+",
  "82D8": "0",
  "82D9": "d",
  "82DA": ",",
  "82DB": "1",
  "82DC": "e",
  "82DD": "f",
  "82DE": "g",
  "82DF": "h",
  "82E0": "i",
  "82E2": "j",
  "82E4": "k",
  "82E6": "l",
  "82E7": "m",
  "82E8": "n",
  "82E9": "o",
  "82EA": "p",
  "82EB": "q",
  "82EC": "s",
  "82ED": "r",
  "82EE": "t",
  "82F0": "s",
  "82F1": "t",
  "834A": "@",
  "834C": "[",
  "834E": "\\",
  "835A": "|",
  "835C": "}",
  "835E": "~"
};

// Preserve the supported patch glyph encoding and original residual records.
globalThis.FE6_ENGLISH_ENCODING = function(bytes) {
  let text = '';
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    // Native FE6 dialogue controls are not Shift-JIS glyphs. They can occur
    // in unused records referenced by a hack's extended item table.
    if (byte === 0x10) { i += 2; continue; } // portrait ID parameter
    if (byte === 0x80) {
      const command = bytes[++i];
      if (command <= 3) i++; // colour parameter
      else if (!(command <= 8 || (command >= 10 && command <= 17))) break;
      continue;
    }
    if (byte < 32) { text += ' '; continue; }
    const pair = byte.toString(16).padStart(2, '0') + (bytes[i + 1] || 0).toString(16).padStart(2, '0');
    const glyph = globalThis.FE6_ENGLISH_GLYPHS[pair.toUpperCase()];
    if (glyph !== undefined) { text += glyph; i++; }
    else if (byte < 127) text += String.fromCharCode(byte);
    else {
      // Original untranslated records retain the Japanese ROM encoding.
      const second = bytes[++i];
      try { text += new TextDecoder('shift_jis', {fatal:true}).decode(new Uint8Array([byte, second])); }
      catch(error) { throw Error('Unsupported FE6 glyph: '+byte.toString(16)+' '+second?.toString(16)); }
    }
  }
  return text;
};
