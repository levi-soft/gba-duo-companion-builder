// The authoring schema is also used by the template coverage audit.
const length = (key,label,extra={}) => ({key,label,kind:'length',...extra});
const select = (key,label,options) => ({key,label,kind:'select',options});
const text = (key,label,kind='text') => ({key,label,kind});
export const styleGroups = [
  {name:'Kích thước & vị trí', fields:[
    ...['width','height','min-width','min-height','max-width','max-height'].map((k,i)=>length(k,['Chiều rộng','Chiều cao','Rộng tối thiểu','Cao tối thiểu','Rộng tối đa','Cao tối đa'][i],{percent:true,auto:true})),
    select('position','Định vị',['static','relative','absolute']),
    ...['left','top','right','bottom'].map((k,i)=>length(k,['Trái (X)','Trên (Y)','Phải','Dưới'][i],{percent:true,auto:true,negative:true})),
    select('scroll-follow','Auto scroll',['none','end']),
    select('overflow','Nội dung tràn',['visible','auto','scroll','hidden']),
  ]},
  {name:'Sắp xếp & khoảng cách',fields:[
    select('display','Kiểu bố cục',['flex','grid','stack','none']),select('flex-direction','Hướng',['row','column','row-reverse','column-reverse']),
    select('flex-wrap','Xuống dòng',['nowrap','wrap','wrap-reverse']),
    select('align-items','Căn theo trục phụ',['stretch','start','center','end','flex-start','flex-end','baseline']),
    select('justify-content','Căn theo trục chính',['start','center','end','flex-start','flex-end','space-between','space-around','space-evenly']),
    text('place-items','Căn trong ô','pair'),text('flex','Co giãn','flex'),text('grid-template-columns','Các cột lưới','columns'),
    length('gap','Khoảng cách'),text('padding','Lề trong','sides'),text('margin','Lề ngoài','sides'),
  ]},
  {name:'Viền & bo góc',fields:[text('border-radius','Bo bốn góc','corners'),text('border','Đường viền','border'),
    text('border-top','Viền trên','border'),text('border-right','Viền phải','border'),text('border-bottom','Viền dưới','border'),text('border-left','Viền trái','border'),
    text('border-color','Màu viền','color')]},
  {name:'Nền & hình ảnh',fields:[text('background','Nền','background'),text('background-color','Màu nền','color'),text('background-image','Ảnh / chuyển màu','image'),
    text('background-size','Kích thước nền','background-size'),text('background-position','Vị trí nền'),
    select('background-repeat','Lặp nền',['no-repeat','repeat','repeat-x','repeat-y']),
    select('image-rendering','Nội suy ảnh',['auto','pixelated','crisp-edges']),select('object-fit','Khớp ảnh',['contain','cover','fill','none','scale-down']),text('accent-color','Màu thanh chỉ số','color')]},
  {name:'Chữ',fields:[text('font-family','Font chữ','font'),length('font-size','Cỡ chữ'),select('font-weight','Độ đậm',['normal','bold','100','200','300','400','500','600','700','800','900']),
    text('color','Màu chữ','color'),length('line-height','Chiều cao dòng',{auto:true}),length('letter-spacing','Giãn chữ',{negative:true}),
    select('text-align','Căn chữ',['left','center','right','start','end']),select('text-transform','Chuyển kiểu chữ',['none','uppercase','lowercase','capitalize']),text('text-shadow','Bóng chữ','text-shadow')]},
  {name:'Hiệu ứng & chuyển động',fields:[text('box-shadow','Bóng khung','shadow'),text('opacity','Độ hiện','opacity'),text('transform','Biến đổi','transform'),text('transition','Chuyển tiếp','transition')]},
];
export const styleFields = styleGroups.flatMap(g=>g.fields);
export const styleProperties = [...new Set([...styleFields.map(f=>f.key),
  'border-width','border-style',...['top','right','bottom','left'].flatMap(s=>['width','style','color'].map(p=>`border-${s}-${p}`)),
  ...['padding','margin'].flatMap(k=>['top','right','bottom','left'].map(s=>`${k}-${s}`)),
  ...['top-left','top-right','bottom-right','bottom-left'].map(s=>`border-${s}-radius`)])];
export function styleTargets(node) {
  const targets=[{key:'self',label:'Thành phần đang chọn',selector:''}];
  if(node.type==='tabs') targets.push({key:'tab-bar',label:'Thanh chứa tab',selector:' > tab-bar'},...node.tabs.map((t,i)=>({key:`tab:${t.child.id}`,label:`Nút tab ${i+1} · ${t.title}`,selector:` > tab-bar > tab:nth-child(${i+1})`})),{key:'tab-content',label:'Khung chứa nội dung tab',selector:' > tab-content'});
  if(node.type==='bar') targets.push({key:'fill',label:'Phần tô thanh chỉ số',selector:' > fill'},{key:'label',label:'Chữ trên thanh chỉ số',selector:' > label'});
  if(node.type==='button') targets.push({key:'label',label:'Chữ trên nút',selector:' > .label'});
  if(node.type==='list') targets.push({key:'empty',label:'Thông báo danh sách trống',selector:' > empty'});
  return targets;
}
