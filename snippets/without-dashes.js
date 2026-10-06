// The user asked for no dashes anywhere in the app's text. Telling the model
// "never use em dashes" in the system prompt reduces them, but LLMs still
// slip them in as a pause. So every AI reply also goes through this filter
// on the phone: a dash used as a pause becomes a comma, and a dash that
// starts a line (a pseudo-bullet) is dropped. Hyphens inside words
// ("guarda-chuva") are untouched, since only — and – are targeted.

function withoutDashes(text) {
  return text
    .replace(/^[ \t]*[—–][ \t]*/gm, '')
    .replace(/[ \t]*[—–][ \t]*/g, ', ')
    .replace(/,\s*([.,!?;:])/g, '$1');
}

module.exports = { withoutDashes };
