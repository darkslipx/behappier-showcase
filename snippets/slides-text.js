// Class slides usually arrive as .pptx, and the model can't read Office
// files directly. A .pptx is a zip of XML files, one per slide
// (ppt/slides/slide1.xml, slide2.xml, …), and the visible text sits in
// <a:t> runs. In the Cloud Function the zip is opened with JSZip; this is
// the dependency-free part: put the slides in the right order and pull the
// text out of each one.
//
// Ordering matters: a plain string sort puts slide10 before slide2.

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
    .replace(/&amp;/g, '&'); // last, so "&amp;lt;" stays "&lt;"
}

/** `slides`: { [zipPath]: xmlString }. Returns one line per slide with text. */
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
