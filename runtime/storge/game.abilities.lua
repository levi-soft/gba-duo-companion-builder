-- Preserve FE8's native abilities and add Storge's pending chapter conversations.
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
