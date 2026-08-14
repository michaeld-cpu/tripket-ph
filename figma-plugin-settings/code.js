/* ============================================================================
 * Tripket — Build "Settings — All states"
 * ----------------------------------------------------------------------------
 * Rebuilds app/settings/page.tsx as native Figma frames: all three tabs
 * (Account, Configurations, System), the four catalog editors, the SaveBar and
 * the type-to-confirm SuspendLineDialog. The plugin CREATES its own section
 * below every existing section on the page and is ADDITIVE: a frame whose name
 * already exists is skipped, never replaced.
 *
 * Shares the chrome layer (sidebar, topbar, row menu, modal shell, embedded
 * logos, text measurement) byte-for-byte with the Routes / Vessels / Bookings /
 * Tickets / Shipping-lines / Reports / Accounts / Activity-logs plugins.
 * Settings-only code starts at the "S1." marker.
 *
 * Measurements are real CSS pixels at 1440x900. globals.css sets
 * html { font-size: 17px }, so rem utilities are 17px-based (p-6 = 25.5,
 * py-3.5 = 14.875) and its type-scale layer lifts a fixed list of arbitrary
 * text-[Npx] values by ~1px. Literal px classes (w-[38px] switches, the 160px
 * and 96px grid tracks, max-w-[280px]) do NOT scale.
 * ========================================================================== */

/* ── 1. Tokens ─────────────────────────────────────────────────────────── */

const C = {
  white:      '#FFFFFF',
  slate900:   '#0F172A',
  slate700:   '#334155',
  slate600:   '#475569',
  slate500:   '#64748B',
  slate400:   '#94A3B8',
  slate300:   '#CBD5E1',
  slate200:   '#E2E8F0',
  slate100:   '#F1F5F9',
  slate50:    '#F8FAFC',
  gray500:    '#6B7280',
  gray200:    '#E5E7EB',
  gray100:    '#F3F4F6',
  gray50:     '#F9FAFB',
  brand50:    '#FFF7ED',
  brand100:   '#FFEDD5',
  brand500:   '#F97316',
  brand600:   '#EA580C',
  brand700:   '#C2410C',
  emerald50:  '#ECFDF5',
  emerald100: '#D1FAE5',
  emerald500: '#10B981',
  emerald600: '#059669',
  emerald700: '#047857',
  emerald800: '#065F46',
  yellow50:   '#FEFCE8',
  yellow700:  '#A16207',
  amber100:   '#FEF3C7',
  amber500:   '#F59E0B',
  amber700:   '#B45309',
  amber800:   '#92400E',
  sky50:      '#F0F9FF',
  sky500:     '#0EA5E9',
  sky700:     '#0369A1',
  rose50:     '#FFF1F2',
  rose200:    '#FECDD3',
  rose300:    '#FDA4AF',
  rose500:    '#F43F5E',
  rose600:    '#E11D48',
  red500:     '#EF4444',
  red600:     '#DC2626',
  indigo50:   '#EEF2FF',
  indigo200:  '#C7D2FE',
  indigo600:  '#4F46E5',
  indigo700:  '#4338CA',
  amber50:    '#FFFBEB',
  amber200:   '#FDE68A',
  emerald200: '#A7F3D0',
  brand200:   '#FED7AA',
  brand300:   '#FDBA74',
  brand400:   '#FB923C',
  gray300:    '#D1D5DB',
  gray400:    '#9CA3AF',
  gray900:    '#111827',
  black:      '#000000',
};

const SP = {
  s05: 2.125, s1: 4.25, s1_5: 6.375, s2: 8.5, s2_5: 10.625,
  s3: 12.75, s3_5: 14.875, s4: 17, s5: 21.25, s6: 25.5, s8: 34, s9: 38.25,
};
const RAD = { md: 6.375, lg: 8.5, xl: 12.75, xxl: 17, full: 999 };

// Post-lift font sizes: class in source → rendered px.
const FS = {
  t8: 8, t9: 9, t9_5: 10.5, t10: 11, t10_5: 11.5, t11: 12, t11_5: 12.5,
  t12: 13, t12_5: 13.5, t13: 14, t13_5: 14.5, t15: 16, t15_5: 15.5, t17: 18,
  xs: 12.75, sm: 14.875, base: 17, xl: 21.25,
};

const LEADING = 1.5;               // browser leading-normal
const lh = (size) => size * LEADING;

const FRAME_W = 1440;
const FRAME_H = 900;
const SIDEBAR_W = 255;
const TOPBAR_H = 59.5;
const MAIN_X = SIDEBAR_W;
const MAIN_W = FRAME_W - SIDEBAR_W;
const MAIN_H = FRAME_H - TOPBAR_H;
const CONTENT_X = SP.s8;
const CONTENT_Y = SP.s6;
const CONTENT_W = MAIN_W - SP.s8 * 2;   // 1117

let FONT = { family: 'Inter', regular: 'Regular', medium: 'Medium', semibold: 'Semi Bold', bold: 'Bold' };

/* ── 2. Embedded assets ────────────────────────────────────────────────── */

// public/imgs/logo.png, recoloured white (CSS: brightness-0 invert).
const LOGO_WHITE_B64 = 'iVBORw0KGgoAAAANSUhEUgAAACcAAAAYCAYAAAB5j+RNAAACYElEQVR42rWXvY7TUBCFv6yokR+AaMMTxC0V5gk2FS0RgnoTXiCbJyC0NNntkcJ2QINp+GnASPQxYregiqFnD81c6erKdq6z2ZGs+P6fzJ1zZtyTxA6WAiPgEEiAgf2eASfevDFQAvkuhyCp63OsZhtLSiTNJG2sbyQp2+GcTuASSc9rAG0kLSSlAShnA1s/uClwA0nfakCd2FgdKGcPd/FaF3AhsEUEKGeXkj6b1/tdwPUiCbG2oHf2AFgZCdrsH/A76PsEvANebjv0IJI3pfd+6rGTCHCh3QOmMYfeigRXee9nwJLr2ZuYSbGe+xN4cBC57qqh/+0+wTnPnQOPOnioaOj/eBPgTk31Y2xq8fUYuAgI8XefGSI1pR9ru723+eEeTyR96aJ7bVLicmYKDO09a2FpBcyBhbUz4BnwFXgF/AD6Nvbrup5LFGcuUyTeupU3dukJ8dMuInywJc7yLeNz4K5XicxMsEc1bO131ZttOvfBrscHVJjWvbZ2ChwBk5orv6rJDnsDl1u8/TQwhQfo2IBnDV59YXp2AdwBblvcRVtMbs2MDEMDlbaQIrerzj0yJR7gskX7dpKSVYR0OEJkVn1sItZMttV4MeAmATPXkpbWn9RUvqGt7WkaXzaB7Ely+lV6MRXqXVKTW0dGhMwbO7c9CmtXDd8f7sz71sYYP2+KucxS09A2rWo2T71yyTH33NJa5e1zFJRVhTE/r9nTAZ15tWLZRojUC+jDYOy7553KAKR2gGN24f05l2kc2LVJUVlz7thUYArksZVw4oEIr9p5Jvbzz4FtY+0YKP8DQZycqqLnwP8AAAAASUVORK5CYII=';
// public/imgs/2go.png — the seeded active shipping line.
const LINE_LOGO_B64 = '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';

let LOGO_WHITE_HASH = null;
let LINE_LOGO_HASH = null;

function b64ToBytes(b64) {
  if (typeof figma.base64Decode === 'function') return figma.base64Decode(b64);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n = (chars.indexOf(clean[i]) << 18) | (chars.indexOf(clean[i + 1]) << 12) |
              ((chars.indexOf(clean[i + 2]) & 63) << 6) | (chars.indexOf(clean[i + 3]) & 63);
    if (p < out.length) out[p++] = (n >> 16) & 255;
    if (p < out.length) out[p++] = (n >> 8) & 255;
    if (p < out.length) out[p++] = n & 255;
  }
  return out;
}

function loadImages() {
  try { LOGO_WHITE_HASH = figma.createImage(b64ToBytes(LOGO_WHITE_B64)).hash; } catch (e) { LOGO_WHITE_HASH = null; }
  try { LINE_LOGO_HASH = figma.createImage(b64ToBytes(LINE_LOGO_B64)).hash; } catch (e) { LINE_LOGO_HASH = null; }
}

/* ── 3. Primitives ─────────────────────────────────────────────────────── */

function hex(h) {
  const n = parseInt(h.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
function fill(h, opacity) {
  const p = { type: 'SOLID', color: hex(h) };
  if (opacity !== undefined) p.opacity = opacity;
  return [p];
}

function frame(parent, name, x, y, w, h, opts) {
  const o = opts || {};
  const f = figma.createFrame();
  f.name = name;
  f.x = x; f.y = y;
  f.resize(Math.max(w, 0.01), Math.max(h, 0.01));
  f.fills = o.bg ? fill(o.bg, o.opacity) : [];
  f.clipsContent = o.clip !== undefined ? o.clip : false;
  if (o.radius !== undefined) f.cornerRadius = o.radius;
  if (o.stroke) {
    f.strokes = fill(o.stroke, o.strokeOpacity);
    f.strokeWeight = o.strokeW !== undefined ? o.strokeW : 1;
    f.strokeAlign = o.strokeAlign || 'INSIDE';
  }
  if (o.dash) f.dashPattern = o.dash;
  if (o.shadow) f.effects = o.shadow;
  parent.appendChild(f);
  return f;
}

function rect(parent, name, x, y, w, h, opts) {
  const o = opts || {};
  const r = figma.createRectangle();
  r.name = name;
  r.x = x; r.y = y;
  r.resize(Math.max(w, 0.01), Math.max(h, 0.01));
  r.fills = o.bg ? fill(o.bg, o.opacity) : [];
  if (o.radius !== undefined) r.cornerRadius = o.radius;
  if (o.stroke) {
    r.strokes = fill(o.stroke, o.strokeOpacity);
    r.strokeWeight = o.strokeW !== undefined ? o.strokeW : 1;
    r.strokeAlign = o.strokeAlign || 'INSIDE';
  }
  parent.appendChild(r);
  return r;
}

function hairline(parent, name, x, y, w, color, opacity) {
  return rect(parent, name, x, y, w, 1, { bg: color, opacity: opacity });
}

function text(parent, name, chars, x, y, opts) {
  const o = opts || {};
  const t = figma.createText();
  t.name = name || String(chars);
  t.fontName = { family: FONT.family, style: o.weight || FONT.regular };
  t.characters = String(chars);
  t.fontSize = o.size || FS.sm;
  t.fills = fill(o.color || C.slate900, o.opacity);
  if (o.tracking !== undefined) t.letterSpacing = { unit: 'PIXELS', value: o.tracking };
  t.lineHeight = { unit: 'PIXELS', value: o.lh || lh(o.size || FS.sm) };
  if (o.width) {
    t.textAutoResize = 'HEIGHT';
    t.resize(o.width, t.height);
    t.textAlignHorizontal = o.align || 'LEFT';
  } else {
    t.textAutoResize = 'WIDTH_AND_HEIGHT';
  }
  t.x = x; t.y = y;
  parent.appendChild(t);
  return t;
}

function centerIn(node, box) {
  node.x = box.x + (box.w - node.width) / 2;
  node.y = box.y + (box.h - node.height) / 2;
}

/* Text measurement — mirrors how the browser sizes nowrap table cells. */
const MEASURE_CACHE = Object.create(null);
let MEASURE_NODE = null;
function measure(chars, size, weight, tracking) {
  const key = chars + '|' + size + '|' + (weight || FONT.regular) + '|' + (tracking || 0);
  if (MEASURE_CACHE[key] !== undefined) return MEASURE_CACHE[key];
  if (!MEASURE_NODE) {
    MEASURE_NODE = figma.createText();
    MEASURE_NODE.name = '__measure__';
  }
  MEASURE_NODE.fontName = { family: FONT.family, style: weight || FONT.regular };
  MEASURE_NODE.textAutoResize = 'WIDTH_AND_HEIGHT';
  MEASURE_NODE.fontSize = size;
  MEASURE_NODE.letterSpacing = { unit: 'PIXELS', value: tracking || 0 };
  MEASURE_NODE.characters = String(chars);
  const w = MEASURE_NODE.width;
  MEASURE_CACHE[key] = w;
  return w;
}

/* SVG nodes, cached and cloned — the frames need ~1,500 glyphs. */
const SVG_CACHE = Object.create(null);
function svgNode(parent, name, svg, x, y) {
  let node;
  if (SVG_CACHE[svg]) {
    node = SVG_CACHE[svg].clone();
  } else {
    const created = figma.createNodeFromSvg(svg);
    SVG_CACHE[svg] = created;
    node = created.clone();
  }
  node.name = name;
  node.x = x; node.y = y;
  parent.appendChild(node);
  return node;
}

/** 24-viewBox icon at size `s`, tinted `color`. */
function icon(parent, name, def, x, y, s, color) {
  const sw = def.sw || 1.5;
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" ' +
    'fill="none" stroke="' + color + '" stroke-width="' + sw + '" stroke-linecap="round" ' +
    'stroke-linejoin="round">' + def.d + '</svg>';
  return svgNode(parent, name, svg, x, y);
}

function flushSvgCache() {
  Object.keys(SVG_CACHE).forEach((k) => {
    try { SVG_CACHE[k].remove(); } catch (e) { /* gone */ }
    delete SVG_CACHE[k];
  });
  if (MEASURE_NODE) { try { MEASURE_NODE.remove(); } catch (e) {} MEASURE_NODE = null; }
}

const CARD_SHADOW = [{
  type: 'DROP_SHADOW', color: { r: 15 / 255, g: 23 / 255, b: 42 / 255, a: 0.08 },
  offset: { x: 0, y: 20 }, radius: 40, spread: -24, visible: true, blendMode: 'NORMAL',
}];
const DIALOG_SHADOW = [{
  type: 'DROP_SHADOW', color: { r: 15 / 255, g: 23 / 255, b: 42 / 255, a: 0.35 },
  offset: { x: 0, y: 30 }, radius: 80, spread: -20, visible: true, blendMode: 'NORMAL',
}];
const MENU_SHADOW = [{
  type: 'DROP_SHADOW', color: { r: 15 / 255, g: 23 / 255, b: 42 / 255, a: 0.25 },
  offset: { x: 0, y: 18 }, radius: 44, spread: -16, visible: true, blendMode: 'NORMAL',
}];


/* ── 4. Icons — verbatim path data from the source components ──────────── */

// Sidebar nav (components/Sidebar.tsx). Stroke weights preserved per icon.
const NAV_ICONS = {
  dashboard: { sw: 1.5, d: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>' },
  voyage:    { sw: 1.5, d: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' },
  route:     { sw: 1.5, d: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H15a3.5 3.5 0 0 1 0 7H9a3.5 3.5 0 0 0 0 7h6.5"/>' },
  ferry:     { sw: 1.5, d: '<path d="M12 3v3"/><path d="M6 13V8h12v5"/><path d="M3 13h18l-1.8 5.2a2 2 0 0 1-1.9 1.3H6.7a2 2 0 0 1-1.9-1.3L3 13Z"/><path d="M2.5 21c1.2 0 1.2-1 2.4-1s1.2 1 2.4 1 1.2-1 2.4-1 1.2 1 2.3 1 1.2-1 2.4-1 1.2 1 2.4 1 1.2-1 2.3-1"/>' },
  bookings:  { sw: 1.5, d: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 10h6M9 14h6M9 18h4"/>' },
  tickets:   { sw: 1.5, d: '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z"/><path d="M14 6v12" stroke-dasharray="2 2"/>' },
  passengers:{ sw: 1.75, d: '<path d="M18 21.0001C17.713 17.269 14.7289 14.3151 10.995 14.0662L10 13.9999C9.64458 14.0096 9.31335 14.0225 9.00082 14.0378C5.3 14.2192 2.28417 17.3057 2 21.0001"/><path d="M18 6.49988H22"/><path d="M18 9.99988H22"/><path d="M20 13.4999H22"/><circle cx="10" cy="6.99988" r="4"/>' },
  vehicles:  { sw: 1.75, d: '<path d="M9.0072 17C9.0072 18.1046 8.11177 19 7.0072 19C5.90263 19 5.0072 18.1046 5.0072 17C5.0072 15.8954 5.90263 15 7.0072 15C8.11177 15 9.0072 15.8954 9.0072 17Z"/><path d="M19.0072 17C19.0072 18.1046 18.1118 19 17.0072 19C15.9026 19 15.0072 18.1046 15.0072 17C15.0072 15.8954 15.9026 15 17.0072 15C18.1118 15 19.0072 15.8954 19.0072 17Z"/><path d="M2.00722 10H18.0072M3.64197 5.42C3.16234 6.2 2.22306 8.26 2.00722 10C2.00722 10.78 1.98723 13.04 2.01122 15.26C2.04719 15.98 2.1671 16.58 5.00893 17M9.00722 10V5M14.9973 17H9.00189M2.02321 5H12.2394C12.2394 5 12.779 5 13.2586 5.048C14.158 5.132 14.9134 5.54 15.6688 6.56C16.4687 7.64 17.0837 9.008 17.8991 9.74C19.2541 10.9564 21.8321 10.58 21.976 13.16C22.012 14.48 22.012 15.92 21.952 16.16C21.8557 16.8667 21.3108 16.9821 20.633 17C20.0448 17.0156 19.3357 16.9721 18.9903 17"/>' },
  reports:   { sw: 1.5, d: '<path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/>' },
  accounts:  { sw: 1.5, d: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M5 16c.5-1.4 1.7-2 3-2s2.5.6 3 2"/><path d="M14 10h4M14 13.5h3"/>' },
  audit:     { sw: 1.5, d: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/>' },
  settings:  { sw: 1.5, d: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>' },
  chevronDown: { sw: 2, d: '<path d="M6 9l6 6 6-6"/>' },
  chevronLeft: { sw: 2, d: '<path d="M15 6l-6 6 6 6"/>' },
};

// Page-level icons, verbatim from the ticket pages and shared components.
const I = {
  search:      { sw: 2,    d: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>' },
  filters:     { sw: 2,    d: '<path d="M3 5h18M6 12h12M10 19h4"/>' },
  copy:        { sw: 1.75, d: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>' },
  check:       { sw: 2.5,  d: '<path d="M5 12l5 5 9-11"/>' },
  checkThin:   { sw: 2,    d: '<path d="M5 12l5 5 9-11"/>' },
  arrowRight:  { sw: 2,    d: '<path d="M5 12h14M13 6l6 6-6 6"/>' },
  sort:        { sw: 2,    d: '<path d="M7 10l5-5 5 5M7 14l5 5 5-5"/>' },
  updown:      { sw: 2,    d: '<path d="M8 9l4-4 4 4M8 15l4 4 4-4"/>' },
  chevronDown: { sw: 2,    d: '<path d="m6 9 6 6 6-6"/>' },
  chevronLeft: { sw: 2,    d: '<path d="M15 18l-6-6 6-6"/>' },
  chevronRight:{ sw: 2,    d: '<path d="M9 6l6 6-6 6"/>' },
  eye:         { sw: 1.75, d: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/>' },
  pencil:      { sw: 1.75, d: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>' },
  markPaid:    { sw: 1.75, d: '<path d="M5 12l5 5 9-11"/>' },
  refund:      { sw: 1.75, d: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>' },
  cancel:      { sw: 1.75, d: '<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>' },
  close:       { sw: 1.75, d: '<path d="M6 6l12 12M18 6 6 18"/>' },
  bell:        { sw: 1.75, d: '<path d="M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z"/><path d="M10 19a2 2 0 0 0 4 0"/>' },
  export:      { sw: 1.75, d: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 9v6"/><path d="m9 12 3 3 3-3"/>' },
  inbox:       { sw: 1.5,  d: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/>' },
  imageDash:   { sw: 1.75, d: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 17 5-5 4 4 3-3 4 4"/>' },
  photo:       { sw: 1.5,  d: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m8 13 2.5 3L14 12l4 5"/><circle cx="8.5" cy="9" r="1.5"/>' },
  userRemoved: { sw: 2,    d: '<circle cx="9" cy="8" r="3"/><path d="M4 20c0-3 2.2-5 5-5s5 2 5 5"/><path d="M16 11h5"/>' },
  comped:      { sw: 2,    d: '<path d="M3 14h18l-2 5a2 2 0 0 1-1.9 1.3H6.9A2 2 0 0 1 5 19l-2-5Z"/><path d="M5 14V8a1 1 0 0 1 1-1h7l5 4"/>' },
  // ActivityLog event glyphs (stroke-width 3 in source, drawn white on the node)
  actCreated:  { sw: 3,    d: '<path d="M12 5v14M5 12h14"/>' },
  actPaid:     { sw: 3,    d: '<path d="M5 12l5 5 9-11"/>' },
  actEdited:   { sw: 3,    d: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>' },
  // Dialog chrome added in v4
  calendar:    { sw: 1.75, d: '<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17"/>' },
  plus:        { sw: 1.8,  d: '<path d="M12 5v14M5 12h14"/>' },
  lock:        { sw: 1.9,  d: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>' },
  personRound: { sw: 1.75, d: '<circle cx="12" cy="8" r="3.4"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>' },
  carRound:    { sw: 1.6,  d: '<path d="M3 13l2-5a2 2 0 0 1 1.9-1.3h10.2A2 2 0 0 1 19 8l2 5"/><path d="M5 17h14"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>' },
};

/** Route-leg connector: dashed rule + arrowhead, viewBox 0 0 48 12, h-3 w-10. */
function legArrow(parent, name, x, y) {
  const w = 42.5, h = 12.75;
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 48 12" ' +
    'fill="none" stroke="' + C.slate300 + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M2 6 H38" stroke-dasharray="3 3"/><path d="M38 2 L44 6 L38 10"/></svg>';
  return svgNode(parent, name, svg, x, y);
}


const LINE = { name: '2GO Travel', initial: '2G' };

/* ── 7. Shared chrome ──────────────────────────────────────────────────── */

const NAV = [
  { label: 'Dashboard',     ic: NAV_ICONS.dashboard },
  { divider: true },
  { label: 'Voyages',       ic: NAV_ICONS.voyage },
  { label: 'Routes',        ic: NAV_ICONS.route },
  { label: 'Vessels',       ic: NAV_ICONS.ferry },
  { label: 'Bookings',      ic: NAV_ICONS.bookings },
  { label: 'Tickets',       ic: NAV_ICONS.tickets, group: true },
  { label: 'Passengers',    ic: NAV_ICONS.passengers, child: true },
  { label: 'Vehicles',      ic: NAV_ICONS.vehicles,   child: true },
  { label: 'Reports',       ic: NAV_ICONS.reports },
  { label: 'Accounts',      ic: NAV_ICONS.accounts, group: true },
  { label: 'Activity logs', ic: NAV_ICONS.audit },
  { divider: true },
  { label: 'Settings',      ic: NAV_ICONS.settings },
];

const NAV_ITEM_H = SP.s1_5 * 2 + lh(FS.t13_5);   // py-1.5 + leading-normal ≈ 34.5
const NAV_GAP = 1;                                // gap-px
const NAV_DIVIDER_H = 18;

/** LogoTile — white rounded-md tile, gray-200 ring, line logo object-contain. */
function logoTile(parent, x, y, size) {
  const tile = frame(parent, 'LogoTile · ' + LINE.name, x, y, size, size, {
    bg: C.white, radius: RAD.md, stroke: C.gray200, clip: true,
  });
  if (LINE_LOGO_HASH) {
    tile.fills = [
      { type: 'SOLID', color: hex(C.white) },
      { type: 'IMAGE', scaleMode: 'FIT', imageHash: LINE_LOGO_HASH },
    ];
  } else {
    const t = text(tile, 'Initial', LINE.initial, 0, 0,
      { size: FS.t10, weight: FONT.bold, color: C.slate700 });
    centerIn(t, { x: 0, y: 0, w: size, h: size });
  }
  return tile;
}

function buildSidebar(parent, activeLabel) {
  const side = frame(parent, 'Sidebar', 0, 0, SIDEBAR_W, FRAME_H, { clip: true });
  side.fills = [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[0, 1, 0], [-1, 0, 1]],
    gradientStops: [
      { position: 0,   color: Object.assign({ a: 1 }, hex('#FAFBFC')) },
      { position: 0.6, color: Object.assign({ a: 1 }, hex('#FCFCFD')) },
      { position: 1,   color: Object.assign({ a: 1 }, hex(C.white)) },
    ],
  }];
  rect(side, 'Border right', SIDEBAR_W - 1, 0, 1, FRAME_H, { bg: C.slate200, opacity: 0.7 });

  // Brand header — px-2 inside the aside's px-3, mb-6.
  const brandY = SP.s5;
  const brand = frame(side, 'Brand', SP.s3, brandY, SIDEBAR_W - SP.s3 * 2, SP.s9);
  const tile = frame(brand, 'Logo tile', SP.s2, 0, SP.s9, SP.s9, { bg: C.brand600, radius: RAD.xl, clip: true });
  if (LOGO_WHITE_HASH) {
    // img h-5 w-5 object-contain, white via brightness-0 invert.
    const img = frame(tile, 'Logo image / logo.png', (SP.s9 - SP.s5) / 2, (SP.s9 - SP.s5) / 2, SP.s5, SP.s5);
    img.fills = [{ type: 'IMAGE', scaleMode: 'FIT', imageHash: LOGO_WHITE_HASH }];
  }
  text(brand, 'Brand name', 'Tripket PH', SP.s2 + SP.s9 + SP.s2_5, (SP.s9 - lh(FS.t15)) / 2,
    { size: FS.t15, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });

  // Navigation — starts after the brand block's mb-6.
  const navY = brandY + SP.s9 + SP.s6;
  const nav = frame(side, 'Navigation', SP.s3, navY, SIDEBAR_W - SP.s3 * 2, 10);
  let y = 0;
  NAV.forEach((entry) => {
    if (entry.divider) {
      const d = frame(nav, 'Divider', 0, y, nav.width, NAV_DIVIDER_H);
      hairline(d, 'Rule', SP.s3, NAV_DIVIDER_H / 2, nav.width - SP.s3 * 2, C.slate200, 0.7);
      y += NAV_DIVIDER_H + NAV_GAP;
      return;
    }
    const active = entry.label === activeLabel;
    // Source: the active leaf gets weight + colour only — no background tint.
    const item = frame(nav, 'Nav item · ' + entry.label, 0, y, nav.width, NAV_ITEM_H, { radius: RAD.md });
    if (active) {
      rect(item, 'Active indicator', 0, (NAV_ITEM_H - SP.s5) / 2, 3, SP.s5, { bg: C.brand500, radius: 1.5 });
    }
    const px = entry.child ? SP.s9 : SP.s3;   // pl-9 for group children
    icon(item, 'Icon', entry.ic, px, (NAV_ITEM_H - 18) / 2, 18, active ? C.brand600 : C.slate400);
    text(item, 'Label', entry.label, px + 18 + SP.s3, (NAV_ITEM_H - lh(FS.t13_5)) / 2, {
      size: FS.t13_5,
      weight: active ? FONT.medium : FONT.regular,
      color: active ? C.slate900 : C.slate600,
      tracking: active ? -0.2 : 0,
    });
    if (entry.group) {
      icon(item, 'Icon · chevron', NAV_ICONS.chevronDown, nav.width - SP.s3 - 14,
        (NAV_ITEM_H - 14) / 2, 14, C.slate400);
    }
    y += NAV_ITEM_H + NAV_GAP;
  });
  nav.resize(nav.width, y);

  // User block — mt-4, border-t, pt-3; pinned to the bottom by the flex-1 nav.
  const btnH = SP.s2 * 2 + SP.s8;                       // py-2 + h-8 avatar
  const blockH = SP.s4 + 1 + SP.s3 + btnH;
  const blockY = FRAME_H - SP.s5 - blockH;
  const block = frame(side, 'User block', SP.s3, blockY, SIDEBAR_W - SP.s3 * 2, blockH);
  hairline(block, 'Border top', 0, SP.s4, block.width, C.slate200, 0.7);
  const btnY = SP.s4 + 1 + SP.s3;
  const av = frame(block, 'Avatar', SP.s2, btnY + SP.s2, SP.s8, SP.s8,
    { bg: C.brand100, radius: RAD.lg });
  const ini = text(av, 'Initials', 'MD', 0, 0, { size: FS.t10, weight: FONT.bold, color: C.brand600 });
  centerIn(ini, { x: 0, y: 0, w: SP.s8, h: SP.s8 });
  const tx = SP.s2 + SP.s8 + SP.s2_5;
  text(block, 'Role', 'Admin', tx, btnY + SP.s2 + 1,
    { size: FS.t12, weight: FONT.medium, color: C.slate900 });
  text(block, 'Email', 'michael@tripket.ph', tx, btnY + SP.s2 + 1 + lh(FS.t12),
    { size: FS.t10, color: C.slate500 });

  // Collapse handle — absolute -right-3 top-1/2, h-6 w-6, 2px white ring.
  const collapse = frame(side, 'Button - Collapse sidebar', SIDEBAR_W - 13, FRAME_H / 2 - 13, 26, 26,
    { bg: C.brand600, radius: RAD.full, stroke: C.white, strokeW: 2 });
  icon(collapse, 'Icon', NAV_ICONS.chevronLeft, (26 - 14.875) / 2, (26 - 14.875) / 2, 14.875, C.white);
  return side;
}

function buildTopbar(parent) {
  const bar = frame(parent, 'Header', 0, 0, MAIN_W, TOPBAR_H, { bg: C.white });
  hairline(bar, 'Border bottom', 0, TOPBAR_H - 1, MAIN_W, C.slate200, 0.7);

  // ShippingLineSwitcher — px-2 py-1.5 rounded-lg, no border in the rest state.
  const nameW = measure(LINE.name, FS.sm, FONT.medium);
  const swW = SP.s2 * 2 + 25.5 + SP.s2 + nameW + SP.s1 + SP.s5;
  const swH = SP.s1_5 * 2 + lh(FS.sm);
  const sw = frame(bar, 'ShippingLineSwitcher', SP.s6, (TOPBAR_H - swH) / 2, swW, swH, { radius: RAD.lg });
  logoTile(sw, SP.s2, (swH - 25.5) / 2, 25.5);
  text(sw, 'Line name', LINE.name, SP.s2 + 25.5 + SP.s2, (swH - lh(FS.sm)) / 2,
    { size: FS.sm, weight: FONT.medium, color: C.slate900 });
  const chev = frame(sw, 'Chevron box', SP.s2 + 25.5 + SP.s2 + nameW + SP.s1, (swH - SP.s5) / 2,
    SP.s5, SP.s5, { bg: C.gray100, radius: RAD.md });
  icon(chev, 'Icon', I.updown, (SP.s5 - 12.75) / 2, (SP.s5 - 12.75) / 2, 12.75, C.gray500);

  const notif = frame(bar, 'Button - Notifications', MAIN_W - SP.s6 - SP.s9, (TOPBAR_H - SP.s9) / 2,
    SP.s9, SP.s9, { radius: RAD.full });
  icon(notif, 'Icon', I.bell, (SP.s9 - SP.s5) / 2, (SP.s9 - SP.s5) / 2, SP.s5, C.slate600);
  rect(notif, 'Unread dot', SP.s9 - SP.s2 - 6.375, SP.s2, 6.375, 6.375, { bg: C.red500, radius: RAD.full });
  return bar;
}

function buildPageHeader(parent, title) {
  const btnH = SP.s1_5 * 2 + lh(FS.sm);
  const h = frame(parent, 'Page header', 0, 0, CONTENT_W, Math.max(lh(FS.xl), btnH));
  text(h, 'Page title', title, 0, 0,
    { size: FS.xl, weight: FONT.semibold, color: C.slate900, tracking: -0.5 });

  const labelW = measure('Export', FS.sm, FONT.medium);
  const btnW = SP.s3 * 2 + 17 + SP.s1_5 + labelW;
  const btn = frame(h, 'Button - Export', CONTENT_W - btnW, 0, btnW, btnH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  icon(btn, 'Icon', I.export, SP.s3, (btnH - 17) / 2, 17, C.slate500);
  text(btn, 'Label', 'Export', SP.s3 + 17 + SP.s1_5, (btnH - lh(FS.sm)) / 2,
    { size: FS.sm, weight: FONT.medium, color: C.slate700 });
  return h;
}

let LAST_SHELL = null;
function buildShell(name, x, y, pageTitle, activeNav) {
  const f = frame(figma.currentPage, name, x, y, FRAME_W, FRAME_H, { bg: C.white, clip: true });
  LAST_SHELL = f;
  buildSidebar(f, activeNav);
  const right = frame(f, 'Container', MAIN_X, 0, MAIN_W, FRAME_H);
  buildTopbar(right);
  const main = frame(right, 'Main Content', 0, TOPBAR_H, MAIN_W, MAIN_H, { clip: true });
  const content = frame(main, 'Container', CONTENT_X, CONTENT_Y, CONTENT_W, 1500);
  const header = buildPageHeader(content, pageTitle);
  return { frame: f, content: content, bodyY: header.height + SP.s6 };
}


/* ── 8. Table primitives ───────────────────────────────────────────────── */

const CELL_PAD_X = SP.s6;                                   // px-6
const CELL_PAD_Y = SP.s4;                                   // py-4
const TWO_LINE_H = lh(FS.t13) + SP.s05 + lh(FS.t11);        // code + mt-0.5 + city
const ROW_H = CELL_PAD_Y * 2 + TWO_LINE_H;
const THEAD_H = SP.s3 * 2 + lh(FS.t11);
const TOOLBAR_H = SP.s4 * 2 + lh(FS.base) + SP.s05 + lh(FS.xs);
const PAGER_H = SP.s3 * 2 + 29.75;
const COPY_BTN = SP.s5;
const ACTIONS_W = CELL_PAD_X * 2 + 29.75;

function pillWidth(tone) {
  return measure(tone.label.toUpperCase(), FS.t10, FONT.semibold, 0.96) + SP.s2 * 2;
}
function statusPill(parent, name, x, y, tone) {
  const label = tone.label.toUpperCase();
  const w = pillWidth(tone);
  const h = lh(FS.t10) + SP.s05 * 2;
  const pill = frame(parent, name, x, y, w, h, { bg: tone.bg, radius: RAD.md });
  text(pill, 'Label', label, SP.s2, SP.s05,
    { size: FS.t10, weight: FONT.semibold, color: tone.fg, tracking: 0.96 });
  return pill;
}

function copyIdWidth(value) {
  return measure(value, FS.t12_5, FONT.semibold, 0.54) + SP.s1_5 + COPY_BTN;
}
function copyableId(parent, value, x, y, copied) {
  const t = text(parent, 'Value', value, x, y,
    { size: FS.t12_5, weight: FONT.semibold, color: C.slate900, tracking: 0.54 });
  const b = frame(parent, copied ? 'Copied indicator' : 'Button - Copy',
    x + t.width + SP.s1_5, y + (t.height - COPY_BTN) / 2, COPY_BTN, COPY_BTN, { radius: RAD.md });
  icon(b, 'Icon', copied ? I.check : I.copy, (COPY_BTN - 14.875) / 2, (COPY_BTN - 14.875) / 2,
    14.875, copied ? C.emerald600 : C.slate400);
  return t;
}

/* Route cell: flex items-center gap-2.5 — [code/city] → [code/city]. */
function routeBlockW(code, city) {
  return Math.max(
    measure(code, FS.t13, FONT.bold, -0.3),
    measure('(' + city + ')', FS.t11, FONT.regular)
  );
}
function routeCellW(r) {
  return routeBlockW(r.oc, r.ocity) + SP.s2_5 + 14.875 + SP.s2_5 + routeBlockW(r.dc, r.dcity);
}
function routeCell(parent, r, x, y) {
  const ow = routeBlockW(r.oc, r.ocity);
  text(parent, 'Origin code', r.oc, x, y,
    { size: FS.t13, weight: FONT.bold, color: C.slate900, tracking: -0.3 });
  text(parent, 'Origin city', '(' + r.ocity + ')', x, y + lh(FS.t13) + SP.s05,
    { size: FS.t11, color: C.slate400 });
  const ax = x + ow + SP.s2_5;
  icon(parent, 'Icon · arrow', I.arrowRight, ax, y + (TWO_LINE_H - 14.875) / 2, 14.875, C.slate300);
  const dx = ax + 14.875 + SP.s2_5;
  text(parent, 'Destination code', r.dc, dx, y,
    { size: FS.t13, weight: FONT.bold, color: C.slate900, tracking: -0.3 });
  text(parent, 'Destination city', '(' + r.dcity + ')', dx, y + lh(FS.t13) + SP.s05,
    { size: FS.t11, color: C.slate400 });
}

function departureW(r) {
  return measure(r.dep, FS.t13, FONT.semibold, -0.3) + SP.s1_5 + measure(r.tm, FS.t13, FONT.medium);
}

/**
 * Lay columns out the way a browser sizes an auto table: each column is the
 * widest cell it holds plus px-6 either side; the table then stretches to its
 * min-width if the natural total falls short.
 */

function layoutColumns(defs, rows, minWidth) {
  let x = 0;
  const cols = defs.map((d) => {
    let contentW = measure(d.label.toUpperCase(), FS.t11, FONT.medium, 0.96);
    if (d.sortable) contentW += SP.s1_5 + 12.75;
    rows.forEach((r) => { contentW = Math.max(contentW, d.width(r)); });
    const w = contentW + CELL_PAD_X * 2;
    const col = { key: d.key, label: d.label, sortable: d.sortable, x: x, w: w };
    x += w;
    return col;
  });
  const natural = x + ACTIONS_W;
  if (natural < minWidth) {
    // Browsers distribute the slack proportionally across the columns.
    const slack = minWidth - natural;
    let acc = 0;
    cols.forEach((c, i) => {
      const share = slack * (c.w / x);
      c.x += acc;
      acc += share;
      c.w += share;
    });
    return { cols: cols, width: minWidth };
  }
  return { cols: cols, width: natural };
}

function buildToolbar(card, title, showing, placeholder, isQuery, withFilters, filterCount) {
  const tb = frame(card, 'Toolbar', 0, 0, card.width, TOOLBAR_H);
  hairline(tb, 'Border bottom', 0, TOOLBAR_H - 1, card.width, C.slate100);
  text(tb, 'Toolbar title', title, SP.s5, SP.s4,
    { size: FS.base, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  const cap = text(tb, 'Toolbar caption', showing, SP.s5, SP.s4 + lh(FS.base) + SP.s05,
    { size: FS.xs, color: C.slate500 });
  const m = /^Showing (\S+)/.exec(showing);
  if (m) {
    cap.setRangeFills(8, 8 + m[1].length, fill(C.slate900));
    cap.setRangeFontName(8, 8 + m[1].length, { family: FONT.family, style: FONT.medium });
  }

  let right = card.width - SP.s5;
  const ctlH = SP.s9;
  const ctlY = (TOOLBAR_H - ctlH) / 2;

  if (withFilters) {
    const lw = measure('Filters', FS.t13, FONT.medium);
    let fw = SP.s3 * 2 + 14.875 + SP.s2 + lw;
    if (filterCount > 0) fw += SP.s2 + SP.s5;
    const fb = frame(tb, 'Button - Filters', right - fw, ctlY, fw, ctlH,
      { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
    icon(fb, 'Icon', I.filters, SP.s3, (ctlH - 14.875) / 2, 14.875, C.slate500);
    text(fb, 'Label', 'Filters', SP.s3 + 14.875 + SP.s2, (ctlH - lh(FS.t13)) / 2,
      { size: FS.t13, weight: FONT.medium, color: C.slate700 });
    if (filterCount > 0) {
      const badge = frame(fb, 'Active count', fw - SP.s3 - SP.s5, (ctlH - SP.s5) / 2, SP.s5, SP.s5,
        { bg: C.brand500, radius: RAD.full });
      const bt = text(badge, 'Count', String(filterCount), 0, 0,
        { size: FS.t9_5, weight: FONT.semibold, color: C.white });
      centerIn(bt, { x: 0, y: 0, w: SP.s5, h: SP.s5 });
    }
    right -= fw + SP.s2;
  }

  const searchW = 306;                       // w-72
  const searchH = SP.s1_5 * 2 + lh(FS.sm);
  const sb = frame(tb, 'Search field', right - searchW, (TOOLBAR_H - searchH) / 2, searchW, searchH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  icon(sb, 'Icon · search', I.search, SP.s3, (searchH - 17) / 2, 17, C.slate400);
  text(sb, isQuery ? 'Query' : 'Placeholder', placeholder, SP.s3 + 17 + SP.s2,
    (searchH - lh(FS.sm)) / 2, { size: FS.sm, color: isQuery ? C.slate900 : C.slate400 });
  return tb;
}

function buildPager(card, y, summary, page, totalPages) {
  const p = frame(card, 'Pagination', 0, y, card.width, PAGER_H);
  hairline(p, 'Border top', 0, 0, card.width, C.slate100);
  text(p, 'Summary', summary, SP.s5, (PAGER_H - lh(FS.t12)) / 2, { size: FS.t12, color: C.slate500 });

  const chipH = 29.75;
  const cy = (PAGER_H - chipH) / 2;
  let x = card.width - SP.s5;

  const nextW = SP.s2_5 * 2 + measure('Next', FS.t12, FONT.medium) + SP.s1 + 12.75;
  const next = frame(p, 'Button - Next', x - nextW, cy, nextW, chipH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(next, 'Label', 'Next', SP.s2_5, (chipH - lh(FS.t12)) / 2,
    { size: FS.t12, weight: FONT.medium, color: C.slate700 });
  icon(next, 'Icon', I.chevronRight, nextW - SP.s2_5 - 12.75, (chipH - 12.75) / 2, 12.75, C.slate700);
  x -= nextW + SP.s1;

  for (let n = totalPages; n >= 1; n--) {
    const isActive = n === page;
    const cw = Math.max(29.75, measure(String(n), FS.t12) + SP.s2 * 2);
    const chip = frame(p, 'Page chip ' + n, x - cw, cy, cw, chipH, {
      bg: isActive ? C.brand500 : C.white, radius: RAD.lg, stroke: isActive ? undefined : C.slate200,
    });
    const ct = text(chip, 'Number', String(n), 0, 0,
      { size: FS.t12, color: isActive ? C.white : C.slate700 });
    centerIn(ct, { x: 0, y: 0, w: cw, h: chipH });
    x -= cw + SP.s1;
  }
  x -= SP.s1;

  const prevW = SP.s2_5 * 2 + 12.75 + SP.s1 + measure('Previous', FS.t12, FONT.medium);
  const prev = frame(p, 'Button - Previous', x - prevW, cy, prevW, chipH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  prev.opacity = page === 1 ? 0.4 : 1;
  icon(prev, 'Icon', I.chevronLeft, SP.s2_5, (chipH - 12.75) / 2, 12.75, C.slate700);
  text(prev, 'Label', 'Previous', SP.s2_5 + 12.75 + SP.s1, (chipH - lh(FS.t12)) / 2,
    { size: FS.t12, weight: FONT.medium, color: C.slate700 });
  return p;
}

function kebab(parent, x, y, open) {
  const b = frame(parent, 'Button - Row actions', x, y, 29.75, 29.75,
    { bg: open ? C.slate100 : undefined, radius: RAD.lg });
  const col = open ? C.slate900 : C.slate500;
  for (let i = 0; i < 3; i++) {
    rect(b, 'Dot', 29.75 / 2 - 1.5, 8 + i * 5.5, 3, 3, { bg: col, radius: RAD.full });
  }
  return b;
}

function buildStickyActions(scroll, rows, bodyH, menuRowIndex) {
  const sticky = frame(scroll, 'Actions column (sticky)', CONTENT_W - ACTIONS_W, 0,
    ACTIONS_W, THEAD_H + bodyH, { bg: C.white, opacity: 0.7 });
  rect(sticky, 'Left shadow', 0, 0, 8, THEAD_H + bodyH, { bg: C.slate900, opacity: 0.04 });
  const sh = frame(sticky, 'Header cell', 0, 0, ACTIONS_W, THEAD_H, { bg: C.slate50, opacity: 0.7 });
  hairline(sh, 'Border bottom', 0, THEAD_H - 1, ACTIONS_W, C.slate100);
  rows.forEach((r, i) => {
    const cell = frame(sticky, 'Actions cell', 0, THEAD_H + i * ROW_H, ACTIONS_W, ROW_H,
      { bg: menuRowIndex === i ? C.slate50 : C.white, opacity: 0.7 });
    if (i > 0) hairline(cell, 'Divider', 0, 0, ACTIONS_W, C.slate100);
    kebab(cell, CELL_PAD_X, (ROW_H - 29.75) / 2, menuRowIndex === i);
  });
  return sticky;
}

function buildThead(table, cols, width) {
  const thead = frame(table, 'Table header', 0, 0, width, THEAD_H, { bg: C.slate50, opacity: 0.5 });
  hairline(thead, 'Border bottom', 0, THEAD_H - 1, width, C.slate100);
  cols.forEach((c) => {
    const lt = text(thead, 'Header ' + c.label, c.label.toUpperCase(), c.x + CELL_PAD_X, SP.s3,
      { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
    if (c.sortable) {
      icon(thead, 'Icon · sort', I.sort, c.x + CELL_PAD_X + lt.width + SP.s1_5,
        SP.s3 + (lh(FS.t11) - 12.75) / 2, 12.75, C.slate300);
    }
  });
  return thead;
}


function buildSkeleton(parent, y, rowCount) {
  const headerH = SP.s4 * 2 + 17 + SP.s2 + 12.75;
  const colsH = SP.s3 * 2 + 12.75;
  const rowH = SP.s4 * 2 + SP.s5;
  const h = headerH + colsH + rowCount * rowH;
  const card = frame(parent, 'Table skeleton', 0, y, CONTENT_W, h,
    { bg: C.white, radius: RAD.xl, stroke: C.gray200, clip: true });

  const head = frame(card, 'Skeleton header', 0, 0, CONTENT_W, headerH);
  hairline(head, 'Border bottom', 0, headerH - 1, CONTENT_W, C.gray100);
  rect(head, 'Bar', SP.s5, SP.s4, 170, 17, { bg: C.gray200, radius: RAD.md });
  rect(head, 'Bar', SP.s5, SP.s4 + 17 + SP.s2, 272, 12.75, { bg: C.gray200, radius: RAD.md });

  const cols = frame(card, 'Skeleton column labels', 0, headerH, CONTENT_W, colsH, { bg: C.gray50 });
  for (let i = 0; i < 6; i++) {
    rect(cols, 'Bar', SP.s5 + i * (85 + SP.s6), SP.s3, 85, 12.75, { bg: C.gray200, radius: RAD.md });
  }

  const widths = [85, 136, 170, 102, 68, 85];
  for (let r = 0; r < rowCount; r++) {
    const row = frame(card, 'Skeleton row', 0, headerH + colsH + r * rowH, CONTENT_W, rowH);
    if (r > 0) hairline(row, 'Divider', 0, 0, CONTENT_W, C.gray100);
    let x = SP.s5;
    widths.forEach((w, i) => {
      const isPill = i === widths.length - 1;
      rect(row, 'Bar', x, (rowH - (isPill ? SP.s5 : 17)) / 2, w, isPill ? SP.s5 : 17,
        { bg: C.gray200, radius: isPill ? RAD.full : RAD.md });
      x += w + SP.s6;
    });
  }
  return card;
}

function buildEmptyState(parent, y, title, body) {
  const h = 400;
  const panel = frame(parent, 'Empty state', 0, y, CONTENT_W, h,
    { bg: C.white, radius: RAD.xxl, stroke: C.slate200, dash: [6, 4], clip: true });

  const badgeS = 51;
  const badge = frame(panel, 'Icon badge', (CONTENT_W - badgeS) / 2, 0, badgeS, badgeS,
    { bg: C.slate100, radius: RAD.full, stroke: C.slate200, strokeOpacity: 0.7 });
  icon(badge, 'Icon', I.inbox, (badgeS - 25.5) / 2, (badgeS - 25.5) / 2, 25.5, C.slate400);

  const t = text(panel, 'Title', title, 0, 0,
    { size: FS.t15, weight: FONT.semibold, color: C.slate900, tracking: -0.3, width: CONTENT_W, align: 'CENTER' });
  const b = text(panel, 'Body', body, (CONTENT_W - 448) / 2, 0,
    { size: FS.t12_5, color: C.slate500, lh: FS.t12_5 * 1.6, width: 448, align: 'CENTER' });

  const block = badgeS + SP.s4 + t.height + SP.s1_5 + b.height;
  const top = (h - block) / 2;
  badge.y = top;
  t.y = top + badgeS + SP.s4;
  b.y = t.y + t.height + SP.s1_5;
  return panel;
}

function buildRowMenu(parent, triggerX, triggerY, items) {
  const W = 221;         // w-52
  const ITEM_H = 32;
  const h = items.length * ITEM_H + 8;
  const menu = frame(parent, 'Row actions menu', triggerX + 29.75 - W, triggerY + 29.75 + 6, W, h, {
    bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.7, clip: true, shadow: MENU_SHADOW,
  });
  items.forEach((it, i) => {
    const tile = frame(menu, 'Menu item · ' + it.label, SP.s1, SP.s1 + i * ITEM_H, W - SP.s2, ITEM_H - 2,
      { radius: RAD.md });
    const col = it.disabled ? C.slate300 : it.danger ? C.rose600 : C.slate700;
    icon(tile, 'Icon', it.ic, SP.s2, (ITEM_H - 2 - 17) / 2, 17, col);
    text(tile, 'Label', it.label, SP.s2 + 17 + SP.s2, (ITEM_H - 2 - lh(FS.t12_5)) / 2,
      { size: FS.t12_5, weight: FONT.medium, color: col });
  });
  return menu;
}

function buildScrim(parent, opacity) {
  return rect(parent, 'Scrim', 0, 0, FRAME_W, FRAME_H,
    { bg: C.black, opacity: opacity === undefined ? 0.55 : opacity });
}

/**
 * Modal shell (components/Modal.tsx) — non-dismissing backdrop at black/30
 * (black/40 for layer="top"), rounded-2xl, border-gray-200, and its own
 * heavier shadow. Distinct from TicketDetailDialog, which rolls its own
 * black/55 scrim and a slate ring.
 */
const MODAL_SHADOW = [{
  type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.18 },
  offset: { x: 0, y: 24 }, radius: 60, spread: 0, visible: true, blendMode: 'NORMAL',
}];

function buildModal(parent, name, W, H, top) {
  buildScrim(parent, top ? 0.4 : 0.3);
  return frame(parent, name, (FRAME_W - W) / 2, (FRAME_H - H) / 2, W, H, {
    bg: C.white, radius: RAD.xxl, stroke: C.gray200, clip: true, shadow: MODAL_SHADOW,
  });
}

/* Toast (components/ToastContext.tsx) — pill pinned bottom-6, centred. */
function buildToast(parent, message, variant) {
  const bg = variant === 'error' ? C.red600 : variant === 'info' ? C.gray900 : C.brand600;
  const h = SP.s2_5 * 2 + lh(FS.sm);
  const w = SP.s4 * 2 + SP.s5 + SP.s2_5 + measure(message, FS.sm, FONT.medium);
  const pill = frame(parent, 'Toast · ' + message, (FRAME_W - w) / 2, FRAME_H - SP.s6 - h, w, h, {
    bg: bg, radius: RAD.full,
    shadow: [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.25 },
               offset: { x: 0, y: 8 }, radius: 24, spread: 0, visible: true, blendMode: 'NORMAL' }],
  });
  const badge = frame(pill, 'Icon badge', SP.s4, (h - SP.s5) / 2, SP.s5, SP.s5,
    { bg: C.white, opacity: 0.2, radius: RAD.full });
  icon(badge, 'Icon', variant === 'error' ? I.close : I.check,
    (SP.s5 - 12.75) / 2, (SP.s5 - 12.75) / 2, 12.75, C.white);
  text(pill, 'Message', message, SP.s4 + SP.s5 + SP.s2_5, (h - lh(FS.sm)) / 2,
    { size: FS.sm, weight: FONT.medium, color: C.white });
  return pill;
}

/* Select trigger — components/Select.tsx, default px-3 py-2. */
function selectTrigger(parent, name, x, y, w, label, placeholder) {
  const h = SP.s2 * 2 + lh(FS.sm);
  const f = frame(parent, name, x, y, w, h, { bg: C.white, radius: RAD.lg, stroke: C.gray200 });
  const t = text(f, placeholder ? 'Placeholder' : 'Value', label, SP.s3, (h - lh(FS.sm)) / 2,
    { size: FS.sm, color: placeholder ? C.gray400 : C.gray900 });
  if (placeholder) t.fontName = { family: FONT.family, style: FONT.italic || FONT.regular };
  icon(f, 'Icon · chevron', I.chevronDown, w - SP.s3 - 14.875, (h - 14.875) / 2, 14.875, C.gray400);
  return f;
}

/* DateRangePicker trigger — px-3 py-1.5, brand-500 calendar glyph. */
function dateRangeTrigger(parent, x, y, label) {
  const h = SP.s1_5 * 2 + lh(FS.sm);
  const w = SP.s3 * 2 + 17 + SP.s2 + measure(label, FS.sm, FONT.medium) + SP.s2 + 14.875;
  const f = frame(parent, 'DateRangePicker', x, y, w, h,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  icon(f, 'Icon · calendar', I.calendar, SP.s3, (h - 17) / 2, 17, C.brand500);
  text(f, 'Range', label, SP.s3 + 17 + SP.s2, (h - lh(FS.sm)) / 2,
    { size: FS.sm, weight: FONT.medium, color: C.slate700 });
  icon(f, 'Icon · chevron', I.chevronDown, w - SP.s3 - 14.875, (h - 14.875) / 2, 14.875, C.slate400);
  return f;
}


function buildFiltersDialog(parent, fields, activeCount) {
  const W = 448;                                       // max-w-md
  const headH = SP.s4 * 2 + lh(FS.t15) + SP.s05 + lh(FS.t12);
  const fieldLabelH = SP.s1_5 + lh(FS.t11_5);
  const selH = SP.s2 * 2 + lh(FS.sm);
  const dateH = SP.s1_5 * 2 + lh(FS.sm);
  let bodyH = SP.s4 * 2;
  fields.forEach((f, i) => {
    bodyH += fieldLabelH + (f.kind === 'dateRange' ? dateH : selH) + (i < fields.length - 1 ? SP.s4 : 0);
  });
  const footH = SP.s3_5 * 2 + SP.s1_5 * 2 + lh(FS.sm);
  const H = headH + bodyH + footH;

  const dlg = buildModal(parent, 'Dialog - Filters', W, H, false);

  const head = frame(dlg, 'Header', 0, 0, W, headH);
  hairline(head, 'Border bottom', 0, headH - 1, W, C.slate100);
  text(head, 'Title', 'Filters', SP.s5, SP.s4,
    { size: FS.t15, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  text(head, 'Subtitle',
    activeCount === 0 ? 'No filters applied yet.'
      : activeCount + ' filter' + (activeCount === 1 ? '' : 's') + ' active.',
    SP.s5, SP.s4 + lh(FS.t15) + SP.s05, { size: FS.t12, color: C.slate500 });
  const close = frame(head, 'Button - Close filters', W - SP.s5 - 29.75, SP.s4, 29.75, 29.75,
    { radius: RAD.md });
  icon(close, 'Icon', I.close, (29.75 - 14.875) / 2, (29.75 - 14.875) / 2, 14.875, C.slate400);

  const body = frame(dlg, 'Fields', 0, headH, W, bodyH);
  let fy = SP.s4;
  fields.forEach((f) => {
    text(body, 'Field label', f.label.toUpperCase(), SP.s5, fy,
      { size: FS.t11_5, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
    const cy = fy + fieldLabelH;
    if (f.kind === 'dateRange') dateRangeTrigger(body, SP.s5, cy, f.value);
    else selectTrigger(body, 'Select - ' + f.label, SP.s5, cy, W - SP.s5 * 2, f.value, false);
    fy = cy + (f.kind === 'dateRange' ? dateH : selH) + SP.s4;
  });

  const foot = frame(dlg, 'Footer', 0, headH + bodyH, W, footH);
  hairline(foot, 'Border top', 0, 0, W, C.slate100);
  const btnH = SP.s1_5 * 2 + lh(FS.sm);
  const by = (footH - btnH) / 2;
  text(foot, 'Reset all', 'Reset all', SP.s5, (footH - lh(FS.t12_5)) / 2,
    { size: FS.t12_5, weight: FONT.medium, color: C.slate500 });
  const applyW = SP.s3 * 2 + measure('Apply filters', FS.sm, FONT.medium);
  const cancelW = SP.s3 * 2 + measure('Cancel', FS.sm, FONT.medium);
  const cancel = frame(foot, 'Button - Cancel', W - SP.s5 - applyW - SP.s2 - cancelW, by, cancelW, btnH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(cancel, 'Label', 'Cancel', SP.s3, SP.s1_5, { size: FS.sm, weight: FONT.medium, color: C.slate700 });
  const apply = frame(foot, 'Button - Apply filters', W - SP.s5 - applyW, by, applyW, btnH,
    { bg: C.brand600, radius: RAD.lg });
  text(apply, 'Label', 'Apply filters', SP.s3, SP.s1_5, { size: FS.sm, weight: FONT.medium, color: C.white });
  return dlg;
}


const GRID_COLS = 4, GRID_GAP = 40, GRID_MARGIN_X = 64, GRID_MARGIN_Y = 96;

async function loadFonts() {
  const candidates = [
    { family: 'Inter',     regular: 'Regular', medium: 'Medium', semibold: 'Semi Bold', bold: 'Bold' },
    { family: 'Roboto',    regular: 'Regular', medium: 'Medium', semibold: 'Medium',    bold: 'Bold' },
    { family: 'Helvetica', regular: 'Regular', medium: 'Bold',   semibold: 'Bold',      bold: 'Bold' },
  ];
  for (const c of candidates) {
    try {
      const styles = [c.regular, c.medium, c.semibold, c.bold].filter((s, i, a) => a.indexOf(s) === i);
      for (const s of styles) await figma.loadFontAsync({ family: c.family, style: s });
      // Optional — only the Select placeholder is italic; fall back silently.
      try { await figma.loadFontAsync({ family: c.family, style: 'Italic' }); c.italic = 'Italic'; }
      catch (e) { c.italic = c.regular; }
      return c;
    } catch (e) { /* next family */ }
  }
  throw new Error('Could not load Inter, Roboto or Helvetica.');
}


/* ============================================================================
 * S1. Settings — tokens, icons and seed data
 * ----------------------------------------------------------------------------
 * Sources: app/settings/page.tsx, lib/settings-data.ts, components/SaveBar.tsx,
 * components/SuspendLineDialog.tsx, components/RowMenu.tsx,
 * components/Select.tsx, components/PageHeader.tsx.
 * ========================================================================== */

const C5 = {
  rose700:   '#BE123C',
  emerald300:'#6EE7B7',
  gray700:   '#374151',
  slate800:  '#1E293B',
};
Object.keys(C5).forEach((k) => { if (C[k] === undefined) C[k] = C5[k]; });

const SI = {
  plus:      { sw: 2,    d: '<path d="M12 5v14M5 12h14"/>' },
  plusBold:  { sw: 2.25, d: '<path d="M12 5v14M5 12h14"/>' },
  trash:     { sw: 1.75, d: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6"/>' },
  eye:       { sw: 1.75, d: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/>' },
  chevDown:  { sw: 2,    d: '<path d="m6 9 6 6 6-6"/>' },
  bench:     { sw: 1.75, d: '<rect x="3" y="10" width="18" height="8" rx="1"/><path d="M6 10V7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3"/><path d="M3 18v2M21 18v2"/>' },
  pause:     { sw: 1.75, d: '<circle cx="12" cy="12" r="9"/><path d="M9 9h2v6H9zM13 9h2v6h-2z"/>' },
  camera:    { sw: 1.75, d: '<path d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4l-1.5-2Z"/><circle cx="12" cy="13" r="3.5"/>' },
};

const TABS = [
  { id: 'account', label: 'Account' },
  { id: 'booking', label: 'Configurations' },
  { id: 'system',  label: 'System', badge: 'GLOBAL' },
];

const CONFIG_SECTIONS = [
  { id: 'passenger-types', label: 'Passenger types' },
  { id: 'vehicle-classes', label: 'Vehicle classes' },
  { id: 'add-ons',         label: 'Add-ons' },
  { id: 'accommodations',  label: 'Accommodations' },
];

// lib/settings-data.ts — DEFAULT_VEHICLE_CLASSES, verbatim.
const VEHICLE_CLASSES = [
  { label: 'Motorcycle / Tricycle', descriptor: '≤ 300 kg GVW',   max: '300',   slots: '1', price: '300',  pax: '1' },
  { label: 'Car / SUV / Van',       descriptor: '≤ 3,500 kg GVW', max: '3500',  slots: '2', price: '1500', pax: '1' },
  { label: 'Pickup / AUV',          descriptor: '≤ 3,500 kg GVW', max: '3500',  slots: '2', price: '1800', pax: '1' },
  { label: 'Light Truck / Elf',     descriptor: '3.5 – 7 tons',   max: '7000',  slots: '3', price: '3500', pax: '1' },
  { label: 'Heavy Truck / Trailer', descriptor: '7+ tons',        max: '12000', slots: '5', price: '6500', pax: '2' },
  { label: 'Bus / Minibus',         descriptor: '≤ 12 m length',  max: '12 m',  slots: '6', price: '5000', pax: '2' },
];

// DEFAULT_PASSENGER_TYPES — discountKind is undefined on every seed row, so
// `kind = p.discountKind ?? "percent"` makes them all percent.
const PASSENGER_TYPES = [
  { label: 'Senior Citizen',               amount: '20',  doc: 'OSCA ID / Senior Citizen ID' },
  { label: 'Person with Disability (PWD)', amount: '20',  doc: 'PWD ID (national or LGU-issued)' },
  { label: 'Student',                      amount: '10',  doc: 'Valid school ID' },
  { label: 'Infant',                       amount: '100', doc: 'Birth certificate or PSA copy' },
];

// DEFAULT_ADD_ONS
const ADD_ONS = [
  { label: 'Extra Cabin Bag',      descriptor: 'Beyond included carry-on',       price: '150' },
  { label: 'Onboard Meal Pack',    descriptor: 'Hot meal + drink mid-voyage',    price: '250' },
  { label: 'Priority Boarding',    descriptor: 'Skip the gate queue',            price: '150' },
  { label: 'Arrival Vehicle Wash', descriptor: 'RoRo-only · cleaned on arrival', price: '300' },
];

// SYSTEM_SETTINGS — verbatim, including the truncated description on row 5.
const SYSTEM_SETTINGS = [
  { scope: 'SYSTEM', label: 'Application Name',       desc: 'The name displayed throughout the application.',            key: 'app.name',             value: 'Acme CMS',          editable: true },
  { scope: 'SYSTEM', label: 'Application URL',        desc: 'Base URL of the application.',                              key: 'app.url',              value: 'https://acme.test', editable: true },
  { scope: 'APP',    label: 'Maintenance Mode',       desc: 'Enable or disable maintenance mode.',                       key: 'app.maintenance',      value: '1',                 editable: false },
  { scope: 'APP',    label: 'Default Language',       desc: 'Default locale used by the application.',                   key: 'app.locale',           value: 'en',                editable: false },
  { scope: 'ADMIN',  label: 'Maximum Login Attempts', desc: 'Number of failed login attempts before locking a…',         key: 'auth.max_attempts',    value: '5',                 editable: false },
  { scope: 'ADMIN',  label: 'Password Policy',        desc: 'Password validation requirements.',                         key: 'auth.password_policy', value: '{"minLength":12,"uppercase":true,"lowercase":true,"numbers":true,"symbols":true}', editable: false },
  { scope: 'SYSTEM', label: 'PHP Version',            desc: 'Current PHP runtime version.',                              key: 'system.php_version',   value: '8.3.6',             editable: true },
  { scope: 'APP',    label: 'Allowed File Types',     desc: 'Supported upload file extensions.',                         key: 'files.allowed_types',  value: '["jpg","png","pdf","docx"]', editable: false },
  { scope: 'ADMIN',  label: 'Session Timeout',        desc: 'Session expiration time in minutes.',                       key: 'session.timeout',      value: '30',                editable: false },
  { scope: 'SYSTEM', label: 'Debug Mode',             desc: 'Indicates whether debug mode is enabled.',                  key: 'app.debug',            value: '0',                 editable: true },
];

const SCOPE_TONE = {
  SYSTEM: { bg: C.slate100,  fg: C.slate600 },
  APP:    { bg: C.emerald50, fg: C.emerald700 },
  ADMIN:  { bg: C.sky50,     fg: C.sky700 },
};

// defaultAccount("2GO Travel", "2go")
const ACCOUNT = {
  displayName: '2GO Travel',
  website: 'https://www.2go.ph',
  contactEmail: 'support@2go.ph',
  contactPhone: '+63 2 8888 0000',
  address: 'Pier 4, North Harbor, Manila',
  scheduleDaysAhead: '30',
  paymentProvider: 'Asbir Pay',
  bookingProvider: '2GO Travel',
  bookingCutoffMinutes: '30',
  requireMobile: true,
  requireAddress: true,
  autoConfirm: false,
};
const PAYMENT_PROVIDERS = ['Asbir Pay', 'Beetzee Pay', 'Maayo Pay'];
const BOOKING_PROVIDERS = ['Maayo Shipping', 'Tripket Direct', 'Partner Agency'];


/* ── S2. Page chrome ───────────────────────────────────────────────────── */

const TAB_H = SP.s2_5 * 2 + lh(FS.t13);              // px-4 py-2.5 text-[13px]
const RAIL_W = 221;                                   // w-52
const CARD_PAD = SP.s6;                               // p-6

/** PageHeader — title only; showExport defaults to true so Export renders. */
function settingsPageHeader(parent) {
  const btnH = SP.s1_5 * 2 + lh(FS.sm) + 2;
  const h = frame(parent, 'Page header', 0, 0, CONTENT_W, Math.max(lh(FS.xl), btnH));
  const H = h.height;
  text(h, 'Page title', 'Settings', 0, (H - lh(FS.xl)) / 2,
    { size: FS.xl, weight: FONT.semibold, color: C.slate900, tracking: -0.5 });
  const eW = SP.s3 * 2 + 17 + SP.s1_5 + measure('Export', FS.sm, FONT.medium) + 2;
  const ex = frame(h, 'Button - Export', CONTENT_W - eW, (H - btnH) / 2, eW, btnH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  icon(ex, 'Icon', I.export, SP.s3, (btnH - 17) / 2, 17, C.slate500);
  text(ex, 'Label', 'Export', SP.s3 + 17 + SP.s1_5, (btnH - lh(FS.sm)) / 2,
    { size: FS.sm, weight: FONT.medium, color: C.slate700 });
  return h;
}

/** Tab bar — gap-1, border-b, brand underline on the active tab. */
function settingsTabs(parent, y, activeId) {
  const bar = frame(parent, 'Tab bar', 0, y, CONTENT_W, TAB_H);
  hairline(bar, 'Border bottom', 0, TAB_H - 1, CONTENT_W, C.slate200);
  let x = 0;
  TABS.forEach((t) => {
    const labelW = measure(t.label, FS.t13, FONT.medium);
    let w = SP.s4 * 2 + labelW;
    let badgeW = 0;
    if (t.badge) {
      badgeW = SP.s1_5 * 2 + measure(t.badge, FS.t9, FONT.semibold, 0.72);
      w += SP.s1_5 + badgeW;
    }
    const on = t.id === activeId;
    const tab = frame(bar, 'Tab · ' + t.label, x, 0, w, TAB_H);
    text(tab, 'Label', t.label, SP.s4, (TAB_H - lh(FS.t13)) / 2,
      { size: FS.t13, weight: FONT.medium, color: on ? C.brand600 : C.slate500 });
    if (t.badge) {
      const bh = SP.s05 * 2 + lh(FS.t9);
      const b = frame(tab, 'Badge', SP.s4 + labelW + SP.s1_5, (TAB_H - bh) / 2, badgeW, bh,
        { bg: C.brand50, radius: RAD.full, stroke: C.brand200 });
      text(b, 'Label', t.badge, SP.s1_5, SP.s05,
        { size: FS.t9, weight: FONT.semibold, color: C.brand600, tracking: 0.72 });
    }
    if (on) {
      // absolute inset-x-2 -bottom-px h-0.5 rounded-full
      rect(tab, 'Active underline', SP.s2, TAB_H - 1, w - SP.s2 * 2, 2,
        { bg: C.brand500, radius: RAD.full });
    }
    x += w + SP.s1;                                   // gap-1
  });
  return bar;
}

/** Card — rounded-2xl p-6 ring-1. Returns { card, bodyY, innerW }. */
function sCard(parent, x, y, w, title, subtitle) {
  const card = frame(parent, 'Card · ' + title, x, y, w, 10,
    { bg: C.white, radius: RAD.xxl, stroke: C.slate200, strokeOpacity: 0.7, shadow: CARD_SHADOW });
  const innerW = w - CARD_PAD * 2;
  text(card, 'Title', title, CARD_PAD, CARD_PAD,
    { size: FS.t15, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  const sub = text(card, 'Subtitle', subtitle, CARD_PAD, CARD_PAD + lh(FS.t15) + SP.s05,
    { size: FS.t12_5, color: C.slate500, width: innerW });
  const bodyY = CARD_PAD + lh(FS.t15) + SP.s05 + sub.height + SP.s4;   // mt-4
  return { card: card, bodyY: bodyY, innerW: innerW, x: CARD_PAD };
}
function sCardClose(c, bodyH) {
  c.card.resize(c.card.width, c.bodyY + bodyH + CARD_PAD);
  return c.card.height;
}


/* ── S3. Catalog editors ───────────────────────────────────────────────── */

const CAT_INPUT_H = SP.s1_5 * 2 + lh(FS.t12_5) + 2;   // px-2.5 py-1.5 text-[12.5px]
const CAT_ROW_PY = SP.s2;                             // py-2
const REMOVE_BTN = 29.75;                             // h-7 w-7

/** CatalogHeader — label + hint on the left, "n of m" + Add on the right. */
function catalogHeader(parent, x, y, w, hint, used, total, addLabel) {
  // Right cluster first — the left block wraps into whatever it leaves.
  const addH = SP.s1 * 2 + lh(FS.t11);
  const addW = SP.s2 * 2 + 12.75 + SP.s1 + measure(addLabel, FS.t11, FONT.medium);
  const countLabel = used + ' of ' + total;
  const countW = measure(countLabel, FS.t11, FONT.regular);
  const rightW = countW + SP.s3 + addW;                // gap-3 between the two
  const leftW = w - rightW - SP.s3;                    // gap-3 from justify-between

  text(parent, 'Catalog label', 'CATALOG', x, y,
    { size: FS.t10_5, weight: FONT.semibold, color: C.slate400, tracking: 1.61 });
  const hintT = text(parent, 'Hint', hint, x, y + lh(FS.t10_5) + SP.s1,
    { size: FS.t11_5, color: C.slate500, width: leftW });
  const leftH = lh(FS.t10_5) + SP.s1 + hintT.height;   // hint can wrap to 2 lines

  const add = frame(parent, 'Button - ' + addLabel, x + w - addW, y, addW, addH,
    { bg: C.brand50, radius: RAD.md });
  icon(add, 'Icon · plus', SI.plusBold, SP.s2, (addH - 12.75) / 2, 12.75, C.brand700);
  text(add, 'Label', addLabel, SP.s2 + 12.75 + SP.s1, SP.s1,
    { size: FS.t11, weight: FONT.medium, color: C.brand700 });

  const ct = text(parent, 'Count', countLabel, x + w - addW - SP.s3 - countW, y + 1,
    { size: FS.t11, color: C.slate400 });
  try {
    ct.setRangeFills(0, String(used).length, fill(C.slate700));
    ct.setRangeFontName(0, String(used).length, { family: FONT.family, style: FONT.medium });
  } catch (e) { /* defensive */ }

  return Math.max(leftH, addH) + SP.s3;                // mb-3
}

/** Column header strip — text-[10px] uppercase, pb-2, border-b. */
function catalogColumns(parent, x, y, cols) {
  const h = lh(FS.t10) + SP.s2 + 1;
  let cx = x;
  cols.forEach((c) => {
    if (c.label) {
      const t = text(parent, 'Th · ' + c.label, c.label.toUpperCase(), 0, y,
        { size: FS.t10, weight: FONT.semibold, color: C.slate400, tracking: 1.1 });
      t.x = c.right ? cx + c.w - t.width : cx;
    }
    cx += c.w + SP.s2;
  });
  hairline(parent, 'Border bottom', x, y + lh(FS.t10) + SP.s2, cx - SP.s2 - x, C.slate100);
  return h;
}

function catInput(parent, x, y, w, value, placeholder, opts) {
  const o = opts || {};
  const f = frame(parent, 'Input · ' + (value || placeholder || ''), x, y, w, CAT_INPUT_H,
    { bg: C.white, radius: RAD.md, stroke: C.slate200 });
  const t = text(f, value ? 'Value' : 'Placeholder', value || placeholder || '', SP.s2_5, SP.s1_5 + 1,
    { size: FS.t12_5, color: value ? C.slate900 : C.slate400, tracking: -0.2 });
  if (o.right) t.x = w - SP.s2_5 - t.width;
  if (o.mono && MONO) t.fontName = { family: MONO.family, style: MONO.regular };
  return f;
}

/** Boxed numeric field with a trailing (or leading) unit label. */
function catUnitBox(parent, x, y, w, value, unit, leading) {
  const f = frame(parent, 'Input · ' + value + ' ' + unit, x, y, w, CAT_INPUT_H,
    { bg: C.white, radius: RAD.md, stroke: C.slate200 });
  if (leading) {
    text(f, 'Unit', unit, SP.s2, (CAT_INPUT_H - lh(FS.t11)) / 2,
      { size: FS.t11, weight: FONT.medium, color: C.slate400 });
    const t = text(f, 'Value', value, 0, SP.s1_5 + 1,
      { size: FS.t12_5, color: C.slate900 });
    if (MONO) t.fontName = { family: MONO.family, style: MONO.regular };
    t.x = w - SP.s2 - t.width;
  } else {
    const u = text(f, 'Unit', unit, 0, (CAT_INPUT_H - lh(FS.t10_5)) / 2,
      { size: FS.t10_5, weight: FONT.medium, color: C.slate400 });
    u.x = w - SP.s2 - u.width;
    const t = text(f, 'Value', value, 0, SP.s1_5 + 1,
      { size: FS.t12_5, color: C.slate900 });
    if (MONO) t.fontName = { family: MONO.family, style: MONO.regular };
    t.x = u.x - SP.s1 - t.width;
  }
  return f;
}

function removeButton(parent, x, y) {
  const b = frame(parent, 'Button - Remove', x, y, REMOVE_BTN, REMOVE_BTN, { radius: RAD.md });
  icon(b, 'Icon · trash', SI.trash, (REMOVE_BTN - 14.875) / 2, (REMOVE_BTN - 14.875) / 2,
    14.875, C.slate400);
  return b;
}

/** grid-cols-[…] with `fr` units resolved against the available width. */
function gridCols(spec, total, gap) {
  const gaps = (spec.length - 1) * gap;
  let fixed = 0, frs = 0;
  spec.forEach((s) => { if (typeof s === 'number') fixed += s; else frs += s.fr; });
  const per = (total - gaps - fixed) / frs;
  return spec.map((s) => (typeof s === 'number' ? s : s.fr * per));
}

function passengerTypesEditor(parent, x, y, w, rows, opts) {
  const o = opts || {};
  const used = rows.filter((r) => r.label.trim()).length;
  let cy = y + catalogHeader(parent, x, y, w,
    'Set the discount % and required document for each fare category. Mark Infant if the row is the free-fare / no-seat type.',
    used, rows.length, 'Add type');

  const cw = gridCols([{ fr: 1.4 }, 160, { fr: 1.4 }, 36], w, SP.s2);
  cy += catalogColumns(parent, x, cy, [
    { label: 'Category', w: cw[0] },
    { label: 'Discount (% or ₱)', w: cw[1], right: true },
    { label: 'Required document', w: cw[2] },
    { label: '', w: cw[3] },
  ]);

  const DISC_H = SP.s9;                                // h-9
  const rowH = CAT_ROW_PY * 2 + Math.max(CAT_INPUT_H, DISC_H, REMOVE_BTN);
  if (!rows.length) {
    const t = text(parent, 'Empty', 'No passenger types. Add one to make it available to vessels.',
      x, cy + SP.s3, { size: FS.t11_5, color: C.slate400, width: w, align: 'CENTER' });
    return cy + SP.s3 * 2 + t.height - y;
  }
  rows.forEach((r, i) => {
    if (i > 0) hairline(parent, 'Divider', x, cy, w, C.slate100);
    const ry = cy + (i > 0 ? 1 : 0) + CAT_ROW_PY;
    let cx = x;
    catInput(parent, cx, ry + (rowH - CAT_ROW_PY * 2 - CAT_INPUT_H) / 2, cw[0], r.label, 'e.g. Senior Citizen');
    cx += cw[0] + SP.s2;

    // Discount = [unit segmented button] + [number] + ["off"]
    const pct = !(o.flatRow === i);
    const box = frame(parent, 'Discount', cx, ry, cw[1], DISC_H,
      { bg: C.white, radius: RAD.md, stroke: C.slate200 });
    const symW = SP.s2 + measure(pct ? '%' : '₱', FS.t13, FONT.semibold) + SP.s05 + 12.75 + SP.s1;
    const unit = frame(box, 'Unit toggle', 0, 0, symW, DISC_H, { bg: C.slate50 });
    text(unit, 'Symbol', pct ? '%' : '₱', SP.s2, (DISC_H - lh(FS.t13)) / 2,
      { size: FS.t13, weight: FONT.semibold, color: C.slate700 });
    icon(unit, 'Icon · chevron', SI.chevDown, symW - SP.s1 - 12.75, (DISC_H - 12.75) / 2, 12.75, C.slate400);
    rect(box, 'Border right', symW, 0, 1, DISC_H, { bg: C.slate200 });
    const offW = SP.s2 + measure('OFF', FS.t10_5, FONT.medium, 0.63);
    text(box, 'Off', 'OFF', cw[1] - offW, (DISC_H - lh(FS.t10_5)) / 2,
      { size: FS.t10_5, weight: FONT.medium, color: C.slate400, tracking: 0.63 });
    const amt = text(box, 'Amount', r.amount, 0, (DISC_H - lh(FS.t13)) / 2,
      { size: FS.t13, color: C.slate900 });
    if (MONO) amt.fontName = { family: MONO.family, style: MONO.regular };
    amt.x = cw[1] - offW - SP.s2 - amt.width;
    cx += cw[1] + SP.s2;

    catInput(parent, cx, ry + (rowH - CAT_ROW_PY * 2 - CAT_INPUT_H) / 2, cw[2], r.doc,
      'e.g. OSCA ID / Senior Citizen ID');
    cx += cw[2] + SP.s2;
    removeButton(parent, cx + (cw[3] - REMOVE_BTN) / 2, ry + (DISC_H - REMOVE_BTN) / 2);
    cy += rowH + (i > 0 ? 1 : 0);
  });
  return cy - y;
}

function vehicleClassesEditor(parent, x, y, w, rows) {
  const used = rows.filter((r) => r.label.trim()).length;
  let cy = y + catalogHeader(parent, x, y, w,
    'Set the label, descriptor, default fare, and weight or length limit for each class.',
    used, rows.length, 'Add class');

  const cw = gridCols([{ fr: 1.4 }, { fr: 1.2 }, 96, 80, 96, 72, 36], w, SP.s2);
  cy += catalogColumns(parent, x, cy, [
    { label: 'Label', w: cw[0] },
    { label: 'Descriptor', w: cw[1] },
    { label: 'Max (kg / m)', w: cw[2], right: true },
    { label: 'Slots', w: cw[3], right: true },
    { label: 'Default fare', w: cw[4], right: true },
    { label: 'Companions', w: cw[5], right: true },
    { label: '', w: cw[6] },
  ]);

  const rowH = CAT_ROW_PY * 2 + CAT_INPUT_H;
  if (!rows.length) {
    const t = text(parent, 'Empty', 'No vehicle classes. Add one to make it available to vessels.',
      x, cy + SP.s3, { size: FS.t11_5, color: C.slate400, width: w, align: 'CENTER' });
    return cy + SP.s3 * 2 + t.height - y;
  }
  rows.forEach((r, i) => {
    if (i > 0) hairline(parent, 'Divider', x, cy, w, C.slate100);
    const ry = cy + (i > 0 ? 1 : 0) + CAT_ROW_PY;
    let cx = x;
    catInput(parent, cx, ry, cw[0], r.label, 'e.g. Motorcycle / Tricycle'); cx += cw[0] + SP.s2;
    catInput(parent, cx, ry, cw[1], r.descriptor, 'e.g. ≤ 300 kg GVW');     cx += cw[1] + SP.s2;
    catInput(parent, cx, ry, cw[2], r.max, '3500', { right: true, mono: true }); cx += cw[2] + SP.s2;
    catUnitBox(parent, cx, ry, cw[3], r.slots, 'slots');                    cx += cw[3] + SP.s2;
    catUnitBox(parent, cx, ry, cw[4], r.price, '₱', true);                  cx += cw[4] + SP.s2;
    catUnitBox(parent, cx, ry, cw[5], r.pax, 'pax');                        cx += cw[5] + SP.s2;
    removeButton(parent, cx + (cw[6] - REMOVE_BTN) / 2, ry + (CAT_INPUT_H - REMOVE_BTN) / 2);
    cy += rowH + (i > 0 ? 1 : 0);
  });
  return cy - y;
}

function addOnsEditor(parent, x, y, w, rows) {
  const used = rows.filter((r) => r.label.trim()).length;
  let cy = y + catalogHeader(parent, x, y, w,
    'Default prices for every add-on. Vessels can toggle them on or off but cannot override the price.',
    used, rows.length, 'Add add-on');

  const cw = gridCols([{ fr: 1.3 }, { fr: 1.5 }, 96, 36], w, SP.s2);
  cy += catalogColumns(parent, x, cy, [
    { label: 'Name', w: cw[0] },
    { label: 'Descriptor', w: cw[1] },
    { label: 'Default price', w: cw[2], right: true },
    { label: '', w: cw[3] },
  ]);

  const rowH = CAT_ROW_PY * 2 + CAT_INPUT_H;
  rows.forEach((r, i) => {
    if (i > 0) hairline(parent, 'Divider', x, cy, w, C.slate100);
    const ry = cy + (i > 0 ? 1 : 0) + CAT_ROW_PY;
    let cx = x;
    catInput(parent, cx, ry, cw[0], r.label, 'e.g. Extra Cabin Bag');       cx += cw[0] + SP.s2;
    catInput(parent, cx, ry, cw[1], r.descriptor, 'e.g. Beyond included carry-on'); cx += cw[1] + SP.s2;
    catUnitBox(parent, cx, ry, cw[2], r.price, '₱', true);                  cx += cw[2] + SP.s2;
    removeButton(parent, cx + (cw[3] - REMOVE_BTN) / 2, ry + (CAT_INPUT_H - REMOVE_BTN) / 2);
    cy += rowH + (i > 0 ? 1 : 0);
  });
  return cy - y;
}

/** Accommodations — a dashed placeholder; the editor isn't built yet. */
function accommodationsPlaceholder(parent, x, y, w) {
  const box = frame(parent, 'Placeholder · No accommodation tiers', x, y, w, 10,
    { bg: C.slate50, opacity: 0.4, radius: RAD.xl, stroke: C.slate200, dash: [5, 4] });
  const PY = SP.s4 * 2.5;                              // py-10
  const badge = frame(box, 'Icon badge', (w - SP.s9) / 2, PY, SP.s9, SP.s9,
    { bg: C.slate100, radius: RAD.full });
  icon(badge, 'Icon · bench', SI.bench, (SP.s9 - 17) / 2, (SP.s9 - 17) / 2, 17, C.slate400);
  const t = text(box, 'Title', 'No accommodation tiers yet', 0, PY + SP.s9 + SP.s2,
    { size: FS.t13, weight: FONT.semibold, color: C.slate700, tracking: -0.2, width: w, align: 'CENTER' });
  const p = text(box, 'Body',
    'Accommodation tiers are configured per vessel for now. Line-level defaults will live here soon.',
    (w - 408) / 2, PY + SP.s9 + SP.s2 + t.height + SP.s1,
    { size: FS.t12, color: C.slate500, lh: FS.t12 * 1.625, width: 408, align: 'CENTER' });
  const h = PY * 2 + SP.s9 + SP.s2 + t.height + SP.s1 + p.height;
  box.resize(w, h);
  return h;
}


/* ── S4. Configurations tab ────────────────────────────────────────────── */

/** Left rail — "On this page" + four topics, brand pill on the active one. */
function configRail(parent, x, y, activeId) {
  const rail = frame(parent, 'On this page', x, y, RAIL_W, 10);
  text(rail, 'Rail label', 'ON THIS PAGE', SP.s3, 0,
    { size: FS.t10_5, weight: FONT.semibold, color: C.slate400, tracking: 1.15 });
  let ry = lh(FS.t10_5) + SP.s2;                       // mb-2
  const itemH = SP.s1_5 * 2 + lh(FS.t12_5);
  CONFIG_SECTIONS.forEach((s) => {
    const on = s.id === activeId;
    const item = frame(rail, 'Topic · ' + s.label, 0, ry, RAIL_W, itemH,
      { bg: on ? C.brand50 : undefined, radius: RAD.md });
    if (on) {
      rect(item, 'Active indicator', 0, (itemH - 17) / 2, 3, 17,
        { bg: C.brand500, radius: 1.5 });
    }
    text(item, 'Label', s.label, SP.s3, SP.s1_5, {
      size: FS.t12_5, weight: on ? FONT.medium : FONT.regular,
      color: on ? C.brand700 : C.slate600,
    });
    ry += itemH + SP.s05;                              // space-y-0.5
  });
  rail.resize(RAIL_W, ry);
  return rail;
}

const CONFIG_CARDS = {
  'passenger-types': {
    title: 'Passenger types',
    subtitle: 'Fare categories with their default discount and required document. These appear when pricing every departure.',
  },
  'vehicle-classes': {
    title: 'Vehicle classes',
    subtitle: 'Define the vehicle catalog for this shipping line. Vessels toggle which classes they accept; edits here flow live into every vessel that uses them.',
  },
  'add-ons': {
    title: 'Add-ons',
    subtitle: 'Optional extras passengers can buy on top of their base ticket. Vessels toggle which extras they offer; the price comes from here.',
  },
  'accommodations': {
    title: 'Accommodations',
    subtitle: 'Seating tiers (Economy / Tourist / Business) this shipping line offers. Vessels pick from these and set their own seat counts and fares.',
  },
};

function buildConfigTab(parent, y, o) {
  o = o || {};
  const section = o.section || 'passenger-types';
  configRail(parent, 0, y + SP.s4, section);           // sticky top-4

  const colX = RAIL_W + SP.s6;                         // gap-6
  const colW = CONTENT_W - colX - SP.s1;               // pr-1 gutter
  const spec = CONFIG_CARDS[section];
  const c = sCard(parent, colX, y, colW, spec.title, spec.subtitle);

  let bodyH = 0;
  if (section === 'passenger-types') {
    const rows = o.rows || PASSENGER_TYPES;
    bodyH = passengerTypesEditor(c.card, c.x, c.bodyY, c.innerW, rows, { flatRow: o.flatRow });
  } else if (section === 'vehicle-classes') {
    bodyH = vehicleClassesEditor(c.card, c.x, c.bodyY, c.innerW, o.rows || VEHICLE_CLASSES);
  } else if (section === 'add-ons') {
    bodyH = addOnsEditor(c.card, c.x, c.bodyY, c.innerW, ADD_ONS);
  } else {
    bodyH = accommodationsPlaceholder(c.card, c.x, c.bodyY, c.innerW);
  }
  sCardClose(c, bodyH);
  return c.card;
}


/* ── S5. Account tab ───────────────────────────────────────────────────── */

const ACC_INPUT_H = SP.s2 * 2 + lh(FS.t13) + 2;       // px-3 py-2 text-[13px]
const ACC_LABEL_H = lh(FS.t12_5);                     // mb-1.5 block

function accField(parent, x, y, w, label, value, placeholder, opts) {
  const o = opts || {};
  text(parent, 'Field label', label, x, y,
    { size: FS.t12_5, weight: FONT.semibold, color: C.slate700, tracking: -0.2 });
  const iy = y + ACC_LABEL_H + SP.s1_5;
  if (o.select) {
    const f = frame(parent, 'Select · ' + value, x, iy, w, SP.s2 * 2 + lh(FS.sm) + 2,
      { bg: C.white, radius: RAD.lg, stroke: o.open ? C.gray300 : C.gray200 });
    text(f, 'Value', value, SP.s3, SP.s2 + 1, { size: FS.sm, color: C.gray900 });
    const chev = icon(f, 'Icon · chevron', I.chevronDown, w - SP.s3 - 14.875,
      (f.height - 14.875) / 2, 14.875, C.gray400);
    if (o.open) chev.rotation = 180;
    return ACC_LABEL_H + SP.s1_5 + f.height;
  }
  const f = frame(parent, 'Input · ' + (value || placeholder || ''), x, iy, w, ACC_INPUT_H,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(f, value ? 'Value' : 'Placeholder', value || placeholder || '', SP.s3, SP.s2 + 1,
    { size: FS.t13, color: value ? C.slate900 : C.slate400 });
  return ACC_LABEL_H + SP.s1_5 + ACC_INPUT_H;
}

/** RuleToggle — bordered row, label + description, switch on the right. */
function ruleToggle(parent, x, y, w, label, desc, on) {
  const SW_W = 38, SW_H = 22, KNOB = 18;
  const txtW = w - SP.s4 * 2 - SP.s4 - SW_W;
  const box = frame(parent, 'RuleToggle · ' + label, x, y, w, 10,
    { bg: C.white, radius: RAD.xl, stroke: C.slate200 });
  const t = text(box, 'Label', label, SP.s4, SP.s3,
    { size: FS.t13, weight: FONT.medium, color: C.slate900, tracking: -0.2 });
  const d = text(box, 'Description', desc, SP.s4, SP.s3 + lh(FS.t13) + SP.s05,
    { size: FS.t11_5, color: C.slate500, lh: FS.t11_5 * 1.375, width: txtW });
  const h = SP.s3 * 2 + lh(FS.t13) + SP.s05 + d.height + 2;
  box.resize(w, h);
  t.y = (h - (lh(FS.t13) + SP.s05 + d.height)) / 2;
  d.y = t.y + lh(FS.t13) + SP.s05;
  const sw = frame(box, 'Switch · ' + (on ? 'On' : 'Off'), w - SP.s4 - SW_W, (h - SW_H) / 2,
    SW_W, SW_H, { bg: on ? C.brand600 : C.slate300, radius: RAD.full });
  frame(sw, 'Knob', on ? 18 : 2, (SW_H - KNOB) / 2, KNOB, KNOB, { bg: C.white, radius: RAD.full });
  return h;
}

function buildAccountTab(parent, y, o) {
  o = o || {};
  const W = CONTENT_W;
  const colW = (W - CARD_PAD * 2 - SP.s4) / 2;
  const col2 = CARD_PAD + colW + SP.s4;
  let cy = y;

  /* Line Profile */
  const p = sCard(parent, 0, cy, W, 'Line Profile',
    'How this shipping line appears across Tripket. Saved to this line only.');
  // Identity strip — logo tile + display name + line id
  const idH = SP.s3 * 2 + 46.75;
  const strip = frame(p.card, 'Identity', CARD_PAD, p.bodyY, p.innerW, idH,
    { bg: C.slate50, opacity: 0.7, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.6 });
  const tile = frame(strip, 'LogoTile', SP.s4, SP.s3, 46.75, 46.75,
    { bg: C.white, radius: RAD.lg, stroke: C.gray200, clip: true });
  if (LINE_LOGO_HASH) {
    tile.fills = [
      { type: 'SOLID', color: hex(C.white) },
      { type: 'IMAGE', scaleMode: 'FIT', imageHash: LINE_LOGO_HASH },
    ];
  }
  const nx = SP.s4 + 46.75 + SP.s3;
  const nameH = lh(FS.t13_5) + lh(FS.t10);
  text(strip, 'Display name', ACCOUNT.displayName, nx, (idH - nameH) / 2,
    { size: FS.t13_5, weight: FONT.semibold, color: C.slate900, tracking: -0.2 });
  const lid = text(strip, 'Line id', '2go', nx, (idH - nameH) / 2 + lh(FS.t13_5),
    { size: FS.t10, color: C.slate400 });
  if (MONO) lid.fontName = { family: MONO.family, style: MONO.regular };

  let fy = p.bodyY + idH + SP.s5;                      // mb-5
  const rowH = ACC_LABEL_H + SP.s1_5 + ACC_INPUT_H;
  accField(p.card, CARD_PAD, fy, colW, 'Display name', ACCOUNT.displayName);
  accField(p.card, col2, fy, colW, 'Website', ACCOUNT.website, 'https://');
  accField(p.card, CARD_PAD, fy + rowH + SP.s4, colW, 'Support email', ACCOUNT.contactEmail);
  accField(p.card, col2, fy + rowH + SP.s4, colW, 'Contact number', ACCOUNT.contactPhone);
  accField(p.card, CARD_PAD, fy + (rowH + SP.s4) * 2, p.innerW, 'Business address', ACCOUNT.address);
  const profileBody = idH + SP.s5 + rowH * 3 + SP.s4 * 2;
  cy += sCardClose(p, profileBody) + SP.s5;           // space-y-5

  /* Settings */
  const s = sCard(parent, 0, cy, W, 'Settings', 'Configure booking behavior and payment providers.');
  let sy = s.bodyY;
  accField(s.card, CARD_PAD, sy, colW, 'Schedule days ahead', ACCOUNT.scheduleDaysAhead, '30');
  const selH = accField(s.card, col2, sy, colW, 'Payment provider', ACCOUNT.paymentProvider, null,
    { select: true, open: o.selectOpen === 'payment' });
  const r2 = sy + Math.max(rowH, selH) + SP.s4;
  accField(s.card, CARD_PAD, r2, colW, 'Booking provider', ACCOUNT.bookingProvider, null, { select: true });
  accField(s.card, col2, r2, colW, 'Booking cutoff (minutes)', ACCOUNT.bookingCutoffMinutes, '30');
  let ry = r2 + Math.max(rowH, selH) + SP.s6;         // mt-6
  hairline(s.card, 'Divider', CARD_PAD, ry, s.innerW, C.slate100);
  ry += 1 + SP.s4;                                     // pt-4
  text(s.card, 'Rules label', 'BOOKING RULES', CARD_PAD, ry,
    { size: FS.t10_5, weight: FONT.semibold, color: C.slate400, tracking: 1.38 });
  ry += lh(FS.t10_5) + SP.s3;
  const rules = o.rules || ACCOUNT;
  ry += ruleToggle(s.card, CARD_PAD, ry, s.innerW, 'Require mobile number',
    'Customers must provide a phone number.', rules.requireMobile) + SP.s2_5;
  ry += ruleToggle(s.card, CARD_PAD, ry, s.innerW, 'Require address',
    'Customers must provide their address.', rules.requireAddress) + SP.s2_5;
  ry += ruleToggle(s.card, CARD_PAD, ry, s.innerW, 'Auto confirm bookings',
    'Bookings are confirmed immediately after payment.', rules.autoConfirm);
  cy += sCardClose(s, ry - s.bodyY) + SP.s5;

  /* Danger zone — admin only */
  const suspended = o.status === 'suspended';
  const d = frame(parent, 'Card · Danger zone', 0, cy, W, 10,
    { bg: C.white, radius: RAD.xxl, stroke: C.rose200, strokeOpacity: 0.7, shadow: CARD_SHADOW });
  text(d, 'Title', 'Danger zone', CARD_PAD, CARD_PAD,
    { size: FS.t15, weight: FONT.semibold, color: C.rose700, tracking: -0.3 });
  const copy = suspended
    ? 'This line is disabled — it is not accepting new bookings and its future schedules are hidden. Enable to restore it.'
    : 'Disabling stops new bookings and hides future schedules for this line. Existing bookings are honored. You can enable it again at any time.';
  const dp = text(d, 'Body', copy, CARD_PAD, CARD_PAD + lh(FS.t15) + SP.s05,
    { size: FS.t12_5, color: suspended ? C.rose600 : C.slate500, width: W - CARD_PAD * 2 });
  const dbY = CARD_PAD + lh(FS.t15) + SP.s05 + dp.height + SP.s4;
  const dLabel = suspended ? 'Enable shipping line' : 'Disable shipping line';
  const dbH = SP.s1_5 * 2 + lh(FS.sm) + 2;
  const dbW = SP.s3 * 2 + measure(dLabel, FS.sm, FONT.medium) + 2;
  const db = frame(d, 'Button - ' + dLabel, CARD_PAD, dbY, dbW, dbH,
    { bg: C.white, radius: RAD.lg, stroke: suspended ? C.emerald200 : C.rose200 });
  text(db, 'Label', dLabel, SP.s3, SP.s1_5 + 1,
    { size: FS.sm, weight: FONT.medium, color: suspended ? C.emerald700 : C.rose600 });
  d.resize(W, dbY + dbH + CARD_PAD);
  return cy + d.height;
}


/* ── S6. System tab ────────────────────────────────────────────────────── */

const SYS_PX = SP.s4;                                  // px-4

function buildSystemTab(parent, y, o) {
  o = o || {};
  const card = frame(parent, 'Card · System Settings', 0, y, CONTENT_W, 10,
    { bg: C.white, radius: RAD.xxl, stroke: C.slate200, strokeOpacity: 0.7,
      clip: true, shadow: CARD_SHADOW });
  const innerW = CONTENT_W - CARD_PAD * 2;

  text(card, 'Title', 'System Settings', CARD_PAD, CARD_PAD,
    { size: FS.base, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  text(card, 'Subtitle', 'Manage and configure system-wide settings and administrative preferences.',
    CARD_PAD, CARD_PAD + lh(FS.base) + SP.s05, { size: FS.t12_5, color: C.slate500 });
  // Dashed-outline "Add Setting" button, top-right.
  const abH = SP.s1_5 * 2 + lh(FS.t12_5);
  const abW = SP.s3 * 2 + 14.875 + SP.s1_5 + measure('Add Setting', FS.t12_5, FONT.semibold);
  const ab = frame(card, 'Button - Add Setting', CONTENT_W - CARD_PAD - abW, CARD_PAD, abW, abH,
    { bg: C.white, radius: RAD.lg, stroke: C.brand300, dash: [4, 3] });
  icon(ab, 'Icon · plus', SI.plus, SP.s3, (abH - 14.875) / 2, 14.875, C.brand700);
  text(ab, 'Label', 'Add Setting', SP.s3 + 14.875 + SP.s1_5, SP.s1_5,
    { size: FS.t12_5, weight: FONT.semibold, color: C.brand700 });

  let ty = CARD_PAD + lh(FS.base) + SP.s05 + lh(FS.t12_5) + SP.s4;   // mt-4

  // Columns — proportional distribution, the way table-auto behaves.
  const pad = SYS_PX * 2;
  const ACT_W = 70;
  let scopeW = measure('SCOPE', FS.t11, FONT.medium, 0.96);
  let labelW = measure('LABEL', FS.t11, FONT.medium, 0.96);
  let descW  = measure('DESCRIPTION', FS.t11, FONT.medium, 0.96);
  let keyW   = measure('KEY', FS.t11, FONT.medium, 0.96);
  let editW  = measure('EDITABLE', FS.t11, FONT.medium, 0.96);
  SYSTEM_SETTINGS.forEach((s) => {
    scopeW = Math.max(scopeW, SP.s2 * 2 + measure(s.scope, FS.t10, FONT.semibold, 0.88));
    labelW = Math.max(labelW, measure(s.label, FS.t13, FONT.semibold));
    descW  = Math.max(descW, measure(s.desc, FS.t12_5, FONT.regular));
    keyW   = Math.max(keyW, measure(s.key, FS.t12, FONT.regular));
    editW  = Math.max(editW, SP.s2 * 2 + measure(s.editable ? 'EDITABLE' : 'READ ONLY', FS.t10, FONT.semibold, 0.88));
  });
  descW = Math.min(descW, 300);                        // long descriptions wrap
  const VAL_W = 280 + pad;                             // max-w-[280px] break-all
  const natural = [scopeW + pad, labelW + pad, descW + pad, keyW + pad, VAL_W, editW + pad];
  const avail = innerW - ACT_W;
  const sum = natural.reduce((a, b) => a + b, 0);
  const cw = natural.slice();
  if (sum < avail) {
    // Surplus spreads proportionally, the way table-auto distributes it.
    const surplus = avail - sum;
    for (let i = 0; i < cw.length; i++) cw[i] += surplus * (natural[i] / sum);
  } else if (sum > avail) {
    // The natural widths don't fit — which is why the source wraps the table in
    // `overflow-x-auto`. Take the deficit from the two columns that WRAP
    // (Description, Value) in proportion to their widths, so neither collapses
    // while the other keeps its full size. Scope/Key/Editable are already at
    // their content width and have nothing to give.
    const FLOOR = 150;
    const deficit = sum - avail;
    const flexSum = cw[2] + cw[4];
    [2, 4].forEach((i) => {
      cw[i] = Math.max(FLOOR, cw[i] - deficit * (cw[i] / flexSum));
    });
    const over = cw.reduce((a, b) => a + b, 0) - avail;
    if (over > 0) {                                    // still tight — scale all
      const f = avail / (avail + over);
      for (let i = 0; i < cw.length; i++) cw[i] *= f;
    }
  }
  cw.push(ACT_W);

  // Thead
  const theadH = SP.s2_5 * 2 + lh(FS.t11) + 1;
  const th = frame(card, 'Thead', CARD_PAD, ty, innerW, theadH);
  hairline(th, 'Border bottom', 0, theadH - 1, innerW, C.slate100);
  ['Scope', 'Label', 'Description', 'Key', 'Value', 'Editable', ''].forEach((l, i) => {
    if (!l) return;
    let hx = 0;
    for (let j = 0; j < i; j++) hx += cw[j];
    text(th, 'Th · ' + l, l.toUpperCase(), hx + SYS_PX, SP.s2_5,
      { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
  });
  ty += theadH;

  // Rows — align-top, py-3.5. Description and Value wrap, so the row is sized
  // from the cells AFTER they exist rather than from a predicted height.
  SYSTEM_SETTINGS.forEach((s, i) => {
    const cellW = (n) => cw[n] - SYS_PX * 2;
    const row = frame(card, 'Row · ' + s.label, CARD_PAD, ty, innerW, 10);
    if (i > 0) hairline(row, 'Divider', 0, 0, innerW, C.slate100);
    const top = SP.s3_5;
    let cx = 0;

    const ph = SP.s05 * 2 + lh(FS.t10);
    const pw = SP.s2 * 2 + measure(s.scope, FS.t10, FONT.semibold, 0.88);
    const pill = frame(row, 'Scope pill', cx + SYS_PX, top, pw, ph,
      { bg: SCOPE_TONE[s.scope].bg, radius: RAD.md });
    text(pill, 'Label', s.scope, SP.s2, SP.s05,
      { size: FS.t10, weight: FONT.semibold, color: SCOPE_TONE[s.scope].fg, tracking: 0.88 });
    cx += cw[0];

    const lt = text(row, 'Label', s.label, cx + SYS_PX, top,
      { size: FS.t13, weight: FONT.semibold, color: C.slate900, tracking: -0.2, width: cellW(1) });
    cx += cw[1];

    const dt = text(row, 'Description', s.desc, cx + SYS_PX, top,
      { size: FS.t12_5, color: C.slate400, width: cellW(2) });
    dt.fontName = { family: FONT.family, style: FONT.italic || FONT.regular };
    cx += cw[2];

    const kt = text(row, 'Key', s.key, cx + SYS_PX, top,
      { size: FS.t12, color: C.slate600, width: cellW(3) });
    if (MONO) kt.fontName = { family: MONO.family, style: MONO.regular };
    cx += cw[3];

    const vt = text(row, 'Value', s.value, cx + SYS_PX, top,
      { size: FS.t12, color: C.slate700, width: cellW(4) });
    if (MONO) vt.fontName = { family: MONO.family, style: MONO.regular };
    cx += cw[4];

    const ew = SP.s2 * 2 + measure(s.editable ? 'EDITABLE' : 'READ ONLY', FS.t10, FONT.semibold, 0.88);
    const ep = frame(row, 'Editable pill', cx + SYS_PX, top, ew, ph,
      { bg: s.editable ? C.emerald50 : C.rose50, radius: RAD.md });
    text(ep, 'Label', s.editable ? 'EDITABLE' : 'READ ONLY', SP.s2, SP.s05,
      { size: FS.t10, weight: FONT.semibold, color: s.editable ? C.emerald700 : C.rose600, tracking: 0.88 });
    cx += cw[5];

    // py-3 on the actions cell, everything else py-3.5.
    const kb = frame(row, 'Button - Row actions', cx + SYS_PX, SP.s3, 29.75, 29.75, { radius: RAD.md });
    for (let dd = 0; dd < 3; dd++) {
      rect(kb, 'Dot', (29.75 - 3) / 2, 8.5 + dd * 5, 3, 3, { bg: C.slate400, radius: RAD.full });
    }

    const contentH = Math.max(lt.height, dt.height, kt.height, vt.height, ph, 29.75);
    row.resize(innerW, SP.s3_5 * 2 + contentH);
    if (o.menuRow === i) o._menu = { x: CARD_PAD + cx + SYS_PX, y: ty + SP.s3 };
    ty += row.height;
  });

  card.resize(CONTENT_W, ty + CARD_PAD);
  return { card: card, menu: o._menu };
}


/* ── S7. SaveBar and SuspendLineDialog ─────────────────────────────────── */

/** Fixed bottom bar, left-offset by the sidebar width, spanning to the edge. */
function buildSaveBar(parent, disabledHint) {
  const btnH = SP.s1_5 * 2 + lh(FS.sm) + 2;
  const H = 1 + SP.s3_5 * 2 + btnH;
  const bar = frame(parent, 'SaveBar', SIDEBAR_W, FRAME_H - H, FRAME_W - SIDEBAR_W, H,
    { bg: C.white, opacity: 0.95,
      shadow: [{ type: 'DROP_SHADOW', color: { r: 15 / 255, g: 23 / 255, b: 42 / 255, a: 0.25 },
                 offset: { x: 0, y: -10 }, radius: 30, spread: -16, visible: true, blendMode: 'NORMAL' }] });
  hairline(bar, 'Border top', 0, 0, bar.width, C.slate200);
  const cy = 1 + SP.s3_5;
  const label = disabledHint || 'You have unsaved changes';
  rect(bar, 'Status dot', SP.s8, cy + (btnH - 6.375) / 2, 6.375, 6.375,
    { bg: disabledHint ? C.rose500 : C.brand500, radius: RAD.full });
  text(bar, 'Label', label, SP.s8 + 6.375 + SP.s2, cy + (btnH - lh(FS.t12_5)) / 2,
    { size: FS.t12_5, weight: FONT.medium, color: C.slate700 });

  const saveW = SP.s3_5 * 2 + measure('Save changes', FS.sm, FONT.medium);
  const discW = SP.s3 * 2 + measure('Discard', FS.sm, FONT.medium) + 2;
  const save = frame(bar, 'Button - Save changes', bar.width - SP.s8 - saveW, cy + 1,
    saveW, btnH - 2, { bg: C.brand600, radius: RAD.lg });
  if (disabledHint) save.opacity = 0.6;                // disabled:opacity-60
  text(save, 'Label', 'Save changes', SP.s3_5, SP.s1_5,
    { size: FS.sm, weight: FONT.medium, color: C.white });
  const disc = frame(bar, 'Button - Discard', bar.width - SP.s8 - saveW - SP.s2 - discW, cy,
    discW, btnH, { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(disc, 'Label', 'Discard', SP.s3, SP.s1_5 + 1,
    { size: FS.sm, weight: FONT.medium, color: C.slate700 });
  return bar;
}

/** SuspendLineDialog — max-w-md, type-to-confirm. */
function buildSuspendDialog(parent, typed) {
  const W = 476;
  const NAME = ACCOUNT.displayName;
  const matches = typed === NAME;

  buildScrim(parent, 0.3);
  const dlg = frame(parent, 'Dialog - Disable this shipping line?', (FRAME_W - W) / 2, 0, W, 100,
    { bg: C.white, radius: RAD.xxl, stroke: C.gray200, clip: true, shadow: MODAL_SHADOW });

  const PX = SP.s6;
  const badge = frame(dlg, 'Icon badge', PX, SP.s6, SP.s9, SP.s9,
    { bg: C.rose50, radius: RAD.full, stroke: C.rose200, strokeOpacity: 0.7 });
  icon(badge, 'Icon · pause', SI.pause, (SP.s9 - 18) / 2, (SP.s9 - 18) / 2, 18, C.rose600);
  const tx = PX + SP.s9 + SP.s4;
  const tw = W - PX * 2 - SP.s9 - SP.s4;
  text(dlg, 'Title', 'Disable this shipping line?', tx, SP.s6,
    { size: FS.t15_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  const copy = NAME + ' will stop accepting new bookings and its future schedules will be hidden. ' +
    'Existing bookings are honored and nothing is deleted — you can enable it again at any time.';
  const p = text(dlg, 'Body', copy, tx, SP.s6 + lh(FS.t15_5) + SP.s1_5,
    { size: FS.t13, color: C.slate600, lh: FS.t13 * 1.625, width: tw });
  try {
    p.setRangeFills(0, NAME.length, fill(C.slate900));
    p.setRangeFontName(0, NAME.length, { family: FONT.family, style: FONT.medium });
  } catch (e) { /* defensive */ }

  let y = SP.s6 + Math.max(SP.s9, lh(FS.t15_5) + SP.s1_5 + p.height) + SP.s5;

  // Confirm panel — label, the expected name in mono, then the input.
  const panelW = W - PX * 2;
  const panel = frame(dlg, 'Confirm panel', PX, y, panelW, 10,
    { bg: C.slate50, opacity: 0.6, radius: RAD.lg, stroke: C.slate200 });
  let py = SP.s3;
  text(panel, 'Label', 'TYPE THE LINE NAME TO CONFIRM', SP.s3_5, py,
    { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
  py += lh(FS.t11) + SP.s05;
  const exp = text(panel, 'Expected', NAME, SP.s3_5, py, { size: FS.t11_5, color: C.slate500 });
  if (MONO) exp.fontName = { family: MONO.family, style: MONO.regular };
  py += lh(FS.t11_5) + SP.s2;
  const inpH = SP.s1_5 * 2 + lh(FS.t13) + 2;
  const inp = frame(panel, 'Input · ' + (typed || 'Line name'), SP.s3_5, py,
    panelW - SP.s3_5 * 2, inpH, { bg: C.white, radius: RAD.md,
      stroke: typed ? C.rose300 : C.slate200, strokeW: typed ? 2 : 1 });
  text(inp, typed ? 'Value' : 'Placeholder', typed || 'Line name', SP.s2_5, SP.s1_5 + 1,
    { size: FS.t13, color: typed ? C.slate900 : C.slate400 });
  py += inpH + SP.s3;
  panel.resize(panelW, py);
  y += py + SP.s5;                                     // pb-5

  const btnH = SP.s1_5 * 2 + lh(FS.sm) + 2;
  const footH = 1 + SP.s3_5 * 2 + btnH;
  const foot = frame(dlg, 'Footer', 0, y, W, footH);
  hairline(foot, 'Border top', 0, 0, W, C.slate100);
  const cta = 'Disable line';
  const ctaW = SP.s3 * 2 + measure(cta, FS.sm, FONT.medium);
  const cancelW = SP.s3 * 2 + measure('Cancel', FS.sm, FONT.medium) + 2;
  const by = 1 + SP.s3_5;
  const cancel = frame(foot, 'Button - Cancel', W - PX - ctaW - SP.s2 - cancelW, by,
    cancelW, btnH, { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(cancel, 'Label', 'Cancel', SP.s3, SP.s1_5 + 1,
    { size: FS.sm, weight: FONT.medium, color: C.slate700 });
  const go = frame(foot, 'Button - ' + cta, W - PX - ctaW, by + 1, ctaW, btnH - 2,
    { bg: C.rose600, radius: RAD.lg });
  if (!matches) go.opacity = 0.5;                      // disabled:opacity-50
  text(go, 'Label', cta, SP.s3, SP.s1_5, { size: FS.sm, weight: FONT.medium, color: C.white });

  const H = y + footH;
  dlg.resize(W, H);
  dlg.y = (FRAME_H - H) / 2;
  return dlg;
}


/* ── S8. Page composition ──────────────────────────────────────────────── */

function settingsShell(name, x, y, scroll) {
  const f = frame(figma.currentPage, name, x, y, FRAME_W, FRAME_H, { bg: C.white, clip: true });
  LAST_SHELL = f;
  buildSidebar(f, 'Settings');
  const right = frame(f, 'Container', MAIN_X, 0, MAIN_W, FRAME_H);
  buildTopbar(right);
  const main = frame(right, 'Main Content', 0, TOPBAR_H, MAIN_W, MAIN_H, { clip: true });
  const content = frame(main, 'Container', CONTENT_X, CONTENT_Y - (scroll || 0), CONTENT_W, 3000);
  return {
    frame: f, content: content,
    ox: MAIN_X + CONTENT_X,
    oy: TOPBAR_H + CONTENT_Y - (scroll || 0),
  };
}

function buildSettingsPage(name, x, y, o) {
  o = o || {};
  const s = settingsShell(name, x, y, o.scroll);
  const head = settingsPageHeader(s.content);
  const tabsY = head.height + SP.s6;                   // PageHeader mb-6
  settingsTabs(s.content, tabsY, o.tab || 'booking');
  const bodyY = tabsY + TAB_H + SP.s5;                 // mb-5

  if (o.tab === 'system') {
    const built = buildSystemTab(s.content, bodyY, o);
    if (built.menu) {
      buildRowMenu(s.frame, s.ox + built.menu.x, s.oy + built.menu.y,
        [{ label: 'View setting', ic: SI.eye }]);
    }
  } else if (o.tab === 'account') {
    buildAccountTab(s.content, bodyY, o);
  } else {
    buildConfigTab(s.content, bodyY, o);
  }

  if (o.saveBar) buildSaveBar(s.frame, o.saveDisabledHint);
  if (o.selectOpen === 'payment') {
    // Portaled Select menu — fixed coords escape the card.
    const colW = (CONTENT_W - CARD_PAD * 2 - SP.s4) / 2;
    const mx = s.ox + CARD_PAD + colW + SP.s4;
    const optH = SP.s2 * 2 + lh(FS.sm);
    const opts = PAYMENT_PROVIDERS;
    const mh = opts.length * optH + SP.s1 * 2 + 2;
    const menu = frame(s.frame, 'Select menu · Payment provider', mx, o.selectMenuY || 0, colW, mh,
      { bg: C.white, radius: RAD.lg, stroke: C.gray200, clip: true, shadow: MENU_SHADOW });
    opts.forEach((opt, i) => {
      const on = opt === ACCOUNT.paymentProvider;
      const row = frame(menu, 'Option · ' + opt, 0, SP.s1 + i * optH, colW, optH,
        { bg: on ? C.brand50 : undefined });
      text(row, 'Label', opt, SP.s3, SP.s2, { size: FS.sm, color: on ? C.brand700 : C.gray700 });
      if (on) icon(row, 'Icon · tick', I.check, colW - SP.s3 - 17, (optH - 17) / 2, 17, C.brand600);
    });
  }
  if (o.dialog) buildSuspendDialog(s.frame, o.dialogTyped || '');
  return s;
}


/* ── S9. Frames ────────────────────────────────────────────────────────── */

const BLANK_ROW = { label: '', amount: '0', doc: '' };

const BUILDERS = [
  { name: 'Settings / Configurations / 01 — Passenger types',
    build: (x, y, n) => buildSettingsPage(n, x, y, { tab: 'booking', section: 'passenger-types' }) },

  { name: 'Settings / Configurations / 02 — Vehicle classes',
    build: (x, y, n) => buildSettingsPage(n, x, y, { tab: 'booking', section: 'vehicle-classes' }) },

  { name: 'Settings / Configurations / 03 — Add-ons',
    build: (x, y, n) => buildSettingsPage(n, x, y, { tab: 'booking', section: 'add-ons' }) },

  { name: 'Settings / Configurations / 04 — Accommodations placeholder',
    build: (x, y, n) => buildSettingsPage(n, x, y, { tab: 'booking', section: 'accommodations' }) },

  { name: 'Settings / Configurations / 05 — Discount unit — Flat ₱',
    build: (x, y, n) => buildSettingsPage(n, x, y, {
      tab: 'booking', section: 'passenger-types', flatRow: 1 }) },

  { name: 'Settings / Configurations / 06 — Unsaved changes — Save bar',
    build: (x, y, n) => buildSettingsPage(n, x, y, {
      tab: 'booking', section: 'vehicle-classes', saveBar: true }) },

  { name: 'Settings / Configurations / 07 — Blank label — Save disabled',
    build: (x, y, n) => buildSettingsPage(n, x, y, {
      tab: 'booking', section: 'passenger-types',
      rows: PASSENGER_TYPES.slice(0, 3).concat([BLANK_ROW]),
      saveBar: true, saveDisabledHint: 'Every catalog row needs a label' }) },

  { name: 'Settings / Configurations / 08 — Empty catalog',
    build: (x, y, n) => buildSettingsPage(n, x, y, {
      tab: 'booking', section: 'vehicle-classes', rows: [] }) },

  { name: 'Settings / Account / 01 — Line profile',
    build: (x, y, n) => buildSettingsPage(n, x, y, { tab: 'account' }) },

  { name: 'Settings / Account / 02 — Booking rules + Danger zone',
    build: (x, y, n) => buildSettingsPage(n, x, y, { tab: 'account', scroll: 520 }) },

  { name: 'Settings / Account / 03 — Line disabled',
    build: (x, y, n) => buildSettingsPage(n, x, y, {
      tab: 'account', status: 'suspended', scroll: 520 }) },

  { name: 'Settings / Account / 04 — Payment provider open',
    build: (x, y, n) => buildSettingsPage(n, x, y, {
      tab: 'account', scroll: 520, selectOpen: 'payment', selectMenuY: 120 }) },

  { name: 'Settings / Account / 05 — Unsaved changes — Save bar',
    build: (x, y, n) => buildSettingsPage(n, x, y, { tab: 'account', saveBar: true }) },

  { name: 'Settings / Account / 06 — Disable line — Empty confirm',
    build: (x, y, n) => buildSettingsPage(n, x, y, {
      tab: 'account', scroll: 520, dialog: true }) },

  { name: 'Settings / Account / 07 — Disable line — Name typed',
    build: (x, y, n) => buildSettingsPage(n, x, y, {
      tab: 'account', scroll: 520, dialog: true, dialogTyped: '2GO Travel' }) },

  { name: 'Settings / System / 01 — System settings table',
    build: (x, y, n) => buildSettingsPage(n, x, y, { tab: 'system' }) },

  { name: 'Settings / System / 02 — Row menu open',
    build: (x, y, n) => buildSettingsPage(n, x, y, { tab: 'system', menuRow: 2 }) },
];


/* ── S10. Entry point ──────────────────────────────────────────────────── */

const SECTION_NAME = 'Settings — All states';

async function loadMono() {
  const families = ['Roboto Mono', 'JetBrains Mono', 'Space Mono', 'Courier New'];
  for (const family of families) {
    try {
      await figma.loadFontAsync({ family: family, style: 'Regular' });
      return { family: family, regular: 'Regular' };
    } catch (e) { /* next */ }
  }
  return null;
}
let MONO = null;

async function main() {
  FONT = await loadFonts();
  MONO = await loadMono();

  const page = figma.currentPage;
  if (typeof figma.setCurrentPageAsync === 'function') await figma.setCurrentPageAsync(page);
  else figma.currentPage = page;

  loadImages();

  const rows = Math.ceil(BUILDERS.length / GRID_COLS);
  const needW = GRID_MARGIN_X * 2 + GRID_COLS * FRAME_W + (GRID_COLS - 1) * GRID_GAP;
  const needH = GRID_MARGIN_Y * 2 + rows * FRAME_H + (rows - 1) * GRID_GAP;

  let section = page.findOne((n) => n.type === 'SECTION' && n.name === SECTION_NAME);
  if (!section) {
    let bottom = 0, left = 0;
    page.children.forEach((c) => {
      if (c.type !== 'SECTION') return;
      bottom = Math.max(bottom, c.y + c.height);
      left = Math.min(left, c.x);
    });
    section = figma.createSection();
    section.name = SECTION_NAME;
    page.appendChild(section);
    section.x = left;
    section.y = bottom + 400;
    section.resizeWithoutConstraints(needW, needH);
  } else if (section.resizeWithoutConstraints) {
    section.resizeWithoutConstraints(Math.max(section.width, needW), Math.max(section.height, needH));
  }

  // Additive: never touch a frame that is already there.
  const existing = Object.create(null);
  section.children.forEach((c) => { existing[c.name] = true; });

  const sectionBox = section.absoluteBoundingBox;
  const made = [];
  let skipped = 0;
  for (let i = 0; i < BUILDERS.length; i++) {
    if (existing[BUILDERS[i].name]) { skipped++; continue; }
    const col = i % GRID_COLS, row = Math.floor(i / GRID_COLS);
    const x = GRID_MARGIN_X + col * (FRAME_W + GRID_GAP);
    const y = GRID_MARGIN_Y + row * (FRAME_H + GRID_GAP);

    LAST_SHELL = null;
    BUILDERS[i].build(x, y, BUILDERS[i].name);
    const node = LAST_SHELL;
    if (!node) continue;

    section.appendChild(node);
    node.x = x; node.y = y;
    const box = node.absoluteBoundingBox;
    if (box && sectionBox) {
      node.x += (sectionBox.x + x) - box.x;
      node.y += (sectionBox.y + y) - box.y;
    }
    made.push(node);
  }
  flushSvgCache();

  if (made.length) {
    figma.currentPage.selection = made;
    figma.viewport.scrollAndZoomIntoView(made);
  }
  figma.closePlugin(
    made.length
      ? 'Added ' + made.length + ' frame' + (made.length === 1 ? '' : 's') + ' to "' + SECTION_NAME + '"'
        + (skipped ? ' · kept ' + skipped + ' existing' : '')
      : 'Nothing to add — all ' + skipped + ' frames already exist in "' + SECTION_NAME + '".');
}

main().catch((e) => figma.closePlugin('Error: ' + (e && e.message ? e.message : String(e))));
