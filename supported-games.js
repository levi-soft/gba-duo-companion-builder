'use strict';
const $=id=>document.getElementById(id);
const copy={
  en:{title:'Supported games',back:'← Companion Builder',intro:'Choose a game below to check its supported ROM revision. The builder detects the matching profile when you select your ROM.',exactNote:'Support applies to the exact ROM revision listed for each game. Other translations, mods and revisions need their own profile.',start:'Create a companion',count:n=>`${n} supported games`,version:'Companion',rom:'ROM details',code:'Game code',checksum:'CRC32'},
  vi:{title:'Game được hỗ trợ',back:'← Companion Builder',intro:'Xem phiên bản ROM được hỗ trợ của từng game bên dưới. Builder tự nhận diện profile phù hợp khi bạn chọn ROM.',exactNote:'Chỉ phiên bản ROM được liệt kê cho từng game mới được hỗ trợ. Bản dịch, bản mod và phiên bản ROM khác cần profile riêng.',start:'Tạo companion',count:n=>`${n} game được hỗ trợ`,version:'Companion',rom:'Chi tiết ROM',code:'Game code',checksum:'CRC32'}
};
const requested=new URLSearchParams(globalThis.location?.search||'').get('lang');
if(Object.hasOwn(copy,requested))$('language').value=requested;
function textElement(tag,text,className){
  const element=document.createElement(tag);
  element.textContent=text;
  if(className)element.className=className;
  return element;
}
function render(){
  const lang=$('language').value,labels=copy[lang];
  document.documentElement.lang=lang;
  document.title=labels.title+' · GBA Duo Companion Builder';
  for(const id of ['title','back','intro','exactNote','start'])$(id).textContent=labels[id];
  for(const id of ['back','start'])$(id).href='index.html?lang='+lang;
  $('count').textContent=labels.count(COMPANION_PROFILES.length);
  const cards=COMPANION_PROFILES.map(profile=>{
    const card=document.createElement('li');
    card.className='game-card';
    card.append(textElement('h2',lang==='vi'?(profile.nameVi||profile.name):profile.name));
    const version=profile.output.match(/-(\d+\.\d+\.\d+)$/)?.[1];
    if(version)card.append(textElement('p',labels.version+' '+version,'game-version'));
    const details=document.createElement('details');
    details.append(textElement('summary',labels.rom));
    const fields=document.createElement('dl');
    for(const [label,value]of [[labels.code,profile.code],[labels.checksum,profile.crc32]]){
      fields.append(textElement('dt',label),textElement('dd',value));
    }
    details.append(fields);
    card.append(details);
    return card;
  });
  $('gameList').replaceChildren(...cards);
}
$('language').addEventListener('change',render);
render();
