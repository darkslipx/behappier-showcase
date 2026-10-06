// The study chat keeps the whole conversation on the phone, but resending
// every PDF and photo on every turn would be slow and expensive on mobile
// data. So only the newest message ships its files (as base64); the server
// extracts their text and returns it, the app stores it on the message,
// and later turns send that text instead of the file. Older photos become
// a short "[she sent N photos here]" marker. History is trimmed to the
// most recent messages.

const MAX_HISTORY = 30;

/**
 * `readBase64(uri)` reads a local file. Returns the payload for the
 * aiStudyChat callable.
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
