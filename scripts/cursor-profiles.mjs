// Authoring inheritance is resolved at build time. Packs contain only flat data.
export function resolveCursorProfiles(source) {
  function preset(name, chain = []) {
    if (chain.includes(name)) throw Error('Cyclic cursor preset: ' + [...chain, name].join(' -> '));
    const value = source.presets[name];
    if (!value) throw Error('Unknown cursor preset: ' + name);
    const {extends: parent, ...fields} = value;
    return {...(parent ? preset(parent, [...chain, name]) : {}), ...fields};
  }
  return Object.fromEntries(Object.entries(source.profiles).map(([id, name]) => [id, preset(name)]));
}
