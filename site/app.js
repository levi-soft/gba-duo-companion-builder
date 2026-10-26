'use strict';
const $=id=>document.getElementById(id);let controller,urls=[],busy=false;
const strings={en:{title:'GBA Duo Companion Builder',intro:'Select your own supported ROM. Images and game text are extracted on this device once, then cached in a companion ZIP for smooth gameplay.',step:'1. Choose your ROM',choose:'ROM file (.gba or .zip)',privacy:'Your ROM stays on this device. Building does not upload ROM data.',build:'Build companion',cancel:'Cancel',ready:'2. Import into GBA Duo Plus',instructions:'Download the companion ZIP, import it in GBA Duo Plus, assign it to this ROM and reopen the game. The project JSON can be opened in GBA Duo Studio.',zip:'Download companion ZIP',project:'Download Studio project',private:'The generated files contain images and text from your ROM. Keep them private. Share this builder kit instead.',idle:'Choose a ROM to start.',reading:'Reading local ROM…',done:'Ready. Download the generated ZIP below.',failed:'Could not build: ',cancelled:'Cancelled.'},vi:{title:'GBA Duo Companion Builder',intro:'Chọn ROM được hỗ trợ. Ảnh và văn bản game được đọc một lần trên máy này, rồi lưu cache trong ZIP companion để tránh giải mã lại khi chơi.',step:'1. Chọn ROM',choose:'Tệp ROM (.gba hoặc .zip)',privacy:'ROM ở lại trên máy của bạn. Tạo companion không tải dữ liệu ROM lên mạng.',build:'Tạo companion',cancel:'Hủy',ready:'2. Nhập vào GBA Duo Plus',instructions:'Tải ZIP companion, nhập vào GBA Duo Plus, gán cho ROM này rồi mở lại game. Tệp dự án JSON có thể mở bằng GBA Duo Studio.',zip:'Tải ZIP companion',project:'Tải dự án Studio',private:'Các tệp vừa tạo chứa ảnh và văn bản từ ROM. Giữ riêng để sử dụng cá nhân. Chỉ chia sẻ bộ công cụ tạo này.',idle:'Chọn ROM để bắt đầu.',reading:'Đang đọc ROM trên máy…',done:'Đã xong. Tải ZIP vừa tạo ở bên dưới.',failed:'Không tạo được: ',cancelled:'Đã hủy.'}};
strings.en.supportedGames='Supported games';strings.vi.supportedGames='Game được hỗ trợ';
if(globalThis.location?.search){const lang=new URLSearchParams(globalThis.location.search).get('lang');if(Object.hasOwn(strings,lang))$('language').value=lang;}
strings.en.pickRom='Choose file';strings.en.noFile='No file selected';strings.vi.pickRom='Chọn tệp';strings.vi.noFile='Chưa chọn tệp';
const t=()=>strings[$('language').value];
function fileName(){ $('fileName').textContent=$('rom').files[0]?.name||t().noFile; }
function language(){document.documentElement.lang=$('language').value;for(const[id,text]of Object.entries(t()))if($(id))$(id).textContent=text;$('supportedGames').href='supported-games.html?lang='+$('language').value;fileName();if(!busy)$('status').textContent=t().idle;}
$('language').addEventListener('change',language);
$('pickRom').addEventListener('click',()=>$('rom').click());
$('rom').addEventListener('change',()=>{fileName();$('build').disabled=!$('rom').files.length;$('result').hidden=true;});
$('cancel').addEventListener('click',()=>controller?.abort());
function download(id,blob,name){const url=URL.createObjectURL(blob);urls.push(url);$(id).href=url;$(id).download=name;}
$('build').addEventListener('click',async()=>{
 const file=$('rom').files[0];if(!file||busy)return;
 busy=true;controller=new AbortController();$('build').disabled=true;$('rom').disabled=true;$('pickRom').disabled=true;$('cancel').hidden=false;$('progress').hidden=false;$('result').hidden=true;
 urls.forEach(URL.revokeObjectURL);urls=[];
 try{
  $('status').textContent=t().reading;
  const rom=await CompanionBuild.readRom(file);
  const result=await CompanionBuild.build(rom,{signal:controller.signal,onProgress:message=>{if($('language').value==='vi')message=message.replace('Reading FE8 characters','Đang đọc nhân vật FE8').replace('Reading FE8 classes','Đang đọc class FE8').replace('Reading FE8 items','Đang đọc trang bị FE8').replace('Packing FE8 local companion','Đang đóng gói companion FE8').replace('Building FE8 images:','Đang tạo ảnh FE8:').replace('Reading character data','Đang đọc nhân vật').replace('Reading character records','Đang đọc nhân vật').replace('Reading class data','Đang đọc class').replace('Reading classes and map sprites','Đang đọc class và sprite').replace('Reading items and skills','Đang đọc trang bị và skill').replace('Building images:','Đang tạo ảnh:').replace('Building local images:','Đang tạo ảnh:').replace('Building Growth diagrams:','Đang tạo biểu đồ Growth:').replace('Packing local companion','Đang đóng gói companion');$('status').textContent=message;}});
  const p=result.project,profile=result.profile;
  download('zip',new Blob([result.zipBytes],{type:'application/zip'}),profile.output+'-Local.zip');
  download('project',new Blob([JSON.stringify(p)],{type:'application/json'}),profile.output+'-Local.gbastudio.json');
  $('result').hidden=false;$('status').textContent=t().done+'\n'+($('language').value==='vi'?profile.nameVi:profile.name)+'\n'+result.report.files+' files · CRC32 '+result.report.crc32;
 }catch(error){$('status').textContent=controller.signal.aborted?t().cancelled:t().failed+error.message;}
 finally{busy=false;$('build').disabled=false;$('rom').disabled=false;$('pickRom').disabled=false;$('cancel').hidden=true;$('progress').hidden=true;}
});
language();
