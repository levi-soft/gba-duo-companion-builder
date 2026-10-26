import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { fingerprintWebAssets } from './fingerprint-web-assets.mjs';

// Public website content is independent of the verified offline Builder bundle.
// Run build:site for website-only updates; build also calls this for future releases.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'site');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).version;
const base = 'https://levi-soft.github.io/gba-duo-companion-builder/';
const context = {};
vm.runInNewContext(fs.readFileSync(path.join(site, 'profiles.js'), 'utf8'), context);
const profiles = context.COMPANION_PROFILES;
const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const definition = {
  'index.html': {
    title: 'GBA Duo Companion Builder - Local Fire Emblem Packs',
    description: 'Create Fire Emblem companion packs locally with GBA Duo Companion Builder. Use supported ROMs with GBA Duo Plus or Plus SS. No ROM uploads required.',
    url: base,
    schema: { '@context':'https://schema.org', '@type':'WebApplication', name:'GBA Duo Companion Builder', url:base,
      description:'Build companion packs from supported Fire Emblem ROMs locally in the browser, for GBA Duo Plus and Plus SS.',
      applicationCategory:'UtilitiesApplication', operatingSystem:'Web browser', softwareVersion:version,
      isAccessibleForFree:true, author:{'@type':'Person',name:'levi-soft',url:'https://github.com/levi-soft'},
      license:'https://github.com/levi-soft/gba-duo-companion-builder/blob/main/LICENSE' }
  },
  'supported-games.html': {
    title: 'Supported Fire Emblem Games - GBA Duo Companion Builder',
    description: `Check ${profiles.length} supported Fire Emblem ROM profiles for GBA Duo Companion Builder, with exact game codes, CRC32 checksums and companion versions.`,
    url: base + 'supported-games.html',
    schema:{'@context':'https://schema.org','@type':'ItemList',name:'GBA Duo Companion Builder supported games',
      numberOfItems:profiles.length,itemListElement:profiles.map((profile,index)=>({'@type':'ListItem',position:index+1,name:profile.name}))}
  }
};
for (const [name, meta] of Object.entries(definition)) {
  const file = path.join(site, name);
  let html = fs.readFileSync(file, 'utf8').replace(/<!-- discovery:start -->[\s\S]*?<!-- discovery:end -->/g, '');
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escape(meta.title)}</title>`);
  const tags = `<!-- discovery:start --><meta name="description" content="${escape(meta.description)}"><meta name="robots" content="index,follow"><link rel="canonical" href="${meta.url}"><meta property="og:type" content="website"><meta property="og:site_name" content="GBA Duo Companion Builder"><meta property="og:title" content="${escape(meta.title)}"><meta property="og:description" content="${escape(meta.description)}"><meta property="og:url" content="${meta.url}"><meta name="twitter:card" content="summary"><meta name="theme-color" content="#101a28"><link rel="icon" href="favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="discovery.css"><script type="application/ld+json">${JSON.stringify(meta.schema).replace(/</g,'\\u003c')}</script><!-- discovery:end -->`;
  html = html.replace('</title>', '</title>' + tags);
  if (name === 'index.html') {
    html = html.replace(/(<h1 id="title">)[^<]*(<\/h1>)/, '$1GBA Duo Companion Builder$2');
    html = html.replace(/<nav aria-label="Companion Builder">[\s\S]*?<\/nav>/,
      '<nav class="project-nav" aria-label="Companion Builder"><a id="supportedGames" class="support-link" href="supported-games.html">Supported games</a><a href="https://levi-soft.github.io/gba-duo-plus/">GBA Duo Plus</a><a href="https://levi-soft.github.io/gba-duo-plus/single-screen/">GBA Duo Plus SS</a></nav>');
    html = html.replace(/<!-- builder-help:start -->[\s\S]*?<!-- builder-help:end -->/g, '');
    const help = `<!-- builder-help:start --><section class="about-builder" lang="en"><h2>Fire Emblem companion packs, built on your device</h2><p>GBA Duo Companion Builder turns an exact supported ROM into a companion ZIP for GBA Duo Plus and GBA Duo Plus SS. Depending on the profile, companions include Units, Map, Talk, Growth and conditional Battle Analysis.</p><p>There are <a href="supported-games.html">${profiles.length} supported profiles</a>, including FE6, FE7, FE8, Project Ember, Sacred Echoes, Vision Quest and The Last Promise. Other ROM revisions need their own profiles.</p><h3>How do I use a companion?</h3><p>Choose your ROM, build locally, then import the downloaded ZIP through your game's Companion pack menu. Generated game images and text stay private. You can also create supported packs directly inside Plus or Plus SS.</p><h3>Which emulator should I download?</h3><p><a href="https://levi-soft.github.io/gba-duo-plus/">GBA Duo Plus</a> uses a second Android display. <a href="https://levi-soft.github.io/gba-duo-plus/single-screen/">GBA Duo Plus SS</a> puts the game and companion on one screen for phones, tablets and foldables.</p></section><noscript><p class="notice">Building a pack needs JavaScript. You can still read the <a href="supported-games.html">supported ROM list</a> and <a href="https://levi-soft.github.io/gba-duo-plus/">download the emulator</a> without it.</p></noscript><!-- builder-help:end -->`;
    html = html.replace('<footer>', help + '<footer>');
  } else {
    const cards = profiles.map(profile => `<li class="game-card"><h2>${escape(profile.name)}</h2><p class="game-version">Companion ${escape(profile.output.match(/-(\d+\.\d+\.\d+)$/)[1])}</p><details><summary>ROM details</summary><dl><dt>Game code</dt><dd>${escape(profile.code)}</dd><dt>CRC32</dt><dd>${escape(profile.crc32)}</dd></dl></details></li>`).join('\n');
    html = html.replace(/(<ul id="gameList"[^>]*>)[\s\S]*?(<\/ul>)/, `$1\n${cards}\n$2`);
    html = html.replace(/(<p id="count"[^>]*>)[\s\S]*?(<\/p>)/, `$1${profiles.length} supported games$2`);
  }
  fs.writeFileSync(file, html);
}
const runner = path.join(site, 'plus-runner.html');
let html = fs.readFileSync(runner, 'utf8').replace(/<meta name="robots"[^>]*>/g, '');
fs.writeFileSync(runner, html.replace('</title>', '</title><meta name="robots" content="noindex,nofollow">'));
fs.writeFileSync(path.join(site, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.values(definition).map(meta=>`  <url><loc>${meta.url}</loc></url>`).join('\n')}\n</urlset>\n`);
fingerprintWebAssets(site);
console.log(`Prepared crawlable website content for ${profiles.length} profiles; Builder ${version} unchanged.`);
