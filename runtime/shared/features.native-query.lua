-- A bounded sequence of native getters; every write stays in a private shadow.
local start=pack.require("features.thumb").start
return function(initial)
  local queue,index,shadow={},1,initial or {}
  local run,spent
  local job={}
  function job.add(entry,args,accept)
    queue[#queue+1]={entry=entry,args=args,accept=accept}
  end
  function job.step(budget)
    while budget>0 and queue[index] do
      local phase=queue[index]
      if not run then
        run=start(phase.entry,type(phase.args)=="function" and phase.args() or phase.args,
          shadow,{maxSteps=6000})
        spent=0
      end
      local done,result,output,total=run(budget)
      budget=budget-(total-spent);spent=total
      if not done then return false end
      shadow=output
      if phase.accept then phase.accept(result,shadow)end
      index=index+1;run=nil
    end
    return queue[index]==nil
  end
  return job
end
