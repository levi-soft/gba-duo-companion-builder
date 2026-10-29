-- Preserve native FE8 abilities and this exact ROM's pending conversations.
return function(D)
  local native = pack.require("game.native-abilities")(D)
  local talk = pack.require("game.talk")(D)
  return {
    apply = function(values, unit)
      native.apply(values, unit)
      talk(values, unit)
    end,
  }
end
