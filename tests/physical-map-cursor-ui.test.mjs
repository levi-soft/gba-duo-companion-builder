import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const layout=JSON.parse(fs.readFileSync('ui/theme.layout.json','utf8'));
function nodes(value,result=[]){
  if(value&&typeof value==='object'){
    if(value.id)result.push(value);
    for(const child of Object.values(value))nodes(child,result);
  }
  return result;
}
const all=nodes(layout);
test('Map taps call the game-cursor action without selecting a companion unit before write permission or validation',()=>{
  const clickable=all.filter(n=>n.onClick?.call==='focusMapUnit');
  assert.equal(clickable.length,2,'Roster and map marker must use the same action');
  for(const n of clickable){
    assert.equal(n.onClick.set?.mapPickedId,undefined,'A denied/delayed action must not make companion selection appear successful');
    assert.equal(n.onClick.set?.mapPickedContext,undefined);
    assert.deepEqual(n.onClick.args,['{id}','{mapPickContext}']);
  }
});
test('Map never inserts cursor action messages above the chapter or resizes the map on a tap',()=>{
  const status=all.filter(n=>n.visibleIf?.includes('mapCursor')||n.text?.includes('mapCursorMessage'));
  assert.equal(status.length,0);
});
