-- Bounded read-only Thumb-1 evaluator with private shadow writes.
-- Verified grid jobs may opt into the ARM7 subset used by native RAM kernels.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

local function modThumbStart(entry, args, initial, options)
  options = options or {}
  assert(options.allowArm == nil or type(options.allowArm) == "boolean", "Invalid ARM execution option")
  local biosPrefetch
  if options.busContext ~= nil then
    local context = options.busContext
    assert(type(context) == "table" and context.version == 1 and context.platform == "gba"
      and math.type(context.biosPrefetch) == "integer" and context.biosPrefetch >= 0
      and context.biosPrefetch <= 0xffffffff, "Invalid captured GBA bus context")
    biosPrefetch = context.biosPrefetch
  end
  local function busContext()
    return biosPrefetch and { version = 1, platform = "gba", biosPrefetch = biosPrefetch } or nil
  end
  local r = {}
  for n = 0, 15 do
    r[n] = 0
  end
  for n = 4, 12 do
    if options.registers and options.registers[n] then
      r[n] = options.registers[n] & 0xffffffff
    end
  end
  for n = 1, #args do
    r[n - 1] = args[n]
  end
  r[13] = 0x03007E00
  r[14] = 0x01000001
  local pc = entry & 0xfffffffe
  local arm = false
  local shadow = {}
  for a, v in pairs(initial or {}) do
    shadow[a] = v
  end
  local N, Z, C, V = false, false, false, false
  local read
  local function executable(a)
    return a >= 0x02000000 and a < 0x02040000
      or a >= 0x03000000 and a < 0x03008000
      or a >= 0x08000000 and a < 0x0A000000
  end
  local function byte(a)
    if a >= 0 and a < 0x4000 then
      assert(pc >= 0x02000000, "Executing BIOS firmware is outside this private CPU contract")
      assert(biosPrefetch ~= nil, string.format(
        "Protected BIOS read requires captured GBA bus context: %08X at %08X", a, pc))
      return (biosPrefetch >> ((a & 3) * 8)) & 255
    end
    if a >= 0x02000000 and a < 0x02040000 or a >= 0x03000000 and a < 0x03008000 then
      if shadow[a] ~= nil then
        return shadow[a]
      end
      if options.strictStack and a >= 0x03007000 and a < 0x03007F00 then
        error(string.format("Unknown caller stack byte: %08X at %08X", a, pc))
      end
      return options.ramByte and options.ramByte(a) or mem.u8(a)
    end
    if a >= 0x08000000 and a < 0x0A000000 then
      return mem.u8(a)
    end
    if a >= 0x4000 and a < 0x02000000 or a >= 0x10000000 and a <= 0xffffffff then
      -- Unmapped data reads use this private Thumb CPU's instruction pipeline,
      -- never a host debugger read. mGBA GBALoadBad and native controls agree
      -- on the ROM/EWRAM duplicate and IWRAM two-halfword cases below.
      assert(executable(pc) and executable(pc + 4), "Unverified open-bus execution region")
      local word
      if arm then
        assert(executable(pc + 8), "Unverified ARM open-bus execution region")
        word = read(pc + 8, 4)
      else
        local nextHalf, followingHalf = read(pc + 2, 2), read(pc + 4, 2)
        word = followingHalf | (followingHalf << 16)
        if pc >= 0x03000000 and pc < 0x03008000 then
          word = (pc & 2) ~= 0 and (nextHalf | (followingHalf << 16))
            or (followingHalf | (nextHalf << 16))
        end
      end
      return (word >> ((a & 3) * 8)) & 255
    end
    error(string.format("EXP read outside supported memory: %08X at %08X", a, pc))
  end
  read = function(a, n)
    if n > 1 and a % n ~= 0 then
      local aligned = read(a & ~(n - 1), n)
      local shift = (a & (n - 1)) * 8
      return ((aligned >> shift) | (aligned << (32 - shift))) & 0xffffffff
    end
    if a >= 0x08000000 and a + n <= 0x0A000000 then
      if n == 2 and a % 2 == 0 then
        return mem.u16(a)
      end
      if n == 4 and a % 4 == 0 then
        return mem.u32(a)
      end
    end
    if n == 1 then
      return byte(a)
    end
    if n == 2 then
      return byte(a) | (byte(a + 1) << 8)
    end
    return byte(a) | (byte(a + 1) << 8) | (byte(a + 2) << 16) | (byte(a + 3) << 24)
  end
  local function write(a, value, n)
    if n > 1 then
      a = a & ~(n - 1)
    end
    -- GBA BIOS is read-only: native STR8/16/32 controls leave its latch intact.
    if a >= 0 and a + n <= 0x02000000 or a >= 0x10000000 and a + n <= 0x100000000 then return end
    if a >= 0x08000000 and a + n <= 0x0A000000 then
      local offset = a & 0x00ffffff
      -- Ordinary cartridge ROM stores are ignored. GPIO, Matrix and AGB
      -- print registers remain outside the private CPU's peripheral contract.
      if n == 1 or offset < 0x00fd0000 and not (offset >= 0xc4 and offset <= 0xc8)
        and not (a >= 0x08800100 and a < 0x08800200) then return end
    end
    if not (a >= 0x02000000 and a + n <= 0x02040000 or a >= 0x03000000 and a + n <= 0x03008000) then
      error(string.format("EXP write outside private RAM shadow: %08X at %08X", a, pc))
    end
    for i = 0, n - 1 do
      shadow[a + i] = (value >> (i * 8)) & 255
    end
  end
  local function signed(v)
    return v >= 0x80000000 and v - 0x100000000 or v
  end
  local function nz(value)
    value = value & 0xffffffff
    N = (value & 0x80000000) ~= 0
    Z = value == 0
    return value
  end
  local function add(a, b, carry)
    local full = a + b + (carry or 0)
    C = full > 0xffffffff
    local s = signed(a) + signed(b) + (carry or 0)
    V = s > 0x7fffffff or s < -0x80000000
    return nz(full)
  end
  local function sub(a, b, borrow)
    local full = a - b - (borrow or 0)
    C = full >= 0
    local s = signed(a) - signed(b) - (borrow or 0)
    V = s > 0x7fffffff or s < -0x80000000
    return nz(full)
  end
  local function shift(a, n, kind)
    if n == 0 then
      return nz(a)
    end
    if kind == 0 then
      C = n <= 32 and ((a >> (32 - n)) & 1) ~= 0 or false
      return nz(n >= 32 and 0 or a << n)
    elseif kind == 1 then
      C = n <= 32 and ((a >> (n - 1)) & 1) ~= 0 or false
      return nz(n >= 32 and 0 or a >> n)
    elseif kind == 2 then
      C = n >= 32 and (a & 0x80000000) ~= 0 or ((a >> (n - 1)) & 1) ~= 0
      return nz(n >= 32 and (signed(a) < 0 and 0xffffffff or 0) or math.floor(signed(a) / (2 ^ n)))
    else
      n = n % 32
      if n == 0 then
        C = (a & 0x80000000) ~= 0
        return nz(a)
      end
      local v = ((a >> n) | (a << (32 - n))) & 0xffffffff
      C = (v & 0x80000000) ~= 0
      return nz(v)
    end
  end
  local function value(n)
    return n == 15 and pc + 4 or r[n]
  end
  local function branch(target)
    if (target & 1) == 0 then
      if options.allowArm then
        arm = true
        return target & 0xfffffffc
      end
      -- FE8's interworking veneers contain only LDR ip,[pc]; BX ip.
      -- Resolve this exact trampoline; arbitrary ARM code still fails closed.
      if read(target, 4) == 0xe59fc000 and read(target + 4, 4) == 0xe12fff1c then
        return branch(read(target + 8, 4))
      end
      error(string.format("EXP ARM branch is not supported: %08X at %08X", target, pc))
    end
    arm = false
    return target & 0xfffffffe
  end
  local function armCondition(kind)
    if kind == 0 then return Z elseif kind == 1 then return not Z
    elseif kind == 2 then return C elseif kind == 3 then return not C
    elseif kind == 4 then return N elseif kind == 5 then return not N
    elseif kind == 6 then return V elseif kind == 7 then return not V
    elseif kind == 8 then return C and not Z elseif kind == 9 then return not C or Z
    elseif kind == 10 then return N == V elseif kind == 11 then return N ~= V
    elseif kind == 12 then return not Z and N == V elseif kind == 13 then return Z or N ~= V
    elseif kind == 14 then return true end
    return false -- ARMv4 condition NV never executes.
  end
  local function armValue(n, registerShift)
    return n == 15 and ((pc + (registerShift and 12 or 8)) & 0xffffffff) or r[n]
  end
  local function armShift(a, n, kind, registerShift)
    if registerShift and n == 0 then return a, C end
    if kind == 0 then
      if n == 0 then return a, C end
      return n >= 32 and 0 or ((a << n) & 0xffffffff), n <= 32 and ((a >> (32 - n)) & 1) ~= 0 or false
    elseif kind == 1 then
      if not registerShift and n == 0 then n = 32 end
      return n >= 32 and 0 or (a >> n), n <= 32 and ((a >> (n - 1)) & 1) ~= 0 or false
    elseif kind == 2 then
      -- The pinned core has a separate ASR-immediate-zero edge. No verified
      -- native grid uses it, so keep that case explicit until target controls.
      assert(registerShift or n ~= 0, "Unsupported ARM ASR immediate zero")
      if n >= 32 then return (a & 0x80000000) ~= 0 and 0xffffffff or 0, (a & 0x80000000) ~= 0 end
      return math.floor(signed(a) / (2 ^ n)) & 0xffffffff, ((a >> (n - 1)) & 1) ~= 0
    elseif not registerShift and n == 0 then
      return ((C and 0x80000000 or 0) | (a >> 1)), (a & 1) ~= 0
    else
      n = n % 32
      if n == 0 then return a, (a & 0x80000000) ~= 0 end
      return ((a >> n) | (a << (32 - n))) & 0xffffffff, ((a >> (n - 1)) & 1) ~= 0
    end
  end
  local function armStep(op)
    local nextpc = (pc + 4) & 0xffffffff
    if not armCondition(op >> 28) then return nextpc end
    if (op & 0x0ffffff0) == 0x012fff10 then
      return branch(armValue(op & 15))
    elseif (op & 0x0e000000) == 0x0a000000 then
      local offset = op & 0x00ffffff
      if offset >= 0x800000 then offset = offset - 0x1000000 end
      if (op & 0x01000000) ~= 0 then r[14] = nextpc end
      return (pc + 8 + offset * 4) & 0xfffffffc
    elseif (op & 0x0e000000) == 0x08000000 then
      assert((op & 0x00400000) == 0, "Unsupported ARM banked block transfer")
      local base, list = (op >> 16) & 15, op & 0xffff
      assert(list ~= 0, "Unsupported ARM empty register list")
      local load, up, pre, wb = (op & 0x00100000) ~= 0, (op & 0x00800000) ~= 0,
        (op & 0x01000000) ~= 0, (op & 0x00200000) ~= 0
      assert(base ~= 15 or not wb, "Unsupported ARM PC writeback")
      local count = 0
      for n = 0, 15 do if (list & (1 << n)) ~= 0 then count = count + 1 end end
      local original = armValue(base)
      local address = (original + (up and (pre and 4 or 0) or (-count * 4 + (pre and 0 or 4)))) & 0xffffffff
      for n = 0, 15 do
        if (list & (1 << n)) ~= 0 then
          if load then
            local value = read(address & 0xfffffffc, 4)
            if n == 15 then nextpc = value & 0xfffffffc else r[n] = value end
          else
            write(address, n == 15 and (pc + 12) or r[n], 4)
          end
          address = (address + 4) & 0xffffffff
        end
      end
      if wb and not (load and (list & (1 << base)) ~= 0) then r[base] = (original + (up and count * 4 or -count * 4)) & 0xffffffff end
      return nextpc
    elseif (op & 0x0c000000) == 0x04000000 or (op & 0x0e000090) == 0x00000090 and (op & 0x60) ~= 0 then
      local half = (op & 0x0c000000) == 0
      local base, d = (op >> 16) & 15, (op >> 12) & 15
      local load, up, pre, wb = (op & 0x00100000) ~= 0, (op & 0x00800000) ~= 0,
        (op & 0x01000000) ~= 0, (op & 0x00200000) ~= 0
      assert(not (not pre and wb), "Unsupported ARM user-mode transfer")
      assert(base ~= 15 or (pre and not wb), "Unsupported ARM PC writeback")
      local offset, width, sign = 0, 4, false
      if half then
        local kind = (op >> 5) & 3
        assert(load or kind == 1, "Unsupported ARM signed store")
        assert(d ~= 15, "Unsupported ARM halfword PC transfer")
        if (op & 0x00400000) ~= 0 then offset = ((op >> 4) & 0xf0) | (op & 15)
        else offset = armValue(op & 15) end
        width, sign = kind == 2 and 1 or 2, kind >= 2
      elseif (op & 0x02000000) ~= 0 then
        assert((op & 0x10) == 0, "Unsupported ARM load/store register shift")
        offset = armShift(armValue(op & 15), (op >> 7) & 31, (op >> 5) & 3, false)
      else offset = op & 0xfff end
      if not half and (op & 0x00400000) ~= 0 then width = 1 end
      local original = armValue(base)
      local indexed = (original + (up and offset or -offset)) & 0xffffffff
      local address = pre and indexed or original
      -- mGBA applies load writeback before the destination assignment, so
      -- LDR Rn,[Rn],offset retains the loaded value when Rn equals Rd.
      if load then
        if wb or not pre then r[base] = indexed end
        if sign and width == 2 and (address & 1) ~= 0 then width = 1 end
        local value = read(address, width)
        if sign then
          local limit = width == 1 and 0x80 or 0x8000
          if value >= limit then value = (value - limit * 2) & 0xffffffff end
        end
        if d == 15 then nextpc = value & 0xfffffffc else r[d] = value end
      else
        write(address, d == 15 and (pc + 12) or r[d], width)
        if wb or not pre then r[base] = indexed end
      end
      return nextpc
    elseif (op & 0x0c000000) == 0 and not ((op & 0x02000090) == 0x00000090) then
      local kind, d, base = (op >> 21) & 15, (op >> 12) & 15, (op >> 16) & 15
      local test, set = kind >= 8 and kind <= 11, (op & 0x00100000) ~= 0
      assert(not test or set, string.format("Unsupported ARM instruction: %08X at %08X", op, pc))
      assert(not (d == 15 and set), "Unsupported ARM CPSR restore")
      local registerShift = (op & 0x02000010) == 0x00000010
      local operand, carry
      if (op & 0x02000000) ~= 0 then
        local amount = ((op >> 8) & 15) * 2
        operand, carry = armShift(op & 255, amount, 3, true)
      else
        local amount = registerShift and (armValue((op >> 8) & 15) & 255) or ((op >> 7) & 31)
        operand, carry = armShift(armValue(op & 15, registerShift), amount, (op >> 5) & 3, registerShift)
      end
      local a, result = armValue(base, registerShift)
      local oldN, oldZ, oldC, oldV = N, Z, C, V
      if kind == 0 or kind == 8 then result = nz(a & operand);C = carry
      elseif kind == 1 or kind == 9 then result = nz(a ~ operand);C = carry
      elseif kind == 2 or kind == 10 then result = sub(a, operand)
      elseif kind == 3 then result = sub(operand, a)
      elseif kind == 4 or kind == 11 then result = add(a, operand)
      elseif kind == 5 then result = add(a, operand, oldC and 1 or 0)
      elseif kind == 6 then result = sub(a, operand, oldC and 0 or 1)
      elseif kind == 7 then result = sub(operand, a, oldC and 0 or 1)
      elseif kind == 12 then result = nz(a | operand);C = carry
      elseif kind == 13 then result = nz(operand);C = carry
      elseif kind == 14 then result = nz(a & ~operand);C = carry
      elseif kind == 15 then result = nz(~operand);C = carry end
      if not set then N, Z, C, V = oldN, oldZ, oldC, oldV end
      if not test then if d == 15 then nextpc = result & 0xfffffffc else r[d] = result end end
      return nextpc
    end
    error(string.format("Unsupported ARM instruction: %08X at %08X", op, pc))
  end
  local steps = 0
  local copy
  local function finishCopy()
    if copy.fast then
      r[0] = copy.fill and copy.source or copy.source + copy.count * 4
      r[1] = copy.dest + copy.count * 4
      r[3] = copy.last
    elseif copy.width == 4 then
      r[0] = copy.source + (copy.fill and 4 or copy.count * 4)
      r[1] = copy.dest + copy.count * 4
      r[3] = 0x170
    else
      r[3] = 0x170
    end
    -- The supported SWI return path is verified against mGBA's BIOS source
    -- and native Div/CpuSet/CpuFastSet controls; this is not a read fallback.
    biosPrefetch = 0xE3A02004
    copy = nil
  end
  local function copyStep()
    local index, value = copy.index, copy.value
    if not copy.fill then
      if copy.fast then
        if index % 8 == 0 then
          copy.block = {}
          for n = 0, 7 do copy.block[n + 1] = read((copy.source + (index + n) * 4) & ~3, 4) end
          copy.last = copy.block[1]
        end
        value = copy.block[index % 8 + 1]
      else
        local address = copy.source + index * copy.width
        value = read(copy.width == 4 and (address & ~3) or address, copy.width)
      end
    end
    write(copy.dest + index * copy.width, value, copy.width)
    copy.index = index + 1
    if copy.index == copy.count then finishCopy() end
  end
  return function(slice)
    for _ = 1, slice or 6000 do
      if pc == 0x01000000 then
        return true, r[0], shadow, steps, busContext()
      end
      if copy then
        steps = steps + 1
        if steps > (options.maxSteps or 6000) then error("EXP evaluation limit reached") end
        copyStep()
      else
      if options.beforeEntry and options.beforeEntry[pc] then
        -- A detached current private-CPU context lets optional hooks preserve
        -- captured BIOS behavior without consulting mutable live host state.
        local redirect = options.beforeEntry[pc](r, read, write, busContext())
        if redirect ~= nil then
          assert(
            type(redirect) == "number"
              and redirect >= 0x08000000
              and redirect < 0x0A000000
              and redirect % 2 == 0,
            "Invalid private CPU entry redirect"
          )
          pc = redirect
        end
      end
      steps = steps + 1
      if steps > (options.maxSteps or 6000) then
        error("EXP evaluation limit reached")
      end
      assert(executable(pc), string.format("EXP execution outside supported memory: %08X", pc))
      if arm then
        assert(pc % 4 == 0, "Unaligned ARM instruction address")
        pc = armStep(read(pc, 4))
      else
      local op = read(pc, 2)
      local nextpc = pc + 2
      local d = op & 7
      local s = (op >> 3) & 7
      if (op & 0xf800) == 0x1800 then
        local b = (op & 0x400) ~= 0 and ((op >> 6) & 7) or r[(op >> 6) & 7]
        r[d] = (op & 0x200) ~= 0 and sub(r[s], b) or add(r[s], b)
      elseif (op & 0xe000) == 0 then
        local kind = (op >> 11) & 3
        local n = (op >> 6) & 31
        if kind > 0 and n == 0 then
          n = 32
        end
        r[d] = shift(r[s], n, kind)
      elseif (op & 0xe000) == 0x2000 then
        local k = (op >> 11) & 3
        d = (op >> 8) & 7
        local b = op & 255
        if k == 0 then
          r[d] = nz(b)
        elseif k == 1 then
          sub(r[d], b)
        elseif k == 2 then
          r[d] = add(r[d], b)
        else
          r[d] = sub(r[d], b)
        end
      elseif (op & 0xfc00) == 0x4000 then
        local k = (op >> 6) & 15
        local a, b = r[d], r[s]
        if k == 0 then
          r[d] = nz(a & b)
        elseif k == 1 then
          r[d] = nz(a ~ b)
        elseif k == 2 or k == 3 or k == 4 then
          r[d] = shift(a, b & 255, k - 2)
        elseif k == 5 then
          r[d] = add(a, b, C and 1 or 0)
        elseif k == 6 then
          r[d] = sub(a, b, C and 0 or 1)
        elseif k == 7 then
          r[d] = shift(a, b & 255, 3)
        elseif k == 8 then
          nz(a & b)
        elseif k == 9 then
          r[d] = sub(0, b)
        elseif k == 10 then
          sub(a, b)
        elseif k == 11 then
          add(a, b)
        elseif k == 12 then
          r[d] = nz(a | b)
        elseif k == 13 then
          r[d] = nz(a * b)
        elseif k == 14 then
          r[d] = nz(a & ~b)
        else
          r[d] = nz(~b)
        end
      elseif (op & 0xfc00) == 0x4400 then
        local k = (op >> 8) & 3
        d = (op & 7) + ((op >> 4) & 8)
        s = (op >> 3) & 15
        if k == 0 then
          local v = (value(d) + value(s)) & 0xffffffff
          if d == 15 then
            nextpc = v & 0xfffffffe
          else
            r[d] = v
          end
        elseif k == 1 then
          sub(value(d), value(s))
        elseif k == 2 then
          if d == 15 then
            nextpc = value(s) & 0xfffffffe
          else
            r[d] = value(s)
          end
        else
          nextpc = branch(value(s))
        end
      elseif (op & 0xf800) == 0x4800 then
        r[(op >> 8) & 7] = read(((pc + 4) & 0xfffffffc) + (op & 255) * 4, 4)
      elseif (op & 0xf000) == 0x5000 then
        local k = (op >> 9) & 7
        local a = (r[s] + r[(op >> 6) & 7]) & 0xffffffff
        if k == 0 then
          write(a, r[d], 4)
        elseif k == 1 then
          write(a, r[d], 2)
        elseif k == 2 then
          write(a, r[d], 1)
        elseif k == 3 then
          local v = read(a, 1)
          r[d] = (v >= 128 and v - 256 or v) & 0xffffffff
        elseif k == 4 then
          r[d] = read(a, 4)
        elseif k == 5 then
          r[d] = read(a, 2)
        elseif k == 6 then
          r[d] = read(a, 1)
        else
          local n = (a & 1) ~= 0 and 1 or 2
          local v = read(a, n)
          local sign = n == 1 and 128 or 32768
          local wrap = n == 1 and 256 or 65536
          r[d] = (v >= sign and v - wrap or v) & 0xffffffff
        end
      elseif (op & 0xe000) == 0x6000 then
        local n = (op & 0x1000) ~= 0 and 1 or 4
        local a = r[s] + ((op >> 6) & 31) * n
        if (op & 0x800) ~= 0 then
          r[d] = read(a, n)
        else
          write(a, r[d], n)
        end
      elseif (op & 0xf000) == 0x8000 then
        local a = r[s] + ((op >> 6) & 31) * 2
        if (op & 0x800) ~= 0 then
          r[d] = read(a, 2)
        else
          write(a, r[d], 2)
        end
      elseif (op & 0xf000) == 0x9000 then
        d = (op >> 8) & 7
        local a = r[13] + (op & 255) * 4
        if (op & 0x800) ~= 0 then
          r[d] = read(a, 4)
        else
          write(a, r[d], 4)
        end
      elseif (op & 0xf000) == 0xa000 then
        r[(op >> 8) & 7] = ((op & 0x800) ~= 0 and r[13] or ((pc + 4) & 0xfffffffc)) + (op & 255) * 4
      elseif (op & 0xff00) == 0xb000 then
        r[13] = r[13] + ((op & 0x80) ~= 0 and -1 or 1) * (op & 127) * 4
      elseif (op & 0xf600) == 0xb400 then
        local pop = (op & 0x800) ~= 0
        local list = {}
        for n = 0, 7 do
          if (op & (1 << n)) ~= 0 then
            list[#list + 1] = n
          end
        end
        if (op & 0x100) ~= 0 then
          list[#list + 1] = pop and 15 or 14
        end
        if #list == 0 then
          error("Unsupported empty Thumb stack list")
        end
        if pop then
          for _, n in ipairs(list) do
            local v = read(r[13] & 0xfffffffc, 4)
            r[13] = r[13] + 4
            if n == 15 then
              nextpc = branch(v)
            else
              r[n] = v
            end
          end
        else
          r[13] = r[13] - #list * 4
          for i, n in ipairs(list) do
            write(r[13] + (i - 1) * 4, r[n], 4)
          end
        end
      elseif (op & 0xf000) == 0xc000 then
        local base = (op >> 8) & 7
        if (op & 255) == 0 then
          error("Unsupported empty Thumb register list")
        end
        local a = r[base]
        local load = (op & 0x800) ~= 0
        for n = 0, 7 do
          if (op & (1 << n)) ~= 0 then
            if load then
              r[n] = read(a & 0xfffffffc, 4)
            else
              write(a, r[n], 4)
            end
            a = a + 4
          end
        end
        if not (load and (op & (1 << base)) ~= 0) then
          r[base] = a
        end
      elseif (op & 0xff00) == 0xdf00 then
        local swi = op & 255
        if swi == 11 or swi == 12 then
          if (r[0] >> 24) < 2 then
            -- mGBA refuses CpuSet sources in the BIOS region.
            biosPrefetch = 0xE3A02004
          else
            -- A BIOS routine's own ARM prefetch is not the caller's Thumb
            -- pipeline. Keep unmapped/peripheral copy sources unsupported.
            assert(executable(r[0]), "Unsupported BIOS copy source memory")
            local fast, fill = swi == 12, (r[2] & 0x01000000) ~= 0
            local width = (fast or (r[2] & 0x04000000) ~= 0) and 4 or 2
            -- The pinned mGBA BIOS shifts left12, retaining the low20 bits.
            local count = r[2] & 0x000fffff
            if fast then count = (count + 7) & ~7 end
            copy = { fast = fast, fill = fill, width = width, count = count, index = 0,
              source = r[0], dest = r[1], last = 0 }
            if fill then
              copy.value = read(not fast and (r[0] & ~(width - 1)) or r[0], width)
              copy.last = copy.value
            end
            if count == 0 then finishCopy() end
          end
        elseif swi == 6 or swi == 7 then
          local a, b = signed(r[0]), signed(r[1])
          if swi == 7 then a, b = b, a end
          if b == 0 then error("EXP BIOS division by zero") end
          local q = math.abs(a) // math.abs(b)
          if (a < 0) ~= (b < 0) then q = -q end
          r[0] = q & 0xffffffff
          r[1] = (a - q * b) & 0xffffffff
          r[3] = math.abs(q) & 0xffffffff
          biosPrefetch = 0xE3A02004
        else
          error(string.format("Unsupported EXP software interrupt: %04X at %08X", op, pc))
        end
      elseif (op & 0xf000) == 0xd000 then
        local k = (op >> 8) & 15
        if k >= 14 then
          error(string.format("Unsupported EXP software interrupt: %04X at %08X", op, pc))
        end
        local cond = {
          Z,
          not Z,
          C,
          not C,
          N,
          not N,
          V,
          not V,
          C and not Z,
          (not C) or Z,
          N == V,
          N ~= V,
          (not Z) and (N == V),
          Z or (N ~= V),
        }
        if cond[k + 1] then
          local off = op & 255
          if off >= 128 then
            off = off - 256
          end
          nextpc = pc + 4 + off * 2
        end
      elseif (op & 0xf800) == 0xe000 then
        local off = op & 2047
        if off >= 1024 then
          off = off - 2048
        end
        nextpc = pc + 4 + off * 2
      elseif (op & 0xf800) == 0xf000 then
        local off = op & 2047
        if off >= 1024 then
          off = off - 2048
        end
        r[14] = (pc + 4 + off * 4096) & 0xffffffff
      elseif (op & 0xf800) == 0xf800 then
        nextpc = (r[14] + (op & 2047) * 2) & 0xfffffffe
        r[14] = (pc + 2) | 1
      else
        error(string.format("Unsupported EXP instruction: %04X at %08X", op, pc))
      end
      pc = nextpc
      end
      end
    end
    return false, nil, nil, steps, busContext()
  end
end
local function modThumbCall(entry, args, initial)
  local done, result = modThumbStart(entry, args, initial)(6001)
  if not done then
    error("EXP evaluation limit reached")
  end
  return result
end

return { start = modThumbStart, call = modThumbCall }
