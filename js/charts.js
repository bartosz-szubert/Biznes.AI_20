// Wykresy jako SVG – bez bibliotek. Kolory kanałów z palety (css/styles.css, zmienne --series-*).

import { CHANNELS } from './domain.js';

export const CHANNEL_COLOR = {
  social: 'var(--series-social)',
  www: 'var(--series-www)',
  radio: 'var(--series-radio)',
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Wycinek pierścienia między kątami a0 i a1 (radiany). */
function arcPath(cx, cy, rOut, rIn, a0, a1) {
  const pt = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = pt(rOut, a0);
  const [x1, y1] = pt(rOut, a1);
  const [x2, y2] = pt(rIn, a1);
  const [x3, y3] = pt(rIn, a0);
  return `M${x0} ${y0} A${rOut} ${rOut} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${rIn} ${rIn} 0 ${large} 0 ${x3} ${y3} Z`;
}

/** Wykres pierścieniowy podziału budżetu. data: [{id, name, value, sharePct}] */
export function donutChart(data, formatValue) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const size = 240;
  const c = size / 2;
  let angle = -Math.PI / 2;
  let paths = '';
  for (const d of data) {
    if (d.value <= 0 || total <= 0) continue;
    const span = (d.value / total) * Math.PI * 2;
    const title = `${d.name}: ${formatValue(d.value)} (${d.sharePct.toFixed(1).replace('.', ',')}%)`;
    if (span >= Math.PI * 2 - 1e-6) {
      paths += `<circle cx="${c}" cy="${c}" r="${(c - 4 + 46) / 2}" fill="none" stroke="${CHANNEL_COLOR[d.id]}" stroke-width="${c - 4 - 46}"><title>${esc(title)}</title></circle>`;
    } else {
      paths += `<path d="${arcPath(c, c, c - 4, c - 46, angle, angle + span)}" fill="${CHANNEL_COLOR[d.id]}" stroke="var(--surface-1)" stroke-width="2"><title>${esc(title)}</title></path>`;
    }
    angle += span;
  }
  return `<svg viewBox="0 0 ${size} ${size}" class="chart-svg donut" aria-hidden="true" focusable="false">${paths}</svg>`;
}

/** Słupki grupowane (wiele serii, jedna oś). groups: [{label, values: {key: number}}], series: [{key, label, color}] */
export function groupedBars(groups, series, { format = (v) => String(v), tick = (v) => String(v), height = 260, width = 640 } = {}) {
  const padL = 64;
  const padB = 30;
  const padT = 16;
  const innerW = width - padL - 8;
  const innerH = height - padB - padT;
  const max = niceMax(Math.max(0, ...groups.flatMap((g) => series.map((s) => g.values[s.key] ?? 0))));
  const y = (v) => padT + innerH - (v / max) * innerH;
  const groupW = innerW / Math.max(1, groups.length);
  const barW = Math.min(24, (groupW * 0.6) / series.length);
  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const v = (max / 4) * i;
    grid += `<line x1="${padL}" x2="${width - 8}" y1="${y(v)}" y2="${y(v)}" stroke="var(--gridline)" stroke-width="1"/>`;
    grid += `<text x="${padL - 8}" y="${y(v) + 4}" text-anchor="end" class="axis-tick">${esc(tick(v))}</text>`;
  }
  let bars = '';
  groups.forEach((g, gi) => {
    const gx = padL + gi * groupW + (groupW - barW * series.length) / 2;
    series.forEach((s, si) => {
      const v = g.values[s.key] ?? 0;
      const h = (v / max) * innerH;
      const x = gx + si * barW;
      const top = padT + innerH - h;
      bars += `<rect x="${x + 1}" y="${top}" width="${Math.max(1, barW - 2)}" height="${Math.max(0, h)}" rx="4" fill="${s.color}"><title>${esc(`${g.label} – ${s.label}: ${format(v)}`)}</title></rect>`;
    });
    bars += `<text x="${padL + gi * groupW + groupW / 2}" y="${height - 8}" text-anchor="middle" class="axis-label">${esc(g.label)}</text>`;
  });
  return `<svg viewBox="0 0 ${width} ${height}" class="chart-svg" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">${grid}${bars}</svg>`;
}

/** Słupki skumulowane 0–100% (struktura budżetu). */
export function stackedShareBars(groups, { width = 640 } = {}) {
  const height = 260;
  const padL = 48;
  const padB = 30;
  const padT = 16;
  const innerW = width - padL - 8;
  const innerH = height - padB - padT;
  const y = (v) => padT + innerH - (v / 100) * innerH;
  const groupW = innerW / Math.max(1, groups.length);
  const barW = Math.min(48, groupW * 0.5);
  let grid = '';
  for (const v of [0, 25, 50, 75, 100]) {
    grid += `<line x1="${padL}" x2="${width - 8}" y1="${y(v)}" y2="${y(v)}" stroke="var(--gridline)" stroke-width="1"/>`;
    grid += `<text x="${padL - 8}" y="${y(v) + 4}" text-anchor="end" class="axis-tick">${v}%</text>`;
  }
  let bars = '';
  groups.forEach((g, gi) => {
    const x = padL + gi * groupW + (groupW - barW) / 2;
    let acc = 0;
    for (const id of ['social', 'www', 'radio']) {
      const v = g.values[id] ?? 0;
      if (v <= 0) continue;
      const top = y(acc + v);
      const bottom = y(acc);
      bars += `<rect x="${x}" y="${top}" width="${barW}" height="${bottom - top}" fill="${CHANNEL_COLOR[id]}" stroke="var(--surface-1)" stroke-width="2"><title>${esc(`${g.label} – ${CHANNELS[id].name}: ${v.toFixed(1).replace('.', ',')}%`)}</title></rect>`;
      acc += v;
    }
    bars += `<text x="${padL + gi * groupW + groupW / 2}" y="${height - 8}" text-anchor="middle" class="axis-label">${esc(g.label)}</text>`;
  });
  return `<svg viewBox="0 0 ${width} ${height}" class="chart-svg" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">${grid}${bars}</svg>`;
}

function niceMax(v) {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}


