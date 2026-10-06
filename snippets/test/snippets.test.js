// Run with: npm test
const test = require('node:test');
const assert = require('node:assert');
const { lateDays, dayInCycle, cyclePhase, averageCycleLength } = require('../cycle-day');
const { withoutDashes } = require('../without-dashes');
const { slidesText } = require('../slides-text');
const { buildMaterial } = require('../material-budget');
const { buildStudyPayload } = require('../study-history');
const { mergeLogs, localOnly } = require('../merge-logs');

// ---------------------------------------------------------------- cycle

const cycle = { lastPeriodStart: '2026-09-01', cycleLength: 28, periodLength: 5 };

test('cycle: day 1 is the start, and it wraps on time', () => {
  assert.strictEqual(dayInCycle(cycle, '2026-09-01', '2026-09-01'), 1);
  assert.strictEqual(dayInCycle(cycle, '2026-09-28', '2026-09-10'), 28);
  assert.strictEqual(dayInCycle(cycle, '2026-09-29', '2026-09-10'), 1);
});

test('cycle: dates before the logged start repeat backwards', () => {
  assert.strictEqual(dayInCycle(cycle, '2026-08-31', '2026-09-10'), 28);
});

test('cycle: a late period keeps counting instead of starting a new cycle', () => {
  const today = '2026-10-01'; // day 31
  assert.strictEqual(lateDays(cycle, today), 3);
  assert.strictEqual(dayInCycle(cycle, today, today), 31);
  // Future days assume it starts tomorrow.
  assert.strictEqual(dayInCycle(cycle, '2026-10-02', today), 1);
});

test('cycle: not late before the cycle ends', () => {
  assert.strictEqual(lateDays(cycle, '2026-09-28'), 0);
});

test('cycle: phases across a 28-day cycle', () => {
  assert.strictEqual(cyclePhase(cycle, '2026-09-03'), 'menstrual');
  assert.strictEqual(cyclePhase(cycle, '2026-09-10'), 'follicular');
  assert.strictEqual(cyclePhase(cycle, '2026-09-14'), 'ovulation');
  assert.strictEqual(cyclePhase(cycle, '2026-09-22'), 'luteal');
});

test('cycle: average of real cycles, skipping impossible gaps', () => {
  assert.strictEqual(averageCycleLength(['2026-06-01']), null);
  assert.strictEqual(averageCycleLength(['2026-06-01', '2026-06-29', '2026-07-29']), 29);
  // A forgotten month (61 days) is not a cycle.
  assert.strictEqual(averageCycleLength(['2026-01-01', '2026-03-03', '2026-03-31']), 28);
});

// ---------------------------------------------------------------- dashes

test('withoutDashes: em/en dash as a pause becomes a comma', () => {
  assert.strictEqual(withoutDashes('Respira fundo — você está indo bem.'), 'Respira fundo, você está indo bem.');
  assert.strictEqual(withoutDashes('Fase lútea – mais sensível'), 'Fase lútea, mais sensível');
});

test('withoutDashes: line-start dashes are dropped, hyphens kept', () => {
  assert.strictEqual(withoutDashes('— primeiro\n– segundo'), 'primeiro\nsegundo');
  assert.strictEqual(withoutDashes('guarda-chuva'), 'guarda-chuva');
});

test('withoutDashes: no comma before punctuation', () => {
  assert.strictEqual(withoutDashes('Tudo certo —.'), 'Tudo certo.');
});

// ---------------------------------------------------------------- slides

test('slidesText: numeric slide order and entity decoding', () => {
  const text = slidesText({
    'ppt/slides/slide10.xml': '<a:t>Fim</a:t>',
    'ppt/slides/slide2.xml': '<p:sld><a:t>Enzimas &amp; cofatores</a:t></p:sld>',
    'ppt/slides/slide1.xml': '<a:t>Bioquímica</a:t><a:t>Aula 1</a:t>',
    'ppt/slides/_rels/slide1.xml.rels': '<a:t>ignored</a:t>',
  });
  assert.strictEqual(text, 'Slide 1: Bioquímica Aula 1\nSlide 2: Enzimas & cofatores\nSlide 3: Fim');
});

test('slidesText: slides without text are skipped', () => {
  assert.strictEqual(slidesText({ 'ppt/slides/slide1.xml': '<p:pic/>' }), '');
});

// ---------------------------------------------------------------- material

const item = (id, kind, createdAt, extra = {}) => ({ id, kind, name: `${id}`, createdAt, ...extra });

test('material: notes, files and photos, newest first', async () => {
  const items = [
    item('old.pdf', 'file', '2026-10-01'),
    item('nota', 'note', '2026-10-03', { text: 'Enzimas aceleram reações' }),
    item('foto.jpg', 'photo', '2026-10-02'),
  ];
  const m = await buildMaterial(items, async () => 'texto do pdf');
  assert.deepStrictEqual(m.texts.map((t) => t.name), ['nota', 'old.pdf']);
  assert.strictEqual(m.photos.length, 1);
  assert.strictEqual(m.note, null);
});

test('material: unreadable and over-budget items are reported, not hidden', async () => {
  const items = [
    item('scan.pdf', 'file', '2026-10-03'),
    item('big.pdf', 'file', '2026-10-02'),
    item('small.pdf', 'file', '2026-10-01'),
  ];
  const texts = { 'scan.pdf': '', 'big.pdf': 'x'.repeat(90), 'small.pdf': 'y'.repeat(20) };
  const m = await buildMaterial(items, async (i) => texts[i.name], { maxChars: 100 });
  assert.deepStrictEqual(m.texts.map((t) => t.name), ['big.pdf']);
  assert.strictEqual(m.usedChars, 90);
  assert.match(m.note, /Não consegui ler: scan\.pdf/);
  assert.match(m.note, /muito material: small\.pdf/);
});

test('material: photo cap', async () => {
  const photos = Array.from({ length: 4 }, (_, i) => item(`p${i}`, 'photo', `2026-10-0${i + 1}`));
  const m = await buildMaterial(photos, async () => '', { maxPhotos: 3 });
  assert.strictEqual(m.photos.length, 3);
  assert.strictEqual(m.photos[0].id, 'p3'); // newest kept
  assert.match(m.note, /1 foto\(s\) ficaram de fora/);
});

// ---------------------------------------------------------------- study chat

test('study payload: only the newest message carries files', async () => {
  const history = [
    { role: 'user', content: 'resume', files: [{ name: 'a.pdf', mimeType: 'application/pdf', uri: 'a', extractedText: 'AAA' }], images: ['p1', 'p2'] },
    { role: 'assistant', content: 'ok', document: { title: 'Resumo', content: '## Tópico' } },
    { role: 'user', content: 'e esse?', files: [{ name: 'b.pdf', mimeType: 'application/pdf', uri: 'b' }] },
  ];
  const reads = [];
  const payload = await buildStudyPayload(history, async (uri) => {
    reads.push(uri);
    return `b64:${uri}`;
  });
  assert.deepStrictEqual(reads, ['b']);
  assert.deepStrictEqual(payload[0].fileTexts, [{ name: 'a.pdf', text: 'AAA' }]);
  assert.strictEqual(payload[0].imageCount, 2);
  assert.strictEqual(payload[0].files, undefined);
  assert.match(payload[1].content, /\[PDF "Resumo"\]/);
  assert.strictEqual(payload[2].files[0].base64, 'b64:b');
});

test('study payload: history is trimmed', async () => {
  const history = Array.from({ length: 40 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `${i}` }));
  const payload = await buildStudyPayload(history, async () => '', 30);
  assert.strictEqual(payload.length, 30);
  assert.strictEqual(payload[0].content, '10');
});

// ---------------------------------------------------------------- sync

test('mergeLogs: union by id, cloud wins, sorted', () => {
  const local = [
    { id: 'a', createdAt: '2026-10-02', energy: 2 },
    { id: 'b', createdAt: '2026-10-01', energy: 3 },
  ];
  const cloud = [{ id: 'a', createdAt: '2026-10-02', energy: 4 }, { id: 'c', createdAt: '2026-10-03', energy: 5 }];
  const merged = mergeLogs(local, cloud);
  assert.deepStrictEqual(merged.map((l) => l.id), ['b', 'a', 'c']);
  assert.strictEqual(merged[1].energy, 4);
  assert.deepStrictEqual(localOnly(local, cloud).map((l) => l.id), ['b']);
});
