// Extend the common layout only with capabilities provided by a ROM profile.
globalThis.makeCompanionLayout = function (extension) {
  const layout = structuredClone(COMPANION_THEME.layout);
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

  // FE8 retains the common Growth/Analysis UI and adds its native ability panel.
  if (extension.nativePanel) {
    const identity = byClass('identity-line');
    const panel = structuredClone(extension.nativePanel);
    panel.children[panel.children.length - 1] = identity.children[2];
    identity.children[2] = panel;
    inventoryPages().pages.push(...structuredClone(extension.pages));
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
  layout.children.push(sharedGrowth, sharedAnalysis);
  return layout;
};
