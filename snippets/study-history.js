// O chat de estudos guarda a conversa inteira no celular, mas reenviar todo
// PDF e foto a cada mensagem seria lento e caro no 4G. Então só a mensagem
// mais nova leva os arquivos (em base64); o servidor extrai o texto e
// devolve, o app guarda esse texto na mensagem, e as próximas perguntas
// mandam o texto em vez do arquivo. Fotos antigas viram só uma marcação
// "[ela tinha mandado N fotos aqui]". O histórico é cortado nas mensagens
// mais recentes.

const MAX_HISTORY = 30;

/**
 * `readBase64(uri)` lê um arquivo local. Devolve o payload da callable
 * aiStudyChat.
 */
async function buildStudyPayload(history, readBase64, maxHistory = MAX_HISTORY) {
  const recent = history.slice(-maxHistory);
  return Promise.all(
    recent.map(async (m, i) => {
      if (m.role === 'assistant') {
        const doc = m.document ? `\n\n[PDF "${m.document.title}"]\n${m.document.content}` : '';
        return { role: 'assistant', content: `${m.content}${doc}` };
      }
      if (i === recent.length - 1) {
        return {
          role: 'user',
          content: m.content,
          images: await Promise.all((m.images || []).map(readBase64)),
          files: await Promise.all(
            (m.files || []).map(async (f) => ({ name: f.name, mimeType: f.mimeType, base64: await readBase64(f.uri) }))
          ),
        };
      }
      const payload = {
        role: 'user',
        content: m.content,
        fileTexts: (m.files || []).filter((f) => f.extractedText).map((f) => ({ name: f.name, text: f.extractedText })),
      };
      if (m.images && m.images.length) payload.imageCount = m.images.length;
      return payload;
    })
  );
}

module.exports = { buildStudyPayload, MAX_HISTORY };
