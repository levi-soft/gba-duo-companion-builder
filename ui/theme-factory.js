// Extend the common layout only with capabilities provided by a ROM profile.

globalThis.extendCompanionAnalysisStats = function(template, stats) {
  const find = (node, predicate) => {
    if(!node||typeof node!=='object')return null;
    if(predicate(node))return node;
    for(const value of Object.values(node))if(value&&typeof value==='object')
      for(const child of Array.isArray(value)?value:[value]){const found=find(child,predicate);if(found)return found;}
    return null;
  };
  const results=find(template.layout,node=>node.class==='prediction-results');
  if(!results)throw Error('Missing shared Analysis results');
  const base=results.children.find(node=>node.children?.some(child=>child.text==='{rngPowerResult}'));
  for(const stat of stats){
    if(!['Con','Mov'].includes(stat.key)||typeof stat.label!=='string'||!stat.label.trim())throw Error('Invalid extra Analysis stat');
    if(find(results,node=>node.text===`{rng${stat.key}Result}`))throw Error('Extra Analysis stat already exists: '+stat.key);
    const row=structuredClone(base);
    function replace(node){
      if(typeof node==='string')return node.replaceAll('growthPower','growth'+stat.key).replaceAll('rngPower','rng'+stat.key);
      if(Array.isArray(node))return node.map(replace);
      if(node&&typeof node==='object')return Object.fromEntries(Object.entries(node).map(([key,value])=>[key,key==='id'?value+'-extra-'+stat.key:replace(value)]));
      return node;
    }
    const extra=replace(row);extra.children[0].text=stat.label;extra.visibleIf='$analysis'+stat.key+'Present';
    results.children.push(extra);
  }
  return template;
};

globalThis.withCompanionTalk = function (extension, talkSource) {
  const result=structuredClone(extension);
  result.sprite=structuredClone(talkSource.sprite);
  const talk=structuredClone(talkSource.pages.find(page=>page.name==='talk'));
  talk.child.class='native-ability-detail';
  talk.child.children[0].class='native-ability-title';
  talk.child.children[1].class='native-ability-description';
  result.pages.push(talk);
  result.css+='\n'+talkSource.css.split('\n')
    .filter(rule=>/remaster-sprite-frame|remaster-unit-sprite|remaster-talk-badge/.test(rule)).join('\n');
  return result;
};
globalThis.localizeCompanionUi = function (value, language = 'vi') {
  const dictionary = language === 'vi' ? {} : COMPANION_THEME.locales?.[language];
  if (!dictionary) throw Error('Unsupported companion UI language: ' + language);
  const strings = {...dictionary.layout, ...dictionary.runtime};
  function translate(node) {
    if (typeof node === 'string') return strings[node] ?? node;
    if (Array.isArray(node)) return node.map(translate);
    if (node && typeof node === 'object') return Object.fromEntries(
      Object.entries(node).map(([key, child]) => [key, translate(child)]));
    return node;
  }
  return translate(value);
};

globalThis.makeCompanionLayout = function (extension, language = 'vi') {
  const layout = localizeCompanionUi(COMPANION_THEME.layout, language);
  if (!extension) return layout;

  function find(node, predicate) {
    if (!node || typeof node !== 'object') return null;
    if (predicate(node)) return node;
    for (const value of Object.values(node)) {
      if (!value || typeof value !== 'object') continue;
      for (const child of Array.isArray(value) ? value : [value]) {
        const found = find(child, predicate);
        if (found) return found;
      }
    }
    return null;
  }

  const inventoryPages = () => find(layout, node => node.type === 'pages' && node.state === 'inventoryDetail');
  const byClass = className => find(layout, node => node.class === className);

  // Sprite/detail extensions retain the common Growth/Analysis UI.
  // FE8 may additionally supply its native ability panel.
  if (!extension.skills) {
    const identity = byClass('identity-line');
    if (extension.sprite) identity.children[0] = structuredClone(extension.sprite);
    if (extension.nativePanel) {
      const panel = structuredClone(extension.nativePanel);
      panel.children[panel.children.length - 1] = identity.children[2];
      identity.children[2] = panel;
    }
    inventoryPages().pages.push(...structuredClone(extension.pages || []));
    return layout;
  }

  // FE6 Remastered reuses the same modal trees, extended with separate Mag.
  const sharedGrowth = structuredClone(find(layout, node => node.visibleIf === '$ui.growthPopup'));
  const sharedAnalysis = structuredClone(find(layout, node => node.visibleIf === '$ui.predictionPopup'));

  function renameTree(node, suffix, replacements) {
    node.id += suffix;
    if (node.text) {
      for (const [before, after] of replacements) node.text = node.text.replaceAll(before, after);
    }
    if (node.classIf) {
      for (const key of Object.keys(node.classIf)) {
        for (const [before, after] of replacements) {
          node.classIf[key] = node.classIf[key].replaceAll(before, after);
        }
      }
    }
    for (const child of node.children || []) renameTree(child, suffix, replacements);
  }

  if (extension.separateMag) {
    const table = find(sharedGrowth, node => node.class === 'growth-table');
    const power = table.children.find(node => node.class === 'growth-table-row'
      && node.children?.some(child => child.text === '{growthPowerCurrent}'));
    const mag = structuredClone(power);
    renameTree(mag, '-separate-mag', [['growthPower', 'growthMag']]);
    mag.children[0].text = 'Mag';
    table.children.splice(table.children.indexOf(power) + 1, 0, mag);

    const results = find(sharedAnalysis, node => node.class === 'prediction-results');
    const powerResult = results.children.find(node => node.children?.some(child => child.text === '{rngPowerResult}'));
    const magResult = structuredClone(powerResult);
    renameTree(magResult, '-fe6-mag', [['growthPower', 'growthMag'], ['rngPower', 'rngMag']]);
    magResult.children[0].text = 'Mag';
    results.children.splice(results.children.indexOf(powerResult) + 1, 0, magResult);
  }

  function removeSharedModals(node) {
    if (!node || typeof node !== 'object') return;
    if (node.children) node.children = node.children.filter(child => child.class !== 'growth-modal');
    for (const value of Object.values(node)) {
      if (value && typeof value === 'object') {
        (Array.isArray(value) ? value : [value]).forEach(removeSharedModals);
      }
    }
  }
  removeSharedModals(layout);

  const identity = byClass('identity-line');
  identity.children[0] = structuredClone(extension.sprite);
  identity.children[2] = structuredClone(extension.skills);
  byClass('portrait-frame').children.push(structuredClone(extension.leadership));
  byClass('portrait-frame').onClick = { set: { growthPopup: true } };
  const stats = byClass('personal-stats');
  stats.children[0].children.find(node => node.class === 'value-label').text = 'Str';
  stats.children.splice(1, 0, structuredClone(extension.magRow));
  inventoryPages().pages.push(...structuredClone(extension.pages));
  // Keep recovery controls above the rebuilt modal scrims. They must remain
  // reachable even when an official host replaces a failed script snapshot.
  const workControls = layout.children.filter(node =>
    node.id === 'companion-work-resume' || node.id === 'companion-error-resume');
  layout.children = layout.children.filter(node => !workControls.includes(node));
  layout.children.push(sharedGrowth, sharedAnalysis, ...workControls);
  return layout;
};

// Opt in per template: reserve one horizontal header for identity, skills and RNG.
globalThis.fitCompanionHeader = function (template, {leadership = false} = {}) {
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (!leadership && node.children)
      node.children = node.children.filter(child => child.id !== 'remaster-leadership-stars');
    if (node.class === 'identity-line') {
      const abilities = node.children[2];
      if (abilities.class !== 'remaster-skills') {
        node.class += ' companion-identity-compact';
        return;
      }
      node.class += ' companion-identity-single';
      return;
    }
    for (const value of Object.values(node)) if (value && typeof value === 'object')
      (Array.isArray(value) ? value : [value]).forEach(visit);
  }
  visit(template.layout);
  template.css += '\n.companion-identity-compact .unit-name{font-size:4.4vmin;line-height:5vmin;}\n'
    + '.companion-identity-compact .class-name{font-size:3.1vmin;line-height:3.8vmin;}\n'
    + '.companion-identity-compact .native-ability-panel{width:30%;flex:0 0 30%;}\n'
    + '.companion-identity-single{flex-wrap:nowrap;gap:0.7vmin;}\n'
    + '.companion-identity-single .unit-identity{flex:1 1 0%;min-width:0;padding:0;}\n'
    + '.companion-identity-single .unit-name{font-size:3.5vmin;line-height:4.2vmin;white-space:nowrap;text-overflow:ellipsis;}\n'
    + '.companion-identity-single .class-name{font-size:3.2vmin;line-height:3.8vmin;white-space:nowrap;text-overflow:ellipsis;}\n'
    + '.companion-identity-single .remaster-skills{width:35vmin;flex:0 0 35vmin;}\n';
  return template;
};
