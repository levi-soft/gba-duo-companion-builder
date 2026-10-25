-- Translate authored presentation strings only; ROM-derived text stays intact.
return function(strings)
  local phrases = {}
  for source in pairs(strings or {}) do
    phrases[#phrases + 1] = source
  end
  table.sort(phrases, function(a, b)
    return #a > #b
  end)
  return function(text)
    if type(text) ~= "string" or not strings then
      return text
    end
    if strings[text] then
      return strings[text]
    end
    -- Compose authored fragments around dynamic EXP/progress numbers. Plain
    -- matching avoids treating punctuation or percentages as Lua patterns.
    for _, source in ipairs(phrases) do
      local from = 1
      while true do
        local first, last = text:find(source, from, true)
        if not first then
          break
        end
        local replacement = strings[source]
        text = text:sub(1, first - 1) .. replacement .. text:sub(last + 1)
        from = first + #replacement
      end
    end
    return text
  end
end
