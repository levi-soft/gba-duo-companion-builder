-- Chapter headers must survive ROM records with missing/blank text.
return function(info, fallback, prefix)
  local function text(value)
    return type(value) == "string" and value:find("%S") and value or nil
  end
  local label = info and text(info.label) or fallback
  local title = info and (text(info.title) or text(info.name))
  return title and (prefix and label .. ": " .. title or title) or label
end
