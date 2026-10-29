'use strict';
const $=id=>document.getElementById(id);let controller,urls=[],busy=false,revision=0,checked=null,checkState='waiting',checkError=null,checkIdentity=null;
let templateForm=null;
const strings={en:{title:'GBA Duo Companion Builder',intro:'Select your own supported ROM. Images and game text are extracted on this device once, then cached in a companion ZIP for smooth gameplay.',step:'1. Choose your ROM',choose:'ROM file (.gba or .zip)',privacy:'Your ROM stays on this device. Building does not upload ROM data.',build:'Build companion',cancel:'Cancel',ready:'2. Import into GBA Duo Plus',instructions:'Download the companion ZIP, import it in GBA Duo Plus, assign it to this ROM and reopen the game. The project JSON can be opened in GBA Duo Studio.',zip:'Download companion ZIP',project:'Download Studio project',private:'The generated files contain images and text from your ROM. Keep them private. Share this builder kit instead.',idle:'Choose a ROM to start.',reading:'Reading local ROM…',done:'Ready. Download the generated ZIP below.',failed:'Could not build: ',cancelled:'Cancelled.'},vi:{title:'GBA Duo Companion Builder',intro:'Chọn ROM được hỗ trợ. Ảnh và văn bản game được đọc một lần trên máy này, rồi lưu cache trong ZIP companion để tránh giải mã lại khi chơi.',step:'1. Chọn ROM',choose:'Tệp ROM (.gba hoặc .zip)',privacy:'ROM ở lại trên máy của bạn. Tạo companion không tải dữ liệu ROM lên mạng.',build:'Tạo companion',cancel:'Hủy',ready:'2. Nhập vào GBA Duo Plus',instructions:'Tải ZIP companion, nhập vào GBA Duo Plus, gán cho ROM này rồi mở lại game. Tệp dự án JSON có thể mở bằng GBA Duo Studio.',zip:'Tải ZIP companion',project:'Tải dự án Studio',private:'Các tệp vừa tạo chứa ảnh và văn bản từ ROM. Giữ riêng để sử dụng cá nhân. Chỉ chia sẻ bộ công cụ tạo này.',idle:'Chọn ROM để bắt đầu.',reading:'Đang đọc ROM trên máy…',done:'Đã xong. Tải ZIP vừa tạo ở bên dưới.',failed:'Không tạo được: ',cancelled:'Đã hủy.'}};
strings.en.supportedGames='Supported games';strings.vi.supportedGames='Game được hỗ trợ';
if(globalThis.location?.search){const lang=new URLSearchParams(globalThis.location.search).get('lang');if(Object.hasOwn(strings,lang))$('language').value=lang;}
strings.en.pickRom='Choose file';strings.en.noFile='No file selected';strings.vi.pickRom='Chọn tệp';strings.vi.noFile='Chưa chọn tệp';
const t=()=>strings[$('language').value];
Object.assign(strings.en,{customTitle:'For custom companions',customLabel:'Use my Studio project',customHelp:'For other games or your edited companion. Choose a prepared Studio JSON and its exact ROM. This packages your existing reader; it does not discover game data or verify predictions.',pickSource:'Choose Studio project',sourceName:'No project selected'});
Object.assign(strings.vi,{customTitle:'Dành cho companion tùy chỉnh',customLabel:'Dùng dự án Studio của tôi',customHelp:'Dành cho game khác hoặc companion đã chỉnh sửa. Chọn JSON Studio đã chuẩn bị và đúng ROM của dự án. Builder đóng gói bộ đọc có sẵn; không tự tìm dữ liệu game hay kiểm chứng dự đoán.',pickSource:'Chọn dự án Studio',sourceName:'Chưa chọn dự án'});
Object.assign(strings.en,{projectCheckTitle:'Project input check',projectCheckNote:'Checks the selected files and exact ROM identity. It does not run Lua or verify the layout, game data or predictions on a device.',checking:'Checking the selected files…',checkReady:'Input checks passed. Ready to package.',checkFailed:'Inputs need attention: ',needBoth:'Choose both the ROM and a Studio project to check them.',sampleWarning:'Sample data only: this project has no Lua reader or native RAM fields. The ZIP will not acquire live game data automatically.',packNameLabel:'Companion',canvasLabel:'Design canvas',readerLabel:'Game data',fieldCountLabel:'Data fields',assetCountLabel:'Assets',fileCountLabel:'Files',luaCountLabel:'Lua files',luaReader:'Existing Lua reader',nativeReader:'Native RAM fields',sampleReader:'Sample data only',customIntro:'Choose your Studio project and its exact ROM to package the prepared interface and existing reader.',customStep:'1. Choose a ROM and Studio project'});
Object.assign(strings.vi,{projectCheckTitle:'Kiểm tra đầu vào dự án',projectCheckNote:'Kiểm tra các tệp đã chọn và danh tính ROM. Không chạy Lua hay xác nhận bố cục, dữ liệu game hoặc dự đoán trên thiết bị.',checking:'Đang kiểm tra các tệp đã chọn…',checkReady:'Đầu vào hợp lệ. Có thể đóng gói.',checkFailed:'Đầu vào cần sửa: ',needBoth:'Chọn cả ROM và dự án Studio để kiểm tra.',sampleWarning:'Chỉ có dữ liệu mẫu: dự án chưa có bộ đọc Lua hoặc trường RAM. ZIP không tự có dữ liệu game trực tiếp khi chạy.',packNameLabel:'Companion',canvasLabel:'Màn hình thiết kế',readerLabel:'Dữ liệu game',fieldCountLabel:'Trường dữ liệu',assetCountLabel:'Tài nguyên',fileCountLabel:'Tệp',luaCountLabel:'Tệp Lua',luaReader:'Bộ đọc Lua có sẵn',nativeReader:'Trường RAM native',sampleReader:'Chỉ có dữ liệu mẫu',customIntro:'Chọn dự án Studio và đúng ROM để đóng gói giao diện cùng bộ đọc đã chuẩn bị.',customStep:'1. Chọn ROM và dự án Studio'});
Object.assign(strings.en,{keepLayoutNote:'The Studio interface will be retained.',templateReady:'Template configured from this project’s data fields. Ready to package.',readyCustom:'3. Import into GBA Duo Plus'});
Object.assign(strings.vi,{keepLayoutNote:'Giao diện Studio sẽ được giữ nguyên.',templateReady:'Đã cấu hình mẫu bằng trường dữ liệu của dự án. Có thể đóng gói.',readyCustom:'3. Nhập vào GBA Duo Plus'});
Object.assign(strings.en,{projectDiagnosticsTitle:'References to review',diagnosticError:'Fix',diagnosticWarning:'Note',diagnosticInfo:'Runtime check',diagnosticSummary:'errors / notes / runtime checks',diagnosticNote:'Fix missing direct files in Studio. Sample/Lua notes do not prove a reader is broken; check them on the device.',diagnosticTruncated:'Only the first 100 entries are shown; blocking errors are listed first.'});
Object.assign(strings.vi,{projectDiagnosticsTitle:'Tham chiếu cần kiểm tra',diagnosticError:'Cần sửa',diagnosticWarning:'Lưu ý',diagnosticInfo:'Kiểm tra khi chạy',diagnosticSummary:'lỗi / lưu ý / kiểm tra khi chạy',diagnosticNote:'Sửa tệp tham chiếu trực tiếp bị thiếu trong Studio. Lưu ý về mẫu/Lua không khẳng định bộ đọc bị hỏng; cần đối chiếu trên thiết bị.',diagnosticTruncated:'Chỉ hiện 100 mục đầu, ưu tiên các lỗi chặn đóng gói.'});
const inputErrors={
 'Choose a Studio project JSON smaller than 64 MiB.':'Chọn tệp dự án Studio JSON không quá 64 MiB.',
 'Project exceeds 64 MiB.':'Tệp dự án vượt quá 64 MiB.',
 'Invalid Studio project JSON.':'Tệp JSON không hợp lệ. Trong Studio, dùng Lưu dự án để lấy tệp .gbastudio.json.',
 'This is a block configuration library. Import it in Studio, insert the blocks and save a Studio project first.':'Đây là thư viện cấu hình khối. Nhập vào Studio, chèn các khối rồi dùng Lưu dự án; Builder cần tệp dự án .gbastudio.json.',
 'Choose a Studio project JSON with manifest, layout, CSS and sample data.':'Cần tệp dự án .gbastudio.json đầy đủ. Mở companion trong Studio rồi dùng Lưu dự án.',
 'Project must declare this exact ROM game code and CRC32. Set them in Studio Project settings.':'ROM không khớp mã game/CRC32 đã khai báo. Trong Studio → Dự án, kiểm tra đúng phiên bản ROM rồi lưu lại.',
 'This project requires Studio runtime generation. Export its ZIP in Studio instead.':'Dự án cần sinh Lua trong Studio. Dùng Xuất pack ZIP ngay trong Studio cho dự án này.',
 'Project Lua entry point is missing or uses a managed metadata path.':'Thiếu tệp Lua chính hoặc đường dẫn không hợp lệ. Kiểm tra phần mã nguồn trong Studio rồi lưu lại dự án.',
 'Project needs a pack ID, name and version.':'Dự án cần ID gói, tên và phiên bản hợp lệ. Kiểm tra thiết lập Dự án trong Studio.',
 'Invalid project canvas size.':'Kích thước màn hình thiết kế cần từ 64 đến 8192 px mỗi chiều.',
 'Invalid project update rate.':'Tần suất cập nhật dự án cần từ 1 đến 30 lần/giây.',
 'Invalid GBA ROM size.':'ROM GBA cần có kích thước từ 192 byte đến 32 MiB.',
 'File exceeds 64 MiB.':'Tệp được chọn vượt quá 64 MiB.',
 'ROM exceeds 32 MiB.':'ROM vượt quá 32 MiB.',
 'ZIP must contain exactly one .gba ROM.':'ZIP cần chứa đúng một ROM .gba.',
 'Unsafe project file path.':'Dự án có đường dẫn tệp không hợp lệ. Kiểm tra tài nguyên trong Studio.',
 'Invalid or oversized base64 project file.':'Tài nguyên trong dự án bị lỗi hoặc quá lớn. Mở lại dự án gốc trong Studio.',
 'Project files exceed 64 MiB.':'Tổng tài nguyên dự án vượt quá 64 MiB.',
 'Project exceeds complexity limits.':'Dự án vượt quá giới hạn độ phức tạp.',
 'Project files must be a base64 map.':'Dữ liệu tài nguyên dự án không đúng định dạng Studio.',
 'Choose an existing layout, a character card, a stat table or both.':'Chọn giữ giao diện, thẻ nhân vật, bảng chỉ số hoặc cả hai.',
 'Template components are unavailable. Reload the Builder.':'Chưa tải được các khối mẫu. Tải lại trang Builder.',
 'Template labels must be at most 128 characters without binding symbols.':'Nhãn tối đa 128 ký tự, không chứa dấu {, } hoặc $.',
 'Choose an available data field.':'Chọn trường dữ liệu có sẵn cho phần còn trống hoặc chưa phù hợp.',
 'Choose an available numeric field.':'Chọn trường số có sẵn cho giá trị hiện tại và tối đa.',
 'Choose an available image-source text field.':'Nguồn ảnh cần một trường chữ có sẵn do bộ đọc cung cấp.',
 'Current and maximum fields must be different.':'Trường hiện tại và tối đa cần khác nhau.',
 'Choose 1 to 24 stat rows.':'Chọn từ 1 đến 24 dòng chỉ số.',
 'Project references need attention before packaging.':'Cần sửa các tham chiếu bắt buộc trước khi đóng gói. Xem danh sách bên dưới.'
};
function errorText(error){
 const message=error?.message||String(error),vi=$('language').value==='vi',translated=vi?(inputErrors[message]||message):message;
 const slots={title:['Heading','Tiêu đề'],'card.nameField':['Name field','Trường tên'],'card.levelField':['Level / rank field','Trường cấp độ / hạng'],'card.portraitField':['Image-source field','Trường nguồn ảnh'],'card.currentField':['Current field','Trường hiện tại'],'card.maximumField':['Maximum field','Trường tối đa'],'card.levelLabel':['Level / rank label','Nhãn cấp độ / hạng'],'card.barLabel':['Bar label','Nhãn của thanh']};
 const row=/^rows\.(\d+)\.(field|label)$/.exec(error?.field??''),slot=slots[error?.field]?.[vi?1:0]??(row?(vi?'Dòng chỉ số ':'Stat row ')+row[1]+(row[2]==='label'?(vi?' — Nhãn':' — Label'):''):'');
 return slot?slot+': '+translated:translated;
}
function fileName(){ $('fileName').textContent=$('rom').files[0]?.name||t().noFile;$('sourceName').textContent=$('source').files[0]?.name||t().sourceName; }
function canBuild(){return !busy&&!!$('rom').files.length&&(!$('custom').checked||checkState==='valid'&&checked?.revision===revision&&checked.file===$('rom').files[0]&&checked.source===$('source').files[0]);}
function clearResult(){$('result').hidden=true;for(const url of urls)URL.revokeObjectURL(url);urls=[];}
function renderCheck(){
 const custom=!!$('custom').checked;$('projectCheck').hidden=!custom;$('intro').textContent=custom?t().customIntro:t().intro;$('step').textContent=custom?t().customStep:t().step;
 if($('templateSection'))$('templateSection').hidden=!custom||!checked;
 $('ready').textContent=custom&&templateForm?t().readyCustom:t().ready;
 if($('templateStatus'))$('templateStatus').textContent=checked?(checkState==='invalid'?errorText(checkError):templateForm?.get().kind==='existing'?t().keepLayoutNote:t().templateReady):'';
 if(!custom)return;
 $('projectCheckStatus').textContent=checkState==='reading'?t().checking:checkState==='valid'?t().checkReady:checkState==='invalid'?t().checkFailed+errorText(checkError):t().needBoth;
 const r=checked?.report;$('projectCheckDetails').hidden=!r&&!checkIdentity;
 $('projectCheckDetails').textContent=r?[`${t().packNameLabel}: ${r.name} · ${r.version}`,`ROM: ${r.gameCode} · CRC32 ${r.crc32}`,`${t().canvasLabel}: ${r.width} × ${r.height}`,`${t().readerLabel}: ${r.reader==='lua'?t().luaReader:r.reader==='native'?t().nativeReader:t().sampleReader}`,`${t().fieldCountLabel}: ${r.dataFields} · ${t().assetCountLabel}: ${r.assets} · ${t().luaCountLabel}: ${r.luaFiles} · ${t().fileCountLabel}: ${r.files}`].join('\n'):checkIdentity?`ROM: ${checkIdentity.gameCode} · CRC32 ${checkIdentity.crc32}`:'';
 $('projectCheckWarning').hidden=!r||r.reader!=='sample';$('projectCheckWarning').textContent=t().sampleWarning;
 const diagnostics=r?.diagnostics??checkError?.diagnostics;
 if($('projectDiagnostics')){
  $('projectDiagnostics').hidden=!diagnostics||!diagnostics.issues.length;
  $('projectDiagnosticsSummary').textContent=diagnostics?`${diagnostics.errors} / ${diagnostics.warnings} / ${diagnostics.info} ${t().diagnosticSummary}`:'';
  $('projectDiagnosticsList').textContent=diagnostics?diagnostics.issues.map(issue=>`${issue.level==='error'?t().diagnosticError:issue.level==='warning'?t().diagnosticWarning:t().diagnosticInfo}: ${CompanionBuild.projectIssueText(issue,$('language').value)}\n  ${[issue.nodeId||issue.location,issue.property,issue.field,issue.detail].filter(Boolean).join(' · ')}`).join('\n\n')+(diagnostics.truncated?'\n\n'+t().diagnosticTruncated:''):'';
 }
}
function referenceCheckError(diagnostics){const error=Error('Project references need attention before packaging.');error.diagnostics=diagnostics;return error;}
async function readSource(file){
 if(!file||file.size>64*1024*1024)throw Error('Choose a Studio project JSON smaller than 64 MiB.');
 const text=await file.text();if(new Blob([text]).size>64*1024*1024)throw Error('Project exceeds 64 MiB.');
 try{return JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw Error('Invalid Studio project JSON.');}
}
async function selectionChanged(){
 const current=++revision;checked=null;checkError=null;checkIdentity=null;checkState='waiting';fileName();clearResult();$('build').disabled=!canBuild();renderCheck();
 templateForm?.setProject(null);
 if(!$('custom').checked){if(!busy)$('status').textContent=t().idle;return;}
 const file=$('rom').files[0],source=$('source').files[0];
 if(!file||!source){if(!busy)$('status').textContent=t().needBoth;return;}
 checkState='reading';renderCheck();if(!busy)$('status').textContent=t().checking;
 try{
  const [rom,project]=await Promise.all([CompanionBuild.readRom(file),readSource(source)]);
  if(current!==revision)return;
  const report=CompanionBuild.inspectProject(rom,project);checked={revision:current,file,source,rom,project,sourceProject:project,report};templateForm?.setProject(project);checkState=report.diagnostics?.errors?'invalid':'valid';if(report.diagnostics?.errors)checkError=referenceCheckError(report.diagnostics);
 }catch(error){if(current!==revision)return;checked=null;checkState='invalid';checkError=error;checkIdentity=error.romIdentity??null;}
 if(current!==revision)return;renderCheck();$('build').disabled=!canBuild();if(!busy)$('status').textContent=checkState==='valid'?t().checkReady:t().checkFailed+errorText(checkError);
}
function configurationChanged(config){
 if(busy||!checked)return;
 checked.revision=++revision;clearResult();checkError=null;
 try{
  const candidate=CompanionTemplates.prepare(checked.sourceProject,config),diagnostics=CompanionBuild.projectDiagnostics(candidate);
  checked.report={...checked.report,diagnostics};if(diagnostics.errors)throw referenceCheckError(diagnostics);
  checked.project=candidate;checkState='valid';
 }catch(error){checked.project=null;checked.report={...checked.report,diagnostics:error.diagnostics??null};checkState='invalid';checkError=error;}
 renderCheck();$('build').disabled=!canBuild();$('status').textContent=checkState==='valid'?t().checkReady:t().checkFailed+errorText(checkError);
}
function language(){document.documentElement.lang=$('language').value;for(const[id,text]of Object.entries(t()))if($(id))$(id).textContent=text;$('supportedGames').href='supported-games.html?lang='+$('language').value;templateForm?.language();fileName();renderCheck();if(!busy)$('status').textContent=$('custom').checked?$('projectCheckStatus').textContent:t().idle;}
if(globalThis.CompanionTemplateForm&&$('templateSection'))templateForm=CompanionTemplateForm.mount(document,configurationChanged,()=>$('language').value);
$('language').addEventListener('change',language);
$('pickRom').addEventListener('click',()=>$('rom').click());
$('rom').addEventListener('change',selectionChanged);
$('custom').addEventListener('change',()=>{$('sourcePicker').hidden=!$('custom').checked;return selectionChanged();});
$('source').addEventListener('change',selectionChanged);
$('pickSource').addEventListener('click',()=>$('source').click());
$('cancel').addEventListener('click',()=>controller?.abort());
function download(id,blob,name){const url=URL.createObjectURL(blob);urls.push(url);$(id).href=url;$(id).download=name;}
$('build').addEventListener('click',async()=>{
 const file=$('rom').files[0];if(!file||!canBuild())return;
 const custom=!!$('custom').checked,selection=checked,jobRevision=revision;
 busy=true;controller=new AbortController();$('build').disabled=true;$('rom').disabled=true;$('pickRom').disabled=true;$('cancel').hidden=false;$('progress').hidden=false;$('result').hidden=true;
 $('custom').disabled=true;$('source').disabled=true;$('pickSource').disabled=true;
 templateForm?.setBusy(true);
 for(const url of urls)URL.revokeObjectURL(url);urls=[];
 try{
  $('status').textContent=t().reading;
  const rom=custom?selection.rom:await CompanionBuild.readRom(file),prepared=custom?selection.project:null;
  const options={signal:controller.signal,onProgress:message=>{if($('language').value==='vi')message=message.replace('Reading FE8 characters','Đang đọc nhân vật FE8').replace('Reading FE8 classes','Đang đọc class FE8').replace('Reading FE8 items','Đang đọc trang bị FE8').replace('Packing FE8 local companion','Đang đóng gói companion FE8').replace('Building FE8 images:','Đang tạo ảnh FE8:').replace('Reading character data','Đang đọc nhân vật').replace('Reading character records','Đang đọc nhân vật').replace('Reading class data','Đang đọc class').replace('Reading classes and map sprites','Đang đọc class và sprite').replace('Reading items and skills','Đang đọc trang bị và skill').replace('Building images:','Đang tạo ảnh:').replace('Building local images:','Đang tạo ảnh:').replace('Building Growth diagrams:','Đang tạo biểu đồ Growth:').replace('Packing local companion','Đang đóng gói companion').replace('Packing Studio project','Đang đóng gói dự án Studio');$('status').textContent=message;}};
  const result=prepared?await CompanionBuild.buildProject(rom,prepared,options):await CompanionBuild.build(rom,options);
  if(jobRevision!==revision||controller.signal.aborted){const error=Error('Cancelled.');error.name='AbortError';throw error;}
  const p=result.project,profile=result.profile;
  download('zip',new Blob([result.zipBytes],{type:'application/zip'}),profile.output+'-Local.zip');
  download('project',new Blob([JSON.stringify(p)],{type:'application/json'}),profile.output+'-Local.gbastudio.json');
  $('result').hidden=false;$('status').textContent=t().done+'\n'+($('language').value==='vi'?profile.nameVi:profile.name)+'\n'+result.report.files+' files · CRC32 '+result.report.crc32;
 }catch(error){$('status').textContent=controller.signal.aborted||error.name==='AbortError'?t().cancelled:t().failed+errorText(error);}
 finally{busy=false;$('build').disabled=!canBuild();$('rom').disabled=false;$('pickRom').disabled=false;$('custom').disabled=false;$('source').disabled=false;$('pickSource').disabled=false;templateForm?.setBusy(false);$('cancel').hidden=true;$('progress').hidden=true;}
});
language();
