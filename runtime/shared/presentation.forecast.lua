-- Popup lifetime follows entry/exit of the game's Battle Forecast.
-- Keep stable frames untouched so users can open and close popups normally.
return function()
  local wasForecast = false
  return function(v)
    local forecast = v.forecastActive == true
    if forecast ~= wasForecast then
      v.ui = v.ui or {}
      v.ui.set = v.ui.set or {}
      v.ui.set.growthPopup = false
      v.ui.set.predictionPopup = false
    end
    wasForecast = forecast
    return v
  end
end
