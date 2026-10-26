// Accepted English FE7 layout with the shared Talk sprite/detail component.
globalThis.THE_LAST_PROMISE_TEMPLATE=structuredClone(FE7_ENGLISH_TEMPLATE);
Object.assign(THE_LAST_PROMISE_TEMPLATE.manifest,{
  id:'the-last-promise-local-cache',name:'The Last Promise - Local ROM Cache',version:'1.0.0',
  match:{gameCode:['AE7E'],crc32:['D1C6E5D5']}
});
{
  const extension=withCompanionTalk({pages:[],css:''},FE6_UI_EXTENSION);
  THE_LAST_PROMISE_TEMPLATE.layout=makeCompanionLayout(extension,'en');
  THE_LAST_PROMISE_TEMPLATE.css=COMPANION_THEME.css+extension.css;
}
