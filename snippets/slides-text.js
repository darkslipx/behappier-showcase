// Os slides das aulas costumam chegar em .pptx, e o modelo não lê arquivo
// do Office direto. Um .pptx é um zip de arquivos XML, um por slide
// (ppt/slides/slide1.xml, slide2.xml, …), e o texto visível fica nas tags
// <a:t>. Na Cloud Function o zip é aberto com o JSZip; esta é a parte sem
// dependências: colocar os slides na ordem certa e tirar o texto de cada um.
//
// A ordem importa: ordenar como texto coloca o slide10 antes do slide2.

function slideNumber(path) {
  const match = /slide(\d+)\.xml$/.exec(path);
  return match ? Number(match[1]) : Infinity;
}

function decodeXml(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&'); // por último, pra "&amp;lt;" virar "&lt;"
}

/** `slides`: { [caminhoNoZip]: xml }. Devolve uma linha por slide que tem texto. */
function slidesText(slides) {
  return Object.keys(slides)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a, b) => slideNumber(a) - slideNumber(b))
    .map((p, i) => {
      const runs = [...slides[p].matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => decodeXml(m[1]));
      return runs.length ? `Slide ${i + 1}: ${runs.join(' ')}` : null;
    })
    .filter(Boolean)
    .join('\n');
}

module.exports = { slidesText };
