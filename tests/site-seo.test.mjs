import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('public pages have distinct metadata, matching canonical/schema URLs and crawlable profile content',()=>{
  const base='https://levi-soft.github.io/gba-duo-companion-builder/';
  const sitemap=fs.readFileSync('site/sitemap.xml','utf8');
  const titles=new Set();
  for(const [file,url] of [['index.html',base],['supported-games.html',base+'supported-games.html']]){
    const html=fs.readFileSync('site/'+file,'utf8');
    const title=html.match(/<title>([^<]+)<\/title>/)?.[1];
    assert(title?.includes('GBA Duo Companion Builder'));titles.add(title);
    assert(html.includes(`rel="canonical" href="${url}"`));
    assert(html.includes('name="robots" content="index,follow"'));
    assert(html.match(/name="description" content="([^"]+)"/)?.[1].length>80);
    assert(sitemap.includes(`<loc>${url}</loc>`));
    assert.equal([...html.matchAll(/<h1\b/g)].length,1);
    const data=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert(data.name.includes('GBA Duo Companion Builder'));
    assert(!html.includes("connect-src 'self'"),'Website must not enable ROM uploads');
  }
  assert.equal(titles.size,2);
  const context={};vm.runInNewContext(fs.readFileSync('site/profiles.js','utf8'),context);
  const games=fs.readFileSync('site/supported-games.html','utf8');
  for(const profile of context.COMPANION_PROFILES){
    assert(games.includes(profile.crc32),'CRC must be visible without JavaScript: '+profile.id);
    assert(games.includes(profile.code));
  }
  assert.equal([...games.matchAll(/class="game-card"/g)].length,context.COMPANION_PROFILES.length);
  const runner=fs.readFileSync('site/plus-runner.html','utf8');
  assert(runner.includes('name="robots" content="noindex,nofollow"'));
  assert(!sitemap.includes('plus-runner'));
});
