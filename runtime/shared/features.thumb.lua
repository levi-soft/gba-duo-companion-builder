-- Bounded read-only Thumb-1 evaluator with private shadow writes.
-- Authored runtime module. Generated ROM tables live in data.rom_tables.lua.

local function modThumbStart(entry, args, initial, options)
  options = options or {}
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
  local shadow = {}
  for a, v in pairs(initial or {}) do
    shadow[a] = v
  end
  local N, Z, C, V = false, false, false, false
  local function byte(a)
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
    error(string.format("EXP read outside supported memory: %08X at %08X", a, pc))
  end
  local function read(a, n)
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
    if not (a >= 0x02000000 and a + n <= 0x02040000 or a >= 0x03000000 and a + n <= 0x03008000) then
      error("EXP write outside private RAM shadow")
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
      -- FE8's interworking veneers contain only LDR ip,[pc]; BX ip.
      -- Resolve this exact trampoline; arbitrary ARM code still fails closed.
      if read(target, 4) == 0xe59fc000 and read(target + 4, 4) == 0xe12fff1c then
        return branch(read(target + 8, 4))
      end
      error(string.format("EXP ARM branch is not supported: %08X at %08X", target, pc))
    end
    return target & 0xfffffffe
  end
  local steps = 0
  return function(slice)
    for _ = 1, slice or 6000 do
      if pc == 0x01000000 then
        return true, r[0], shadow, steps
      end
      if options.beforeEntry and options.beforeEntry[pc] then
        local redirect = options.beforeEntry[pc](r, read, write)
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
        if swi ~= 6 and swi ~= 7 then
          error(string.format("Unsupported EXP software interrupt: %04X at %08X", op, pc))
        end
        local a, b = signed(r[0]), signed(r[1])
        if swi == 7 then
          a, b = b, a
        end
        if b == 0 then
          error("EXP BIOS division by zero")
        end
        local q = math.abs(a) // math.abs(b)
        if (a < 0) ~= (b < 0) then
          q = -q
        end
        r[0] = q & 0xffffffff
        r[1] = (a - q * b) & 0xffffffff
        r[3] = math.abs(q) & 0xffffffff
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
    return false, nil, nil, steps
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
