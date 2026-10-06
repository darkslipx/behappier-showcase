// A usuária pediu nenhum travessão nos textos do app. Dizer ao modelo
// "nunca use travessão" no prompt de sistema diminui, mas os LLMs ainda
// escapam e usam como pausa. Então toda resposta da IA também passa por
// este filtro no celular: o travessão usado como pausa vira vírgula, e o
// que abre uma linha (um falso tópico) é removido. Hífen dentro de palavra
// ("guarda-chuva") não é afetado, porque só — e – são tratados.

function withoutDashes(text) {
  return text
    .replace(/^[ \t]*[—–][ \t]*/gm, '')
    .replace(/[ \t]*[—–][ \t]*/g, ', ')
    .replace(/,\s*([.,!?;:])/g, '$1');
}

module.exports = { withoutDashes };
