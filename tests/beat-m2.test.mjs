import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

function load(path, names, inject = {}) {
  let code = stripTypeScriptTypes(readFileSync(path, 'utf8'), { mode: 'transform' });
  code = code.replace(/^import\s+type[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '');
  code = code.replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '');
  code = code.replace(/\bexport /g, '');
  return new Function(...Object.keys(inject), `${code}\nreturn { ${names.join(',')} };`)(...Object.values(inject));
}

const allow = load('src/lib/beat/allowlist.ts', [
  'classifyBeatMedia',
  'extractXStatusId',
  'extractYouTubeId',
  'normalizeBeatUrl',
]);
const fp = load(
  'src/lib/beat/fingerprint.ts',
  ['beatDuplicateFingerprint', 'urlsLikelySameStory'],
  {
    normalizeBeatUrl: allow.normalizeBeatUrl,
    extractXStatusId: allow.extractXStatusId,
    extractYouTubeId: allow.extractYouTubeId,
  },
);
const discovery = load(
  'src/lib/beat/discovery.ts',
  [
    'scoreDiscoveryCandidate',
    'recommendCategory',
    'extractStatusIdsFromSyndicationHtml',
    'proposeExpiration',
    'PA_BEAT_DISCOVERY_ACCOUNTS',
  ],
  {
    beatDuplicateFingerprint: fp.beatDuplicateFingerprint,
    classifyBeatMedia: allow.classifyBeatMedia,
  },
);

test('classifyBeatMedia maps X and YouTube; else link_out', () => {
  const x = allow.classifyBeatMedia('https://x.com/Phillies/status/2097848487366824203');
  assert.equal(x.mediaType, 'x_embed');
  assert.equal(x.embedId, '2097848487366824203');
  const yt = allow.classifyBeatMedia('https://www.youtube.com/watch?v=v3l96WUeXvs');
  assert.equal(yt.mediaType, 'youtube_embed');
  assert.equal(yt.embedId, 'v3l96WUeXvs');
  assert.match(yt.embedUrl, /youtube-nocookie/);
  const link = allow.classifyBeatMedia('https://www.inquirer.com/eagles/example');
  assert.equal(link.mediaType, 'link_out');
});

test('fingerprints prefer provider ids and dedupe URLs', () => {
  assert.equal(
    fp.beatDuplicateFingerprint({ originalUrl: 'https://x.com/Phillies/status/2097848487366824203' }),
    'x:2097848487366824203',
  );
  assert.equal(
    fp.beatDuplicateFingerprint({ originalUrl: 'https://www.youtube.com/watch?v=v3l96WUeXvs' }),
    'yt:v3l96WUeXvs',
  );
  assert.equal(
    fp.urlsLikelySameStory(
      'https://x.com/Phillies/status/2097848487366824203?s=20',
      'https://twitter.com/Phillies/status/2097848487366824203',
    ),
    true,
  );
});

test('discovery scoring prefers official/reporter and demotes rumor/aggregator', () => {
  const official = discovery.scoreDiscoveryCandidate({
    sourceTier: 'official_team_league',
    verifiedOfficial: true,
    text: 'Injury report listed Greenard limited',
    category: 'breaking',
  });
  const rumor = discovery.scoreDiscoveryCandidate({
    sourceTier: 'aggregator',
    verifiedOfficial: false,
    text: 'Rumor: sources say trade incoming',
    category: 'locker_room',
  });
  assert.ok(official > rumor);
  assert.ok(rumor <= 25);
  assert.equal(discovery.recommendCategory('Breaking: ruled out for Sunday', 'reaction'), 'breaking');
});

test('syndication HTML yields status ids', () => {
  const ids = discovery.extractStatusIdsFromSyndicationHtml(
    '<a href="https://x.com/Eagles/status/2098102480470937690">x</a> status/2098079091425517684',
  );
  assert.ok(ids.includes('2098102480470937690'));
  assert.ok(ids.includes('2098079091425517684'));
  assert.ok(discovery.PA_BEAT_DISCOVERY_ACCOUNTS.length >= 8);
});

test('real M2 seed covers categories + required embeds', () => {
  const seed = JSON.parse(readFileSync('data/beat-m2-seed.json', 'utf8')).items;
  assert.ok(seed.length >= 5 && seed.length <= 12);
  const cats = new Set(seed.map((i) => i.category));
  for (const c of ['breaking', 'from_the_beat', 'watch', 'locker_room', 'reaction']) assert.ok(cats.has(c), c);
  assert.ok(seed.some((i) => i.mediaType === 'x_embed' && i.originalUrl.includes('Phillies')));
  assert.ok(seed.some((i) => i.mediaType === 'youtube_embed' && i.embedId === 'v3l96WUeXvs'));
  assert.ok(seed.some((i) => i.mediaType === 'link_out'));
  assert.ok(seed.every((i) => i.approvalStatus === 'approved'));
  assert.ok(seed.every((i) => !/fixture|sample|0000000000000000001/i.test(i.originalUrl)));
});

test('migration 0002 creates beat_items', () => {
  const sql = readFileSync('drizzle/0002_beat_items.sql', 'utf8');
  assert.match(sql, /CREATE TABLE `beat_items`/);
  assert.match(sql, /duplicate_fingerprint/);
  assert.match(sql, /beat_items_pub/);
});

test('production wrangler keeps KEYSTONE_BEAT_M1 false', () => {
  const toml = readFileSync('wrangler.toml', 'utf8');
  assert.match(toml, /KEYSTONE_BEAT_M1\s*=\s*"false"/);
});

test('getBeatDesk source file never imports fixtures', () => {
  const api = readFileSync('src/lib/beat/api.ts', 'utf8');
  assert.equal(/from\s+["']\.\/fixtures["']/.test(api), false);
  assert.equal(/BEAT_POC_FIXTURES/.test(api), false);
  assert.match(api, /listPublicBeatRows/);
});
