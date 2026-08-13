/* ============================================================================
 * Tripket — Build "Shipping lines — Add line"
 * ----------------------------------------------------------------------------
 * Rebuilds the ShippingLineSwitcher dropdown and the CreateLineDialog
 * ("Add a shipping line") as native Figma frames. The plugin CREATES its own
 * section below every existing section on the page and is ADDITIVE: a frame
 * whose name already exists in the section is skipped, never replaced.
 *
 * Shares the chrome layer (sidebar, topbar, page header, modal shell, embedded
 * logos, text measurement) byte-for-byte with the Routes / Vessels / Bookings /
 * Tickets plugins. Shipping-line-only code starts at the "L1." marker.
 *
 * Measurements are real CSS pixels at 1440x900. globals.css sets
 * html { font-size: 17px }, so rem utilities are 17px-based (px-6 = 25.5,
 * py-3.5 = 14.875) and the type-scale layer lifts arbitrary text-[Npx] ~1px.
 * Literal px classes (w-[360px], h-[68px], w-[38px], 140px) do NOT scale.
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
 * L1. Shipping lines — extra tokens, icons and fonts
 * ----------------------------------------------------------------------------
 * Sources: components/ShippingLineSwitcher.tsx, components/CreateLineDialog.tsx,
 * components/Modal.tsx, components/Select.tsx, lib/shipping-lines.ts,
 * lib/line-status.ts, lib/settings-data.ts, app/page.tsx (the backdrop).
 * ========================================================================== */

const C2 = {
  slate800: '#1E293B',
  rose700:  '#BE123C',
  blue500:  '#3B82F6',
  green600: '#16A34A',
};
Object.keys(C2).forEach((k) => { if (C[k] === undefined) C[k] = C2[k]; });

// Icons used only by this module — path data verbatim from the components.
const LI = {
  // CreateLineDialog header badge: strokeWidth 1.75, h-[18px] w-[18px]
  plus:      { sw: 1.75, d: '<path d="M12 5v14M5 12h14"/>' },
  // Hover overlay on the logo tile (camera glyph), strokeWidth 1.75
  camera:    { sw: 1.75, d: '<path d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4l-1.5-2Z"/><circle cx="12" cy="13" r="3.5"/>' },
  // ShippingLineSwitcher "Add Shipping Line" row, strokeWidth 2
  plusThin:  { sw: 2,    d: '<path d="M12 5v14M5 12h14"/>' },
  // LineRow selected tick, strokeWidth 2.5
  tick:      { sw: 2.5,  d: '<path d="M5 12l5 5 9-11"/>' },
  // Dashboard KPI trend arrow, strokeWidth 2.25
  trendUp:   { sw: 2.25, d: '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>' },
  trendDown: { sw: 2.25, d: '<path d="M12 5v14"/><path d="m18 13-6 6-6-6"/>' },
};

/** `font-mono` — best-effort; falls back to the body family when absent. */
async function loadMono() {
  const families = ['Roboto Mono', 'JetBrains Mono', 'Space Mono', 'Courier New'];
  for (const family of families) {
    try {
      await figma.loadFontAsync({ family: family, style: 'Regular' });
      return { family: family, regular: 'Regular' };
    } catch (e) { /* next */ }
  }
  return { family: FONT.family, regular: FONT.regular };
}
let MONO = null;


/* ── L2. Seed data — literal copies ────────────────────────────────────── */

// lib/shipping-lines.ts — the full seed list, in source order.
const LINES = [
  { id: '2go',        name: '2GO Travel',                initial: '2G', tint: '#DB2777' },
  { id: 'fastcat',    name: 'FastCat',                   initial: 'F',  tint: '#2563EB' },
  { id: 'montenegro', name: 'Montenegro Lines',          initial: 'M',  tint: '#047857' },
  { id: 'oceanjet',   name: 'OceanJet',                  initial: 'O',  tint: '#DC2626' },
  { id: 'starlite',   name: 'Starlite Ferries',          initial: 'S',  tint: '#F59E0B' },
  { id: 'trans-asia', name: 'Trans-Asia Shipping Lines', initial: 'T',  tint: '#EAB308' },
  { id: 'weesam',     name: 'Weesam Express',            initial: 'W',  tint: '#0EA5E9' },
];

// lib/settings-data.ts
const PAYMENT_PROVIDERS = ['Asbir Pay', 'Beetzee Pay', 'Maayo Pay'];
const BOOKING_PROVIDERS = ['Maayo Shipping', 'Tripket Direct', 'Partner Agency'];

// CreateLineDialog — FALLBACK_TINT is bg-slate-500 for every new line.
const FALLBACK_TINT = C.slate500;

/** deriveInitial() — first two significant initials. */
function deriveInitial(name) {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}


/* ── L3. Backdrop — the Dashboard the switcher sits above ───────────────── */

/** PageHeader with no action slot (app/page.tsx renders `<PageHeader title="Dashboard" />`). */
function linesPageHeader(parent, title) {
  const h = frame(parent, 'Page header', 0, 0, CONTENT_W, lh(FS.xl));
  text(h, 'Page title', title, 0, 0,
    { size: FS.xl, weight: FONT.semibold, color: C.slate900, tracking: -0.5 });
  return h;
}

const KPI = [
  { label: 'Total Revenue',    value: '₱2,184,500', trend: 12,  up: true },
  { label: 'Tickets Issued',   value: '4,318',           trend: 8,   up: true },
  { label: 'Cancellations',    value: '126',             trend: 4,   up: false },
  { label: 'Vehicle Bookings', value: '742',             trend: 15,  up: true },
];

const KPI_H = SP.s5 * 2 + lh(FS.t11) + SP.s2 + 28 + SP.s3 + (SP.s05 * 2 + lh(FS.t11));

/** KPI strip — grid-cols-4, rounded-2xl, ring-slate-200/70, divide-x. */
function buildKpiStrip(parent, y) {
  const strip = frame(parent, 'KPI strip', 0, y, CONTENT_W, KPI_H,
    { bg: C.white, radius: RAD.xxl, stroke: C.slate200, strokeOpacity: 0.7, clip: true, shadow: CARD_SHADOW });
  const colW = CONTENT_W / 4;
  KPI.forEach((k, i) => {
    const cell = frame(strip, 'KPI · ' + k.label, i * colW, 0, colW, KPI_H);
    if (i > 0) rect(cell, 'Divider', 0, 0, 1, KPI_H, { bg: C.slate100 });
    text(cell, 'Label', k.label.toUpperCase(), SP.s6, SP.s5,
      { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
    // text-[28px] leading-none tabular-nums
    text(cell, 'Value', k.value, SP.s6, SP.s5 + lh(FS.t11) + SP.s2,
      { size: 29, weight: FONT.semibold, color: C.slate900, tracking: -0.6, lh: 29 });
    const chipY = SP.s5 + lh(FS.t11) + SP.s2 + 29 + SP.s3;
    const pctW = measure(Math.abs(k.trend) + '%', FS.t11, FONT.medium);
    const chipW = SP.s1_5 * 2 + 12.75 + SP.s1 + pctW;
    const chipH = SP.s05 * 2 + lh(FS.t11);
    const chip = frame(cell, 'Trend chip', SP.s6, chipY, chipW, chipH, {
      bg: k.up ? C.emerald50 : C.rose50, radius: RAD.full,
      stroke: k.up ? C.emerald200 : C.rose200, strokeOpacity: 0.6,
    });
    icon(chip, 'Icon', k.up ? LI.trendUp : LI.trendDown, SP.s1_5, (chipH - 12.75) / 2, 12.75,
      k.up ? C.emerald700 : C.rose700);
    text(chip, 'Pct', Math.abs(k.trend) + '%', SP.s1_5 + 12.75 + SP.s1, SP.s05,
      { size: FS.t11, weight: FONT.medium, color: k.up ? C.emerald700 : C.rose700 });
    text(cell, 'Caption', 'vs. last month', SP.s6 + chipW + SP.s2, chipY + (chipH - lh(FS.t11)) / 2,
      { size: FS.t11, color: C.slate500 });
  });
  return strip;
}

const CHART_H = 292;

/** Chart card shell — real header copy + legend; the plot is represented, not
 *  transcribed (the charts are out of scope for this plugin). */
function buildChartCard(parent, x, y, w, title, sub, legend, kind) {
  const card = frame(parent, 'Card · ' + title, x, y, w, CHART_H,
    { bg: C.white, radius: RAD.xxl, stroke: C.slate200, strokeOpacity: 0.7, clip: true, shadow: CARD_SHADOW });
  text(card, 'Title', title, SP.s5, SP.s5,
    { size: FS.base, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  text(card, 'Subtitle', sub, SP.s5, SP.s5 + lh(FS.base) + SP.s05,
    { size: FS.t11, color: C.slate500 });
  // Legend, right-aligned, gap-3
  let lx = w - SP.s5;
  for (let i = legend.length - 1; i >= 0; i--) {
    const lw = 10.625 + SP.s1_5 + measure(legend[i].label, FS.t11, FONT.regular);
    lx -= lw;
    const g = frame(card, 'Legend · ' + legend[i].label, lx, SP.s5 + 2, lw, 12.75);
    const sw = rect(g, 'Swatch', 0, (12.75 - 10.625) / 2, 10.625, 10.625, { bg: legend[i].color, radius: 3 });
    if (legend[i].opacity !== undefined) sw.fills = fill(legend[i].color, legend[i].opacity);
    text(g, 'Label', legend[i].label, 10.625 + SP.s1_5, (12.75 - lh(FS.t11)) / 2,
      { size: FS.t11, color: C.slate600 });
    lx -= SP.s3;
  }
  // Plot area — h-56 (238) with a 12-wide y-axis gutter.
  const plotY = SP.s5 + lh(FS.base) + SP.s05 + lh(FS.t11) + SP.s6;
  const plotX = SP.s5 + 51 + SP.s3;
  const plotW = w - plotX - SP.s5;
  const plotH = CHART_H - plotY - SP.s5;
  const plot = frame(card, 'Plot', plotX, plotY, plotW, plotH, { clip: true });
  for (let i = 0; i <= 4; i++) {
    hairline(plot, 'Gridline', 0, Math.round((plotH - SP.s6) * i / 4), plotW, C.slate100);
  }
  if (kind === 'bars') {
    const n = 7, gap = SP.s3;
    const bw = (plotW - gap * (n - 1)) / n;
    const hs = [0.44, 0.62, 0.53, 0.78, 0.71, 0.95, 0.58];
    for (let i = 0; i < n; i++) {
      const bh = (plotH - SP.s6) * hs[i];
      rect(plot, 'Bar', i * (bw + gap), plotH - SP.s6 - bh, bw, bh,
        { bg: C.brand500, radius: RAD.md });
    }
  } else {
    const pts = [0.30, 0.46, 0.40, 0.62, 0.55, 0.74];
    const pts2 = [0.16, 0.22, 0.19, 0.31, 0.27, 0.38];
    const H = plotH - SP.s6;
    const step = plotW / (pts.length - 1);
    const path = (arr) => arr.map((v, i) =>
      (i ? 'L ' : 'M ') + (i * step).toFixed(1) + ' ' + (H - H * v).toFixed(1)).join(' ');
    svgNode(plot, 'Series · Pax',
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + plotW + '" height="' + H + '" viewBox="0 0 ' +
      plotW + ' ' + H + '" fill="none" stroke="' + C.brand500 + '" stroke-width="2" stroke-linecap="round">' +
      '<path d="' + path(pts) + '"/></svg>', 0, 0);
    svgNode(plot, 'Series · Veh',
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + plotW + '" height="' + H + '" viewBox="0 0 ' +
      plotW + ' ' + H + '" fill="none" stroke="' + C.blue500 + '" stroke-width="2" stroke-linecap="round">' +
      '<path d="' + path(pts2) + '"/></svg>', 0, 0);
  }
  return card;
}

const PENDING_COLS = ['Ref', 'Status', 'Ticketholder', 'Route & vessel', 'Departure', 'Amount', 'Booked'];

/** PendingAgingList — header + thead only; the rows fall below the fold.
 *  Present so the scrimmed backdrop matches the real Dashboard. */
function buildPendingCard(parent, y, h) {
  const card = frame(parent, 'Card · Pending bookings', 0, y, CONTENT_W, h,
    { bg: C.white, radius: RAD.xxl, stroke: C.slate200, strokeOpacity: 0.7, clip: true, shadow: CARD_SHADOW });
  const title = text(card, 'Title', 'Pending bookings', SP.s6, SP.s5,
    { size: FS.base, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  const chipLabel = '7 AWAITING ACTION';
  const chipW = SP.s2 * 2 + measure(chipLabel, FS.t10, FONT.semibold, 0.96);
  const chipH = SP.s05 * 2 + lh(FS.t10);
  const chip = frame(card, 'Chip · awaiting', SP.s6 + title.width + SP.s2_5,
    SP.s5 + (lh(FS.base) - chipH) / 2, chipW, chipH, { bg: C.brand50, radius: RAD.md });
  text(chip, 'Label', chipLabel, SP.s2, SP.s05,
    { size: FS.t10, weight: FONT.semibold, color: C.brand700, tracking: 0.96 });
  text(card, 'Subtitle', '3 aging past 1h · 4 recent · sorted oldest first', SP.s6,
    SP.s5 + lh(FS.base) + SP.s1, { size: FS.xs, color: C.slate500 });
  const vaW = SP.s3 * 2 + measure('View all', FS.xs, FONT.medium) + SP.s1_5 + 12.75;
  const vaH = SP.s1_5 * 2 + lh(FS.xs);
  const va = frame(card, 'Button - View all', CONTENT_W - SP.s6 - vaW, SP.s5, vaW, vaH,
    { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  text(va, 'Label', 'View all', SP.s3, SP.s1_5, { size: FS.xs, weight: FONT.medium, color: C.slate700 });
  icon(va, 'Icon', I.arrowRight, SP.s3 + measure('View all', FS.xs, FONT.medium) + SP.s1_5,
    (vaH - 12.75) / 2, 12.75, C.slate700);
  // thead — border-y, bg-slate-50/50, px-6/px-2 py-2.5
  const theadY = SP.s5 + lh(FS.base) + SP.s1 + lh(FS.xs) + SP.s4;
  const theadH = SP.s2_5 * 2 + lh(FS.t11) + 2;
  const th = frame(card, 'Thead', 0, theadY, CONTENT_W, theadH, { bg: C.slate50, opacity: 0.5 });
  hairline(th, 'Border top', 0, 0, CONTENT_W, C.slate100);
  hairline(th, 'Border bottom', 0, theadH - 1, CONTENT_W, C.slate100);
  let tx = SP.s6;
  PENDING_COLS.forEach((c, i) => {
    text(th, 'Th · ' + c, c.toUpperCase(), tx, 1 + SP.s2_5,
      { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
    tx += measure(c.toUpperCase(), FS.t11, FONT.medium, 0.96) + (i === 0 ? SP.s6 + SP.s2 : SP.s2 * 2 + SP.s6);
  });
  return card;
}

let LAST_CONTAINER = null;

/** Shell + Dashboard backdrop. Returns the topbar's parent so overlays can be
 *  appended above `Main Content` (which is clipped). */
function linesShell(name, x, y, newLine) {
  const f = frame(figma.currentPage, name, x, y, FRAME_W, FRAME_H, { bg: C.white, clip: true });
  LAST_SHELL = f;
  buildSidebar(f, 'Dashboard');
  const right = frame(f, 'Container', MAIN_X, 0, MAIN_W, FRAME_H);
  LAST_CONTAINER = right;
  buildTopbar(right);
  if (newLine) retintSwitcher(right, newLine);
  const main = frame(right, 'Main Content', 0, TOPBAR_H, MAIN_W, MAIN_H, { clip: true });
  const content = frame(main, 'Container', CONTENT_X, CONTENT_Y, CONTENT_W, MAIN_H);
  const header = linesPageHeader(content, 'Dashboard');
  let cy = header.height + SP.s6;
  buildKpiStrip(content, cy);
  cy += KPI_H + SP.s6;
  const half = (CONTENT_W - SP.s4) / 2;
  buildChartCard(content, 0, cy, half, 'Weekly revenue', 'May 1 – May 31, 2026',
    [{ label: 'This week', color: C.brand500 }, { label: 'Last week', color: C.brand500, opacity: 0.25 }], 'bars');
  buildChartCard(content, half + SP.s4, cy, half, 'Total ticket bookings', 'Passengers + vehicles',
    [{ label: 'Pax', color: C.brand500 }, { label: 'Veh', color: C.blue500 }], 'lines');
  cy += CHART_H + SP.s6;
  buildPendingCard(content, cy, Math.max(120, MAIN_H - CONTENT_Y - cy + 240));
  return { frame: f, container: right };
}

/** After a line is created, `setActiveId` points the switcher at it — and a
 *  logo-less line renders its initials on the FALLBACK_TINT tile. */
function retintSwitcher(container, newLine) {
  const bar = container.children[0];
  const old = bar.findOne((n) => n.name === 'ShippingLineSwitcher');
  if (old) old.remove();
  const nameW = measure(newLine.name, FS.sm, FONT.medium);
  const swW = SP.s2 * 2 + 25.5 + SP.s2 + nameW + SP.s1 + SP.s5;
  const swH = SP.s1_5 * 2 + lh(FS.sm);
  const sw = frame(bar, 'ShippingLineSwitcher · ' + newLine.name, SP.s6, (TOPBAR_H - swH) / 2,
    swW, swH, { radius: RAD.lg });
  const tile = frame(sw, 'LogoTile · fallback', SP.s2, (swH - 25.5) / 2, 25.5, 25.5,
    { bg: FALLBACK_TINT, radius: RAD.md });
  const ini = text(tile, 'Initial', newLine.initial, 0, 0,
    { size: FS.t10, weight: FONT.bold, color: C.white });
  centerIn(ini, { x: 0, y: 0, w: 25.5, h: 25.5 });
  text(sw, 'Line name', newLine.name, SP.s2 + 25.5 + SP.s2, (swH - lh(FS.sm)) / 2,
    { size: FS.sm, weight: FONT.medium, color: C.slate900 });
  const chev = frame(sw, 'Chevron box', SP.s2 + 25.5 + SP.s2 + nameW + SP.s1, (swH - SP.s5) / 2,
    SP.s5, SP.s5, { bg: C.gray100, radius: RAD.md });
  icon(chev, 'Icon', I.updown, (SP.s5 - 12.75) / 2, (SP.s5 - 12.75) / 2, 12.75, C.gray500);
  return sw;
}


/* ── L4. ShippingLineSwitcher dropdown ─────────────────────────────────── */

const SW_H = SP.s1_5 * 2 + lh(FS.sm);            // trigger height, py-1.5 text-sm
const DD_W = 360;                                 // w-[360px] — literal, unscaled
const DD_SEARCH_H = SP.s2_5 * 2 + lh(FS.sm) + 1;  // px-3 py-2.5 + border-b
const DD_ROW_H = SP.s2_5 * 2 + 28;                // py-2.5, LogoTile size 28
const DD_FOOT_H = SP.s3 * 2 + lh(FS.sm) + 1;      // py-3 + border-t

/** Small "Disabled" chip — rose-50, ring-rose-200, uppercase text-[10px],
 *  tracking-wide (0.025em). */
const CHIP_TRACK = 0.3;
function suspendedChipWidth() {
  return SP.s1_5 * 2 + measure('DISABLED', FS.t10, FONT.semibold, CHIP_TRACK);
}
function suspendedChipHeight() {
  return SP.s05 * 2 + lh(FS.t10);
}
function suspendedChip(parent, x, y) {
  const chip = frame(parent, 'SuspendedChip', x, y, suspendedChipWidth(), suspendedChipHeight(),
    { bg: C.rose50, radius: RAD.md, stroke: C.rose200 });
  text(chip, 'Label', 'DISABLED', SP.s1_5, SP.s05,
    { size: FS.t10, weight: FONT.semibold, color: C.rose600, tracking: CHIP_TRACK });
  return chip;
}

/**
 * The dropdown. Drawn on the topbar's container (a sibling *after* the clipped
 * `Main Content`) so it layers over the page exactly like `z-50` does.
 * opts: { query, rows, suspended, selected }
 */
function buildSwitcherDropdown(container, opts) {
  const o = opts || {};
  const rows = o.rows || LINES;
  const suspended = o.suspended || {};
  const selectedId = o.selected || '2go';

  const listH = SP.s1 * 2 + (rows.length
    ? rows.length * DD_ROW_H
    : SP.s6 * 2 + lh(FS.sm));                    // px-4 py-6 "No matches"
  const H = DD_SEARCH_H + Math.min(listH, 360) + DD_FOOT_H;

  const dd = frame(container, 'ShippingLineSwitcher · Dropdown', SP.s6,
    (TOPBAR_H - SW_H) / 2 + SW_H + SP.s2, DD_W, H, {
      bg: C.white, radius: RAD.xl, stroke: C.gray200, clip: true, shadow: MENU_SHADOW,
    });

  // Search row — the input is a bare transparent field, no box.
  const search = frame(dd, 'Search row', 0, 0, DD_W, DD_SEARCH_H);
  hairline(search, 'Border bottom', 0, DD_SEARCH_H - 1, DD_W, C.gray100);
  const kbdW = SP.s1_5 * 2 + measure('Esc', FS.t10, FONT.regular);
  const kbdH = SP.s05 * 2 + lh(FS.t10);
  if (o.query) {
    text(search, 'Query', o.query, SP.s3, SP.s2_5, { size: FS.sm, color: C.gray900 });
    // Caret — the field autofocuses when the menu opens.
    rect(search, 'Caret', SP.s3 + measure(o.query, FS.sm, FONT.regular) + 1, SP.s2_5 + 2,
      1.25, lh(FS.sm) - 4, { bg: C.gray900 });
  } else {
    text(search, 'Placeholder', 'Find Shipping Line...', SP.s3, SP.s2_5,
      { size: FS.sm, color: C.gray400 });
    rect(search, 'Caret', SP.s3, SP.s2_5 + 2, 1.25, lh(FS.sm) - 4, { bg: C.gray900 });
  }
  const kbd = frame(search, 'Kbd · Esc', DD_W - SP.s3 - kbdW, (DD_SEARCH_H - 1 - kbdH) / 2,
    kbdW, kbdH, { bg: C.gray50, radius: RAD.md, stroke: C.gray200 });
  text(kbd, 'Label', 'Esc', SP.s1_5, SP.s05, { size: FS.t10, color: C.gray500 });

  // List
  const list = frame(dd, 'List', 0, DD_SEARCH_H, DD_W, Math.min(listH, 360), { clip: true });
  if (!rows.length) {
    const t = text(list, 'Empty', 'No matches', 0, SP.s1 + SP.s6,
      { size: FS.sm, color: C.gray400, width: DD_W, align: 'CENTER' });
    t.y = SP.s1 + SP.s6;
  }
  rows.forEach((l, i) => {
    const sel = l.id === selectedId;
    const sus = !!suspended[l.id];
    const row = frame(list, 'LineRow · ' + l.name, 0, SP.s1 + i * DD_ROW_H, DD_W, DD_ROW_H,
      { bg: sel ? C.gray50 : undefined });
    // LogoTile size 28 — real logo for the seeded lines, initials otherwise.
    const tile = frame(row, 'LogoTile', SP.s3, SP.s2_5, 28, 28,
      { bg: C.white, radius: RAD.md, stroke: C.gray200, clip: true, opacity: sus ? 0.5 : undefined });
    if (l.id === '2go' && LINE_LOGO_HASH) {
      tile.fills = [
        { type: 'SOLID', color: hex(C.white), opacity: sus ? 0.5 : 1 },
        { type: 'IMAGE', scaleMode: 'FIT', imageHash: LINE_LOGO_HASH, opacity: sus ? 0.5 : 1 },
      ];
    } else {
      tile.fills = fill(l.tint, sus ? 0.5 : 1);
      tile.strokes = [];
      const ini = text(tile, 'Initial', l.initial, 0, 0,
        { size: FS.t10, weight: FONT.bold, color: C.white, opacity: sus ? 0.5 : undefined });
      centerIn(ini, { x: 0, y: 0, w: 28, h: 28 });
    }
    // Name — flex-1 truncate; the tick and chip are shrink-0.
    const tickW = sel ? SP.s3 + 17 : 0;
    const chipW = sus ? SP.s3 + suspendedChipWidth() : 0;
    const nameX = SP.s3 + 28 + SP.s3;
    text(row, 'Line name', l.name, nameX, (DD_ROW_H - lh(FS.sm)) / 2, {
      size: FS.sm, color: sus ? C.gray400 : C.slate900,
      width: DD_W - nameX - SP.s3 - tickW - chipW,
    });
    let rx = DD_W - SP.s3;
    if (sel) {
      rx -= 17;
      icon(row, 'Icon · tick', LI.tick, rx, (DD_ROW_H - 17) / 2, 17, C.brand600);
      rx -= SP.s3;
    }
    if (sus) {
      rx -= suspendedChipWidth();
      suspendedChip(row, rx, (DD_ROW_H - suspendedChipHeight()) / 2);
    }
  });

  // Footer — "Add Shipping Line", the only way into CreateLineDialog.
  const foot = frame(dd, 'Button - Add Shipping Line', 0, H - DD_FOOT_H, DD_W, DD_FOOT_H);
  hairline(foot, 'Border top', 0, 0, DD_W, C.gray100);
  icon(foot, 'Icon · plus', LI.plusThin, SP.s3, 1 + SP.s3 + (lh(FS.sm) - 17) / 2, 17, C.gray500);
  text(foot, 'Label', 'Add Shipping Line', SP.s3 + 17 + SP.s3, 1 + SP.s3,
    { size: FS.sm, color: C.slate700 });
  return dd;
}


/* ── L5. CreateLineDialog ──────────────────────────────────────────────── */

const D_W = 544;                                  // max-w-lg @ 17px root
const D_PX = SP.s6;                               // px-6
const D_CW = D_W - D_PX * 2;                      // 493
const D_BODY_MAX = Math.round(0.78 * FRAME_H);    // max-h-[78vh] = 702
const D_INP_H = SP.s1_5 * 2 + lh(FS.t13) + 2;     // py-1.5 + text-[13px] + border
const D_FIELD_LABEL_H = lh(FS.t11);               // labelCls, block
const D_SEL_H = SP.s2 * 2 + lh(FS.sm) + 2;        // Select size="md"
const D_SW_W = 38, D_SW_H = 22, D_KNOB = 18;      // literal px — do not scale
const D_TILE = 68;                                // h-[68px] w-[68px]

/** labelCls — uppercase, 11px, tracking-[0.08em], slate-500. */
function dLabel(parent, x, y, label, required) {
  const t = text(parent, 'Label', label.toUpperCase(), x, y,
    { size: FS.t11, weight: FONT.medium, color: C.slate500, tracking: 0.96 });
  if (required) {
    text(parent, 'Required', '*', x + t.width + 3.5, y,
      { size: FS.t11, weight: FONT.medium, color: C.rose500 });
  }
  return t;
}

/** inputCls — rounded-md, border-slate-200, px-2.5 py-1.5, text-[13px]. */
function dInput(parent, x, y, w, value, placeholder, mono) {
  const f = frame(parent, 'Input' + (value ? ' · ' + value : ' · empty'), x, y, w, D_INP_H,
    { bg: C.white, radius: RAD.md, stroke: C.slate200 });
  const shown = value || placeholder || '';
  const t = text(f, value ? 'Value' : 'Placeholder', shown, SP.s2_5, SP.s1_5 + 1,
    { size: FS.t13, color: value ? C.slate900 : C.slate400 });
  if (mono && MONO) t.fontName = { family: MONO.family, style: MONO.regular };
  return f;
}

/** label + input, returns the block height. */
function dField(parent, x, y, w, label, value, placeholder, opts) {
  const o = opts || {};
  dLabel(parent, x, y, label, o.required);
  if (o.suffix) {
    const lw = measure(label.toUpperCase(), FS.t11, FONT.medium, 0.96) + (o.required ? 3.5 + 6 : 0);
    text(parent, 'Suffix', o.suffix, x + lw + 4.25, y,
      { size: FS.t11, color: C.slate400 });
  }
  dInput(parent, x, y + D_FIELD_LABEL_H + SP.s1_5, w, value, placeholder, o.mono);
  return D_FIELD_LABEL_H + SP.s1_5 + D_INP_H;
}

/** role="switch" — h-[22px] w-[38px], knob translate-x-[18px] / [2px]. */
function dSwitch(parent, x, y, on) {
  const f = frame(parent, 'Switch · ' + (on ? 'On' : 'Off'), x, y, D_SW_W, D_SW_H,
    { bg: on ? C.brand600 : C.slate300, radius: RAD.full });
  frame(f, 'Knob', on ? 18 : 2, (D_SW_H - D_KNOB) / 2, D_KNOB, D_KNOB, {
    bg: C.white, radius: RAD.full,
    shadow: [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.12 },
               offset: { x: 0, y: 1 }, radius: 3, spread: 0, visible: true, blendMode: 'NORMAL' }],
  });
  return f;
}

/** Section header — 12px semibold label, optional "Optional", then a hairline. */
function dSectionHead(parent, x, y, w, label, optional) {
  const rowH = lh(FS.t12);
  const h = frame(parent, 'Section head · ' + label, x, y, w, rowH);
  const t = text(h, 'Label', label, 0, 0,
    { size: FS.t12, weight: FONT.semibold, color: C.slate700, tracking: -0.2 });
  let rx = t.width + SP.s2_5;
  if (optional) {
    const o = text(h, 'Optional', 'Optional', rx, (rowH - lh(FS.t11)) / 2,
      { size: FS.t11, color: C.slate400 });
    rx += o.width + SP.s2_5;
  }
  hairline(h, 'Rule', rx, rowH / 2, w - rx, C.slate100);
  return rowH;
}

/** Booking-rules header uses labelCls instead of the 12px semibold style. */
function dRulesHead(parent, x, y, w) {
  const rowH = lh(FS.t11);
  const h = frame(parent, 'Section head · Booking rules', x, y, w, rowH);
  const t = dLabel(h, 0, 0, 'Booking rules', false);
  const rx = t.width + SP.s2_5;
  hairline(h, 'Rule', rx, rowH / 2, w - rx, C.slate100);
  return rowH;
}

const D_RULE_TEXT_H = lh(FS.t13) + SP.s05 + lh(FS.t11_5) * 1.375 / 1.5;
const D_RULE_H = SP.s3 * 2 + Math.max(D_SW_H, lh(FS.t13) + SP.s05 + FS.t11_5 * 1.375);

/** One RuleRow — bg-slate-50/40, px-3.5 py-3. */
function dRuleRow(parent, x, y, w, label, desc, on) {
  const row = frame(parent, 'RuleRow · ' + label, x, y, w, D_RULE_H,
    { bg: C.slate50, opacity: 0.4 });
  const inner = frame(row, 'Text', SP.s3_5, SP.s3, w - SP.s3_5 * 2 - SP.s3 - D_SW_W - SP.s3, 1);
  text(inner, 'Label', label, 0, 0,
    { size: FS.t13, weight: FONT.semibold, color: C.slate800, tracking: -0.2 });
  text(inner, 'Description', desc, 0, lh(FS.t13) + SP.s05,
    { size: FS.t11_5, color: C.slate500, lh: FS.t11_5 * 1.375, width: inner.width });
  inner.resize(inner.width, lh(FS.t13) + SP.s05 + FS.t11_5 * 1.375);
  inner.y = SP.s3;
  dSwitch(row, w - SP.s3_5 - D_SW_W, (D_RULE_H - D_SW_H) / 2, on);
  return D_RULE_H;
}

/* The inline option menu is `z-30` inside the scrolling body, so it paints over
   every field below it. Figma has no z-index — order IS paint order — so open
   menus are queued here and flushed after the rest of the body is laid out. */
let D_PENDING_MENUS = [];

/** Select trigger, size="md", plus the inline option menu when open. */
function dSelect(parent, x, y, w, value, options, open, placement) {
  const f = frame(parent, 'Select · ' + value, x, y, w, D_SEL_H, {
    bg: C.white, radius: RAD.lg,
    stroke: C.gray200, strokeOpacity: undefined,
  });
  if (open) { f.strokes = fill(C.gray300); }
  if (open) {
    // ring-2 ring-brand-100 — drawn as an outside stroke on a sibling.
    const ring = rect(parent, 'Focus ring', x - 2, y - 2, w + 4, D_SEL_H + 4,
      { radius: RAD.lg + 2, stroke: C.brand100, strokeW: 2, strokeAlign: 'INSIDE' });
    ring.fills = [];
  }
  text(f, 'Value', value, SP.s3, SP.s2 + 1, { size: FS.sm, color: C.gray900 });
  const chev = icon(f, 'Icon · chevron', I.chevronDown, w - SP.s3 - 14.875,
    (D_SEL_H - 14.875) / 2, 14.875, C.gray400);
  if (open) chev.rotation = 180;
  if (!open) return { h: D_SEL_H, menuH: 0 };

  // Inline menu: absolute left-0 right-0, py-1, max-h-60, rounded-lg.
  const optH = SP.s2 * 2 + lh(FS.sm);
  const menuH = SP.s1 * 2 + options.length * optH + 2;
  const up = placement === 'up';
  const my = up ? y - SP.s1 - menuH : y + D_SEL_H + SP.s1;
  D_PENDING_MENUS.push(function () {
    const menu = frame(parent, 'Select menu', x, my, w, menuH,
      { bg: C.white, radius: RAD.lg, stroke: C.gray200, clip: true, shadow: MENU_SHADOW });
    options.forEach((opt, i) => {
      const sel = opt === value;
      const row = frame(menu, 'Option · ' + opt, 0, SP.s1 + i * optH, w, optH,
        { bg: sel ? C.brand50 : undefined });
      text(row, 'Label', opt, SP.s3, SP.s2, { size: FS.sm, color: sel ? C.brand700 : C.gray700 });
      if (sel) icon(row, 'Icon · tick', LI.tick, w - SP.s3 - 17, (optH - 17) / 2, 17, C.brand600);
    });
  });
  return { h: D_SEL_H, menuH: menuH };
}


/**
 * Lays the dialog body out into `content` and returns its full height.
 * o: { name, code, logo, dragging, enabled, rules, selectOpen }
 */
function buildLineDialogBody(content, o) {
  const X = D_PX;
  let y = SP.s6;                                  // pt-6
  D_PENDING_MENUS = [];

  /* Header ------------------------------------------------------------- */
  const badge = frame(content, 'Icon badge', X, y, SP.s9, SP.s9,
    { bg: C.brand50, radius: RAD.full, stroke: C.brand200, strokeOpacity: 0.7 });
  icon(badge, 'Icon · plus', LI.plus, (SP.s9 - 18) / 2, (SP.s9 - 18) / 2, 18, C.brand600);
  const hx = X + SP.s9 + SP.s4;                   // gap-4
  const hw = D_CW - SP.s9 - SP.s4;
  text(content, 'Title', 'Add a shipping line', hx, y,
    { size: FS.t15_5, weight: FONT.semibold, color: C.slate900, tracking: -0.3 });
  const sub = text(content, 'Subtitle',
    'Only the name is required — everything else is optional and can be changed later in Settings.',
    hx, y + lh(FS.t15_5) + SP.s1_5,
    { size: FS.t13, color: C.slate600, lh: FS.t13 * 1.625, width: hw });
  y += Math.max(SP.s9, lh(FS.t15_5) + SP.s1_5 + sub.height);

  /* Identity row ------------------------------------------------------- */
  y += SP.s5;                                     // mt-5
  const idY = y;
  // Logo column
  dLabel(content, X, idY, 'Logo', false);
  const tileY = idY + D_FIELD_LABEL_H + SP.s1_5;  // mb-1.5 on the label
  const tile = frame(content, 'Logo tile', X, tileY, D_TILE, D_TILE, {
    bg: o.dragging ? C.brand50 : C.slate50, radius: RAD.xl, clip: true,
    stroke: o.dragging ? C.brand400 : C.slate200, strokeW: o.dragging ? 2 : 1,
  });
  if (o.logo) {
    // <img className="h-full w-full object-cover">
    const img = frame(tile, 'Logo preview', 0, 0, D_TILE, D_TILE);
    if (LINE_LOGO_HASH) img.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: LINE_LOGO_HASH }];
    else img.fills = fill(C.slate200);
  } else {
    const fb = frame(tile, 'Initials fallback', 0, 0, D_TILE, D_TILE, { bg: FALLBACK_TINT });
    const t = text(fb, 'Initial', deriveInitial(o.name || '?'), 0, 0,
      { size: FS.base, weight: FONT.bold, color: C.white });
    centerIn(t, { x: 0, y: 0, w: D_TILE, h: D_TILE });
  }
  // The camera overlay is opacity-0 until hover/focus, so no state draws it.
  let logoColH = D_FIELD_LABEL_H + SP.s1_5 + D_TILE + SP.s1_5;
  if (o.logo) {
    text(content, 'Button - Remove logo', 'Remove', 0, tileY + D_TILE + SP.s1_5,
      { size: FS.t11, weight: FONT.medium, color: C.slate400, width: D_TILE, align: 'CENTER' }).x = X;
    logoColH += lh(FS.t11);
  } else {
    // w-[68px] text-center leading-tight — "Drop or click" wraps to two lines.
    const drop = text(content, 'Hint · Drop or click', 'Drop or click', 0, tileY + D_TILE + SP.s1_5,
      { size: FS.t10_5, color: C.slate400, lh: FS.t10_5 * 1.25, width: D_TILE, align: 'CENTER' });
    drop.x = X;
    logoColH += drop.height;
  }

  // Name + code — grid-cols-[minmax(0,1fr)_140px] gap-3
  const rx = X + D_TILE + SP.s4;
  const rw = D_CW - D_TILE - SP.s4;
  const codeW = 140;                              // literal px
  const nameW = rw - SP.s3 - codeW;
  dField(content, rx, idY, nameW, 'Line name', o.name, 'e.g. Sunrise Ferries', { required: true });
  dField(content, rx + nameW + SP.s3, idY, codeW, 'Line code', o.code, 'E.G. SF123',
    { required: true, mono: true });
  const gridH = D_FIELD_LABEL_H + SP.s1_5 + D_INP_H;
  const hint = text(content, 'Hint · No logo', 'No logo? The line shows its initials on a neutral tile.',
    rx, idY + gridH + SP.s2, { size: FS.t11, color: C.slate400, lh: FS.t11 * 1.375, width: rw });
  y = idY + Math.max(logoColH, gridH + SP.s2 + hint.height);

  /* Status toggle ------------------------------------------------------ */
  y += SP.s5;
  const stBox = frame(content, 'Enable shipping line', X, y, D_CW, 1,
    { bg: C.slate50, opacity: 0.6, radius: RAD.xl, stroke: C.slate200 });
  const stTxtW = D_CW - SP.s3_5 * 2 - SP.s3 - D_SW_W - SP.s3;
  const stT = text(stBox, 'Label', 'Enable shipping line', SP.s3_5, SP.s3,
    { size: FS.t13, weight: FONT.semibold, color: C.slate800, tracking: -0.2 });
  const stS = text(stBox, 'Description', o.enabled
    ? 'The line is active and available right away.'
    : "The line is created disabled — enable it whenever you're ready.",
    SP.s3_5, SP.s3 + lh(FS.t13) + SP.s05,
    { size: FS.t11_5, color: C.slate500, lh: FS.t11_5 * 1.375, width: stTxtW });
  const stH = SP.s3 * 2 + Math.max(D_SW_H, lh(FS.t13) + SP.s05 + stS.height) + 2;
  stBox.resize(D_CW, stH);
  stT.y = (stH - (lh(FS.t13) + SP.s05 + stS.height)) / 2;
  stS.y = stT.y + lh(FS.t13) + SP.s05;
  dSwitch(stBox, D_CW - SP.s3_5 - D_SW_W, (stH - D_SW_H) / 2, o.enabled);
  y += stH;

  /* Contact details ---------------------------------------------------- */
  y += SP.s6;                                     // mt-6
  y += dSectionHead(content, X, y, D_CW, 'Contact details', true);
  y += SP.s3;                                     // mt-3
  const colW = (D_CW - SP.s3) / 2;
  const rowH = D_FIELD_LABEL_H + SP.s1_5 + D_INP_H;
  dField(content, X, y, colW, 'Website', '', 'https://', {});
  dField(content, X + colW + SP.s3, y, colW, 'Support email', '', 'support@line.ph', {});
  dField(content, X, y + rowH + SP.s3, colW, 'Contact number', '', '+63 2 8888 0000', {});
  dField(content, X + colW + SP.s3, y + rowH + SP.s3, colW, 'Business address', '',
    'Pier 4, North Harbor, Manila', {});
  y += rowH * 2 + SP.s3;

  /* Settings ----------------------------------------------------------- */
  y += SP.s6;
  y += dSectionHead(content, X, y, D_CW, 'Settings', true);
  y += SP.s3;
  const selRowH = D_FIELD_LABEL_H + SP.s1_5 + D_SEL_H;
  const setRowH = Math.max(rowH, selRowH);
  dField(content, X, y, colW, 'Schedule days ahead', '30', '30', {});
  dLabel(content, X + colW + SP.s3, y, 'Payment provider', false);
  dSelect(content, X + colW + SP.s3, y + D_FIELD_LABEL_H + SP.s1_5, colW,
    PAYMENT_PROVIDERS[0], PAYMENT_PROVIDERS, o.selectOpen === 'payment', 'up');
  const r2 = y + setRowH + SP.s3;
  // bookingProviderOptions = [trimmed || "Operator", ...BOOKING_PROVIDERS]
  const bpOptions = [o.name && o.name.trim() ? o.name.trim() : 'Operator'].concat(BOOKING_PROVIDERS);
  dLabel(content, X, r2, 'Booking provider', false);
  dSelect(content, X, r2 + D_FIELD_LABEL_H + SP.s1_5, colW,
    BOOKING_PROVIDERS[0], bpOptions, o.selectOpen === 'booking', 'down');
  dField(content, X + colW + SP.s3, r2, colW, 'Booking cutoff', '30', '30',
    { suffix: '(Minutes)' });
  y = r2 + setRowH;

  /* Booking rules ------------------------------------------------------ */
  y += SP.s6;
  y += dRulesHead(content, X, y, D_CW);
  y += SP.s3;
  const rules = o.rules || { mobile: true, address: false, autoConfirm: false };
  const box = frame(content, 'Booking rules', X, y, D_CW, 1,
    { radius: RAD.xl, stroke: C.slate200, clip: true });
  let by = 1;
  by += dRuleRow(box, 1, by, D_CW - 2, 'Require mobile number',
    'Customers must provide a phone number.', rules.mobile);
  hairline(box, 'Divider', 1, by, D_CW - 2, C.slate100); by += 1;
  by += dRuleRow(box, 1, by, D_CW - 2, 'Require address',
    'Customers must provide their address.', rules.address);
  hairline(box, 'Divider', 1, by, D_CW - 2, C.slate100); by += 1;
  by += dRuleRow(box, 1, by, D_CW - 2, 'Auto confirm bookings',
    'Bookings are confirmed immediately after payment.', rules.autoConfirm);
  by += 1;
  box.resize(D_CW, by);
  y += by;

  // z-30 open menus paint last.
  D_PENDING_MENUS.forEach((draw) => draw());
  D_PENDING_MENUS = [];

  return y + SP.s5;                               // pb-5
}

/**
 * The whole dialog: Modal shell (rounded-2xl, black/30 backdrop) + scrolling
 * body + fixed footer.
 * o: { name, code, logo, dragging, enabled, rules, selectOpen, scroll, submitting }
 */
function buildCreateLineDialog(parent, o) {
  o = o || {};
  buildScrim(parent, 0.3);                        // Modal layer="base" → black/30

  const dlg = frame(parent, 'Dialog - Add a shipping line', (FRAME_W - D_W) / 2, 0, D_W, 100, {
    bg: C.white, radius: RAD.xxl, stroke: C.gray200, clip: true, shadow: MODAL_SHADOW,
  });

  const body = frame(dlg, 'Body (scroll)', 0, 0, D_W, 100, { clip: true });
  const content = frame(body, 'Content', 0, 0, D_W, 2000);
  const contentH = buildLineDialogBody(content, o);
  content.resize(D_W, contentH);

  const bodyH = Math.min(contentH, D_BODY_MAX);
  body.resize(D_W, bodyH);
  const maxScroll = Math.max(0, contentH - bodyH);
  const scroll = o.scroll === 'bottom' ? maxScroll : Math.min(o.scroll || 0, maxScroll);
  content.y = -scroll;

  // Overlay scrollbar thumb.
  if (maxScroll > 0) {
    const thumbH = Math.max(28, bodyH * (bodyH / contentH));
    rect(body, 'Scrollbar thumb', D_W - 2 - 6, (bodyH - thumbH) * (scroll / maxScroll), 6, thumbH,
      { bg: C.slate400, opacity: 0.45, radius: 3 });
  }

  /* Footer — outside the scroll area: border-t px-6 py-3.5, justify-end gap-2 */
  const cancelH = SP.s1_5 * 2 + lh(FS.sm) + 2;
  const footH = 1 + SP.s3_5 * 2 + cancelH;
  const foot = frame(dlg, 'Footer', 0, bodyH, D_W, footH);
  hairline(foot, 'Border top', 0, 0, D_W, C.slate100);
  const valid = !!(o.name && o.name.trim()) && !!(o.code && o.code.trim());
  const addLabel = o.submitting ? 'Adding…' : 'Add line';
  const addW = SP.s3 * 2 + measure(addLabel, FS.sm, FONT.medium);
  const cancelW = SP.s3 * 2 + measure('Cancel', FS.sm, FONT.medium) + 2;
  const by = 1 + SP.s3_5;
  const cancel = frame(foot, 'Button - Cancel', D_W - D_PX - addW - SP.s2 - cancelW, by,
    cancelW, cancelH, { bg: C.white, radius: RAD.lg, stroke: C.slate200 });
  if (o.submitting) cancel.opacity = 0.6;         // disabled:opacity-60
  text(cancel, 'Label', 'Cancel', SP.s3, SP.s1_5 + 1,
    { size: FS.sm, weight: FONT.medium, color: C.slate700 });
  const add = frame(foot, 'Button - ' + addLabel, D_W - D_PX - addW, by, addW,
    cancelH - 2, { bg: C.brand600, radius: RAD.lg });
  add.y = by + 1;
  if (!valid || o.submitting) add.opacity = 0.5;   // disabled:opacity-50
  text(add, 'Label', addLabel, SP.s3, SP.s1_5,
    { size: FS.sm, weight: FONT.medium, color: C.white });

  const H = bodyH + footH;
  dlg.resize(D_W, H);
  dlg.y = (FRAME_H - H) / 2;
  return dlg;
}


/* ── L6. Frames ────────────────────────────────────────────────────────── */

const FILLED = { name: 'Sunrise Ferries', code: 'SF123' };

const BUILDERS = [
  {
    name: 'Lines / Switcher / 01 — Topbar switcher — Rest',
    build: (x, y, n) => { linesShell(n, x, y); },
  },
  {
    name: 'Lines / Switcher / 02 — Dropdown open — All 7 lines',
    build: (x, y, n) => {
      const s = linesShell(n, x, y);
      buildSwitcherDropdown(s.container, {});
    },
  },
  {
    name: 'Lines / Switcher / 03 — Dropdown open — Search "fast"',
    build: (x, y, n) => {
      const s = linesShell(n, x, y);
      buildSwitcherDropdown(s.container, {
        query: 'fast',
        rows: LINES.filter((l) => l.name.toLowerCase().indexOf('fast') !== -1),
      });
    },
  },
  {
    name: 'Lines / Switcher / 04 — Dropdown open — No matches',
    build: (x, y, n) => {
      const s = linesShell(n, x, y);
      buildSwitcherDropdown(s.container, { query: 'zzz', rows: [] });
    },
  },
  {
    name: 'Lines / Switcher / 05 — Dropdown open — Disabled line',
    build: (x, y, n) => {
      const s = linesShell(n, x, y);
      buildSwitcherDropdown(s.container, { suspended: { weesam: true, starlite: true } });
    },
  },
  {
    name: 'Lines / Add line / 01 — Empty form — Add line disabled',
    build: (x, y, n) => {
      const s = linesShell(n, x, y);
      buildCreateLineDialog(s.frame, { name: '', code: '', enabled: true });
    },
  },
  {
    name: 'Lines / Add line / 02 — Name + code entered — Add line enabled',
    build: (x, y, n) => {
      const s = linesShell(n, x, y);
      buildCreateLineDialog(s.frame, { name: FILLED.name, code: FILLED.code, enabled: true });
    },
  },
  {
    name: 'Lines / Add line / 03 — Logo tile — Drag over',
    build: (x, y, n) => {
      const s = linesShell(n, x, y);
      buildCreateLineDialog(s.frame, {
        name: FILLED.name, code: FILLED.code, enabled: true, dragging: true,
      });
    },
  },
  {
    name: 'Lines / Add line / 04 — Logo uploaded — Remove',
    build: (x, y, n) => {
      const s = linesShell(n, x, y);
      buildCreateLineDialog(s.frame, {
        name: FILLED.name, code: FILLED.code, enabled: true, logo: true,
      });
    },
  },
  {
    name: 'Lines / Add line / 05 — Enable toggle off',
    build: (x, y, n) => {
      const s = linesShell(n, x, y);
      buildCreateLineDialog(s.frame, { name: FILLED.name, code: FILLED.code, enabled: false });
    },
  },
  {
    name: 'Lines / Add line / 06 — Scrolled to Booking rules',
    build: (x, y, n) => {
      const s = linesShell(n, x, y);
      buildCreateLineDialog(s.frame, {
        name: FILLED.name, code: FILLED.code, enabled: true, scroll: 'bottom',
      });
    },
  },
  {
    name: 'Lines / Add line / 07 — Payment provider open — Flips up',
    build: (x, y, n) => {
      const s = linesShell(n, x, y);
      buildCreateLineDialog(s.frame, {
        name: FILLED.name, code: FILLED.code, enabled: true, selectOpen: 'payment',
      });
    },
  },
  {
    name: 'Lines / Add line / 08 — Booking provider open — Operator first',
    build: (x, y, n) => {
      const s = linesShell(n, x, y);
      buildCreateLineDialog(s.frame, {
        name: FILLED.name, code: FILLED.code, enabled: true,
        scroll: 'bottom', selectOpen: 'booking',
      });
    },
  },
  {
    name: 'Lines / Add line / 09 — Rules all on',
    build: (x, y, n) => {
      const s = linesShell(n, x, y);
      buildCreateLineDialog(s.frame, {
        name: FILLED.name, code: FILLED.code, enabled: true, scroll: 'bottom',
        rules: { mobile: true, address: true, autoConfirm: true },
      });
    },
  },
  {
    name: 'Lines / Add line / 10 — Submitting — "Adding…"',
    build: (x, y, n) => {
      const s = linesShell(n, x, y);
      buildCreateLineDialog(s.frame, {
        name: FILLED.name, code: FILLED.code, enabled: true, submitting: true,
      });
    },
  },
  {
    name: 'Lines / Add line / 11 — Created — Switcher shows the new line',
    build: (x, y, n) => {
      linesShell(n, x, y, { name: FILLED.name, initial: deriveInitial(FILLED.name) });
    },
  },
];


/* ── L7. Entry point ───────────────────────────────────────────────────── */

const SECTION_NAME = 'Shipping lines — Add line';

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
