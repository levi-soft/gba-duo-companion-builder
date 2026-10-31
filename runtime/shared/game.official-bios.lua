-- Exact-ROM, official-HLE-only equivalence for the always-false type guard.
-- This does not invent a BIOS latch or bypass a reachable positive skill path.
-- Image bytes: mGBA src/gba/hle-bios.c, commit 26b7884bc25a5933960f3cdcd98bac1ae14d42e2.
-- BIOS image data copyright 2013-2014 Jeffrey Pfau, Mozilla Public License 2.0.
-- The image data's Source Code Form is subject to the MPL 2.0 terms at
-- https://mozilla.org/MPL/2.0/ (pinned upstream source retains that notice).
-- Whole 16KiB SHA256: 9f307cb8ba43f3d258baafaacbf7a3c32f690541ebc31f4bf6459f443bfa27d2.
-- Every aligned halfword/word prefetch has a low byte other than 6; HLE SWI
-- sets E3A02004, and reset starts at 0. The five read addresses are 4-aligned.
local hleHex = [[
d30000ea660000ea0c0000eafeffffeafeffffea0000a0e1590000eafeffffea00000000000000000000000000000000
0000000000000000000000000000000000005de301d3a00320d04d0200582de902c05ee5d4b0a0e30cc19be7d2bfa0e3
0c005be100b04fe100082de980b00be21fb08be30bf021e10000f00f04402de900005ce30000a0e10000a0e10000a0e1
0000a0e10000a0e10000a0e10fe0a0111cff2f110000a0e10000a0e10000a0e10440bde893f029e30008bde80bf069e1
0058bde80ef0b0e1000000000420a0e300000000b0010000b0010000b4010000b0010000cc010000c401000048030000
4803000048030000480300004803000014020000a8020000b0010000b0010000b0010000b00100004803000048030000
b0010000b0010000b0010000b0010000b0010000b0010000b0010000b0010000b0010000b0010000b0010000b0010000
b0010000b0010000b0010000b0010000b0010000b0010000b0010000b0010000b0010000b0010000b001000000030000
000000000f502de90103a0e300e08fe204f010e50f50bde804f05ee20000000002c05ee504f05ee20000000004e0a003
1eff2fe100b0a0e301c3a0e301b3cce51eff2fe10100a0e30110a0e30c402de901c3a0e3000050e30000a0e30120a0e3
0300000ab8305ce10130c3e1b8304ce10103cce50802cce5b8305ce1013013e001302310b8304c110822cce5f7ffff0a
0c80bde830402de90246a0e100c0a0e10150a0e1010412e30f00000a010312e30500000a244585e00800b0e8040051e1
0800a1b8fcffffba140000ea01c0cce30150c5e3a44585e0b030dce1040055e1b230c5b0fcffffba0c0000ea010312e3
0500000a244585e0040051e10800b0b80800a1b8fbffffba040000eaa44585e0040055e1b230dcb0b230c5b0fbffffba
173ea0e33080bde8f0472de9010412e30236a0e1232581e00b00000a003090e50340a0e10350a0e10360a0e10370a0e1
0380a0e10390a0e103a0a0e1020051e1f807a1b8fcffffba030000ea020051e1f807b0b8f807a1b8fbffffbaf087bde8
f0072de938109fe50130a0e10140a0e10150a0e10160a0e10170a0e10180a0e10190a0e101a0a0e1fa07a0e8fa07a0e8
fa07a0e8fa07a0e80010a0e3f007bde81eff2fe1b001000004b05be2fdffff8a1eff2fe1c2e3a0e303105ee4000051e3
0010a0131eff2f111ce09fe500109ee5000051e30010a0e31eff2f11c0e04ee21eff2fe10000000000f029e1c0000002
]]
local expected=(hleHex:gsub('%s',''):gsub('..',function(pair)return string.char(tonumber(pair,16))end))
expected=expected..string.rep(string.char(0),0x4000-#expected)
local imageVerified=false
local prefix={0xb5f0,0x1c04,0x1c0d,0x201e,0x5c20,0x4910,
  0x2224,0x4342,0x1889,0x79c9,0x2906,0xd116}
return function(readPc,callerPc)
  assert(math.type(readPc)=='integer' and readPc>=0x08000000 and readPc<0x0a000000
    and readPc%2==0 and math.type(callerPc)=='integer' and callerPc>=0x08000000
    and callerPc<0x0a000000 and callerPc%2==0,'Invalid official BIOS guard recipe')
  return {[readPc]=function(registers,read,write,context)
    -- Context belongs to this private CPU, including changes from an earlier SWI.
    -- Any captured context retains the original ROM path, including byte 6.
    if context~=nil then return end
    if not imageVerified then
      assert(mem.read(0,0x4000)==expected,'Unverified official HLE BIOS image')
      imageVerified=true
    end
    for n,opcode in ipairs(prefix)do
      assert(read(readPc-0x12+(n-1)*2,2)==opcode,'Unverified official BIOS guard opcodes')
    end
    assert(read(readPc+0x3a,4)==0xc1 and read(readPc+0x34,2)==0xbdf0
      and registers[0]>=0 and registers[0]<=255 and registers[0]%1==0
      and registers[2]==registers[0]*0x24 and registers[1]==0xc1+registers[2]
      and (registers[1]+7)%4==0,'Unverified official BIOS guard address')
    -- Only the pinned void pre-battle list callback is equivalent: its wrapper
    -- discards r0, its loop replaces flags, and r0/r1 reload before the next call.
    assert(registers[14]==callerPc+1 and registers[6]==((readPc-0x12)|1)
      and read(callerPc-12,2)==0xb570 and read(callerPc-2,2)==0xf803
      and read(callerPc,2)==0xbc70 and read(callerPc+2,2)==0xbc01
      and read(callerPc+4,2)==0x4700 and read(callerPc+6,2)==0x4730
      and read(callerPc-0x28,2)==0x6832 and read(callerPc-0x26,2)==0x2a00
      and read(callerPc-0x1e,2)==0x1c20 and read(callerPc-0x1c,2)==0x1c29
      and read(callerPc-0x16,2)==0x3604 and read(callerPc-0x14,2)==0xe7f4,
      'Unverified official BIOS guard caller')
    -- Run the original POP. All original stack/callee-saved effects are kept.
    -- The skipped LDR/CMP/BNE cannot enter the positive branch on this exact host.
    -- No stat, skill-list/cache, RNG or other state write lies on the false path.
    return readPc+0x34
  end}
end
