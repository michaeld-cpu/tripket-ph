/* ============================================================================
 * Tripket — Build "Accounts — All states"
 * ----------------------------------------------------------------------------
 * Rebuilds the Accounts nav group as native Figma frames: /users and
 * /operators (both rendered by components/UserDirectory.tsx with different
 * props), plus UserFormModal and UserStatusDialog. The plugin CREATES its own
 * section below every existing section on the page and is ADDITIVE: a frame
 * whose name already exists in the section is skipped, never replaced.
 *
 * Shares the chrome layer (sidebar, topbar, table skeleton, modal shell,
 * embedded logos, text measurement) byte-for-byte with the Routes / Vessels /
 * Bookings / Tickets / Shipping-lines plugins. Accounts-only code starts at
 * the "A1." marker.
 *
 * Measurements are real CSS pixels at 1440x900. globals.css sets
 * html { font-size: 17px }, so rem utilities are 17px-based (px-5 = 21.25,
 * py-3.5 = 14.875) and its type-scale layer lifts a fixed list of arbitrary
 * text-[Npx] values by ~1px. Literal px classes (w-48, min-w-[640px],
 * min-w-[28px]) do NOT scale.
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
 * A1. Accounts — tokens, icons and seed data
 * ----------------------------------------------------------------------------
 * Sources: app/users/page.tsx, app/operators/page.tsx (thin wrappers),
 * components/UserDirectory.tsx (the shared view), components/UserFormModal.tsx,
 * components/UserStatusDialog.tsx, components/PageHeader.tsx,
 * components/Pagination.tsx, components/RowMenu.tsx, lib/users-data.ts.
 * ========================================================================== */

const C3 = {
  violet50:   '#F5F3FF',
  violet100:  '#EDE9FE',
  violet700:  '#6D28D9',
  slate800:   '#1E293B',
  emerald900: '#064E3B',
  gray700:    '#374151',
};
Object.keys(C3).forEach((k) => { if (C[k] === undefined) C[k] = C3[k]; });

const AI = {
  plus:      { sw: 2,    d: '<path d="M12 5v14M5 12h14"/>' },
  sortUpDn:  { sw: 2,    d: '<path d="M7 10l5-5 5 5M7 14l5 5 5-5"/>' },
  pencil:    { sw: 1.75, d: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>' },
  // RowMenu suspend/reactivate glyph — circle with an X (not the chassis' I.cancel)
  suspend:   { sw: 1.75, d: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>' },
  // UserFormModal header — person in a circle
  person:    { sw: 1.75, d: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>' },
  // UserStatusDialog — suspend (slashed circle) / reactivate (check)
  slash:     { sw: 1.75, d: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>' },
  checkBig:  { sw: 1.75, d: '<path d="M20 6 9 17l-5-5"/>' },
  eye:       { sw: 1.75, d: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/>' },
  eyeOff:    { sw: 1.75, d: '<path d="M3 3l18 18"/><path d="M10.6 5.2A9.9 9.9 0 0 1 12 5c7 0 11 7 11 7a19 19 0 0 1-3.1 3.9M6.2 6.4A19 19 0 0 0 1 12s4 7 11 7a9.9 9.9 0 0 0 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>' },
};

// lib/users-data.ts — roleLabel / roleTone / userStatusTone / userStatusLabel
const ROLE_LABEL = { Superadmin: 'Super Admin', Admin: 'Admin', Operator: 'Operator' };
const ROLE_TONE = {
  Superadmin: { bg: C.violet50,  fg: C.violet700, ring: C.violet100 },
  Admin:      { bg: C.brand50,   fg: C.brand700,  ring: C.brand100 },
  Operator:   { bg: C.slate100,  fg: C.slate600,  ring: C.slate200, ringOpacity: 0.7 },
};
const STATUS_TONE = {
  Active:    { bg: C.emerald100, fg: C.emerald800 },
  Suspended: { bg: C.slate100,   fg: C.slate500 },
};

/**
 * buildUsers() run to completion — the seed is deterministic (FNV-1a over the
 * line id), so these are the literal rows the app produces, not stand-ins.
 * `last` is relativeTime() at load; the offsets are fixed, the wall clock isn't.
 * `line` is lineForUser(id) — a second hash, unrelated to the user's own lineId.
 */
const SEED_USERS = [
  { id: 'usr-superadmin-1', name: 'Super Admin',    email: 'super_admin@tripket.com',        role: 'Superadmin', status: 'Active', last: 'just now', line: '2GO Travel' },
  { id: 'usr-superadmin-2', name: 'Platform Owner', email: 'platform_owner@tripket.com',     role: 'Superadmin', status: 'Active', last: 'just now', line: 'FastCat' },
  { id: 'usr-2go-2',        name: 'Ella Castillo',  email: 'ella.castillo@2go.ph',           role: 'Superadmin', status: 'Active', last: '11d ago',  line: 'Weesam Express' },
  { id: 'usr-fastcat-0',    name: 'Mae Dela Cruz',  email: 'mae.delacruz@fastcat.ph',        role: 'Admin',      status: 'Active', last: '8d ago',   line: 'Montenegro Lines' },
  { id: 'usr-montenegro-2', name: 'Liza Aquino',    email: 'liza.aquino@montenegro.ph',      role: 'Superadmin', status: 'Active', last: '6d ago',   line: 'Montenegro Lines' },
  { id: 'usr-starlite-0',   name: 'Carla Aquino',   email: 'carla.aquino@starlite.ph',       role: 'Superadmin', status: 'Active', last: '16h ago',  line: 'Weesam Express' },
  { id: 'usr-trans-asia-1', name: 'Trisha Ramos',   email: 'trisha.ramos@trans-asia.ph',     role: 'Admin',      status: 'Active', last: '4d ago',   line: 'Trans-Asia Shipping Lines' },
  { id: 'usr-weesam-2',     name: 'Mika Bautista',  email: 'mika.bautista@weesam.ph',        role: 'Superadmin', status: 'Active', last: '4d ago',   line: 'FastCat' },
];

const SEED_OPERATORS = [
  { id: 'usr-2go-0',        name: 'Rhea Santos',      email: 'rhea.santos@2go.ph',            status: 'Active',    last: '7d ago' },
  { id: 'usr-2go-1',        name: 'Gio Bautista',     email: 'gio.bautista@2go.ph',           status: 'Active',    last: '6d ago' },
  { id: 'usr-2go-3',        name: 'Jun Villanueva',   email: 'jun.villanueva@2go.ph',         status: 'Active',    last: '9d ago' },
  { id: 'usr-2go-4',        name: 'Trisha Reyes',     email: 'trisha.reyes@2go.ph',           status: 'Active',    last: '1d ago' },
  { id: 'usr-2go-5',        name: 'Paolo Castillo',   email: 'paolo.castillo@2go.ph',         status: 'Active',    last: '13d ago' },
  { id: 'usr-fastcat-1',    name: 'Diego Flores',     email: 'diego.flores@fastcat.ph',       status: 'Active',    last: '6d ago' },
  { id: 'usr-fastcat-2',    name: 'Carla Castillo',   email: 'carla.castillo@fastcat.ph',     status: 'Active',    last: '5d ago' },
  { id: 'usr-fastcat-3',    name: 'Ramon Villanueva', email: 'ramon.villanueva@fastcat.ph',   status: 'Active',    last: '3d ago' },
  { id: 'usr-montenegro-0', name: 'Ada Flores',       email: 'ada.flores@montenegro.ph',      status: 'Suspended', last: '3d ago' },
  { id: 'usr-montenegro-1', name: 'Tonio Castillo',   email: 'tonio.castillo@montenegro.ph',  status: 'Active',    last: '1d ago' },
  { id: 'usr-montenegro-3', name: 'Marco Cruz',       email: 'marco.cruz@montenegro.ph',      status: 'Active',    last: '4d ago' },
  { id: 'usr-montenegro-4', name: 'Ella Ramos',       email: 'ella.ramos@montenegro.ph',      status: 'Active',    last: '10d ago' },
  { id: 'usr-montenegro-5', name: 'Jun Aquino',       email: 'jun.aquino@montenegro.ph',      status: 'Active',    last: '8d ago' },
  { id: 'usr-oceanjet-0',   name: 'Karl Flores',      email: 'karl.flores@oceanjet.ph',       status: 'Active',    last: '6d ago' },
  { id: 'usr-oceanjet-1',   name: 'Mika Dela Cruz',   email: 'mika.delacruz@oceanjet.ph',     status: 'Active',    last: '8d ago' },
  { id: 'usr-oceanjet-2',   name: 'Tonio Aquino',     email: 'tonio.aquino@oceanjet.ph',      status: 'Active',    last: '9d ago' },
  { id: 'usr-starlite-1',   name: 'Ramon Dela Cruz',  email: 'ramon.delacruz@starlite.ph',    status: 'Active',    last: '12d ago' },
  { id: 'usr-starlite-2',   name: 'Liza Flores',      email: 'liza.flores@starlite.ph',       status: 'Active',    last: '11d ago' },
  { id: 'usr-starlite-3',   name: 'Marco Castillo',   email: 'marco.castillo@starlite.ph',    status: 'Active',    last: '9d ago' },
  { id: 'usr-trans-asia-0', name: 'Paolo Aquino',     email: 'paolo.aquino@trans-asia.ph',    status: 'Active',    last: '2d ago' },
  { id: 'usr-trans-asia-2', name: 'Diego Flores',     email: 'diego.flores@trans-asia.ph',    status: 'Active',    last: '13d ago' },
  { id: 'usr-trans-asia-3', name: 'Mae Cruz',         email: 'mae.cruz@trans-asia.ph',        status: 'Active',    last: '1d ago' },
  { id: 'usr-trans-asia-4', name: 'Gio Navarro',      email: 'gio.navarro@trans-asia.ph',     status: 'Active',    last: '9d ago' },
  { id: 'usr-weesam-0',     name: 'Ella Dela Cruz',   email: 'ella.delacruz@weesam.ph',       status: 'Active',    last: '23h ago' },
  { id: 'usr-weesam-1',     name: 'Jun Reyes',        email: 'jun.reyes@weesam.ph',           status: 'Active',    last: '13d ago' },
  { id: 'usr-weesam-3',     name: 'Karl Aquino',      email: 'karl.aquino@weesam.ph',         status: 'Active',    last: '2d ago' },
  { id: 'usr-weesam-4',     name: 'Nina Santos',      email: 'nina.santos@weesam.ph',         status: 'Active',    last: '8d ago' },
  { id: 'usr-weesam-5',     name: 'Ben Bautista',     email: 'ben.bautista@weesam.ph',        status: 'Suspended', last: '6d ago' },
];

const A_PAGE_SIZE = 12;                       // DEFAULT_PAGE_SIZE in UserDirectory
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];  // Pagination.tsx — note: 12 is NOT here


/* ── A2. Directory geometry ────────────────────────────────────────────── */

const A_PX = SP.s5;                                   // px-5 on toolbar/cells/pager
const A_AVATAR = SP.s8;                               // h-8 w-8
const A_ROW_H = SP.s3_5 * 2 + Math.max(A_AVATAR, lh(FS.t13) + lh(FS.t11_5));
const A_THEAD_H = SP.s2_5 * 2 + lh(FS.t11) + 1;       // py-2.5 + border-b
const A_CTRL_H = SP.s1_5 * 2 + lh(FS.sm) + 2;         // search box / size="sm" Select
const A_TOOLBAR_H = SP.s4 * 2 + Math.max(lh(FS.base), A_CTRL_H) + 1;
const A_PAGER_H = SP.s3 * 2 + 29.75 + 1;              // py-3 + h-7 controls + border-t
const A_ACTIONS_W = 85;                               // w-10 th + px-5 either side

function pillW(label, tracking) {
  return SP.s2 * 2 + measure(String(label).toUpperCase(), FS.t10, FONT.semibold, tracking || 0.88);
}
function pillH() { return SP.s05 * 2 + lh(FS.t10); }

/** rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] */
function acctPill(parent, name, x, y, label, tone) {
  const w = pillW(label), h = pillH();
  const p = frame(parent, name, x, y, w, h, {
    bg: tone.bg, radius: RAD.md,
    stroke: tone.ring, strokeOpacity: tone.ringOpacity,
  });
  text(p, 'Label', String(label).toUpperCase(), SP.s2, SP.s05,
    { size: FS.t10, weight: FONT.semibold, color: tone.fg, tracking: 0.88 });
  return p;
}

/** avatarFor() — first + last initial on bg-brand-100 / text-brand-600. */
function acctAvatar(parent, x, y, name) {
  const parts = String(name).trim().split(/\s+/);
  const initials = (((parts[0] || '')[0] || '') + ((parts[1] || '')[0] || '')).toUpperCase() || '?';
  const av = frame(parent, 'Avatar', x, y, A_AVATAR, A_AVATAR, { bg: C.brand100, radius: RAD.md });
  const t = text(av, 'Initials', initials, 0, 0,
    { size: FS.t10, weight: FONT.bold, color: C.brand600 });
  centerIn(t, { x: 0, y: 0, w: A_AVATAR, h: A_AVATAR });
  return av;
}

/** LogoTile at size 20 — real logo only for 2GO; the rest fall back to a tint. */
const LINE_TINT = {
  '2GO Travel': '#DB2777', 'FastCat': '#2563EB', 'Montenegro Lines': '#047857',
  'OceanJet': '#DC2626', 'Starlite Ferries': '#F59E0B',
  'Trans-Asia Shipping Lines': '#EAB308', 'Weesam Express': '#0EA5E9',
};
const LINE_INITIAL = {
  '2GO Travel': '2G', 'FastCat': 'F', 'Montenegro Lines': 'M', 'OceanJet': 'O',
  'Starlite Ferries': 'S', 'Trans-Asia Shipping Lines': 'T', 'Weesam Express': 'W',
};
function acctLineTile(parent, x, y, lineName) {
  const S = 20;
  const tile = frame(parent, 'LogoTile · ' + lineName, x, y, S, S,
    { bg: C.white, radius: RAD.md, stroke: C.gray200, clip: true });
  if (lineName === '2GO Travel' && LINE_LOGO_HASH) {
    tile.fills = [
      { type: 'SOLID', color: hex(C.white) },
      { type: 'IMAGE', scaleMode: 'FIT', imageHash: LINE_LOGO_HASH },
    ];
  } else {
    tile.fills = fill(LINE_TINT[lineName] || C.slate500);
    tile.strokes = [];
    const t = text(tile, 'Initial', LINE_INITIAL[lineName] || '?', 0, 0,
      { size: FS.t8, weight: FONT.bold, color: C.white });
    centerIn(t, { x: 0, y: 0, w: S, h: S });
  }
  return tile;
}

/**
 * Column widths, the way `table-auto` + `w-full` actually behaves.
 *
 * Chrome measures each column's max-content width, then spreads the leftover
 * space across the columns in proportion to those widths. Giving the whole
 * surplus to User (what this used to do) left every other column pinned to its
 * minimum. The sticky actions column is excluded — it stays at its own width.
 */
function acctDistribute(natural, total) {
  const sum = natural.reduce((a, b) => a + b, 0);
  const surplus = total - sum;
  if (surplus <= 0) return natural.slice();
  const out = natural.map((w) => w + surplus * (w / sum));
  const drift = total - out.reduce((a, b) => a + b, 0);
  let widest = 0;
  out.forEach((w, i) => { if (w > out[widest]) widest = i; });
  out[widest] += drift;
  return out;
}

function acctColumns(rows, showRole, showLine) {
  const pad = A_PX * 2;
  const keys = ['user'];
  const natural = [];

  let userW = measure('USER', FS.t11, FONT.medium, 0.96) + SP.s1_5 + 12.75;   // + sort glyph
  rows.forEach((r) => {
    userW = Math.max(userW,
      A_AVATAR + SP.s3 + Math.max(measure(r.name, FS.t13, FONT.semibold),
                                  measure(r.email, FS.t11_5, FONT.regular)));
  });
  natural.push(userW + pad);

  if (showRole) {
    let w = measure('ROLE', FS.t11, FONT.medium, 0.96);
    rows.forEach((r) => { w = Math.max(w, pillW(ROLE_LABEL[r.role])); });
    keys.push('role'); natural.push(w + pad);
  }
  if (showLine) {
    let w = measure('SHIPPING LINE', FS.t11, FONT.medium, 0.96);
    rows.forEach((r) => {
      w = Math.max(w, 20 + SP.s2 + measure(r.line, FS.t12_5, FONT.medium));
    });
    keys.push('line'); natural.push(w + pad);
  }
  let sw = measure('STATUS', FS.t11, FONT.medium, 0.96);
  rows.forEach((r) => { sw = Math.max(sw, pillW(r.status)); });
  keys.push('status'); natural.push(sw + pad);

  let lw = measure('LAST ACTIVE', FS.t11, FONT.medium, 0.96);
  rows.forEach((r) => { lw = Math.max(lw, measure(r.last, FS.t12, FONT.regular)); });
  keys.push('last'); natural.push(lw + pad);

  const widths = acctDistribute(natural, CONTENT_W - A_ACTIONS_W);
  const cols = keys.map((k, i) => ({ key: k, w: widths[i] }));
  cols.push({ key: 'actions', w: A_ACTIONS_W });
  return cols;
}

/** Pagination footer. Renders always; only the paging nav collapses. */
function buildAcctPager(parent, y, page, pageSize, total, noun, overlay, cardX, cardY) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const bar = frame(parent, 'Pagination', 0, y, CONTENT_W, A_PAGER_H);
  hairline(bar, 'Border top', 0, 0, CONTENT_W, C.slate100);
  const cy = 1 + SP.s3;

  // "Showing 1–8 of 8 users" — the numerals are font-mono tabular-nums.
  const summary = 'Showing ' + from + '–' + to + ' of ' + total + ' ' + noun;
  const st = text(bar, 'Summary', summary, A_PX, cy + (29.75 - lh(FS.t12)) / 2,
    { size: FS.t12, color: C.slate500 });
  // Highlight the three numeric runs the way the source does.
  try {
    const a0 = 8, a1 = a0 + String(from).length;
    const b0 = a1 + 1, b1 = b0 + String(to).length;
    const c0 = b1 + 4, c1 = c0 + String(total).length;
    [[a0, a1], [b0, b1], [c0, c1]].forEach((r) => {
      if (r[1] <= summary.length) {
        st.setRangeFills(r[0], r[1], fill(C.slate700));
        if (MONO) st.setRangeFontName(r[0], r[1], { family: MONO.family, style: MONO.regular });
      }
    });
  } catch (e) { /* range maths is defensive — the label still reads correctly */ }

  // Centre — "Per page" + a native <select>. pageSize is 12; the options are
  // 10/25/50/100, so the trigger renders EMPTY. Drawn as the source behaves.
  const perW = measure('Per page', FS.t12, FONT.regular);
  const selW = 62;
  const groupW = perW + SP.s2 + selW;
  const gx = (CONTENT_W - groupW) / 2;
  text(bar, 'Per page', 'Per page', gx, cy + (29.75 - lh(FS.t12)) / 2,
    { size: FS.t12, color: C.slate500 });
  const sel = frame(bar, 'Select - Per page', gx + perW + SP.s2, cy, selW, 29.75,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  const shown = PAGE_SIZE_OPTIONS.indexOf(pageSize) === -1 ? '' : String(pageSize);
  if (shown) {
    const v = text(sel, 'Value', shown, SP.s2, (29.75 - lh(FS.t12)) / 2,
      { size: FS.t12, color: C.slate700 });
    if (MONO) v.fontName = { family: MONO.family, style: MONO.regular };
  }
  icon(sel, 'Icon · chevron', I.chevronDown, selW - SP.s2 - 12.75, (29.75 - 12.75) / 2, 12.75, C.slate400);

  // Right — Previous / chips / Next. Hidden entirely at one page.
  if (totalPages > 1) {
    const chips = buildPageList(page, totalPages);
    const prevW = SP.s2_5 * 2 + 12.75 + SP.s1 + measure('Previous', FS.t12, FONT.medium) + 2;
    const nextW = SP.s2_5 * 2 + measure('Next', FS.t12, FONT.medium) + SP.s1 + 12.75 + 2;
    let chipsW = 0;
    chips.forEach((t) => {
      chipsW += (t === '…' ? SP.s1 * 2 + measure('…', FS.t12, FONT.regular)
                           : Math.max(28, SP.s2 * 2 + measure(String(t), FS.t12, FONT.regular))) + SP.s1;
    });
    chipsW = chipsW - SP.s1 + SP.s1 * 2;                 // mx-1 either side
    const navW = prevW + SP.s1 + chipsW + SP.s1 + nextW;
    let nx = CONTENT_W - A_PX - navW;

    const prev = frame(bar, 'Button - Previous page', nx, cy, prevW, 29.75,
      { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
    if (page === 1) prev.opacity = 0.4;                   // disabled:opacity-40
    icon(prev, 'Icon', I.chevronLeft, SP.s2_5, (29.75 - 12.75) / 2, 12.75, C.slate700);
    text(prev, 'Label', 'Previous', SP.s2_5 + 12.75 + SP.s1, (29.75 - lh(FS.t12)) / 2,
      { size: FS.t12, weight: FONT.medium, color: C.slate700 });
    nx += prevW + SP.s1 + SP.s1;

    chips.forEach((t) => {
      if (t === '…') {
        const w = SP.s1 * 2 + measure('…', FS.t12, FONT.regular);
        text(bar, 'Gap', '…', nx + SP.s1, cy + (29.75 - lh(FS.t12)) / 2,
          { size: FS.t12, color: C.slate400 });
        nx += w + SP.s1;
        return;
      }
      const w = Math.max(28, SP.s2 * 2 + measure(String(t), FS.t12, FONT.regular));
      const on = t === page;
      const chip = frame(bar, 'Page ' + t, nx, cy, w, 29.75, {
        bg: on ? C.brand500 : C.white, radius: RAD.lg,
        stroke: on ? undefined : C.slate200,
      });
      const lbl = text(chip, 'Label', String(t), 0, (29.75 - lh(FS.t12)) / 2,
        { size: FS.t12, color: on ? C.white : C.slate700 });
      if (MONO) lbl.fontName = { family: MONO.family, style: MONO.regular };
      lbl.x = (w - lbl.width) / 2;
      nx += w + SP.s1;
    });
    nx += SP.s1 - SP.s1;

    const next = frame(bar, 'Button - Next page', nx, cy, nextW, 29.75,
      { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
    if (page === totalPages) next.opacity = 0.4;
    text(next, 'Label', 'Next', SP.s2_5, (29.75 - lh(FS.t12)) / 2,
      { size: FS.t12, weight: FONT.medium, color: C.slate700 });
    icon(next, 'Icon', I.chevronRight, nextW - SP.s2_5 - 12.75, (29.75 - 12.75) / 2, 12.75, C.slate700);
  }

  // Native <select> popup — drawn on the frame, above the card's clip.
  if (overlay) {
    const optH = 26, popH = PAGE_SIZE_OPTIONS.length * optH + 8;
    // A native <select> near the bottom of the viewport opens upward.
    const below = cardY + y + cy + 29.75 + 2;
    const popY = (below + popH > FRAME_H - 8) ? cardY + y + cy - 2 - popH : below;
    const pop = frame(overlay, 'Native select popup · Per page',
      cardX + gx + perW + SP.s2, popY, selW + 24, popH,
      { bg: C.white, radius: RAD.md, stroke: C.gray300, clip: true, shadow: MENU_SHADOW });
    PAGE_SIZE_OPTIONS.forEach((n, i) => {
      // Nothing is highlighted: the select's value (12) matches no option.
      const row = frame(pop, 'Option · ' + n, 0, 4 + i * optH, selW + 24, optH);
      const t = text(row, 'Label', String(n), SP.s2, (optH - lh(FS.t12)) / 2,
        { size: FS.t12, color: C.slate700 });
      if (MONO) t.fontName = { family: MONO.family, style: MONO.regular };
    });
  }
  return bar;
}

/** Pagination.tsx buildPageList() — verbatim. */
function buildPageList(page, total) {
  if (total <= 7) { const o = []; for (let i = 1; i <= total; i++) o.push(i); return o; }
  const out = [1];
  const left = Math.max(2, page - 1);
  const right = Math.min(total - 1, page + 1);
  if (left > 2) out.push('…');
  for (let i = left; i <= right; i++) out.push(i);
  if (right < total - 1) out.push('…');
  out.push(total);
  return out;
}

/**
 * The shared directory card.
 * o: { rows, allRows, heading, noun, showRole, showLine, showStatusFilter,
 *      query, page, emptyOnly, roleFilterLabel, statusFilterLabel }
 */
function buildDirectory(parent, y, o) {
  const rows = o.rows;
  const cols = acctColumns(o.allRows.length ? o.allRows : rows, o.showRole, o.showLine);
  const bodyH = rows.length
    ? rows.length * A_ROW_H + (rows.length - 1)
    : SP.s3 * 4 + lh(FS.sm);                      // py-12 empty cell
  const H = A_TOOLBAR_H + A_THEAD_H + bodyH + A_PAGER_H;

  const card = frame(parent, 'Directory card', 0, y, CONTENT_W, H,
    { bg: C.white, radius: RAD.xxl, stroke: C.slate200, strokeOpacity: 0.7, clip: true, shadow: CARD_SHADOW });

  /* Toolbar */
  const tb = frame(card, 'Toolbar', 0, 0, CONTENT_W, A_TOOLBAR_H);
  hairline(tb, 'Border bottom', 0, A_TOOLBAR_H - 1, CONTENT_W, C.slate100);
  text(tb, 'Heading', o.heading, A_PX, (A_TOOLBAR_H - 1 - lh(FS.base)) / 2,
    { size: FS.base, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });

  const ctrlY = (A_TOOLBAR_H - 1 - A_CTRL_H) / 2;
  let rx = CONTENT_W - A_PX;
  const selW = 136;                                        // w-32
  if (o.showStatusFilter) {
    rx -= selW;
    acctSelect(tb, 'Select - Filter by status', rx, ctrlY, selW, o.statusFilterLabel || 'All status',
      o.openFilter === 'status');
    rx -= SP.s2;
  }
  if (o.showRole) {
    rx -= selW;
    acctSelect(tb, 'Select - Filter by role', rx, ctrlY, selW, o.roleFilterLabel || 'All roles',
      o.openFilter === 'role');
    rx -= SP.s2;
  }
  const searchW = SP.s3 * 2 + 17 + SP.s2 + 204 + 2;        // px-3 + icon + gap-2 + w-48
  rx -= searchW;
  const search = frame(tb, 'Search', rx, ctrlY, searchW, A_CTRL_H,
    { bg: C.white, radius: RAD.lg, stroke: o.query ? C.gray300 : C.gray200 });
  icon(search, 'Icon · search', I.search, SP.s3, (A_CTRL_H - 17) / 2, 17, C.gray400);
  text(search, o.query ? 'Query' : 'Placeholder', o.query || 'Search name or email',
    SP.s3 + 17 + SP.s2, (A_CTRL_H - lh(FS.sm)) / 2,
    { size: FS.sm, color: o.query ? C.gray900 : C.gray400 });

  /* Thead */
  const th = frame(card, 'Thead', 0, A_TOOLBAR_H, CONTENT_W, A_THEAD_H, { bg: C.slate50, opacity: 0.5 });
  hairline(th, 'Border bottom', 0, A_THEAD_H - 1, CONTENT_W, C.slate100);
  const LABELS = { user: 'User', role: 'Role', line: 'Shipping line', status: 'Status', last: 'Last active' };
  let cx = 0;
  cols.forEach((c) => {
    if (c.key !== 'actions') {
      const t = text(th, 'Th · ' + LABELS[c.key], LABELS[c.key].toUpperCase(), cx + A_PX, SP.s2_5,
        { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
      // Only the User header is a sort button.
      if (c.key === 'user') {
        icon(th, 'Icon · sort', AI.sortUpDn, cx + A_PX + t.width + SP.s1_5,
          SP.s2_5 + (lh(FS.t11) - 12.75) / 2, 12.75, C.gray300);
      }
    }
    cx += c.w;
  });
  // The actions th is sticky with its own translucent wash + left shadow.
  rect(th, 'Sticky actions wash', CONTENT_W - A_ACTIONS_W, 0, A_ACTIONS_W, A_THEAD_H - 1,
    { bg: C.slate50, opacity: 0.7 });

  /* Rows */
  let ry = A_TOOLBAR_H + A_THEAD_H;
  if (!rows.length) {
    const empty = frame(card, 'Empty row', 0, ry, CONTENT_W, bodyH);
    const t = text(empty, 'Empty', 'No ' + o.noun + ' match your filters.', 0,
      (bodyH - lh(FS.sm)) / 2, { size: FS.sm, color: C.slate400, width: CONTENT_W, align: 'CENTER' });
    t.y = (bodyH - t.height) / 2;
  }
  rows.forEach((u, i) => {
    const row = frame(card, 'Row · ' + u.name, 0, ry, CONTENT_W, A_ROW_H);
    if (i > 0) hairline(row, 'Divider', 0, 0, CONTENT_W, C.slate100);
    let x = 0;
    cols.forEach((c) => {
      if (c.key === 'user') {
        acctAvatar(row, x + A_PX, (A_ROW_H - A_AVATAR) / 2, u.name);
        const tx = x + A_PX + A_AVATAR + SP.s3;
        const blockH = lh(FS.t13) + lh(FS.t11_5);
        text(row, 'Name', u.name, tx, (A_ROW_H - blockH) / 2,
          { size: FS.t13, weight: FONT.semibold, color: C.slate900, tracking: -0.2 });
        text(row, 'Email', u.email, tx, (A_ROW_H - blockH) / 2 + lh(FS.t13),
          { size: FS.t11_5, color: C.slate400 });
      } else if (c.key === 'role') {
        acctPill(row, 'Role pill', x + A_PX, (A_ROW_H - pillH()) / 2, ROLE_LABEL[u.role], ROLE_TONE[u.role]);
      } else if (c.key === 'line') {
        acctLineTile(row, x + A_PX, (A_ROW_H - 20) / 2, u.line);
        text(row, 'Line name', u.line, x + A_PX + 20 + SP.s2, (A_ROW_H - lh(FS.t12_5)) / 2,
          { size: FS.t12_5, weight: FONT.medium, color: C.slate700, tracking: -0.2 });
      } else if (c.key === 'status') {
        acctPill(row, 'Status pill', x + A_PX, (A_ROW_H - pillH()) / 2, u.status, STATUS_TONE[u.status]);
      } else if (c.key === 'last') {
        // `tabular-nums` is a figure-spacing feature, not a family — this stays
        // on the body sans. Only Pagination uses `font-mono`.
        text(row, 'Last active', u.last, x + A_PX, (A_ROW_H - lh(FS.t12)) / 2,
          { size: FS.t12, color: C.slate500 });
      } else {
        rect(row, 'Sticky actions wash', x, 0, A_ACTIONS_W, A_ROW_H, { bg: C.white, opacity: 0.7 });
        const kb = frame(row, 'Button - Row actions', x + A_PX, (A_ROW_H - 29.75) / 2, 29.75, 29.75,
          { radius: RAD.md });
        for (let d = 0; d < 3; d++) {
          rect(kb, 'Dot', (29.75 - 3) / 2, 8.5 + d * 5, 3, 3, { bg: C.slate400, radius: RAD.full });
        }
      }
      x += c.w;
    });
    ry += A_ROW_H + 1;
  });
  if (rows.length) ry -= 1;

  buildAcctPager(card, ry, o.page || 1, A_PAGE_SIZE, o.total, o.noun,
    o.perPageOpen ? o.overlay : null, o.cardX, o.cardY + y);

  return { card: card, height: H, cols: cols, rowsTop: A_TOOLBAR_H + A_THEAD_H };
}

/** Select trigger, size="sm" (px-3 py-1.5), with an optional open menu. */
function acctSelect(parent, name, x, y, w, label, open, options, overlay, ox, oy) {
  const f = frame(parent, name, x, y, w, A_CTRL_H,
    { bg: C.white, radius: RAD.lg, stroke: open ? C.gray300 : C.gray200 });
  text(f, 'Value', label, SP.s3, (A_CTRL_H - lh(FS.sm)) / 2, { size: FS.sm, color: C.gray900 });
  const chev = icon(f, 'Icon · chevron', I.chevronDown, w - SP.s3 - 14.875,
    (A_CTRL_H - 14.875) / 2, 14.875, C.gray400);
  if (open) chev.rotation = 180;
  if (open && options && overlay) {
    // Portaled to <body> with fixed coords — it escapes the card's clip.
    const optH = SP.s2 * 2 + lh(FS.sm);
    const h = options.length * optH + SP.s1 * 2 + 2;
    const menu = frame(overlay, 'Select menu · ' + name, ox + x, oy + y + A_CTRL_H + SP.s1, w, h,
      { bg: C.white, radius: RAD.lg, stroke: C.gray200, clip: true, shadow: MENU_SHADOW });
    options.forEach((opt, i) => {
      const on = opt === label;
      const row = frame(menu, 'Option · ' + opt, 0, SP.s1 + i * optH, w, optH,
        { bg: on ? C.brand50 : undefined });
      text(row, 'Label', opt, SP.s3, SP.s2, { size: FS.sm, color: on ? C.brand700 : C.gray700 });
      if (on) icon(row, 'Icon · tick', I.check, w - SP.s3 - 17, (optH - 17) / 2, 17, C.brand600);
    });
  }
  return f;
}

/** RowMenu — w-52, tone lookup from components/RowMenu.tsx. */
const A_TONE = {
  default: { label: C.slate700, icon: C.slate400 },
  success: { label: C.emerald600, icon: C.emerald500 },
  danger:  { label: C.rose600, icon: C.rose500 },
};
function buildAcctRowMenu(parent, triggerX, triggerY, items) {
  const W = 221, ITEM_H = 32;
  const h = items.length * ITEM_H + 8;
  const below = triggerY + 29.75 + 6;
  const my = (below + h > FRAME_H - 8) ? triggerY - 6 - h : below;
  const menu = frame(parent, 'Row actions menu', triggerX + 29.75 - W, my, W, h, {
    bg: C.white, radius: RAD.xl, stroke: C.slate200, strokeOpacity: 0.8, clip: true, shadow: MENU_SHADOW,
  });
  items.forEach((it, i) => {
    const tone = A_TONE[it.tone || 'default'];
    const tile = frame(menu, 'Menu item · ' + it.label, SP.s1, SP.s1 + i * ITEM_H, W - SP.s2, ITEM_H - 2,
      { radius: RAD.md });
    icon(tile, 'Icon', it.ic, SP.s2_5, (ITEM_H - 2 - 17) / 2, 17, tone.icon);
    text(tile, 'Label', it.label, SP.s2_5 + 17 + SP.s2_5, (ITEM_H - 2 - lh(FS.t13)) / 2,
      { size: FS.t13, weight: FONT.medium, color: tone.label });
  });
  return menu;
}

/** PageHeader — title + subtitle chip, then Export (always on) + the CTA. */
function acctPageHeader(parent, title, subtitle, createLabel) {
  const btnH = SP.s1_5 * 2 + lh(FS.sm) + 2;
  const h = frame(parent, 'Page header', 0, 0, CONTENT_W, Math.max(lh(FS.xl), btnH));
  const H = h.height;
  const t = text(h, 'Page title', title, 0, (H - lh(FS.xl)) / 2,
    { size: FS.xl, weight: FONT.semibold, color: C.slate900, tracking: -0.5 });
  // subtitle: rounded-md border px-2 py-0.5 text-xs
  const chipH = SP.s05 * 2 + lh(FS.xs) + 2;
  const chipW = SP.s2 * 2 + measure(subtitle, FS.xs, FONT.regular);
  const chip = frame(h, 'Subtitle chip', t.width + SP.s2, (H - chipH) / 2, chipW, chipH,
    { radius: RAD.md, stroke: C.slate200 });
  text(chip, 'Label', subtitle, SP.s2, SP.s05 + 1, { size: FS.xs, color: C.slate600 });

  // .btn-primary — rounded-md, no border.
  const cW = SP.s3 * 2 + 14.875 + SP.s1_5 + measure(createLabel, FS.sm, FONT.medium);
  const cH = SP.s1_5 * 2 + lh(FS.sm);
  const create = frame(h, 'Button - ' + createLabel, CONTENT_W - cW, (H - cH) / 2, cW, cH,
    { bg: C.brand600, radius: RAD.md });
  icon(create, 'Icon · plus', AI.plus, SP.s3, (cH - 14.875) / 2, 14.875, C.white);
  text(create, 'Label', createLabel, SP.s3 + 14.875 + SP.s1_5, SP.s1_5,
    { size: FS.sm, weight: FONT.medium, color: C.white });

  // showExport defaults to true and UserDirectory never turns it off.
  const eW = SP.s3 * 2 + 17 + SP.s1_5 + measure('Export', FS.sm, FONT.medium) + 2;
  const ex = frame(h, 'Button - Export', CONTENT_W - cW - SP.s2 - eW, (H - btnH) / 2, eW, btnH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  icon(ex, 'Icon', I.export, SP.s3, (btnH - 17) / 2, 17, C.slate500);
  text(ex, 'Label', 'Export', SP.s3 + 17 + SP.s1_5, (btnH - lh(FS.sm)) / 2,
    { size: FS.sm, weight: FONT.medium, color: C.slate700 });
  return h;
}

/* The chassis NAV lists Accounts as a group with no children, but
   buildNavEntries() gives it two leaves — Users (/users) and Operators
   (/operators) — exactly like Tickets. Rebuild the sidebar so the group is
   expanded and the correct LEAF is the active item. */
const ACCT_NAV_ICONS = {
  users:     { sw: 1.5, d: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
  operators: { sw: 1.5, d: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
};

/** buildSidebar + the two Accounts leaves, with `activeLeaf` highlighted. */
function acctSidebar(parent, activeLeaf) {
  const side = buildSidebar(parent, null);
  const nav = side.findOne((n) => n.name === 'Navigation');
  if (!nav) return side;
  const anchor = nav.findOne((n) => n.name === 'Nav item \u00b7 Accounts');
  if (!anchor) return side;

  const insertY = anchor.y + NAV_ITEM_H + NAV_GAP;
  const leaves = [
    { label: 'Users', ic: ACCT_NAV_ICONS.users },
    { label: 'Operators', ic: ACCT_NAV_ICONS.operators },
  ];
  const shift = leaves.length * (NAV_ITEM_H + NAV_GAP);
  // Push everything below the group down to make room.
  nav.children.forEach((c) => { if (c.y >= insertY) c.y += shift; });

  leaves.forEach((leaf, i) => {
    const active = leaf.label === activeLeaf;
    const item = frame(nav, 'Nav item \u00b7 ' + leaf.label, 0, insertY + i * (NAV_ITEM_H + NAV_GAP),
      nav.width, NAV_ITEM_H, { radius: RAD.md });
    if (active) {
      rect(item, 'Active indicator', 0, (NAV_ITEM_H - SP.s5) / 2, 3, SP.s5,
        { bg: C.brand500, radius: 1.5 });
    }
    icon(item, 'Icon', leaf.ic, SP.s9, (NAV_ITEM_H - 18) / 2, 18, active ? C.brand600 : C.slate400);
    text(item, 'Label', leaf.label, SP.s9 + 18 + SP.s3, (NAV_ITEM_H - lh(FS.t13_5)) / 2, {
      size: FS.t13_5,
      weight: active ? FONT.medium : FONT.regular,
      color: active ? C.slate900 : C.slate600,
      tracking: active ? -0.2 : 0,
    });
  });
  nav.resize(nav.width, nav.height + shift);
  return side;
}

/** Shell for /users and /operators. `scroll` offsets the content container. */
function acctShell(name, x, y, navLabel, scroll) {
  const f = frame(figma.currentPage, name, x, y, FRAME_W, FRAME_H, { bg: C.white, clip: true });
  LAST_SHELL = f;
  acctSidebar(f, navLabel);
  const right = frame(f, 'Container', MAIN_X, 0, MAIN_W, FRAME_H);
  buildTopbar(right);
  const main = frame(right, 'Main Content', 0, TOPBAR_H, MAIN_W, MAIN_H, { clip: true });
  const content = frame(main, 'Container', CONTENT_X, CONTENT_Y - (scroll || 0), CONTENT_W, 2000);
  return {
    frame: f, container: right, content: content,
    // Absolute offset of content-local (0,0) inside the frame — overlays need it.
    ox: MAIN_X + CONTENT_X,
    oy: TOPBAR_H + CONTENT_Y - (scroll || 0),
  };
}


/* ── A3. UserFormModal ─────────────────────────────────────────────────── */

const F_W = 544;                                    // max-w-lg
const F_INP_H = SP.s2 * 2 + lh(FS.t13) + 2;         // px-3 py-2 text-[13px]
const F_LABEL_H = lh(FS.t12_5);                     // text-[12.5px] semibold
const F_SEL_H = SP.s2 * 2 + lh(FS.sm) + 2;          // Select size="md"
const F_ERR_H = SP.s1 + lh(FS.t11_5);               // mt-1 text-[11.5px]

function fField(parent, x, y, w, label, required, error) {
  const t = text(parent, 'Field label', label, x, y,
    { size: FS.t12_5, weight: FONT.semibold, color: C.slate700, tracking: -0.2 });
  if (required) {
    text(parent, 'Required', '*', x + t.width + SP.s05, y,
      { size: FS.t12_5, weight: FONT.semibold, color: C.rose500 });
  }
  let h = F_LABEL_H + SP.s1_5;
  if (error) {
    text(parent, 'Error', error, x, y + h + F_INP_H + SP.s1,
      { size: FS.t11_5, weight: FONT.medium, color: C.rose500 });
  }
  return h;
}

function fInput(parent, x, y, w, value, placeholder, opts) {
  const o = opts || {};
  const f = frame(parent, 'Input · ' + (value || placeholder || ''), x, y, w, F_INP_H,
    { bg: C.white, radius: RAD.lg, stroke: o.error ? C.rose300 : C.slate200 });
  // type="password" masks the value until the reveal toggle is pressed.
  let shown = value || '';
  if (o.password && !o.revealed && shown) {
    let dots = ''; for (let i = 0; i < shown.length; i++) dots += '\u2022';
    shown = dots;
  }
  text(f, value ? 'Value' : 'Placeholder', shown || placeholder || '', SP.s3, SP.s2 + 1,
    { size: FS.t13, color: value ? C.slate900 : C.slate400 });
  if (o.password) {
    // Reveal toggle — h-7 w-8, right-1, centred.
    const b = frame(f, 'Button - Toggle reveal', w - 4.25 - 34, (F_INP_H - 29.75) / 2, 34, 29.75,
      { radius: RAD.md });
    icon(b, 'Icon', o.revealed ? AI.eyeOff : AI.eye, (34 - 17) / 2, (29.75 - 17) / 2, 17, C.slate400);
  }
  return f;
}

/**
 * o: { mode: 'create'|'edit', noun: 'user'|'operator', first, last, email,
 *      password, confirm, revealed, role, status, errors, roleOpen }
 */
function buildUserFormModal(parent, o) {
  o = o || {};
  const isEdit = o.mode === 'edit';
  const noun = o.noun || 'user';
  const showRole = noun !== 'operator';
  const errs = o.errors || {};
  const e = (k) => (o.touched ? errs[k] : '');

  buildScrim(parent, 0.3);
  const dlg = frame(parent, 'Dialog - ' + (isEdit ? 'Edit ' : 'Create ') + noun,
    (FRAME_W - F_W) / 2, 0, F_W, 100,
    { bg: C.white, radius: RAD.xxl, stroke: C.gray200, clip: true, shadow: MODAL_SHADOW });

  /* Header — px-6 py-4, gap-2.5 */
  const hTextH = lh(FS.t15_5) + lh(FS.t12);
  const headH = SP.s4 * 2 + Math.max(SP.s8, hTextH) + 1;
  const head = frame(dlg, 'Header', 0, 0, F_W, headH);
  hairline(head, 'Border bottom', 0, headH - 1, F_W, C.slate100);
  const badge = frame(head, 'Icon badge', SP.s6, (headH - 1 - SP.s8) / 2, SP.s8, SP.s8,
    { bg: C.brand50, radius: RAD.full, stroke: C.brand100 });
  icon(badge, 'Icon · person', AI.person, (SP.s8 - 17) / 2, (SP.s8 - 17) / 2, 17, C.brand600);
  const htx = SP.s6 + SP.s8 + SP.s2_5;
  const hty = (headH - 1 - hTextH) / 2;
  text(head, 'Title', (isEdit ? 'Edit ' : 'Create ') + noun, htx, hty,
    { size: FS.t15_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  text(head, 'Subtitle', isEdit
    ? 'Update this ' + noun + "'s details and access."
    : 'Add a ' + noun + ' and assign them to the current shipping line.',
    htx, hty + lh(FS.t15_5), { size: FS.t12, color: C.slate500 });

  /* Body — space-y-4 px-6 py-5 */
  const body = frame(dlg, 'Body', 0, headH, F_W, 100);
  const X = SP.s6, W = F_W - SP.s6 * 2;
  const colW = (W - SP.s3) / 2;
  let y = SP.s5;

  const nameErrH = (e('firstName') || e('lastName')) ? F_ERR_H : 0;
  fField(body, X, y, colW, 'First name', true, e('firstName'));
  fInput(body, X, y + F_LABEL_H + SP.s1_5, colW, o.first, 'E.g. Juan', { error: !!e('firstName') });
  fField(body, X + colW + SP.s3, y, colW, 'Last name', true, e('lastName'));
  fInput(body, X + colW + SP.s3, y + F_LABEL_H + SP.s1_5, colW, o.last, 'E.g. Dela Cruz',
    { error: !!e('lastName') });
  y += F_LABEL_H + SP.s1_5 + F_INP_H + nameErrH + SP.s4;

  fField(body, X, y, W, 'Email', true, e('email'));
  fInput(body, X, y + F_LABEL_H + SP.s1_5, W, o.email, 'name@operator.ph', { error: !!e('email') });
  y += F_LABEL_H + SP.s1_5 + F_INP_H + (e('email') ? F_ERR_H : 0) + SP.s4;

  if (!isEdit) {
    fField(body, X, y, W, 'Password', true, e('password'));
    fInput(body, X, y + F_LABEL_H + SP.s1_5, W, o.password, '••••••••',
      { password: true, revealed: o.revealed, error: !!e('password') });
    y += F_LABEL_H + SP.s1_5 + F_INP_H + (e('password') ? F_ERR_H : 0) + SP.s4;

    fField(body, X, y, W, 'Confirm Password', true, e('confirm'));
    fInput(body, X, y + F_LABEL_H + SP.s1_5, W, o.confirm, '••••••••',
      { password: true, revealed: o.revealedConfirm, error: !!e('confirm') });
    y += F_LABEL_H + SP.s1_5 + F_INP_H + (e('confirm') ? F_ERR_H : 0) + SP.s4;
  }

  // grid grid-cols-2 gap-3 — Role (platform users only) and Status (edit only).
  let gridH = 0;
  if (showRole) {
    fField(body, X, y, colW, 'Role', false, '');
    acctSelectMd(body, X, y + F_LABEL_H + SP.s1_5, colW,
      ROLE_LABEL[o.role || 'Superadmin'], o.roleOpen,
      ['Super Admin', 'Admin'], dlg, 0, headH);
    gridH = F_LABEL_H + SP.s1_5 + F_SEL_H;
  }
  if (isEdit) {
    const sx = showRole ? X + colW + SP.s3 : X;
    fField(body, sx, y, colW, 'Status', false, '');
    // Segmented control — rounded-lg bg-slate-100 p-0.5, two flex-1 tiles.
    const segH = SP.s05 * 2 + (SP.s1_5 * 2 + lh(FS.t12));
    const seg = frame(body, 'Segmented - Status', sx, y + F_LABEL_H + SP.s1_5, colW, segH,
      { bg: C.slate100, radius: RAD.lg });
    ['Active', 'Suspended'].forEach((s, i) => {
      const on = (o.status || 'Active') === s;
      const tw = (colW - SP.s05 * 2) / 2;
      const tile = frame(seg, 'Tile · ' + s, SP.s05 + i * tw, SP.s05, tw, segH - SP.s05 * 2,
        { bg: on ? C.white : undefined, radius: RAD.md });
      const t = text(tile, 'Label', s, 0, SP.s1_5,
        { size: FS.t12, weight: FONT.medium,
          color: on ? (s === 'Active' ? C.emerald700 : C.slate700) : C.slate500 });
      t.x = (tw - t.width) / 2;
    });
    gridH = Math.max(gridH, F_LABEL_H + SP.s1_5 + segH);
  }
  // Operator create: the grid renders with NO children — zero height, but
  // space-y-4 still puts 17px above it.
  y += gridH + SP.s5;                              // + py-5 bottom padding
  const bodyH = y;
  body.resize(F_W, bodyH);

  /* Footer — px-6 py-3.5, justify-end gap-2 */
  const cancelH = SP.s1_5 * 2 + lh(FS.sm) + 2;
  const footH = 1 + SP.s3_5 * 2 + cancelH;
  const foot = frame(dlg, 'Footer', 0, headH + bodyH, F_W, footH);
  hairline(foot, 'Border top', 0, 0, F_W, C.slate100);
  const cta = isEdit ? 'Save changes' : 'Create ' + noun;
  const ctaW = SP.s3 * 2 + measure(cta, FS.sm, FONT.medium);
  const cancelW = SP.s3 * 2 + measure('Cancel', FS.sm, FONT.medium) + 2;
  const by = 1 + SP.s3_5;
  const cancel = frame(foot, 'Button - Cancel', F_W - SP.s6 - ctaW - SP.s2 - cancelW, by,
    cancelW, cancelH, { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(cancel, 'Label', 'Cancel', SP.s3, SP.s1_5 + 1,
    { size: FS.sm, weight: FONT.medium, color: C.slate700 });
  const submit = frame(foot, 'Button - ' + cta, F_W - SP.s6 - ctaW, by + 1, ctaW, cancelH - 2,
    { bg: C.brand600, radius: RAD.lg });
  if (o.invalid) submit.opacity = 0.6;             // disabled:opacity-60
  text(submit, 'Label', cta, SP.s3, SP.s1_5, { size: FS.sm, weight: FONT.medium, color: C.white });

  const H = headH + bodyH + footH;
  dlg.resize(F_W, H);
  dlg.y = (FRAME_H - H) / 2;
  return dlg;
}

/** Select size="md" inside the form dialog; its menu is portaled to <body>. */
function acctSelectMd(parent, x, y, w, label, open, options, overlay, ox, oy) {
  const f = frame(parent, 'Select · ' + label, x, y, w, F_SEL_H,
    { bg: C.white, radius: RAD.lg, stroke: open ? C.gray300 : C.gray200 });
  text(f, 'Value', label, SP.s3, SP.s2 + 1, { size: FS.sm, color: C.gray900 });
  const chev = icon(f, 'Icon · chevron', I.chevronDown, w - SP.s3 - 14.875,
    (F_SEL_H - 14.875) / 2, 14.875, C.gray400);
  if (open) chev.rotation = 180;
  if (open && options && overlay) {
    const optH = SP.s2 * 2 + lh(FS.sm);
    const h = options.length * optH + SP.s1 * 2 + 2;
    A_PENDING.push(function () {
      const menu = frame(overlay, 'Select menu · Role', (ox || 0) + x, (oy || 0) + y + F_SEL_H + SP.s1,
        w, h, { bg: C.white, radius: RAD.lg, stroke: C.gray200, clip: true, shadow: MENU_SHADOW });
      options.forEach((opt, i) => {
        const on = opt === label;
        const row = frame(menu, 'Option · ' + opt, 0, SP.s1 + i * optH, w, optH,
          { bg: on ? C.brand50 : undefined });
        text(row, 'Label', opt, SP.s3, SP.s2, { size: FS.sm, color: on ? C.brand700 : C.gray700 });
        if (on) icon(row, 'Icon · tick', I.check, w - SP.s3 - 17, (optH - 17) / 2, 17, C.brand600);
      });
    });
  }
  return f;
}
let A_PENDING = [];


/* ── A4. UserStatusDialog ──────────────────────────────────────────────── */

function buildUserStatusDialog(parent, o) {
  const W = 476;                                   // max-w-md at a 17px root
  const suspending = o.mode === 'suspend';
  const P = SP.s6;                                 // p-6
  const bodyW = W - P * 2 - SP.s9 - SP.s3;

  buildScrim(parent, 0.3);
  const dlg = frame(parent, 'Dialog - ' + (suspending ? 'Suspend' : 'Reactivate') + ' ' + o.noun,
    (FRAME_W - W) / 2, 0, W, 100,
    { bg: C.white, radius: RAD.xxl, stroke: C.gray200, clip: true, shadow: MODAL_SHADOW });

  const badge = frame(dlg, 'Icon badge', P, P, SP.s9, SP.s9, {
    bg: suspending ? C.rose50 : C.emerald50, radius: RAD.full,
    stroke: suspending ? C.rose200 : C.emerald200, strokeOpacity: 0.7,
  });
  icon(badge, 'Icon', suspending ? AI.slash : AI.checkBig, (SP.s9 - 18) / 2, (SP.s9 - 18) / 2, 18,
    suspending ? C.rose600 : C.emerald600);

  const tx = P + SP.s9 + SP.s3;
  text(dlg, 'Title', (suspending ? 'Suspend this ' : 'Reactivate this ') + o.noun + '?', tx, P,
    { size: FS.t15, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });

  const copy = suspending
    ? o.name + ' will be marked Suspended and won’t be able to sign in. Their record stays on file and access can be restored at any time.'
    : o.name + ' will be marked Active and can sign in again straight away.';
  const p = text(dlg, 'Body', copy, tx, P + lh(FS.t15) + SP.s1,
    { size: FS.t12_5, color: C.slate500, lh: FS.t12_5 * 1.625, width: bodyW });
  // The name and the status word are semibold and re-toned in the source.
  try {
    p.setRangeFills(0, o.name.length, fill(C.slate700));
    p.setRangeFontName(0, o.name.length, { family: FONT.family, style: FONT.semibold });
    const word = suspending ? 'Suspended' : 'Active';
    const at = copy.indexOf(' will be marked ') + ' will be marked '.length;
    p.setRangeFills(at, at + word.length, fill(suspending ? C.rose600 : C.emerald600));
    p.setRangeFontName(at, at + word.length, { family: FONT.family, style: FONT.semibold });
  } catch (err) { /* defensive */ }

  const textH = lh(FS.t15) + SP.s1 + p.height;
  const rowH = Math.max(SP.s9, textH);
  const btnY = P + rowH + SP.s5;                   // mt-5
  const cancelH = SP.s2 * 2 + lh(FS.t12_5) + 2;    // px-3.5 py-2 + ring-1
  const confirmH = SP.s2 * 2 + lh(FS.t12_5);
  const confirmLabel = suspending ? 'Suspend' : 'Reactivate';
  const confirmW = SP.s4 * 2 + measure(confirmLabel, FS.t12_5, FONT.semibold);
  const cancelW = SP.s3_5 * 2 + measure('Cancel', FS.t12_5, FONT.semibold) + 2;

  const cancel = frame(dlg, 'Button - Cancel', W - P - confirmW - SP.s2_5 - cancelW, btnY,
    cancelW, cancelH, { radius: RAD.lg, stroke: C.slate200 });
  text(cancel, 'Label', 'Cancel', SP.s3_5, SP.s2 + 1,
    { size: FS.t12_5, weight: FONT.semibold, color: C.slate600 });
  const confirm = frame(dlg, 'Button - ' + confirmLabel, W - P - confirmW, btnY + 1,
    confirmW, confirmH, { bg: suspending ? C.rose600 : C.emerald600, radius: RAD.lg });
  text(confirm, 'Label', confirmLabel, SP.s4, SP.s2,
    { size: FS.t12_5, weight: FONT.semibold, color: C.white });

  const H = btnY + cancelH + P;
  dlg.resize(W, H);
  dlg.y = (FRAME_H - H) / 2;
  return dlg;
}


/* ── A5. Page compositions ─────────────────────────────────────────────── */

const USERS_CFG = {
  heading: 'Platform users', noun: 'users', title: 'Users', subtitle: 'Admin accounts',
  createLabel: 'Create user', nav: 'Users', showRole: true, showLine: true,
  showStatusFilter: true,
};
const OPS_CFG = {
  heading: 'Operator accounts', noun: 'operators', title: 'Operators',
  subtitle: 'Operator accounts', createLabel: 'Create operator', nav: 'Operators',
  showRole: false, showLine: false, showStatusFilter: false,
};

function buildDirectoryPage(name, x, y, cfg, all, o) {
  o = o || {};
  const s = acctShell(name, x, y, cfg.nav, o.scroll);
  const head = acctPageHeader(s.content, cfg.title, cfg.subtitle, cfg.createLabel);
  const cardY = head.height + SP.s6;

  if (o.loading) { buildSkeleton(s.content, cardY, 10); return s; }

  const page = o.page || 1;
  const rows = o.rows !== undefined ? o.rows
    : all.slice((page - 1) * A_PAGE_SIZE, page * A_PAGE_SIZE);
  const total = o.total !== undefined ? o.total : all.length;

  const built = buildDirectory(s.content, cardY, {
    rows: rows, allRows: all, total: total, page: page,
    heading: cfg.heading, noun: cfg.noun,
    showRole: cfg.showRole, showLine: cfg.showLine,
    showStatusFilter: cfg.showStatusFilter,
    query: o.query, openFilter: o.openFilter,
    roleFilterLabel: o.roleFilterLabel, statusFilterLabel: o.statusFilterLabel,
    perPageOpen: o.perPageOpen, overlay: s.frame, cardX: s.ox, cardY: s.oy,
  });

  // Portaled Select menus (fixed coords) escape the card's clip.
  if (o.openFilter) {
    const selW = 136;
    const statusX = CONTENT_W - A_PX - selW;
    const roleX = statusX - SP.s2 - selW;
    const ctrlY = cardY + (A_TOOLBAR_H - 1 - A_CTRL_H) / 2;
    const opts = o.openFilter === 'role'
      ? ['All roles', 'Superadmin', 'Admin']
      : ['All status', 'Active', 'Suspended'];
    const label = o.openFilter === 'role' ? (o.roleFilterLabel || 'All roles')
                                          : (o.statusFilterLabel || 'All status');
    const mx = o.openFilter === 'role' ? roleX : statusX;
    const optH = SP.s2 * 2 + lh(FS.sm);
    const mh = opts.length * optH + SP.s1 * 2 + 2;
    const menu = frame(s.frame, 'Select menu · ' + o.openFilter,
      s.ox + mx, s.oy + ctrlY + A_CTRL_H + SP.s1, selW, mh,
      { bg: C.white, radius: RAD.lg, stroke: C.gray200, clip: true, shadow: MENU_SHADOW });
    opts.forEach((opt, i) => {
      const on = opt === label;
      const row = frame(menu, 'Option · ' + opt, 0, SP.s1 + i * optH, selW, optH,
        { bg: on ? C.brand50 : undefined });
      text(row, 'Label', opt, SP.s3, SP.s2, { size: FS.sm, color: on ? C.brand700 : C.gray700 });
      if (on) icon(row, 'Icon · tick', I.check, selW - SP.s3 - 17, (optH - 17) / 2, 17, C.brand600);
    });
  }

  // Row menu, anchored to a given row index.
  if (o.menuRow !== undefined && rows[o.menuRow]) {
    const rowY = cardY + built.rowsTop + o.menuRow * (A_ROW_H + 1);
    const kebabX = CONTENT_W - A_ACTIONS_W + A_PX;
    const u = rows[o.menuRow];
    const suspended = u.status === 'Suspended';
    buildAcctRowMenu(s.frame,
      s.ox + kebabX, s.oy + rowY + (A_ROW_H - 29.75) / 2,
      [
        // NB: the label is hard-coded "Edit user" on both pages.
        { label: 'Edit user', ic: AI.pencil },
        { label: suspended ? 'Reactivate' : 'Suspend', ic: AI.suspend,
          tone: suspended ? 'success' : 'danger' },
      ]);
  }
  return s;
}


/* ── A6. Frames ────────────────────────────────────────────────────────── */

const AQUINO = SEED_USERS.filter((u) => /aquino/i.test(u.name + ' ' + u.email));

const BUILDERS = [
  { name: 'Accounts / Users / 01 — Directory',
    build: (x, y, n) => buildDirectoryPage(n, x, y, USERS_CFG, SEED_USERS, {}) },

  { name: 'Accounts / Users / 02 — Loading skeleton',
    build: (x, y, n) => buildDirectoryPage(n, x, y, USERS_CFG, SEED_USERS, { loading: true }) },

  { name: 'Accounts / Users / 03 — Row menu open',
    build: (x, y, n) => buildDirectoryPage(n, x, y, USERS_CFG, SEED_USERS, { menuRow: 3 }) },

  { name: 'Accounts / Users / 04 — Role filter open',
    build: (x, y, n) => buildDirectoryPage(n, x, y, USERS_CFG, SEED_USERS, { openFilter: 'role' }) },

  { name: 'Accounts / Users / 05 — Status filter open',
    build: (x, y, n) => buildDirectoryPage(n, x, y, USERS_CFG, SEED_USERS, { openFilter: 'status' }) },

  { name: 'Accounts / Users / 06 — Search "aquino"',
    build: (x, y, n) => buildDirectoryPage(n, x, y, USERS_CFG, SEED_USERS,
      { query: 'aquino', rows: AQUINO, total: AQUINO.length }) },

  { name: 'Accounts / Users / 07 — No users match',
    build: (x, y, n) => buildDirectoryPage(n, x, y, USERS_CFG, SEED_USERS,
      { query: 'zzz', rows: [], total: 0 }) },

  { name: 'Accounts / Users / 08 — Per page open — 12 matches no option',
    build: (x, y, n) => buildDirectoryPage(n, x, y, USERS_CFG, SEED_USERS, { perPageOpen: true }) },

  { name: 'Accounts / Operators / 01 — Directory — Page 1 of 3',
    build: (x, y, n) => buildDirectoryPage(n, x, y, OPS_CFG, SEED_OPERATORS, {}) },

  { name: 'Accounts / Operators / 02 — Scrolled to pager — Page 2 of 3',
    build: (x, y, n) => buildDirectoryPage(n, x, y, OPS_CFG, SEED_OPERATORS,
      { page: 2, scroll: 320 }) },

  { name: 'Accounts / Operators / 03 — Row menu — Reactivate',
    build: (x, y, n) => buildDirectoryPage(n, x, y, OPS_CFG, SEED_OPERATORS, { menuRow: 8 }) },

  { name: 'Accounts / Operators / 04 — No operators match',
    build: (x, y, n) => buildDirectoryPage(n, x, y, OPS_CFG, SEED_OPERATORS,
      { query: 'zzz', rows: [], total: 0 }) },

  { name: 'Accounts / Create user / 01 — Empty form',
    build: (x, y, n) => {
      const s = buildDirectoryPage(n, x, y, USERS_CFG, SEED_USERS, {});
      buildUserFormModal(s.frame, { mode: 'create', noun: 'user', role: 'Superadmin', invalid: true });
    } },

  { name: 'Accounts / Create user / 02 — Validation errors',
    build: (x, y, n) => {
      const s = buildDirectoryPage(n, x, y, USERS_CFG, SEED_USERS, {});
      buildUserFormModal(s.frame, {
        mode: 'create', noun: 'user', role: 'Superadmin', invalid: true, touched: true,
        email: 'juan@', password: 'abc', confirm: 'abcd',
        first: 'Juan',
        errors: {
          lastName: 'Last name is required.',
          email: 'Enter a valid email.',
          password: 'Use at least 8 characters.',
          confirm: "Passwords don't match.",
        },
      });
    } },

  { name: 'Accounts / Create user / 03 — Filled — Password revealed',
    build: (x, y, n) => {
      const s = buildDirectoryPage(n, x, y, USERS_CFG, SEED_USERS, {});
      buildUserFormModal(s.frame, {
        mode: 'create', noun: 'user', role: 'Admin',
        first: 'Juan', last: 'Dela Cruz', email: 'juan.delacruz@2go.ph',
        password: 'ferry2026', confirm: 'ferry2026', revealed: true,
      });
    } },

  { name: 'Accounts / Create user / 04 — Role select open',
    build: (x, y, n) => {
      const s = buildDirectoryPage(n, x, y, USERS_CFG, SEED_USERS, {});
      buildUserFormModal(s.frame, {
        mode: 'create', noun: 'user', role: 'Superadmin', roleOpen: true,
        first: 'Juan', last: 'Dela Cruz', email: 'juan.delacruz@2go.ph',
        password: 'ferry2026', confirm: 'ferry2026',
      });
    } },

  { name: 'Accounts / Edit user / 01 — Prefilled + Status control',
    build: (x, y, n) => {
      const s = buildDirectoryPage(n, x, y, USERS_CFG, SEED_USERS, {});
      buildUserFormModal(s.frame, {
        mode: 'edit', noun: 'user', role: 'Admin', status: 'Active',
        first: 'Mae', last: 'Dela Cruz', email: 'mae.delacruz@fastcat.ph',
      });
    } },

  { name: 'Accounts / Create operator / 01 — No Role field',
    build: (x, y, n) => {
      const s = buildDirectoryPage(n, x, y, OPS_CFG, SEED_OPERATORS, {});
      buildUserFormModal(s.frame, { mode: 'create', noun: 'operator', invalid: true });
    } },

  { name: 'Accounts / Status / 01 — Suspend this user?',
    build: (x, y, n) => {
      const s = buildDirectoryPage(n, x, y, USERS_CFG, SEED_USERS, {});
      buildUserStatusDialog(s.frame, { mode: 'suspend', noun: 'user', name: 'Mae Dela Cruz' });
    } },

  { name: 'Accounts / Status / 02 — Reactivate this operator?',
    build: (x, y, n) => {
      const s = buildDirectoryPage(n, x, y, OPS_CFG, SEED_OPERATORS, {});
      buildUserStatusDialog(s.frame, { mode: 'reactivate', noun: 'operator', name: 'Ada Flores' });
    } },
];


/* ── A7. Entry point ───────────────────────────────────────────────────── */

const SECTION_NAME = 'Accounts — All states';

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
    A_PENDING = [];
    BUILDERS[i].build(x, y, BUILDERS[i].name);
    A_PENDING.forEach((draw) => draw());
    A_PENDING = [];
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
