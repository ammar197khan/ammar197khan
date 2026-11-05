// Shared helpers: palette, fonts and text-to-path rendering.
// Text is converted to SVG paths so the artwork looks identical in every browser
// (GitHub shows README SVGs as images, which cannot load web fonts).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";

const here = path.dirname(fileURLToPath(import.meta.url));
export const ASSETS = path.join(here, "..", "assets");

export const C = {
  bg: "#0b0d10",
  panel: "#14181d",
  panel2: "#1a1f25",
  border: "rgba(255,255,255,0.10)",
  borderStrong: "rgba(255,255,255,0.16)",
  text: "#e9ebee",
  muted: "#9ba4ae",
  faint: "#6c7580",
  accent: "#f0b25a",
  accentSoft: "rgba(240,178,90,0.12)",
  blue: "#8fb8ff",
  green: "#6fd3a0",
};

const load = (file) => {
  const buf = fs.readFileSync(path.join(here, "fonts", file));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
};

export const F = {
  display: load("space-grotesk-latin-700-normal.woff"),
  title: load("space-grotesk-latin-600-normal.woff"),
  body: load("inter-latin-400-normal.woff"),
  medium: load("inter-latin-500-normal.woff"),
  semibold: load("inter-latin-600-normal.woff"),
  mono: load("jetbrains-mono-latin-500-normal.woff"),
};

export function measure(font, str, size, letterSpacing = 0) {
  return font.getAdvanceWidth(str, size) + letterSpacing * size * Math.max(0, str.length - 1);
}

/**
 * Render text as a <path>.
 * opts: { anchor: "start"|"middle"|"end", fill, ls (letter spacing in em), cls, opacity }
 */
export function text(font, str, x, y, size, opts = {}) {
  const { anchor = "start", fill = C.text, ls = 0, cls = "", opacity } = opts;
  const width = measure(font, str, size, ls);
  let startX = x;
  if (anchor === "middle") startX = x - width / 2;
  if (anchor === "end") startX = x - width;

  // Each glyph outline is defined once per SVG (in font units) and reused with <use>.
  const upm = font.unitsPerEm;
  const k = size / upm;
  const fk = fontKey(font);
  let uses = "";
  let i = 0;
  font.forEachGlyph(str, 0, 0, upm, { kerning: true }, (g, gx) => {
    const ux = Math.round(gx + i * ls * upm);
    i++;
    const id = fk + g.index;
    if (!glyphDefs.has(id)) {
      const d = g.getPath(0, 0, upm).toPathData(0);
      glyphDefs.set(id, d);
    }
    if (glyphDefs.get(id)) uses += `<use href="#${id}" x="${ux}"/>`;
  });
  const attrs = [`fill="${fill}"`, `transform="translate(${+startX.toFixed(2)} ${+y.toFixed(2)}) scale(${+k.toFixed(5)})"`];
  if (cls) attrs.push(`class="${cls}"`);
  if (opacity != null) attrs.push(`opacity="${opacity}"`);
  return `<g ${attrs.join(" ")}>${uses}</g>`;
}

const glyphDefs = new Map();
const fontKeys = new Map();
function fontKey(font) {
  if (!fontKeys.has(font)) fontKeys.set(font, String.fromCharCode(97 + fontKeys.size));
  return fontKeys.get(font);
}

export function svg(width, height, body, { title, style = "" } = {}) {
  const defs = [...glyphDefs].filter(([, d]) => d).map(([id, d]) => `<path id="${id}" d="${d}"/>`).join("");
  glyphDefs.clear();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"${title ? ` aria-label="${esc(title)}"` : ""}>
${title ? `<title>${esc(title)}</title>\n` : ""}${style ? `<style>${style}</style>\n` : ""}${defs ? `<defs>${defs}</defs>\n` : ""}${body}
</svg>
`;
}

export function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function write(rel, content) {
  const file = path.join(ASSETS, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  console.log(`wrote assets/${rel} (${(content.length / 1024).toFixed(1)} KB)`);
}

/** Stroke icons (24x24), same family as the portfolio site. */
export const GLYPHS = {
  cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 14v1M15 14v1M2 13v3M22 13v3"/><circle cx="12" cy="3" r="1"/>',
  flow: '<rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="15" y="15" width="6" height="6" rx="1.5"/><path d="M6 9v3a3 3 0 0 0 3 3h3a3 3 0 0 1 3 3"/><path d="M15 6h3a3 3 0 0 1 3 3v2"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  spark: '<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/>',
  plug: '<path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0zM12 17v5"/>',
  layout: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
  api: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 9.3 4.5 4.5 0 0 0 7 18z"/>',
  brain: '<path d="M9 4a3 3 0 0 0-3 3v.2A3 3 0 0 0 4 10a3 3 0 0 0 1 2.2A3 3 0 0 0 6 17a3 3 0 0 0 3 3h0V4z"/><path d="M15 4a3 3 0 0 1 3 3v.2A3 3 0 0 1 20 10a3 3 0 0 1-1 2.2 3 3 0 0 1-1 4.8 3 3 0 0 1-3 3h0V4z"/><path d="M9 9h1.5M13.5 9H15M9 14h1.5M13.5 14H15"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/><path d="M8.5 11h5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  external: '<path d="M7 17L17 7M8 7h9v9"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10.5V17M8 7.25v.01M12 17v-6.5M12 13.5a2.5 2.5 0 0 1 5 0V17"/>',
  github: '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  flame: '<path d="M12 22c4 0 7-2.7 7-6.8 0-3.2-2-5.7-4-7.7-.4 2-1.4 3.3-2.6 3.8.4-3.4-1-6.6-3.9-8.3.3 3.2-1.3 5.2-2.8 7C4.7 11.3 5 13 5 15.2 5 19.3 8 22 12 22z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
};

export function glyph(name, x, y, size, color) {
  const s = size / 24;
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[name]}</g>`;
}

/** Background used by every card: panel, hairline border, faint dot grid. */
export function cardBg(w, h, { r = 18, grid = true, id = "dots" } = {}) {
  return `<defs><pattern id="${id}" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.05)"/></pattern></defs>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="${r}" fill="${C.panel}" stroke="${C.border}"/>
${grid ? `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="${r}" fill="url(#${id})"/>` : ""}`;
}
