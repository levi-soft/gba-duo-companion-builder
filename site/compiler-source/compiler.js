import { compileSkins } from './skins.js';
import { compileFonts } from './fonts.js';
import { compileStyles } from './style-model.js';

export function compileDesign(project) {
  const compiled = compileFonts(compileStyles(compileSkins(project)));
  return { ...compiled, hasEditorMetadata: compiled.hasSkins || compiled.hasFonts || compiled.hasStyles };
}
