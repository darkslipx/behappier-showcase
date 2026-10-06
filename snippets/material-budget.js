// "Perguntar pra IA sobre estes itens": a usuária escolhe arquivos, fotos e
// anotações numa pasta de matéria, e toda pergunta daquela conversa é
// respondida a partir deles. A Cloud Function lê os itens direto do
// Firestore e do Storage, então o celular não reenvia nada, mas ainda
// precisa decidir o que cabe numa requisição:
//   - o texto tem um limite de caracteres (itens mais recentes primeiro);
//   - as fotos vão como imagem, com um limite de quantidade;
//   - o que não puder ser usado volta como aviso, pro app dizer "não
//     consegui ler X" em vez de responder como se tivesse lido.
// `textOf(item)` devolve o texto do item ('' quando não dá pra ler: PDF
// escaneado, áudio…). Em produção ele lê um cache por item e só extrai
// (pdf-parse, mammoth, o leitor de .pptx) na primeira vez.

const MAX_MATERIAL_CHARS = 400_000; // ~100 mil tokens
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
