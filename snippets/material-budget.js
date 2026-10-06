// "Ask the AI about these items": the user picks files, photos and notes in
// a subject folder, and every question in that conversation is answered
// from them. The Cloud Function reads the items straight from Firestore and
// Storage, so the phone never re-uploads anything, but it still has to
// decide what fits in one request:
//   - text has a character budget (newest items first);
//   - photos go as images, with a cap on how many;
//   - anything that can't be used is reported back, so the app can tell
//     her "I couldn't read X" instead of answering as if it had.
// `textOf(item)` returns the item's text ('' when unreadable: scanned PDFs,
// audio…). In production it reads a per-item cache and only extracts
// (pdf-parse, mammoth, the .pptx reader) the first time.

const MAX_MATERIAL_CHARS = 400_000; // ~100k tokens
const MAX_PHOTOS = 10;

async function buildMaterial(items, textOf, { maxChars = MAX_MATERIAL_CHARS, maxPhotos = MAX_PHOTOS } = {}) {
  const newestFirst = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const texts = [];
  const photos = [];
  const skipped = { unreadable: [], tooMuch: [], photos: 0 };
  let used = 0;

  for (const item of newestFirst) {
    if (item.kind === 'photo') {
      if (photos.length < maxPhotos) photos.push(item);
      else skipped.photos += 1;
      continue;
    }
    const text = item.kind === 'note' ? item.text || '' : await textOf(item);
    if (!text.trim()) {
      skipped.unreadable.push(item.name);
      continue;
    }
    if (used + text.length > maxChars) {
      skipped.tooMuch.push(item.name);
      continue;
    }
    used += text.length;
    texts.push({ name: item.name, text });
  }

  const notes = [];
  if (skipped.unreadable.length) notes.push(`Não consegui ler: ${skipped.unreadable.join(', ')}`);
  if (skipped.tooMuch.length) notes.push(`Ficou de fora por ser muito material: ${skipped.tooMuch.join(', ')}`);
  if (skipped.photos) notes.push(`${skipped.photos} foto(s) ficaram de fora (máximo ${maxPhotos})`);

  return { texts, photos, usedChars: used, note: notes.length ? `${notes.join('. ')}.` : null };
}

module.exports = { buildMaterial, MAX_MATERIAL_CHARS, MAX_PHOTOS };
