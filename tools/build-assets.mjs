// Builds the static artwork for the profile README:
//   assets/banner.svg, assets/about.svg, assets/toolkit.svg, assets/nav-*.svg
// Run from this folder:  npm install && npm run assets
// Edit the content arrays below, then re-run.

import * as icons from "simple-icons";
import { C, F, measure, text, svg, write, glyph, cardBg } from "./lib.mjs";

const W = 1280;

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/* ------------------------------------------------------------------ */

const HERO = {
  label: "AI DEVELOPER  ·  AI AGENTS  ·  AI AUTOMATION",
  name: "Ammar Ali Khan",
  lines: [
    "I build AI agents, LLM applications and automated",
    "workflows, backed by 10 years of software engineering.",
  ],
  status: "Open to AI development projects",
};

const CONSOLE = [
  [["$ ", C.accent], ["agent run ", C.muted], ['"qualify new leads"', "#e7c58d"]],
  [["plan   ", C.blue], ["break task into 3 steps", C.muted]],
  [["tool   ", C.blue], ["crm.fetch_leads()", C.muted]],
  [["llm    ", C.blue], ["score each lead", C.muted]],
  [["check  ", C.blue], ["unsure -> human review", C.muted]],
  [["done   ", C.green], ["summary sent to sales", C.green]],
];

const FOCUS = [
  ["cpu", "AI Application Development", "Products built on large language models, from internal assistants to customer-facing tools."],
  ["bot", "AI Agent Development", "Agents that plan multi-step tasks, call your tools and APIs, and hand off to a person when unsure."],
  ["flow", "AI Workflow Automation", "n8n and code workflows that connect AI steps to your forms, inboxes, CRMs and databases."],
  ["database", "LLM & RAG Integration", "Retrieval-augmented generation over your documents, so answers stay grounded in your data."],
  ["layout", "Web & Mobile Applications", "Laravel, Node.js, Vue.js and React applications, plus the APIs behind mobile apps."],
  ["repeat", "Business Process Automation", "Replacing manual data entry, reporting and hand-offs with processes you can monitor."],
];

// [label, simple-icons export name] or [label, null, glyph name] for items without a brand logo
const TOOLKIT = [
  ["AI & Generative AI", [["Python", "siPython"], ["OpenAI API", null, "plug"], ["LLMs", null, "brain"], ["RAG", null, "search"], ["AI Agents", null, "bot"], ["LangChain", "siLangchain"]]],
  ["Automation", [["n8n", "siN8n"], ["Workflow Automation", null, "flow"], ["API Integration", null, "link"]]],
  ["Backend", [["PHP", "siPhp"], ["Laravel", "siLaravel"], ["Node.js", "siNodedotjs"], ["MySQL", "siMysql"], ["PostgreSQL", "siPostgresql"]]],
  ["Frontend", [["JavaScript", "siJavascript"], ["Vue.js", "siVuedotjs"], ["React", "siReact"], ["HTML5", "siHtml5"], ["CSS3", "siCss"], ["Tailwind CSS", "siTailwindcss"]]],
  ["Tools & Cloud", [["Git", "siGit"], ["GitHub", "siGithub"], ["Docker", "siDocker"], ["AWS", null, "cloud"], ["DigitalOcean", "siDigitalocean"]]],
];

const NAV = [
  ["about", "About", "spark", false],
  ["toolkit", "Toolkit", "cpu", false],
  ["projects", "Projects", "layout", false],
  ["stats", "Stats", "flame", false],
  ["portfolio", "Portfolio", "external", true],
  ["linkedin", "LinkedIn", "linkedin", false],
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function wrap(font, str, size, maxWidth) {
  const words = str.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (measure(font, test, size) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function luminance(hex) {
  const n = parseInt(hex, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function brandIcon(key, x, y, size) {
  const icon = icons[key];
  if (!icon) throw new Error(`simple-icons: ${key} not found`);
  const color = luminance(icon.hex) < 0.06 ? C.text : `#${icon.hex}`;
  return `<path transform="translate(${x} ${y}) scale(${size / 24})" d="${icon.path}" fill="${color}"/>`;
}

/* ------------------------------------------------------------------ */
/*  Banner                                                             */
/* ------------------------------------------------------------------ */

function banner() {
  const H = 380;
  const x = 64;
  let body = `<defs>
  <pattern id="g" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.07)"/></pattern>
  <radialGradient id="fade" cx="78%" cy="40%" r="65%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <mask id="m"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>
  <clipPath id="clip"><rect width="${W}" height="${H}" rx="24"/></clipPath>
</defs>
<g clip-path="url(#clip)">
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  <rect width="${W}" height="${H}" fill="url(#g)" mask="url(#m)"/>
</g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="24" fill="none" stroke="${C.border}"/>
`;
  body += text(F.mono, HERO.label, x, 92, 15, { fill: C.accent, ls: 0.06 });
  body += text(F.display, HERO.name, x - 3, 180, 82, { ls: -0.02 });
  HERO.lines.forEach((l, i) => { body += text(F.body, l, x, 232 + i * 34, 23, { fill: C.muted }); });

  // status pill
  const sw = measure(F.medium, HERO.status, 15) + 58;
  body += `<rect x="${x}" y="306" width="${sw}" height="38" rx="19" fill="${C.panel}" stroke="${C.borderStrong}"/>
<circle class="pulse" cx="${x + 22}" cy="325" r="9" fill="${C.green}" opacity="0.18"/>
<circle cx="${x + 22}" cy="325" r="4.5" fill="${C.green}"/>`;
  body += text(F.medium, HERO.status, x + 40, 330.5, 15, { fill: C.muted });

  // console
  const cx = 812, cy = 62, cw = 404, ch = 256;
  body += `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="16" fill="${C.panel}" stroke="${C.borderStrong}"/>
<path d="M${cx} ${cy + 44}H${cx + cw}" stroke="${C.border}"/>
<rect x="${cx + 0.5}" y="${cy + 0.5}" width="${cw - 1}" height="43.5" rx="15.5" fill="${C.panel2}" opacity="0.6"/>
<circle cx="${cx + 22}" cy="${cy + 22}" r="5" fill="rgba(255,255,255,0.14)"/><circle cx="${cx + 40}" cy="${cy + 22}" r="5" fill="rgba(255,255,255,0.14)"/><circle cx="${cx + 58}" cy="${cy + 22}" r="5" fill="rgba(255,255,255,0.14)"/>`;
  body += text(F.mono, "agent · example run", cx + 78, cy + 27, 13, { fill: C.faint });

  CONSOLE.forEach((parts, i) => {
    let px = cx + 24;
    const py = cy + 82 + i * 30;
    let g = "";
    for (const [str, fill] of parts) {
      g += text(F.mono, str, px, py, 14.5, { fill });
      px += measure(F.mono, str, 14.5);
    }
    body += `<g class="ln" style="animation-delay:${0.5 + i * 0.45}s">${g}</g>\n`;
  });
  body += `<rect class="cur" x="${cx + 24}" y="${cy + 82 + CONSOLE.length * 30 - 13}" width="9" height="17" rx="1.5" fill="${C.accent}"/>`;

  const style = `
.ln{opacity:0;animation:in .5s ease-out forwards}
.cur{opacity:0;animation:in .01s ${0.5 + CONSOLE.length * 0.45}s forwards,blink 1.1s ${0.5 + CONSOLE.length * 0.45}s steps(1) infinite}
.pulse{transform-origin:${x + 22}px 325px;animation:pulse 2.6s ease-in-out infinite}
@keyframes in{to{opacity:1}}
@keyframes blink{50%{opacity:0}}
@keyframes pulse{0%,100%{transform:scale(.7);opacity:.35}50%{transform:scale(1.25);opacity:.08}}
@media (prefers-reduced-motion:reduce){.ln,.cur{animation:none;opacity:1}.pulse{animation:none}}`;

  write("banner.svg", svg(W, H, body, { title: "Ammar Ali Khan — AI Developer, AI Agent Developer and AI Automation Engineer. Building AI agents, LLM applications and automated workflows, backed by 10 years of software engineering.", style }));
}

/* ------------------------------------------------------------------ */
/*  Section heading strip (used as an image heading inside cards)      */
/* ------------------------------------------------------------------ */

function heading(label, title, y) {
  return text(F.mono, `// ${label}`, 48, y, 14, { fill: C.accent, ls: 0.08 }) + text(F.title, title, 48, y + 40, 30, { ls: -0.01 });
}

/* ------------------------------------------------------------------ */
/*  About / focus areas                                                */
/* ------------------------------------------------------------------ */

function about() {
  const pad = 48, gap = 20, cols = 3;
  const tw = (W - pad * 2 - gap * (cols - 1)) / cols;
  const th = 176;
  const top = 116;
  const rows = Math.ceil(FOCUS.length / cols);
  const H = top + rows * th + (rows - 1) * gap + pad;

  let body = cardBg(W, H, { r: 22 });
  body += heading("WHAT I BUILD", "AI engineering, backed by full-stack experience", 58);

  FOCUS.forEach(([ic, title, desc], i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = pad + col * (tw + gap), y = top + row * (th + gap);
    body += `<rect x="${x}" y="${y}" width="${tw}" height="${th}" rx="16" fill="${C.panel2}" stroke="${C.border}"/>`;
    body += `<rect x="${x + 24}" y="${y + 24}" width="44" height="44" rx="12" fill="${C.accentSoft}"/>`;
    body += glyph(ic, x + 34, y + 34, 24, C.accent);
    body += text(F.title, title, x + 84, y + 53, 19);
    wrap(F.body, desc, 15, tw - 48).forEach((l, j) => {
      body += text(F.body, l, x + 24, y + 104 + j * 23, 15, { fill: C.muted });
    });
  });

  write("about.svg", svg(W, H, body, {
    title: "What I build: " + FOCUS.map((f) => `${f[1]} — ${f[2]}`).join(" "),
  }));
}

/* ------------------------------------------------------------------ */
/*  Toolkit                                                            */
/* ------------------------------------------------------------------ */

function toolkit() {
  const pad = 48, labelW = 230, chipH = 44, chipGap = 10, rowGap = 16;
  const startX = pad + labelW, maxX = W - pad;
  let y = 128;
  let rowsSvg = "";

  TOOLKIT.forEach(([label, items], ri) => {
    let x = startX;
    let lineY = y;
    const chips = [];
    for (const [name, key, gl] of items) {
      const w = 16 + 20 + 10 + measure(F.medium, name, 15) + 18;
      if (x + w > maxX) { x = startX; lineY += chipH + chipGap; }
      chips.push({ name, key, gl, x, y: lineY, w });
      x += w + chipGap;
    }
    const rowH = lineY - y + chipH;
    if (ri > 0) rowsSvg += `<path d="M${pad} ${y - rowGap / 2 - 0.5}H${W - pad}" stroke="${C.border}"/>`;
    rowsSvg += text(F.mono, label.toUpperCase(), pad, y + chipH / 2 + 5, 13, { fill: C.muted, ls: 0.06 });
    for (const c of chips) {
      rowsSvg += `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${chipH}" rx="22" fill="${C.panel2}" stroke="${C.borderStrong}"/>`;
      rowsSvg += c.key ? brandIcon(c.key, c.x + 16, c.y + 12, 20) : glyph(c.gl, c.x + 16, c.y + 12, 20, C.accent);
      rowsSvg += text(F.medium, c.name, c.x + 46, c.y + 27.5, 15);
    }
    y += rowH + rowGap * 2;
  });

  const H = y - rowGap * 2 + 48;
  let body = cardBg(W, H, { r: 22 });
  body += heading("TOOLKIT", "Skills & technologies", 58);
  body += rowsSvg;

  write("toolkit.svg", svg(W, H, body, {
    title: "Skills and technologies. " + TOOLKIT.map(([l, items]) => `${l}: ${items.map((i) => i[0]).join(", ")}.`).join(" "),
  }));
}

/* ------------------------------------------------------------------ */
/*  Navigation buttons                                                 */
/* ------------------------------------------------------------------ */

function navButtons() {
  for (const [file, label, ic, primary] of NAV) {
    const size = 15, h = 44;
    const w = Math.round(18 + 18 + 9 + measure(F.semibold, label, size) + 20);
    const bg = primary ? C.accent : C.panel;
    const fg = primary ? "#1a1205" : C.text;
    const iconColor = primary ? "#1a1205" : C.accent;
    let body = `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="${h / 2 - 0.5}" fill="${bg}" stroke="${primary ? C.accent : C.borderStrong}"/>`;
    body += glyph(ic, 18, 13, 18, iconColor);
    body += text(F.semibold, label, 45, 27.5, size, { fill: fg });
    write(`nav-${file}.svg`, svg(w, h, body, { title: label }));
  }
}

banner();
about();
toolkit();
navButtons();
