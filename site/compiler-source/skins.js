import { clone, walk, DEVICE_DENSITY } from './tree.js';

export const hasSkin = (skin) => Boolean(skin && (skin.normal || skin.pressed || skin.selected));
export function compileSkins(project) {
  const layout = clone(project.layout), files = { ...project.files };
  const rules = [];
  let sequence = 0;
  function build(skin, selector, button = null) {
    if (!hasSkin(skin)) return;
    const token = `studio-image-${++sequence}`;
    if (button) {
      button.class = [button.class, token].filter(Boolean).join(' ');
      selector = '.' + token;
      // Background shorthands in inline styles would hide the state-specific images.
      if (button.style && typeof button.style === 'object') {
        for (const key of ['background','background-image','background-size','background-position','background-repeat']) {
          if (button.style[key] != null) { rules.push(`${selector} { ${key}: ${button.style[key]}; }`); delete button.style[key]; }
        }
      }
      if (skin.showLabel === false || skin.showLabel == null) button.text = '';
    }
    const size = (n) => `${Number((n / DEVICE_DENSITY).toFixed(6))}px`;
    const props = ['background-repeat: no-repeat','background-position: center',`background-size: ${skin.fit === 'stretch' ? '100% 100%' : skin.fit === 'cover' ? 'cover' : 'contain'}`];
    if (skin.transparentBackground !== false) props.push('background-color: transparent');
    if (Number(skin.width) > 0) props.push(`width: ${size(Number(skin.width))}`, 'flex-shrink: 0');
    if (Number(skin.height) > 0) props.push(`height: ${size(Number(skin.height))}`);
    if (!button && (skin.showLabel === false || skin.showLabel == null)) props.push('color: transparent');
    rules.push(`${selector} { ${props.join('; ')}; }`);
    if (button) rules.push(`${selector}:pressed { opacity: 1; }`);
    for (const state of ['normal','selected','pressed']) {
      const source = skin[state]; if (!source) continue;
      if (!Object.hasOwn(files, source)) throw new Error(`Thiếu ảnh cho trạng thái ${state}: ${source}`);
      const ext = source.split('.').pop().toLowerCase();
      if (!['png','jpg','jpeg','webp','gif','svg'].includes(ext)) throw new Error('Nút hình ảnh cần asset PNG, JPG, WebP, GIF hoặc SVG.');
      const alias = `assets/__studio_skins/${token}-${state}.${ext}`;
      files[alias] = files[source];
      const pseudo = state === 'normal' ? '' : state === 'selected' ? ':active' : ':pressed';
      rules.push(`${selector}${pseudo} { background-image: url("${alias}"); }`);
    }
    // Selected stays after release; pressed temporarily takes precedence over it.
    if (!button && (skin.showLabel === false || skin.showLabel == null)) rules.push(`${selector}:active, ${selector}:pressed { color: transparent; }`);
  }
  for (const { node } of walk(layout)) {
    if (node.type === 'button') { build(node.buttonSkin, '', node); delete node.buttonSkin; }
    if (node.type === 'tabs' && node.tabs.some((t) => hasSkin(t.skin))) {
      const className = `studio-tabgroup-${++sequence}`;
      node.class = [node.class, className].filter(Boolean).join(' ');
      node.tabs.forEach((tab, i) => { build(tab.skin, `.${className} > tab-bar > tab:nth-child(${i+1})`); delete tab.skin; });
    }
  }
  return { layout, files, css: project.css + (rules.length ? '\n/* Studio: image button states */\n' + rules.join('\n') + '\n' : ''), hasSkins: rules.length > 0 };
}
