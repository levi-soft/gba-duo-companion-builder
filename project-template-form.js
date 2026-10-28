(function(root){
 'use strict';
 const text={en:{templateTitle:'2. Choose the interface',templateModeLabel:'Interface in the exported copy',templateExisting:'Keep my Studio interface',templateCard:'Character card',templateStats:'Stat table',templateOverview:'Card and stat table',templateHelp:'Use fields from this project’s existing reader. A new template replaces the interface only in the exported copy. Lua, assets, sample data and ROM matching are retained. Edit repeated lists or detailed styling in Studio.',templateHeadingLabel:'Heading (optional)',templateNameLabel:'Name field',templateLevelLabel:'Level / rank field (optional)',templatePortraitLabel:'Image-source field (optional)',templateLevelTextLabel:'Level / rank label (optional)',templateBarToggleLabel:'Include a current / maximum bar',templateCurrentLabel:'Current field',templateMaximumLabel:'Maximum field',templateBarTextLabel:'Bar label',templateRowsHelp:'Choose up to 24 values in display order. Labels can be written in your language.',templateAddRow:'Add a stat row',choose:'Choose a field…',none:'None',row:'Row',value:'Data field',label:'Display label',remove:'Remove row',ready:'Template configured. Ready to package.',sample:'Sample',declared:'No sample; reader declaration only'},vi:{templateTitle:'2. Chọn giao diện',templateModeLabel:'Giao diện trong bản xuất',templateExisting:'Giữ giao diện Studio của tôi',templateCard:'Thẻ nhân vật',templateStats:'Bảng chỉ số',templateOverview:'Thẻ và bảng chỉ số',templateHelp:'Dùng trường từ bộ đọc có sẵn trong dự án. Mẫu mới chỉ thay giao diện trong bản xuất. Giữ Lua, tài nguyên, dữ liệu mẫu và khai báo ROM. Chỉnh danh sách lặp hoặc style chi tiết trong Studio.',templateHeadingLabel:'Tiêu đề (tùy chọn)',templateNameLabel:'Trường tên',templateLevelLabel:'Trường cấp độ / hạng (tùy chọn)',templatePortraitLabel:'Trường nguồn ảnh (tùy chọn)',templateLevelTextLabel:'Nhãn cấp độ / hạng (tùy chọn)',templateBarToggleLabel:'Thêm thanh hiện tại / tối đa',templateCurrentLabel:'Trường hiện tại',templateMaximumLabel:'Trường tối đa',templateBarTextLabel:'Nhãn của thanh',templateRowsHelp:'Chọn tối đa 24 giá trị theo thứ tự hiển thị. Nhãn có thể viết bằng tiếng Việt.',templateAddRow:'Thêm dòng chỉ số',choose:'Chọn trường dữ liệu…',none:'Không dùng',row:'Dòng',value:'Trường dữ liệu',label:'Nhãn hiển thị',remove:'Xóa dòng',ready:'Mẫu đã được cấu hình. Có thể đóng gói.',sample:'Mẫu',declared:'Chưa có mẫu; chỉ có khai báo bộ đọc'}};
 function mount(document,onchange,language){
  const $=id=>document.getElementById(id),copy=()=>text[language()]??text.en;
  let source=null,fields=[],rows=[],sequence=0,config,busy=false;
  const get=()=>({...config,card:{...config.card},rows:rows.map(({field,label})=>({field,label}))});
  function reset(){sequence=0;config={kind:'existing',title:'',card:{nameField:'',levelField:'',portraitField:'',levelLabel:'',barEnabled:false,currentField:'',maximumField:'',barLabel:'HP'}};rows=[{id:sequence++,field:'',label:''}];}
  function notify(){onchange(get());}
  function options(id,values,chosen,optional=false){
   const select=$(id);select.replaceChildren();
   function option(value,label,disabled=false){const node=document.createElement('option');node.value=value;node.textContent=label;node.disabled=disabled;select.appendChild(node);}
   option('',optional?copy().none:copy().choose);
   for(const field of values)option(field.path,field.label+' ('+field.path+')');
   if(chosen&&!values.some(f=>f.path===chosen))option(chosen,chosen+' · '+copy().declared,true);
   select.value=chosen;
  }
  function statusSample(path){const field=fields.find(f=>f.path===path);return field?.value==null?copy().declared:copy().sample+': '+String(field.value).slice(0,80);}
  function renderRows(){
   $('templateRows').replaceChildren();
   rows.forEach((row,index)=>{
    const group=document.createElement('div');group.className='template-stat-row';
    const heading=document.createElement('strong');heading.textContent=copy().row+' '+(index+1);group.appendChild(heading);
    const label=document.createElement('label');label.textContent=copy().value+' · '+copy().row+' '+(index+1);const select=document.createElement('select');select.id='template-row-field-'+row.id;label.appendChild(select);group.appendChild(label);
    const labelInput=document.createElement('label');labelInput.textContent=copy().label+' · '+copy().row+' '+(index+1);const input=document.createElement('input');input.maxLength=128;input.value=row.label;input.id='template-row-label-'+row.id;labelInput.appendChild(input);group.appendChild(labelInput);
    const sample=document.createElement('small');sample.textContent=row.field?statusSample(row.field):'';group.appendChild(sample);
    const remove=document.createElement('button');remove.type='button';remove.textContent=copy().remove+' '+(index+1);remove.disabled=busy||rows.length===1;group.appendChild(remove);
    $('templateRows').appendChild(group);options(select.id,fields,row.field);
    select.addEventListener('change',()=>{row.field=select.value;if(!row.label){row.label=fields.find(f=>f.path===row.field)?.label??'';input.value=row.label;}sample.textContent=statusSample(row.field);notify();});
    input.addEventListener('input',()=>{row.label=input.value;notify();});
    remove.addEventListener('click',()=>{if(rows.length===1||busy)return;rows=rows.filter(r=>r!==row);renderRows();notify();});
   });
   $('templateAddRow').disabled=busy||rows.length>=24;
  }
  function render(){
   for(const [id,value]of Object.entries(copy()))if(id.startsWith('template')&&$(id))$(id).textContent=value;
   fields=source?root.CompanionTemplates.catalog(source,language()):[];
   $('templateSection').disabled=busy||!source;
   $('templateMode').value=config.kind;$('templateSettings').hidden=config.kind==='existing';
   $('templateCardFields').hidden=!['card','overview'].includes(config.kind);$('templateStatsFields').hidden=!['stats','overview'].includes(config.kind);$('templateBarFields').hidden=!config.card.barEnabled;
   $('templateHeading').value=config.title;$('templateLevelText').value=config.card.levelLabel;$('templateBarText').value=config.card.barLabel;$('templateBarToggle').checked=config.card.barEnabled;
   options('templateName',fields,config.card.nameField);options('templateLevel',fields,config.card.levelField,true);options('templatePortrait',fields.filter(f=>f.kind==='string'),config.card.portraitField,true);
   options('templateCurrent',fields.filter(f=>f.kind==='number'),config.card.currentField);options('templateMaximum',fields.filter(f=>f.kind==='number'&&f.path!==config.card.currentField),config.card.maximumField);
   renderRows();
  }
  $('templateMode').addEventListener('change',()=>{config.kind=$('templateMode').value;render();notify();});
  for(const [id,key]of [['templateName','nameField'],['templateLevel','levelField'],['templatePortrait','portraitField'],['templateCurrent','currentField'],['templateMaximum','maximumField']])$(id).addEventListener('change',()=>{config.card[key]=$(id).value;if(key==='currentField')options('templateMaximum',fields.filter(f=>f.kind==='number'&&f.path!==config.card.currentField),config.card.maximumField);notify();});
  for(const [id,key]of [['templateLevelText','levelLabel'],['templateBarText','barLabel']])$(id).addEventListener('input',()=>{config.card[key]=$(id).value;notify();});
  $('templateHeading').addEventListener('input',()=>{config.title=$('templateHeading').value;notify();});
  $('templateBarToggle').addEventListener('change',()=>{config.card.barEnabled=$('templateBarToggle').checked;$('templateBarFields').hidden=!config.card.barEnabled;notify();});
  $('templateAddRow').addEventListener('click',()=>{if(rows.length>=24||busy)return;rows.push({id:sequence++,field:'',label:''});renderRows();notify();});
  reset();render();
  return {get,setProject(project){source=project;reset();render();},setBusy(value){busy=value;$('templateSection').disabled=busy||!source;renderRows();},language:render};
 }
 root.CompanionTemplateForm={mount};
})(globalThis);
