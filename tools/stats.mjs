// Generates GitHub stats cards from live GitHub data:
//   assets/stats/overview.svg   totals (contributions, commits, PRs, issues, repos, stars)
//   assets/stats/languages.svg  most used languages across public, non-fork repositories
//   assets/stats/streak.svg     current and longest contribution streak
//   assets/stats/activity.svg   contribution calendar for the last 12 months
//
// Runs daily in GitHub Actions (.github/workflows/stats.yml).
// Locally: set GITHUB_TOKEN to any token with public read access, then `npm run stats`.
// Nothing here is estimated: every number comes straight from the GitHub API.

import { C, F, measure, text, svg, write, glyph, cardBg } from "./lib.mjs";

const USER = process.env.PROFILE_USER || "ammar197khan";
const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) throw new Error("GITHUB_TOKEN is not set");

// Repositories left out of the language chart (the profile repo itself only holds tooling).
const EXCLUDE_LANG_REPOS = new Set([USER]);

async function gql(query, variables = {}) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json", "User-Agent": `${USER}-profile-stats` },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors || json));
  return json.data;
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

async function fetchData() {
  const base = await gql(
    `query($login: String!) {
      user(login: $login) {
        createdAt
        pullRequests { totalCount }
        issues { totalCount }
        repositoriesContributedTo(contributionTypes: [COMMIT, PULL_REQUEST, ISSUE, REPOSITORY]) { totalCount }
        repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {
          totalCount
          nodes {
            name
            stargazerCount
            languages(first: 20, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name color } } }
          }
        }
        contributionsCollection {
          contributionYears
          contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
        }
      }
    }`,
    { login: USER }
  );
  const user = base.user;

  // All-time totals and the full day-by-day history (for streaks), one query per year.
  const years = [...user.contributionsCollection.contributionYears].sort();
  let totalContributions = 0;
  let totalCommits = 0;
  const days = new Map();
  for (const year of years) {
    const from = `${year}-01-01T00:00:00Z`;
    const to = `${year}-12-31T23:59:59Z`;
    const d = await gql(
      `query($login: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $login) {
          contributionsCollection(from: $from, to: $to) {
            totalCommitContributions
            restrictedContributionsCount
            contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
          }
        }
      }`,
      { login: USER, from, to }
    );
    const cc = d.user.contributionsCollection;
    totalContributions += cc.contributionCalendar.totalContributions;
    totalCommits += cc.totalCommitContributions;
    for (const w of cc.contributionCalendar.weeks) for (const day of w.contributionDays) days.set(day.date, day.contributionCount);
  }

  const languages = new Map();
  let stars = 0;
  for (const repo of user.repositories.nodes) {
    stars += repo.stargazerCount;
    if (EXCLUDE_LANG_REPOS.has(repo.name)) continue;
    for (const e of repo.languages.edges) {
      const cur = languages.get(e.node.name) || { size: 0, color: e.node.color };
      cur.size += e.size;
      languages.set(e.node.name, cur);
    }
  }

  return {
    createdAt: user.createdAt,
    prs: user.pullRequests.totalCount,
    issues: user.issues.totalCount,
    contributedTo: user.repositoriesContributedTo.totalCount,
    repos: user.repositories.totalCount,
    stars,
    totalContributions,
    totalCommits,
    days,
    lastYear: user.contributionsCollection.contributionCalendar,
    languages,
  };
}

/* ------------------------------------------------------------------ */
/*  Streaks                                                            */
/* ------------------------------------------------------------------ */

function streaks(daysMap) {
  const today = new Date().toISOString().slice(0, 10);
  const dates = [...daysMap.keys()].filter((d) => d <= today).sort();
  let longest = { len: 0, start: null, end: null };
  let run = { len: 0, start: null, end: null };
  for (const d of dates) {
    if (daysMap.get(d) > 0) {
      run = run.len ? { len: run.len + 1, start: run.start, end: d } : { len: 1, start: d, end: d };
      if (run.len > longest.len) longest = { ...run };
    } else run = { len: 0, start: null, end: null };
  }
  // Current streak: count back from today; a quiet "today" doesn't break it yet.
  let i = dates.length - 1;
  if (i >= 0 && dates[i] === today && !(daysMap.get(today) > 0)) i--;
  let current = { len: 0, start: null, end: null };
  for (; i >= 0 && daysMap.get(dates[i]) > 0; i--) {
    current = { len: current.len + 1, start: dates[i], end: current.end || dates[i] };
  }
  return { current, longest };
}

/* ------------------------------------------------------------------ */
/*  Rendering helpers                                                  */
/* ------------------------------------------------------------------ */

const fmt = (n) => n.toLocaleString("en-US");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (iso, withYear = true) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}${withYear ? `, ${y}` : ""}`;
};
const range = (s) => (s.len ? (s.start === s.end ? fmtDate(s.start) : `${fmtDate(s.start, s.start.slice(0, 4) !== s.end.slice(0, 4))} – ${fmtDate(s.end)}`) : "No active streak");
const firstActive = (days) => [...days.keys()].sort().find((k) => days.get(k) > 0);
const updated = () => `Updated ${fmtDate(new Date().toISOString().slice(0, 10))}`;

function header(label, title, w) {
  return text(F.mono, `// ${label}`, 32, 44, 12, { fill: C.accent, ls: 0.08 }) +
    text(F.title, title, 32, 76, 22) +
    text(F.body, updated(), w - 32, 44, 12, { fill: C.faint, anchor: "end" });
}

/* ------------------------------------------------------------------ */
/*  Cards                                                              */
/* ------------------------------------------------------------------ */

function overviewCard(d) {
  const W = 620, H = 320;
  const items = [
    ["Total contributions", d.totalContributions, "flame"],
    ["Commits", d.totalCommits, "api"],
    ["Pull requests", d.prs, "flow"],
    ["Issues", d.issues, "spark"],
    ["Public repositories", d.repos, "layout"],
    ["Stars earned", d.stars, "trophy"],
  ];
  let body = cardBg(W, H, { r: 18, id: "d1" }) + header("GITHUB STATS", "Activity overview", W);
  const colW = (W - 64) / 2;
  items.forEach(([label, value, ic], i) => {
    const x = 32 + (i % 2) * colW;
    const y = 112 + Math.floor(i / 2) * 56;
    body += `<rect x="${x}" y="${y - 2}" width="36" height="36" rx="10" fill="${C.accentSoft}"/>` + glyph(ic, x + 8, y + 6, 20, C.accent);
    body += text(F.body, label, x + 50, y + 22, 15, { fill: C.muted });
    body += text(F.title, fmt(value), x + colW - 24, y + 23, 20, { anchor: "end" });
  });
  const since = new Date(d.createdAt).getUTCFullYear();
  body += text(F.body, `On GitHub since ${since} · public activity`, 32, H - 22, 12, { fill: C.faint });
  write("stats/overview.svg", svg(W, H, body, { title: `GitHub stats for ${USER}: ${items.map(([l, v]) => `${l} ${fmt(v)}`).join(", ")}.` }));
}

function languagesCard(d) {
  const W = 620, H = 320;
  const total = [...d.languages.values()].reduce((a, b) => a + b.size, 0) || 1;
  const sorted = [...d.languages.entries()].sort((a, b) => b[1].size - a[1].size);
  const top = sorted.slice(0, 7);
  const rest = sorted.slice(7).reduce((a, [, v]) => a + v.size, 0);
  if (rest > 0) top.push(["Other", { size: rest, color: "#4b5563" }]);

  let body = cardBg(W, H, { r: 18, id: "d2" }) + header("LANGUAGES", "Most used languages", W);
  // stacked bar
  const bx = 32, by = 104, bw = W - 64, bh = 12;
  body += `<clipPath id="bar"><rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="6"/></clipPath><g clip-path="url(#bar)"><rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${C.panel2}"/>`;
  let cx = bx;
  for (const [, v] of top) {
    const w = (v.size / total) * bw;
    body += `<rect x="${cx.toFixed(2)}" y="${by}" width="${Math.max(w, 0).toFixed(2)}" height="${bh}" fill="${v.color || C.faint}"/>`;
    cx += w;
  }
  body += `</g>`;
  // legend, two columns
  const colW = (W - 64) / 2;
  top.forEach(([name, v], i) => {
    const x = 32 + (i % 2) * colW;
    const y = 156 + Math.floor(i / 2) * 34;
    body += `<circle cx="${x + 6}" cy="${y - 5}" r="6" fill="${v.color || C.faint}"/>`;
    body += text(F.medium, name, x + 22, y, 15);
    body += text(F.mono, `${((v.size / total) * 100).toFixed(1)}%`, x + colW - 24, y, 14, { fill: C.muted, anchor: "end" });
  });
  if (!sorted.length) body += text(F.body, "No public code yet", 32, 160, 15, { fill: C.muted });
  body += text(F.body, "By code size across public, non-fork repositories", 32, H - 22, 12, { fill: C.faint });
  write("stats/languages.svg", svg(W, H, body, { title: `Most used languages: ${top.map(([n, v]) => `${n} ${((v.size / total) * 100).toFixed(1)}%`).join(", ")}.` }));
}

function streakCard(d, s) {
  const W = 1280, H = 220;
  let body = cardBg(W, H, { r: 20, id: "d3" });
  const cols = [
    ["Total contributions", fmt(d.totalContributions), firstActive(d.days) ? `${fmtDate(firstActive(d.days))} – Present` : "No contributions yet", "calendar", C.text],
    ["Current streak", `${s.current.len} ${s.current.len === 1 ? "day" : "days"}`, range(s.current), "flame", C.accent],
    ["Longest streak", `${s.longest.len} ${s.longest.len === 1 ? "day" : "days"}`, range(s.longest), "trophy", C.text],
  ];
  const cw = W / 3;
  cols.forEach(([label, value, sub, ic, color], i) => {
    const cx = cw * i + cw / 2;
    if (i > 0) body += `<path d="M${cw * i} 44V${H - 44}" stroke="${C.border}"/>`;
    body += glyph(ic, cx - 12, 36, 24, i === 1 ? C.accent : C.muted);
    body += text(F.display, value, cx, 118, 40, { anchor: "middle", fill: color });
    body += text(F.medium, label, cx, 150, 16, { anchor: "middle", fill: C.text });
    body += text(F.body, sub, cx, 176, 13, { anchor: "middle", fill: C.faint });
  });
  write("stats/streak.svg", svg(W, H, body, { title: `Contribution streak: total ${cols[0][1]}, current streak ${cols[1][1]}, longest streak ${cols[2][1]}.` }));
}

function activityCard(d) {
  const weeks = d.lastYear.weeks;
  const cell = 15, gap = 4;
  const gridW = weeks.length * (cell + gap) - gap;
  const W = 1280;
  const left = Math.round((W - gridW) / 2) + 12;
  const top = 124;
  const H = top + 7 * (cell + gap) + 64;
  const max = Math.max(1, ...weeks.flatMap((w) => w.contributionDays.map((x) => x.contributionCount)));
  const level = (n) => (n === 0 ? 0 : n >= max * 0.75 ? 4 : n >= max * 0.5 ? 3 : n >= max * 0.25 ? 2 : 1);
  const colors = [C.panel2, "rgba(240,178,90,0.28)", "rgba(240,178,90,0.5)", "rgba(240,178,90,0.75)", C.accent];

  let body = cardBg(W, H, { r: 20, id: "d4" }) + header("CONTRIBUTIONS", `${fmt(d.lastYear.totalContributions)} contributions in the last 12 months`, W);
  let lastMonth = -1;
  weeks.forEach((w, wi) => {
    const x = left + wi * (cell + gap);
    const first = w.contributionDays[0];
    const m = Number(first.date.slice(5, 7)) - 1;
    if (m !== lastMonth && wi < weeks.length - 2) {
      if (lastMonth !== -1 || Number(first.date.slice(8, 10)) <= 7) body += text(F.body, MONTHS[m], x, top - 12, 12, { fill: C.faint });
      lastMonth = m;
    }
    w.contributionDays.forEach((day) => {
      const dow = new Date(day.date + "T00:00:00Z").getUTCDay();
      body += `<rect x="${x}" y="${top + dow * (cell + gap)}" width="${cell}" height="${cell}" rx="3.5" fill="${colors[level(day.contributionCount)]}"><title>${day.contributionCount} on ${day.date}</title></rect>`;
    });
  });
  ["Mon", "Wed", "Fri"].forEach((l, i) => { body += text(F.body, l, left - 12, top + (1 + i * 2) * (cell + gap) + 11, 11, { fill: C.faint, anchor: "end" }); });
  // legend
  const ly = H - 34;
  let lx = left + gridW - (5 * (cell + gap)) - 34;
  body += text(F.body, "Less", lx - 10, ly + 12, 12, { fill: C.faint, anchor: "end" });
  colors.forEach((c) => { body += `<rect x="${lx}" y="${ly}" width="${cell}" height="${cell}" rx="3.5" fill="${c}"/>`; lx += cell + gap; });
  body += text(F.body, "More", lx + 6, ly + 12, 12, { fill: C.faint });
  write("stats/activity.svg", svg(W, H, body, { title: `Contribution calendar: ${fmt(d.lastYear.totalContributions)} contributions in the last 12 months.` }));
}

const data = await fetchData();
const s = streaks(data.days);
console.log(`contributions=${data.totalContributions} commits=${data.totalCommits} prs=${data.prs} issues=${data.issues} repos=${data.repos} stars=${data.stars} lastYear=${data.lastYear.totalContributions} streak=${s.current.len}/${s.longest.len} languages=${[...data.languages.keys()].length}`);
overviewCard(data);
languagesCard(data);
streakCard(data, s);
activityCard(data);
